import { getCardLeaderboard, formatCardLeaderboard } from "../../lib/cardLeaderboard.mjs";

export default {
  name: "cardlb",
  aliases: ["clb", "ckb", "card-leaderboard", "cardtop"],
  discordColor: "#F1C40F",
  discordTitle: "🏆 Leaderboard — Card Collectors",
  category: "cards",
  description: "Top 10 card collectors by total cards",
  usage: ".cardlb",
  cooldown: 15,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    try {
      const result = await getCardLeaderboard();
      if (!result.rows.length) {
        return sock.sendMessage(jid, { text: "❌ No card collectors found yet." }, { quoted: msg });
      }
      return sock.sendMessage(jid, { text: formatCardLeaderboard(result) }, { quoted: msg });
    } catch (err) {
      console.error("CARDLB ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Failed to load the card leaderboard." }, { quoted: msg });
    }
  },
};
