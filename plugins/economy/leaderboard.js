import { getAllUsers } from "./database.js";

export default {
  name: "leaderboard",
  description: "View the richest players",
  category: "economy",
  usage: ".leaderboard",
  aliases: ["lb", "rich", "top"],
  cooldown: 10,

  async run({ sock, msg }) {
    const users = await getAllUsers();

    if (!users || users.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "💰 No registered users yet! Be the first with *.register*"
      }, { quoted: msg });
    }

    const sorted = users
      .map(u => ({ ...u, net: (u.money || 0) + (u.bank || 0) }))
      .sort((a, b) => b.net - a.net)
      .slice(0, 10);

    const medals = ["🥇", "🥈", "🥉"];
    let text = "🏆 *ECONOMY LEADERBOARD*\n\n";

    sorted.forEach((u, i) => {
      const rank = medals[i] || `${i + 1}.`;
      const name = u.name || `User_${(u._id || "").slice(-4)}`;
      text += `${rank} *${name}*\n`;
      text += `   💰 Net Worth: $${u.net.toLocaleString()}\n`;
      text += `   ⭐ Level: ${u.level || 1}\n\n`;
    });

    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
  }
};
