import { readData } from "../../lib/store.mjs";

export default {
  name: "leaderboard",
  description: "Top 10 richest users",
  category: "economy",
  usage: ".leaderboard",
  aliases: ["rich", "top", "lb"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const eco = readData("economy", {});

    const sorted = Object.entries(eco)
      .map(([num, d]) => ({ num, total: (d.coins ?? 0) + (d.bank ?? 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    if (!sorted.length) return sock.sendMessage(jid, { text: "📊 No economy data yet. Use .work or .daily to start!" });

    const lines = ["💰 *Richest Users*", ""];
    sorted.forEach(({ num, total }, i) => {
      const medal = ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`;
      lines.push(`${medal} +${num.slice(-6)}... — *${total} coins*`);
    });

    await sock.sendMessage(jid, { text: lines.join("\n") }, { quoted: msg });
  },
};
