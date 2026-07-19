export default {
  name: "demote",
  description: "Demote an admin to regular member",
  category: "admin",
  usage: ".demote @user",
  aliases: [],
  cooldown: 3,
  isOwner: false,
  isAdmin: true,
  isPremium: false,
  version: "1.1.0",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return await sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups.",
      });
    }

    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    if (!mentioned.length) {
      return await sock.sendMessage(jid, {
        text: "❌ Please mention a user to demote.",
      });
    }

    try {
      await sock.groupParticipantsUpdate(jid, mentioned, "demote");

      await sock.sendMessage(jid, {
        text: "✅ User demoted from admin.",
      });

    } catch (err) {
      console.error(err);

      await sock.sendMessage(jid, {
        text: "❌ Failed to demote user. Make sure I am an admin and have permission.",
      });
    }
  },
};