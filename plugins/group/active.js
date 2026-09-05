import { groupSettings } from "../../lib/groupSettings.js";

export default {
  name: "active",
  aliases: ["topchatters", "chatters"],
  description: "Rank recorded group chat activity",
  category: "group",
  usage: ".active",
  cooldown: 10,
  isAdmin: true,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    if (!jid?.endsWith("@g.us")) {
      return sock.sendMessage(jid, { text: "👥 This command can only be used in groups." }, { quoted: msg });
    }

    const counts = groupSettings.get(jid).activityCounts || {};
    const rows = Object.entries(counts)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 10);

    if (!rows.length) {
      return sock.sendMessage(jid, {
        text: "📈 No group activity samples have been recorded yet. Use the bot normally and check again later.",
      }, { quoted: msg });
    }

    const mentions = rows.map(([member]) => member);
    const text = `🏆 *Top chatters*\n\n${rows
      .map(([member, count], index) => `${index + 1}. @${member.split("@")[0]} — ${count} messages`)
      .join("\n")}`;

    return sock.sendMessage(jid, { text, mentions }, { quoted: msg });
  },
};
