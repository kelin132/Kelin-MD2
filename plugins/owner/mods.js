// plugins/owner/mods.js
// .mods  — list all guardians/mods with clean phone numbers
// .removemod — remove a user from the mods list

import { getModsData, saveModsData } from '../../lib/permissions.mjs';
import { getStaffMembers } from '../economy/database.js';
import {
  bareNumber,
  getAllGroupNumberMap,
  getGroupNumberMap,
  getSocketLidNumberMap,
  mergeNumberMaps,
  storedRealNumber,
} from '../../lib/staffNumbers.mjs';

const CACHE_TTL_MS = 30_000;
let staffCache = null;
let staffCacheAt = 0;
let staffCacheInFlight = null;

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

export default {
  name:        'mods',
  description: 'List or remove bot moderators',
  category:    'owner',
  usage:       '.mods | .removemod @user',
  aliases:     ['removemod', 'modlist'],
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

      // Sort within each role so the grouped display stays stable.
      const sorted = [...staffMap.values()].sort(
        (a, b) => b.level - a.level || a.name.localeCompare(b.name)
      );

      const admins = sorted.filter((s) => s.level >= 3);
      const staff = sorted.filter((s) => s.level === 2);
      const mods = sorted.filter((s) => s.level <= 1);

      const formatRows = (members) => members.length
        ? members.map((s) => {
        const numPart = bareNumber(s.jid);
        // Prefer a stored phone number, then resolve a LID through group metadata.
        const number = s.realNum || cleanNumMap.get(numPart) || numPart;
        const displayNumber = number ? `+${number}` : '?';
        return `✦ ${s.name || 'Unknown'} ❖ \`${displayNumber}\``;
      })
        : ['✦ None listed'];

      const caption = [
        `🛡️ 𝗠𝗢𝗗𝗦 & 𝗦𝗧𝗔𝗙𝗙 ❖ ⟦ \`${sorted.length}\` ⟧`,
        '━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '👑 𝗔𝗗𝗠𝗜𝗡𝗦',
        ...formatRows(admins),
        '',
        '⭐ 𝗦𝗧𝗔𝗙𝗙',
        ...formatRows(staff),
        '',
        '🗡️ 𝗠𝗢𝗗𝗦',
        ...formatRows(mods),
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━',
        "> 📖 Do not abuse this command, it's only used for important reasons",
      ].join('\n');

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
          `│ ❌ Please specify a user to remove.\n` +
          `│\n` +
          `│ 💡 Mention: \`.removemod @user\`\n` +
          `│ 💡 Reply: \`.removemod\` (reply to target)\n` +
          `│ 💡 Phone: \`.removemod 27628114340\`\n` +
          `╰───────────────❀`,
      }, { quoted: msg });
    }

    const num  = targetJid.split('@')[0].split(':')[0].replace(/\D/g, '');

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
