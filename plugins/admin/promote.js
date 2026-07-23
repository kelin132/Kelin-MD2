export default {
  name: "promote",
  description: "Promote a member to admin",
  category: "admin",
  usage: ".promote @user  |  reply to their message + .promote",
  aliases: [],
  cooldown: 3,
  isOwner: false,
  isAdmin: true,
  isPremium: false,
  version: "1.2.0",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return await sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups.",
      }, { quoted: msg });
    }

    // Support: @mention OR replying to their message
    const mentioned    = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const targets      = mentioned.length ? mentioned : quotedSender ? [quotedSender] : [];

    if (!targets.length) {
      return await sock.sendMessage(jid, {
        text: "❌ Mention a user or reply to their message to promote them.\nExample: *.promote @user*  or reply to a message and type *.promote*",
      }, { quoted: msg });
    }

    try {
      await sock.groupParticipantsUpdate(jid, targets, "promote");

      const nameList = targets.map(t => `@${t.split("@")[0]}`).join(", ");
      await sock.sendMessage(jid, {
        text: `✅ ${nameList} has been promoted to admin.`,
        mentions: targets,
      }, { quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, {
        text: "❌ Failed to promote. Make sure I'm an admin and have the required permissions.",
      }, { quoted: msg });
    }
  },
};
