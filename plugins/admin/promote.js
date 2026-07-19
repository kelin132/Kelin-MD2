export default {
  name: "promote",
  description: "Promote a member to admin",
  category: "admin",
  usage: ".promote @user",
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
        text: "Please mention a user to promote.",
      });
    }

    try {
      await sock.groupParticipantsUpdate(jid, mentioned, "promote");

      await sock.sendMessage(jid, {
        text: "✅ User promoted to admin.",
      });
    } catch (err) {
      console.error(err);

      await sock.sendMessage(jid, {
        text: "❌ Failed to promote the user. Make sure I'm an admin and the user isn't already an admin.",
      });
    }
  },
};