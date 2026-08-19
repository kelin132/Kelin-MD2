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

/** Try every available source to get a display name for a JID. */
async function resolveName(sock, targetJid, chatJid) {
  const num = targetJid.split('@')[0].split(':')[0];

  const c = sock.contacts?.[targetJid] ?? sock.contacts?.[`${num}@s.whatsapp.net`] ?? {};
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

      // Try to enrich with DB staff (staffLevel ≥ 1)
      let dbStaff = [];
      try { dbStaff = await getStaffMembers(); } catch { /* MongoDB may be offline */ }

      // Build a unified map: num → { name, level, jid }
      const staffMap = new Map();

      // DB staff first (authoritative level)
      for (const u of dbStaff) {
        const num = u._id.split('@')[0].split(':')[0];
        staffMap.set(num, {
          jid:   u._id,
          name:  u.name || `+${num}`,
          level: u.staffLevel || 1,
        });
      }

      // mods.json (level 1) — add any not already in DB
      for (const { num, name } of data) {
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

      // ── Build a clean phone-number map from group participants ─────────────
      const cleanNumMap = {}; // storedNum → displayNum
      if (jid?.endsWith('@g.us')) {
        try {
          const meta = await sock.groupMetadata(jid);
          for (const p of meta.participants) {
            const pNum = p.id.split('@')[0].split(':')[0]; // clean phone number
            cleanNumMap[pNum] = pNum;
            for (const [storedNum] of staffMap) {
              if (storedNum !== pNum && storedNum.startsWith(pNum)) {
                cleanNumMap[storedNum] = pNum;
              }
            }
          }
        } catch { /* not in a group or metadata unavailable */ }
      }

      // Sort: highest level first, then alphabetically
      const sorted = [...staffMap.values()].sort(
        (a, b) => b.level - a.level || a.name.localeCompare(b.name)
      );

      const rows = sorted.map((s, index) => {
        const storedNum = s.jid.split('@')[0].split(':')[0].replace(/\D/g, '');
        const number    = cleanNumMap[storedNum] || storedNum;
        const label     = LEVEL_LABEL[s.level] || 'MOD';
        return [
          `│ \`${index + 1}.\` *+${number}*`,
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
