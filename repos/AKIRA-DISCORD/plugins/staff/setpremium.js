/**
 * .setpremium @user [on|off]
 * Grant or revoke premium status for a player.
 */
import { setPremium, getUser, isRegistered } from "../economy/database.js";

export default {
  name: "setpremium",
  description: "Grant or revoke premium status",
  category: "staff",
  usage: ".setpremium @user [on|off]",
  aliases: ["grantpremium", "revokepremium"],
  isStaff: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    let targetJid = null;

    if (mentioned) {
      targetJid = mentioned;
    } else if (args[0]?.match(/^[0-9]+$/)) {
      targetJid = `${args[0]}@s.whatsapp.net`;
    } else {
      return sock.sendMessage(jid, {
        text: "❓ *Usage:* `.setpremium @user [on|off]`\n\n_Default is 'on' if not specified._"
      }, { quoted: msg });
    }

    if (!await isRegistered(targetJid)) {
      return sock.sendMessage(jid, { text: "❌ That player is not registered." }, { quoted: msg });
    }

    const toggle = (args[args.length - 1] || "on").toLowerCase();
    const value  = toggle !== "off";
    const target = await getUser(targetJid);

    await setPremium(targetJid, value);

    await sock.sendMessage(jid, {
      text:
        `⭐ *Premium Status ${value ? "Granted" : "Revoked"}*\n\n` +
        `👤 Player  : ${target.name}\n` +
        `💎 Premium : ${value ? "✅ Active" : "❌ Removed"}\n\n` +
        `_Premium perks: 1.5× weekly, 2× monthly, future exclusive features._`,
      mentions: [targetJid],
    }, { quoted: msg });
  }
};
