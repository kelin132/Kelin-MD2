/**
 * .resetplayer @user
 * Reset a player's economy stats (money, bank, vault, xp, level, inventory, history)
 * while preserving their identity and staff rank.
 */
import { resetPlayer, getUser, isRegistered, addHistory } from "../economy/database.js";

export default {
  name: "resetplayer",
  description: "Reset a player's economy stats to zero",
  category: "staff",
  usage: ".resetplayer @user",
  aliases: ["reseteconomy", "wipeeconomy"],
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
        text: "❓ *Usage:* `.resetplayer @user`"
      }, { quoted: msg });
    }

    if (!await isRegistered(targetJid)) {
      return sock.sendMessage(jid, { text: "❌ That player is not registered." }, { quoted: msg });
    }

    const target = await getUser(targetJid);
    await resetPlayer(targetJid);
    await addHistory(targetJid, "reset", 0, "Account was reset by staff");

    await sock.sendMessage(jid, {
      text:
        `🔄 *Player Reset*\n\n` +
        `👤 Player  : ${target.name}\n` +
        `💰 Money   : $0\n` +
        `🏦 Bank    : $0\n` +
        `🔒 Vault   : $0\n` +
        `⭐ Level   : 1\n\n` +
        `_Identity and staff rank preserved. Economy wiped._`,
      mentions: [targetJid],
    }, { quoted: msg });
  }
};
