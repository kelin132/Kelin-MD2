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
    const start = Date.now();
    
    // Send initial message
    const sentMsg = await sock.sendMessage(msg.key.remoteJid, { text: "Pinging..." });
    
    // Calculate response latency
    const ping = Date.now() - start;

    // Edit the previous message to show the formatted result
    await sock.sendMessage(msg.key.remoteJid, {
      text: `❀ \`${ping}ms\``,
      edit: sentMsg.key,
    });
  },
};
