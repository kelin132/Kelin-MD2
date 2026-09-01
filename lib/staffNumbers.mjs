/**
 * Resolve WhatsApp privacy LIDs to real phone numbers for staff listings.
 *
 * Staff records may have been created while WhatsApp supplied an @lid JID.
 * Never display that LID as a phone number when a phone-number mapping is
 * available from the socket, group metadata, or stored profile fields.
 */

const CACHE_TTL_MS = 30_000;
const groupNumberCaches = new Map();
const groupNumberInFlight = new Map();
let allGroupNumberCache = null;
let allGroupNumberInFlight = null;

export function bareNumber(value) {
  return String(value || "").split("@")[0].split(":")[0].replace(/\D/g, "");
}

function isPhoneLike(value, field = "") {
  const raw = String(value || "");
  const number = bareNumber(raw);
  if (raw.includes("@lid") || number.length < 7 || number.length > 16) return false;

  if (raw.includes("@")) {
    return raw.endsWith("@s.whatsapp.net") || raw.endsWith("@c.us");
  }

  // Explicit phone fields and legacy raw-number IDs are safe to use.
  return field !== "lid" && field !== "id";
}

export function storedRealNumber(user = {}) {
  for (const [field, value] of [
    ["whatsappNumber", user.whatsappNumber],
    ["phoneNumber", user.phoneNumber],
    ["phone", user.phone],
    ["jid", user.jid],
    ["owner", user.owner],
    ["_id", user._id],
  ]) {
    if (isPhoneLike(value, field)) return bareNumber(value);
  }
  return null;
}

function addParticipantsToNumberMap(numberMap, participants = []) {
  for (const participant of participants || []) {
    const phone = [
      ["id", participant?.id],
      ["jid", participant?.jid],
      ["pn", participant?.pn],
      ["phoneNumber", participant?.phoneNumber],
      ["phone", participant?.phone],
    ].map(([field, value]) => isPhoneLike(value, field) ? bareNumber(value) : null)
      .find(Boolean);

    const lids = [
      participant?.lid,
      participant?.lidJid,
      String(participant?.id || "").includes("@lid") ? participant.id : null,
      String(participant?.jid || "").includes("@lid") ? participant.jid : null,
    ].map(bareNumber).filter(Boolean);

    if (phone) numberMap.set(phone, phone);
    for (const lid of lids) {
      if (phone) numberMap.set(lid, phone);
    }
  }
}

export async function getGroupNumberMap(sock, groupJid) {
  if (!groupJid?.endsWith("@g.us") || typeof sock?.groupMetadata !== "function") {
    return new Map();
  }

  const cached = groupNumberCaches.get(groupJid);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.map;
  if (groupNumberInFlight.has(groupJid)) return groupNumberInFlight.get(groupJid);

  const request = Promise.resolve()
    .then(() => sock.groupMetadata(groupJid))
    .then((meta) => {
      const map = new Map();
      addParticipantsToNumberMap(map, meta?.participants);
      groupNumberCaches.set(groupJid, { createdAt: Date.now(), map });
      return map;
    })
    .catch(() => new Map())
    .finally(() => {
      groupNumberInFlight.delete(groupJid);
    });

  groupNumberInFlight.set(groupJid, request);
  return request;
}

export async function getAllGroupNumberMap(sock) {
  if (allGroupNumberCache && Date.now() - allGroupNumberCache.createdAt < CACHE_TTL_MS) {
    return allGroupNumberCache.map;
  }
  if (allGroupNumberInFlight) return allGroupNumberInFlight;
  if (typeof sock?.groupFetchAllParticipating !== "function") return new Map();

  allGroupNumberInFlight = Promise.resolve()
    .then(() => sock.groupFetchAllParticipating())
    .then((groups) => {
      const map = new Map();
      for (const group of Object.values(groups || {})) {
        addParticipantsToNumberMap(map, group?.participants);
      }
      allGroupNumberCache = { createdAt: Date.now(), map };
      return map;
    })
    .catch(() => new Map())
    .finally(() => {
      allGroupNumberInFlight = null;
    });

  return allGroupNumberInFlight;
}

function addMappingPair(result, lid, phone) {
  const lidNumber = bareNumber(lid);
  const phoneNumber = bareNumber(phone);
  if (
    lidNumber &&
    phoneNumber &&
    !String(lid || "").includes("@s.whatsapp.net") &&
    isPhoneLike(phone, "phoneNumber")
  ) {
    result.set(lidNumber, phoneNumber);
  }
}

function addMappingResponse(result, response) {
  if (!response) return;

  if (response instanceof Map) {
    for (const [lid, phone] of response) addMappingPair(result, lid, phone);
    return;
  }

  if (Array.isArray(response)) {
    for (const pair of response) {
      if (Array.isArray(pair)) {
        addMappingPair(result, pair[0], pair[1]);
      } else {
        addMappingPair(result, pair?.lid || pair?.lidJid, pair?.pn || pair?.phoneNumber || pair?.jid);
      }
    }
    return;
  }

  if (typeof response === "object") {
    for (const [lid, phone] of Object.entries(response)) {
      addMappingPair(result, lid, phone);
    }
  }
}

export async function getSocketLidNumberMap(sock, lidNumbers = []) {
  const mapping = sock?.signalRepository?.lidMapping;
  const uniqueLids = [...new Set(lidNumbers.map(bareNumber).filter(Boolean))];
  if (!mapping || uniqueLids.length === 0) return new Map();

  const result = new Map();

  // Support the current batch API and older single-value implementations.
  try {
    const lids = uniqueLids.map((number) => `${number}@lid`);
    if (typeof mapping.getPNsForLIDs === "function") {
      addMappingResponse(result, await mapping.getPNsForLIDs(lids));
    } else if (typeof mapping.getPNForLID === "function") {
      await Promise.all(lids.map(async (lid) => {
        try {
          addMappingPair(result, lid, await mapping.getPNForLID(lid));
        } catch {
          // One missing mapping should not discard all other staff mappings.
        }
      }));
    }
  } catch {
    // Group metadata below is the fallback when the native cache is unavailable.
  }

  const botLid = bareNumber(sock.user?.lid);
  const botPhone = sock.user?.id;
  if (botLid && botPhone) addMappingPair(result, botLid, botPhone);

  return result;
}

export function mergeNumberMaps(target, source) {
  for (const [key, value] of source || []) target.set(key, value);
}

/**
 * Build a source-JID-number → real-phone-number map for staff records.
 */
export async function resolveStaffNumberMap(sock, members = [], currentGroupJid = "") {
  const numberMap = new Map();
  const sourceNumbers = [];

  for (const member of members || []) {
    const sourceNumber = bareNumber(member?._id || member?.jid || member?.userId);
    if (!sourceNumber) continue;
    sourceNumbers.push(sourceNumber);

    const storedNumber = storedRealNumber(member);
    if (storedNumber) numberMap.set(sourceNumber, storedNumber);
  }

  mergeNumberMaps(numberMap, await getGroupNumberMap(sock, currentGroupJid));

  const unresolved = sourceNumbers.filter((number) => !numberMap.has(number));
  if (unresolved.length) {
    mergeNumberMaps(numberMap, await getSocketLidNumberMap(sock, unresolved));
  }

  const stillUnresolved = unresolved.filter((number) => !numberMap.has(number));
  if (stillUnresolved.length) {
    mergeNumberMaps(numberMap, await getAllGroupNumberMap(sock));
  }

  return numberMap;
}