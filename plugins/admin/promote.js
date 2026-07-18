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
  version: "1.0.0",
  async run({ sock, msg }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
    if (!mentioned.length) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Please mention a user to promote." });
      return;
    }
    try {
      await sock.groupParticipantsUpdate(msg.key.remoteJid, mentioned, "promote");
      await sock.sendMessage(msg.key.remoteJid, { text: "User promoted to admin." });
    } catch {
      await sock.sendMessage(msg.key.remoteJid, { text: "Failed to promote." });
    }
  },
};
