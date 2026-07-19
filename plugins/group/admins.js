/**
 * KELIN MD — .admins
 * Tag all group admins.
 */
export default {
  name: "admins",
  description: "Mention all group admins",
  category: "group",
  usage: ".admins",
  aliases: ["tagadmins"],
  cooldown: 10,
  isAdmin: false,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups.",
      }, { quoted: msg });
    }

    let meta;
    try {
      meta = await sock.groupMetadata(jid);
    } catch {
      return sock.sendMessage(jid, {
        text: "❌ Could not fetch group info.",
      }, { quoted: msg });
    }

    const admins = meta.participants.filter(p => p.admin).map(p => p.id);

    if (!admins.length) {
      return sock.sendMessage(jid, {
        text: "❌ No admins found in this group.",
      }, { quoted: msg });
    }

    const tags   = admins.map(a => `@${a.split("@")[0]}`).join("\n");
    const labels = admins.map(a => {
      const isSuper = meta.participants.find(p => p.id === a)?.admin === "superadmin";
      return `${isSuper ? "👑" : "🛡️"} @${a.split("@")[0]}`;
    }).join("\n");

    return sock.sendMessage(jid, {
      text:
`👮 *Group Admins* (${admins.length})

${labels}`,
      mentions: admins,
    }, { quoted: msg });
  },
};
