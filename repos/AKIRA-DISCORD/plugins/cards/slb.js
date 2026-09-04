import { getCardLeaderboard, formatCardLeaderboard } from "../../lib/cardLeaderboard.mjs";

export default {
  name: "slb",
  aliases: ["serieslb", "seriesleaderboard"],
  category: "cards",
  description: "Series card leaderboard",
  usage: ".slb <series>",
  cooldown: 15,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const seriesQuery = args.join(" ").trim();
    if (!seriesQuery) {
      return sock.sendMessage(jid, { text: "❌ Usage: *.slb <series>*\n\nExample: *.slb Zoro*" }, { quoted: msg });
    }

    try {
      const result = await getCardLeaderboard(seriesQuery);
      if (!result.rows.length) {
        return sock.sendMessage(jid, {
          text: `❌ No cards from the series *${result.seriesLabel || seriesQuery}* were found in any collection.`,
        }, { quoted: msg });
      }
      return sock.sendMessage(jid, { text: formatCardLeaderboard(result) }, { quoted: msg });
    } catch (err) {
      console.error("SLB ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Failed to load the series leaderboard." }, { quoted: msg });
    }
  },
};
