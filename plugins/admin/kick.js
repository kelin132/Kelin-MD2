export default {
  name: "kick",
  description: "Kick a member from the group",
  category: "admin",
  usage: ".kick @user",
  aliases: ["remove"],
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
        text: "Please mention a user to kick.",
      });
    }

    try {
      await sock.groupParticipantsUpdate(jid, mentioned, "remove");

      await sock.sendMessage(jid, {
        text: "✅ User kicked successfully.",
      });
    } catch (err) {
      console.error(err);

      await sock.sendMessage(jid, {
        text: "❌ Failed to kick the user. Make sure I'm an admin and the target isn't an admin.",
      });
    }
  },
};