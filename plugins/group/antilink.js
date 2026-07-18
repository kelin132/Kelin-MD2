export default {
  name: "antilink",
  description: "Toggle anti-link protection in the group",
  category: "group",
  usage: ".antilink <on|off>",
  aliases: [],
  cooldown: 5,
  isOwner: false,
  isAdmin: true,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, args }) {
    const toggle = args[0]?.toLowerCase();
    if (!["on", "off"].includes(toggle)) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .antilink on|off" });
      return;
    }
    await sock.sendMessage(msg.key.remoteJid, {
      text: `Anti-link protection turned *${toggle}*.`,
    });
  },
};
