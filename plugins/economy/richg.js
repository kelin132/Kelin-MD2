import { getUser } from "./database.js";

export default {
  name: "richg",
  aliases: ["grouprich", "glb"],
  category: "economy",
  description: "Richest players in this group",
  usage: ".richg",
  cooldown: 15,

  async run({ sock, msg }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    if (!jid.endsWith("@g.us")) {
      return reply("❌ This command only works in groups!");
    }

    try {
      const meta    = await sock.groupMetadata(jid);
      const members = meta.participants.map(p => p.id);

      const results = await Promise.allSettled(members.map(m => getUser(m)));

      const users = results
        .filter(r => r.status === "fulfilled" && r.value?.registered)
        .map((r, i) => ({ ...r.value, jid: members[i] }))
        .map(u => ({ ...u, net: (u.money || 0) + (u.bank || 0) }))
        .sort((a, b) => b.net - a.net)
        .slice(0, 10);

      if (!users.length) {
        return reply("❌ No registered users in this group yet.\n\nUse *.register <name>* to join!");
      }

      const medals = ["🥇", "🥈", "🥉"];
      let text = `🏆 *GROUP LEADERBOARD*\n📍 ${meta.subject}\n\n`;

      users.forEach((u, i) => {
        const rank = medals[i] || `${i + 1}.`;
        const name = u.name || `User_${u.jid?.split("@")[0]?.slice(-4) || "???"}`;
        text += `${rank} *${name}*\n`;
        text += `   💰 $${u.net.toLocaleString()}  •  ⭐ Lv${u.level || 1}\n\n`;
      });

      return reply(text);
    } catch (err) {
      console.error("RICHG ERROR:", err);
      return reply("❌ Failed to load group leaderboard.");
    }
  },
};
