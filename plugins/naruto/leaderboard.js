import players from "../../lib/player.js";

export default {
  name: "nleaderboard",
  aliases: ["nlead", "nshinobileaderboard"],
  description: "Show the Naruto shinobi leaderboard",
  category: "naruto",
  usage: ".nleaderboard",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const list = await players.getLeaderboard(10);
    if (!list.length) {
      return sock.sendMessage(jid, { text: "🍃 No shinobi have started their journey yet. Use *.nstart*." }, { quoted: msg });
    }
    const lines = list.map((player, index) =>
      `${index + 1}. *${player.username || "Shinobi"}* — Lv.${player.level} | ${player.xp}/${player.xpNeeded} XP | ${player.wins || 0} wins`
    );
    return sock.sendMessage(jid, { text: `🏆 *SHINOBI LEADERBOARD*\n\n${lines.join("\n")}` }, { quoted: msg });
  },
};