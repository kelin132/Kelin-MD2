/**
 * .setstaff @user [level]
 * Set a user's staff level. Level: 1=mod, 2=staff, 3=admin
 * Owner can set any level. Staff can only set level 1 (mod).
 * Aliases: setmod, addstaff
 */
import { setStaffLevel, getUser, isRegistered } from "../economy/database.js";

const LEVEL_NAMES = { 1: "Mod", 2: "Staff", 3: "Admin" };

export default {
  name: "setstaff",
  description: "Grant a user mod/staff/admin rank",
  category: "staff",
  usage: ".setstaff @user [1|2|3]",
  aliases: ["setmod", "addstaff", "grantstaff"],
  isMod: true,

  async run({ sock, msg, args, sender, isOwner, isStaff, staffLevel }) {
    const jid = msg.key.remoteJid;

    // Check for a mentioned LID (Baileys often puts LIDs or JIDs in mentionedJid depending on the version/device)
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    let targetLid = null;

    if (mentioned) {
      // If the mentioned ID is already a LID, keep it. Otherwise, convert if needed or use directly.
      targetLid = mentioned.includes("@lid") ? mentioned : mentioned.replace("@s.whatsapp.net", "@lid");
    } else if (args[0]?.match(/^[0-9]+$/)) {
      // If numbers are provided directly, format as a LID
      targetLid = `${args[0]}@lid`;
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

    if (targetLid === sender) {
      return sock.sendMessage(jid, { text: "❌ You can't change your own rank." }, { quoted: msg });
    }

    if (!await isRegistered(targetLid)) {
      return sock.sendMessage(jid, { text: "❌ That player is not registered." }, { quoted: msg });
    }

    const target = await getUser(targetLid);
    await setStaffLevel(targetLid, requestedLevel);

    await sock.sendMessage(jid, {
      text:
        `✅ *Staff Rank Updated*\n\n` +
        `👤 Player : ${target.name}\n` +
        `🏅 Rank   : ${LEVEL_NAMES[requestedLevel]}\n` +
        `🔑 Level  : ${requestedLevel}`,
      mentions: [targetLid],
    }, { quoted: msg });
  }
};
