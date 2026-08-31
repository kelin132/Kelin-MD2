export default {
  name: "inactive",
  aliases: ["lurkers", "silent"],
  description: "Show the group's inactive member summary",
  category: "group",
  usage: ".inactive",
  cooldown: 10,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    if (!jid?.endsWith("@g.us")) {
      return sock.sendMessage(jid, { text: "👥 This command can only be used in groups." }, { quoted: msg });
    }

    try {
      const meta = await sock.groupMetadata(jid);
      const participants = meta.participants || [];
      const admins = participants.filter((participant) => participant.admin).length;
      return sock.sendMessage(jid, {
        text:
`👻 *Inactive Members Notice*

📊 This group has *${participants.length}* total members
👑 Admins: *${admins}*
👤 Regular Members: *${participants.length - admins}*

📢 If you've been lurking, now is a great time to say hi! 👋

_Inactive member removal is at admin discretion._`,
      }, { quoted: msg });
    } catch (err) {
      console.error("[inactive]", err.message);
      return sock.sendMessage(jid, { text: "❌ Failed to fetch member data." }, { quoted: msg });
    }
  },
};
