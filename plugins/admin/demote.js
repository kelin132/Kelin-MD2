export default {
  name: "demote",
  description: "Demote an admin to regular member",
  category: "admin",
  usage: ".demote @user  |  reply to their message + .demote",
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
        text: "❌ Mention a user or reply to their message to demote them.\nExample: *.demote @user*  or reply to a message and type *.demote*",
      }, { quoted: msg });
    }

    try {
      await sock.groupParticipantsUpdate(jid, targets, "demote");

      const nameList = targets.map(t => `@${t.split("@")[0]}`).join(", ");
      await sock.sendMessage(jid, {
        text: `✅ ${nameList} has been demoted from admin.`,
        mentions: targets,
      }, { quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, {
        text: "❌ Failed to demote. Make sure I'm an admin and have the required permissions.",
      }, { quoted: msg });
    }
  },
};
