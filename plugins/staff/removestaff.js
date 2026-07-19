/**
 * .removestaff @user
 * Remove a user's staff/mod rank (set level back to 0).
 */
import { removeStaffLevel, getUser, isRegistered } from "../economy/database.js";

export default {
  name: "removestaff",
  description: "Remove a user's staff/mod rank",
  category: "staff",
  usage: ".removestaff @user",
  aliases: ["demod", "destaff", "unmod"],
  isStaff: true,

  async run({ sock, msg, args, sender, isOwner, staffLevel }) {
    const jid = msg.key.remoteJid;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    let targetJid = null;

    if (mentioned) {
      targetJid = mentioned;
    } else if (args[0]?.match(/^[0-9]+$/)) {
      targetJid = `${args[0]}@s.whatsapp.net`;
    } else {
      return sock.sendMessage(jid, {
        text: "❓ *Usage:* `.removestaff @user`"
      }, { quoted: msg });
    }

    if (targetJid === sender) {
      return sock.sendMessage(jid, { text: "❌ You can't remove your own rank." }, { quoted: msg });
    }

    if (!await isRegistered(targetJid)) {
      return sock.sendMessage(jid, { text: "❌ That player is not registered." }, { quoted: msg });
    }

    const target = await getUser(targetJid);

    // Staff cannot remove someone of equal or higher rank
    if (!isOwner && (target.staffLevel || 0) >= staffLevel) {
      return sock.sendMessage(jid, {
        text: "❌ You cannot remove the rank of someone at or above your level."
      }, { quoted: msg });
    }

    await removeStaffLevel(targetJid);

    await sock.sendMessage(jid, {
      text:
        `✅ *Staff Rank Removed*\n\n` +
        `👤 Player : ${target.name}\n` +
        `📛 Rank   : Removed (now regular user)`,
      mentions: [targetJid],
    }, { quoted: msg });
  }
};
