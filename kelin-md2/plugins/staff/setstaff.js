/**
 * .setstaff @user [level]
 * Set a user's staff level. Level: 1=mod, 2=staff, 3=admin
 * Owner can set any level. Staff can only set level 1 (mod).
 * Aliases: addmod, setmod, addstaff
 */
import { setStaffLevel, getUser, isRegistered } from "../economy/database.js";

const LEVEL_NAMES = { 1: "Mod", 2: "Staff", 3: "Admin" };

export default {
  name: "setstaff",
  description: "Grant a user mod/staff/admin rank",
  category: "staff",
  usage: ".setstaff @user [1|2|3]",
  aliases: ["addmod", "setmod", "addstaff", "grantstaff"],
  isMod: true,

  async run({ sock, msg, args, sender, isOwner, isStaff, staffLevel }) {
    const jid = msg.key.remoteJid;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    let targetJid = null;

    if (mentioned) {
      targetJid = mentioned;
    } else if (args[0]?.match(/^[0-9]+$/)) {
      targetJid = `${args[0]}@s.whatsapp.net`;
    } else {
      return sock.sendMessage(jid, {
        text:
          `❓ *Usage:* \`.setstaff @user [level]\`\n\n` +
          `*Levels:*\n` +
          `• \`1\` — Mod (can use staff commands)\n` +
          `• \`2\` — Staff (higher access)\n` +
          `• \`3\` — Admin (owner-level staff)\n\n` +
          `_Example: \`.setstaff @user 2\`_`
      }, { quoted: msg });
    }

    // Determine requested level
    const requestedLevel = parseInt(args[args.length - 1]) || 1;

    if (![1, 2, 3].includes(requestedLevel)) {
      return sock.sendMessage(jid, { text: "❌ Level must be 1 (Mod), 2 (Staff), or 3 (Admin)." }, { quoted: msg });
    }

    // Permission: staff can only grant mod (level 1); owner can grant any
    if (!isOwner && isStaff && requestedLevel >= staffLevel) {
      return sock.sendMessage(jid, {
        text: `❌ You can only grant ranks below your own level (${LEVEL_NAMES[staffLevel]}).`
      }, { quoted: msg });
    }
    if (!isOwner && requestedLevel >= 3) {
      return sock.sendMessage(jid, { text: "❌ Only the owner can grant Admin rank." }, { quoted: msg });
    }

    if (targetJid === sender) {
      return sock.sendMessage(jid, { text: "❌ You can't change your own rank." }, { quoted: msg });
    }

    if (!await isRegistered(targetJid)) {
      return sock.sendMessage(jid, { text: "❌ That player is not registered." }, { quoted: msg });
    }

    const target = await getUser(targetJid);
    await setStaffLevel(targetJid, requestedLevel);

    await sock.sendMessage(jid, {
      text:
        `✅ *Staff Rank Updated*\n\n` +
        `👤 Player : ${target.name}\n` +
        `🏅 Rank   : ${LEVEL_NAMES[requestedLevel]}\n` +
        `🔑 Level  : ${requestedLevel}`,
      mentions: [targetJid],
    }, { quoted: msg });
  }
};
