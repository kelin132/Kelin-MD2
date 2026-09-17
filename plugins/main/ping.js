export default {
  name: "ping",
  description: "Check if the bot is responsive",
  category: "main",
  usage: ".ping",
  // Keep `.p` reserved for the economy profile shortcut.
  aliases: [],
  cooldown: 3,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg }) {
    // A send followed by an edit required two WhatsApp round trips. Reply
    // once so the command cannot add a second network wait by design.
    await sock.sendMessage(msg.key.remoteJid, {
      text: "🏓 Pong! Connection is online.",
    });
  },
};
