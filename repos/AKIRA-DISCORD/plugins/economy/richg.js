import { getUser } from "./database.js";
import { formatAnimeLeaderboard } from "../../lib/animeLeaderboard.mjs";

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

      const text = formatAnimeLeaderboard({
        subtitle: `GROUP WEALTH · ${meta.subject}`,
        rows: users.map((u) => ({ name: u.name || `User_${u.jid?.split("@")[0]?.slice(-4) || "???"}`, value: u.net })),
        valueIcon: "💰",
        valueLabel: "𝐖𝐄𝐀𝐋𝐓𝐇",
        footer: "🌸 𝐆𝐑𝐎𝐔𝐏 𝐋𝐄𝐆𝐄𝐍𝐃𝐒",
      });
      return reply(text);
    } catch (err) {
      console.error("RICHG ERROR:", err);
      return reply("❌ Failed to load group leaderboard.");
    }
  },
};
