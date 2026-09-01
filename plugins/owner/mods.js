// plugins/owner/mods.js
// .mods  — list all guardians/mods with clean phone numbers
// .addmod / .removemod — manage the mods list

import { getModsData, saveModsData, getMods } from '../../lib/permissions.mjs';
import { getStaffMembers } from '../economy/database.js';

const LEVEL_LABEL = {
  1:  'MOD',
  2:  'STAFF',
  3:  'ADMIN',
  99: 'OWNER',
};

const CACHE_TTL_MS = 30_000;
let staffCache = null;
let staffCacheAt = 0;
let staffCacheInFlight = null;
const groupNumberCaches = new Map();
const groupNumberInFlight = new Map();
let allGroupNumberCache = null;
let allGroupNumberInFlight = null;

function bareNumber(value) {
  return String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

function addParticipantsToNumberMap(numberMap, participants = []) {
  for (const participant of participants) {
    const phoneNumber = bareNumber(participant.id);
    const lidNumber = bareNumber(participant.lid);
    if (phoneNumber) numberMap.set(phoneNumber, phoneNumber);
    if (lidNumber && phoneNumber) numberMap.set(lidNumber, phoneNumber);
  }
}

async function getCachedStaffMembers() {
  if (staffCache && Date.now() - staffCacheAt < CACHE_TTL_MS) return staffCache;
  if (staffCacheInFlight) return staffCacheInFlight;

  staffCacheInFlight = getStaffMembers()
    .then((members) => {
      staffCache = Array.isArray(members) ? members : [];
      staffCacheAt = Date.now();
      return staffCache;
    })
    .catch(() => {
      staffCache = [];
      staffCacheAt = Date.now();
      return staffCache;
    })
    .finally(() => {
      staffCacheInFlight = null;
    });

  return staffCacheInFlight;
}

async function getGroupNumberMap(sock, groupJid) {
  if (!groupJid?.endsWith('@g.us') || typeof sock?.groupMetadata !== 'function') {
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

async function getAllGroupNumberMap(sock) {
  if (allGroupNumberCache && Date.now() - allGroupNumberCache.createdAt < CACHE_TTL_MS) {
    return allGroupNumberCache.map;
  }
  if (allGroupNumberInFlight) return allGroupNumberInFlight;
  if (typeof sock?.groupFetchAllParticipating !== 'function') return new Map();

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

async function getSocketLidNumberMap(sock, lidNumbers) {
  const mapping = sock?.signalRepository?.lidMapping;
  if (!mapping || lidNumbers.length === 0) return new Map();

  try {
    const lids = lidNumbers.map((number) => `${number}@lid`);
    const pairs = typeof mapping.getPNsForLIDs === 'function'
      ? await mapping.getPNsForLIDs(lids)
      : await Promise.all(lids.map(async (lid) => ({
        lid,
        pn: await mapping.getPNForLID(lid),
      })));
    const result = new Map();
    for (const pair of pairs || []) {
      const lidNumber = bareNumber(pair?.lid);
      const phoneNumber = bareNumber(pair?.pn);
      if (lidNumber && phoneNumber) result.set(lidNumber, phoneNumber);
    }
    return result;
  } catch {
    return new Map();
  }
}

function mergeNumberMaps(target, source) {
  for (const [key, value] of source) target.set(key, value);
}

function storedRealNumber(user) {
  for (const value of [
    user.whatsappNumber,
    user.phoneNumber,
    user.phone,
    user.jid,
    user.owner,
  ]) {
    const number = bareNumber(value);
    if (number.length >= 7 && !String(value).includes('@lid')) return number;
  }
  return null;
}

/** Try every available source to get a display name for a JID. */
async function resolveName(sock, targetJid, chatJid) {
  const num = bareNumber(targetJid);

  const contacts = sock.store?.contacts || sock.contacts || {};
  const c = contacts[targetJid] ?? contacts[`${num}@s.whatsapp.net`] ?? {};
  const fromContacts = c.notify || c.verifiedName || c.name;
  if (fromContacts) return fromContacts;

  if (chatJid?.endsWith('@g.us')) {
    try {
      const meta        = await sock.groupMetadata(chatJid);
      const participant = meta.participants.find(
        p => p.id.split('@')[0].split(':')[0] === num
      );
      if (participant?.name || participant?.notify)
        return participant.name || participant.notify;
    } catch { /* ignore */ }
  }

  return null;
}

export default {
  name:        'mods',
  description: 'List, add, or remove bot moderators',
  category:    'owner',
  usage:       '.mods | .addmod @user | .removemod @user',
  aliases:     ['addmod', 'removemod', 'modlist'],
  cooldown:    5,
  isOwner:     false,

  async run({ sock, msg, cmd }) {
    const jid  = msg.key.remoteJid;
    const data = getModsData(); // [{ num, name }]

    // ── .mods / .modlist ─────────────────────────────────────────────────
    if (cmd === 'mods' || cmd === 'modlist') {

      // Start the independent database and current-group lookups together.
      // Both are cached briefly because .mods is commonly checked repeatedly.
      const staffPromise = getCachedStaffMembers();
      const currentGroupPromise = jid?.endsWith('@g.us')
        ? getGroupNumberMap(sock, jid)
        : Promise.resolve(new Map());
      const [dbStaff, currentGroupNumbers] = await Promise.all([
        staffPromise,
        currentGroupPromise,
      ]);

      // Build a unified map: num → { name, level, jid, whatsappNumber }
      const staffMap = new Map();

      // DB staff first (authoritative level)
      for (const u of dbStaff) {
        const num = bareNumber(u._id);
        const realNum = storedRealNumber(u);
        
        staffMap.set(num, {
          jid:   u._id,
          name:  u.name || `+${num}`,
          level: u.staffLevel || 1,
          realNum: realNum && realNum.length >= 7 ? realNum : null
        });
      }

      // mods.json (level 1) — add any not already in DB
      for (const { num: rawNum, name } of data) {
        const num = bareNumber(rawNum);
        if (!staffMap.has(num)) {
          staffMap.set(num, {
            jid:   `${num}@s.whatsapp.net`,
            name:  name || `+${num}`,
            level: 1,
          });
        }
      }

      if (!staffMap.size) {
        return sock.sendMessage(jid, {
          text:
            `╭─❀「 🛡️ *𝐌𝐎𝐃𝐒 & 𝐒𝐓𝐀𝐅𝐅* 」❀─╮\n` +
            `│ No mods set yet.\n` +
            `│\n` +
            `│ 💡 \`.addmod @user\` — grant mod access\n` +
            `│ 💡 \`.removemod @user\` — revoke mod access\n` +
            `╰───────────────❀`,
        }, { quoted: msg });
      }

      // ── Build a clean phone-number map from available group metadata ─────
      const cleanNumMap = new Map(currentGroupNumbers);

      // If some staff still not resolved, try other groups (if any)
      const unresolved = [...staffMap.keys()].filter((num) => !cleanNumMap.has(num));
      if (unresolved.length > 0) {
        // Baileys keeps a native LID → phone mapping. Use it before scanning
        // every group; this is both faster and works when the mod is not in
        // the group where .mods was requested.
        mergeNumberMaps(cleanNumMap, await getSocketLidNumberMap(sock, unresolved));
      }

      const stillUnresolved = unresolved.filter((num) => !cleanNumMap.has(num));
      if (stillUnresolved.length > 0) {
        mergeNumberMaps(cleanNumMap, await getAllGroupNumberMap(sock));
      }

      // Sort: highest level first, then alphabetically
      const sorted = [...staffMap.values()].sort(
        (a, b) => b.level - a.level || a.name.localeCompare(b.name)
      );

      const rows = sorted.map((s, index) => {
        const numPart = bareNumber(s.jid);
        const isLid = s.jid.endsWith('@lid');
        
        // Prefer a stored phone number, then resolve a LID through group metadata.
        const number = s.realNum || cleanNumMap.get(numPart) || numPart;
        const label = LEVEL_LABEL[s.level] || 'MOD';
        
        return [
          `│ \`${index + 1}.\` *+${number}*${isLid && !s.realNum && !cleanNumMap.has(numPart) ? ' _(LID unresolved)_' : ''}`,
          `│    👤 Name: *${s.name}*`,
          `│    🛡️ Role: \`${label}\``,
        ].join('\n');
      }).join('\n│\n');

      const caption =
        `╭─❀「 🛡️ *𝐌𝐎𝐃𝐒 & 𝐒𝐓𝐀𝐅𝐅* 」❀─╮\n` +
        `│ 👥 Members: \`${sorted.length}\`\n` +
        `│\n` +
        `${rows}\n` +
        `│\n` +
        `│ 💬 Contact a listed team member for assistance.\n` +
        `│ 📖 Use \`.rules\` to review guidelines.\n` +
        `╰───────────────❀`;

      return sock.sendMessage(jid, {
        text: caption,
      }, { quoted: msg });
    }

    // ── Resolve target JID ────────────────────────────────────────────────
    const ctx        = msg.message?.extendedTextMessage?.contextInfo;
    const mentionJid = ctx?.mentionedJid?.[0];
    const quotedPart = ctx?.participant;

    const rawText  = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const numArg   = rawText.trim().split(/\s+/).slice(1)[0];
    const numMatch = numArg?.replace(/\D/g, '');

    const targetJid =
      mentionJid ||
      quotedPart ||
      (numMatch?.length >= 7 ? `${numMatch}@s.whatsapp.net` : null);

    if (!targetJid) {
      return sock.sendMessage(jid, {
        text:
          `╭─❀「 🛡️ *𝐌𝐎𝐃𝐒 & 𝐒𝐓𝐀𝐅𝐅* 」❀─╮\n` +
          `│ ❌ Please specify a user.\n` +
          `│\n` +
          `│ 💡 Mention: \`.addmod @user\`\n` +
          `│ 💡 Reply: \`.addmod\` (reply to target)\n` +
          `│ 💡 Phone: \`.addmod 27628114340\`\n` +
          `╰───────────────❀`,
      }, { quoted: msg });
    }

    const num  = targetJid.split('@')[0].split(':')[0].replace(/\D/g, '');
    const list = getMods();

    // ── .addmod ───────────────────────────────────────────────────────────
    if (cmd === 'addmod') {
      if (list.includes(num)) {
        return sock.sendMessage(jid, {
          text:
            `╭─❀「 🛡️ *𝐌𝐎𝐃𝐒 & 𝐒𝐓𝐀𝐅𝐅* 」❀─╮\n` +
            `│ ❌ @${num} is already a mod.\n` +
            `╰───────────────❀`,
          mentions: [targetJid],
        }, { quoted: msg });
      }

      const resolvedName = await resolveName(sock, targetJid, jid);
      const name = resolvedName || `+${num}`;

      data.push({ num, name });
      saveModsData(data);

      return sock.sendMessage(jid, {
        text:
          `╭─❀「 🛡️ *𝐌𝐎𝐃𝐒 & 𝐒𝐓𝐀𝐅𝐅* 」❀─╮\n` +
          `│ ✅ @${num} added as bot mod!\n` +
          `│\n` +
          `│ 👤 Name: *${name}*\n` +
          `│ 📞 Phone: \`+${num}\`\n` +
          `╰───────────────❀`,
        mentions: [targetJid],
      }, { quoted: msg });
    }

    // ── .removemod ────────────────────────────────────────────────────────
    if (cmd === 'removemod') {
      const idx = data.findIndex(e => e.num === num);
      if (idx === -1) {
        return sock.sendMessage(jid, {
          text:
            `╭─❀「 🛡️ *𝐌𝐎𝐃𝐒 & 𝐒𝐓𝐀𝐅𝐅* 」❀─╮\n` +
            `│ ❌ @${num} is not in the mods list.\n` +
            `╰───────────────❀`,
          mentions: [targetJid],
        }, { quoted: msg });
      }
      const { name } = data[idx];
      data.splice(idx, 1);
      saveModsData(data);
      return sock.sendMessage(jid, {
        text:
          `╭─❀「 🛡️ *𝐌𝐎𝐃𝐒 & 𝐒𝐓𝐀𝐅𝐅* 」❀─╮\n` +
          `│ ✅ @${num} (*${name}*) removed from mods.\n` +
          `╰───────────────❀`,
        mentions: [targetJid],
      }, { quoted: msg });
    }
  },
};
