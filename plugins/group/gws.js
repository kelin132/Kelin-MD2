import {
  createGiveaway,
  formatDuration,
  parseDuration,
} from "../../lib/giveawayManager.mjs";

export default {
  name: "gws",
  aliases: ["giveaway"],
  description: "Create a timed reaction giveaway",
  category: "group",
  usage: ".gws <duration> <prize>",
  isMod: true,
  cooldown: 10,

  async run({ sock, msg, args, text, sender }) {
    const chatId = msg.key.remoteJid;
    if (!chatId?.endsWith("@g.us")) {
      return sock.sendMessage(chatId, {
        text: "❌ Giveaways can only be created inside a group.",
      }, { quoted: msg });
    }

    const durationMs = parseDuration(args[0]);
    const prize = text.replace(/^\S+\s*/, "").trim();

    if (!durationMs || !prize) {
      return sock.sendMessage(chatId, {
        text: [
          "❌ *Giveaway details required*",
          "",
          "*Usage:* .gws <duration> <prize>",
          "*Example:* .gws 2h Nitro Basic",
          "",
          "Durations support seconds, minutes, hours, days, or weeks.",
          "Examples: `30s`, `10m`, `2h`, `1d`, `1h30m`",
          `Maximum duration: ${formatDuration(30 * 24 * 60 * 60 * 1000)}.`,
        ].join("\n"),
      }, { quoted: msg });
    }

    try {
      await createGiveaway({
        sock,
        chatId,
        creatorJid: sender,
        prize,
        durationMs,
      });

      return sock.sendMessage(chatId, {
        text: `✅ Giveaway created. React with 🎉 to enter; the winner will be selected in ${formatDuration(durationMs)}.`,
      }, { quoted: msg });
    } catch (error) {
      return sock.sendMessage(chatId, {
        text: `❌ Could not create the giveaway: ${error.message}`,
      }, { quoted: msg });
    }
  },
};