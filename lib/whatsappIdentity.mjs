/**
 * Resolve Baileys message identities to the user's real WhatsApp number.
 *
 * WhatsApp can deliver a message with a phone JID, a device JID, or an LID.
 * LIDs are privacy identifiers and must never be shown to users as phone
 * numbers. In groups, the LID -> phone mapping is available in metadata.
 */

export function jidNumber(value = "") {
  return String(value || "")
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");
}

export function normalizePhoneNumber(value = "") {
  return String(value || "")
    .replace(/[^\d]/g, "")
    .replace(/^00/, "");
}

export function phoneJid(number) {
  const digits = normalizePhoneNumber(number);
  return digits ? `${digits}@s.whatsapp.net` : "";
}

export function formattedPhoneNumber(number) {
  const digits = normalizePhoneNumber(number);
  return digits ? `+${digits}` : "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build the MongoDB filter used for user records.
 *
 * Older releases stored device JIDs (and sometimes the legacy @c.us form)
 * as the document id. The current bot stores the phone JID, so lookups must
 * accept every phone-JID form for the same number.
 */
export function userJidFilter(value = "") {
  const raw = String(value || "").trim();
  const number = jidNumber(raw);
  if (!number) return { _id: raw };

  const legacyJidPattern = new RegExp(
    `^${escapeRegExp(number)}(?:\\d+|:[^@]+)?@(?:s\\.whatsapp\\.net|c\\.us)$`
  );

  return {
    $or: [
      { _id: raw },
      { _id: phoneJid(number) },
      { _id: `${number}@c.us` },
      { _id: { $regex: legacyJidPattern } },
    ],
  };
}

function isPhoneJid(jid = "") {
  return /@(?:s\.whatsapp\.net|c\.us)$/.test(String(jid));
}

function unique(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function contactNumber(sock, jid) {
  const contact =
    sock?.store?.contacts?.[jid] ||
    sock?.contacts?.[jid] ||
    sock?.store?.contacts?.[phoneJid(jidNumber(jid))] ||
    sock?.contacts?.[phoneJid(jidNumber(jid))];

  return normalizePhoneNumber(
    contact?.number ||
    contact?.phoneNumber ||
    contact?.phone ||
    (isPhoneJid(contact?.id) ? jidNumber(contact.id) : "")
  );
}

async function groupPhoneAliases(sock, chatId, candidates) {
  if (!chatId?.endsWith("@g.us") || !sock?.groupMetadata) return [];

  try {
    const metadata = await sock.groupMetadata(chatId);
    const candidateNumbers = new Set(candidates.map(jidNumber).filter(Boolean));
    const aliases = [];

    for (const participant of metadata.participants || []) {
      const ids = [participant.id, participant.jid, participant.lid]
        .filter(Boolean)
        .map(String);
      if (ids.some((id) => candidates.includes(id) || candidateNumbers.has(jidNumber(id)))) {
        aliases.push(...ids);
        if (isPhoneJid(participant.id)) aliases.push(participant.id);
      }
    }

    return aliases;
  } catch {
    return [];
  }
}

/**
 * Baileys equivalent of whatsapp-web.js' getContact()/contact.number.
 *
 * The returned `jid` is safe for database lookups and mentions, while
 * `phoneNumber` and `formattedNumber` are for all user-facing text.
 */
export async function resolveMessageIdentity(sock, msg) {
  const key = msg?.key || {};
  const candidates = unique([
    key.participant,
    key.participantAlt,
    key.participantPn,
    key.remoteJid,
    key.remoteJidAlt,
  ]);

  const aliases = unique([
    ...candidates,
    ...(await groupPhoneAliases(sock, key.remoteJid, candidates)),
  ]);

  const phoneCandidate =
    aliases.find((candidate) => isPhoneJid(candidate)) ||
    aliases.find((candidate) => contactNumber(sock, candidate)) ||
    "";
  const phoneNumber =
    normalizePhoneNumber(phoneCandidate) ||
    aliases.map((candidate) => contactNumber(sock, candidate)).find(Boolean) ||
    "";

  const originalJid = key.participant || key.remoteJid || "";
  const jid = phoneNumber ? phoneJid(phoneNumber) : originalJid;

  return {
    jid,
    phoneNumber,
    formattedNumber: formattedPhoneNumber(phoneNumber),
    aliases,
  };
}

/**
 * Resolve a stored user id against current group metadata. This repairs old
 * records where a device/LID suffix was accidentally saved with the number.
 */
export async function resolveDisplayNumber(sock, storedJid, chatId) {
  const stored = String(storedJid || "");
  const storedNumber = jidNumber(stored);

  if (chatId?.endsWith("@g.us") && sock?.groupMetadata) {
    try {
      const metadata = await sock.groupMetadata(chatId);
      for (const participant of metadata.participants || []) {
        const participantNumber = jidNumber(participant.id || participant.jid);
        const participantLid = jidNumber(participant.lid);
        const matches =
          stored === participant.id ||
          stored === participant.jid ||
          stored === participant.lid ||
          (storedNumber && participantLid && storedNumber === participantLid) ||
          (storedNumber && participantNumber &&
            (storedNumber === participantNumber ||
              storedNumber.startsWith(participantNumber) ||
              participantNumber.startsWith(storedNumber)));

        if (matches && participantNumber) return participantNumber;
      }
    } catch {
      // Use the best available stored value below.
    }
  }

  const aliases = await groupPhoneAliases(sock, chatId, [stored]);
  const phoneAlias = aliases.find((alias) => isPhoneJid(alias));
  return normalizePhoneNumber(phoneAlias) || storedNumber;
}

/**
 * Normalize a mentioned or quoted user reference before staff/economy
 * plugins use it as a database id. This keeps LID and device-JID mentions
 * compatible with the canonical phone JID used by the bot.
 */
export async function normalizeUserReference(sock, jid, chatId) {
  const number = await resolveDisplayNumber(sock, jid, chatId);
  return number ? phoneJid(number) : String(jid || "");
}

/**
 * Normalize all known quoted/mentioned JIDs on a command message in place.
 * Baileys places contextInfo in different message wrappers depending on the
 * message type, so inspect every nested object rather than one message kind.
 */
export async function normalizeMessageReferences(sock, msg) {
  const chatId = msg?.key?.remoteJid;
  const seen = new Set();

  async function visit(value) {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);

    if (value.contextInfo) {
      if (Array.isArray(value.contextInfo.mentionedJid)) {
        value.contextInfo.mentionedJid = await Promise.all(
          value.contextInfo.mentionedJid.map((jid) =>
            normalizeUserReference(sock, jid, chatId)
          )
        );
      }
      if (value.contextInfo.participant) {
        value.contextInfo.participant = await normalizeUserReference(
          sock,
          value.contextInfo.participant,
          chatId
        );
      }
    }

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") await visit(child);
    }
  }

  await visit(msg?.message);
  return msg;
}