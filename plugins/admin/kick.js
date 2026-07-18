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
  version: "1.0.0",
  async run({ sock, msg }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
    if (!mentioned.length) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Please mention a user to kick." });
      return;
    }
    try {
      await sock.groupParticipantsUpdate(msg.key.remoteJid, mentioned, "remove");
      await sock.sendMessage(msg.key.remoteJid, { text: "User kicked successfully." });
    } catch {
      await sock.sendMessage(msg.key.remoteJid, { text: "Failed to kick. Make sure I am an admin." });
    }
  },
};
