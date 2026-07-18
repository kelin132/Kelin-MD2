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
  version: "1.0.0",
  async run({ sock, msg }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
    if (!mentioned.length) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Please mention a user to demote." });
      return;
    }
    try {
      await sock.groupParticipantsUpdate(msg.key.remoteJid, mentioned, "demote");
      await sock.sendMessage(msg.key.remoteJid, { text: "User demoted from admin." });
    } catch {
      await sock.sendMessage(msg.key.remoteJid, { text: "Failed to demote." });
    }
  },
};
