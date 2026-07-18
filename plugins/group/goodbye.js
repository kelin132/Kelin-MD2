export default {
  name: "goodbye",
  description: "Toggle goodbye messages for leaving members",
  category: "group",
  usage: ".goodbye <on|off>",
  aliases: ["setgoodbye"],
  cooldown: 5,
  isOwner: false,
  isAdmin: true,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, args }) {
    const toggle = args[0]?.toLowerCase();
    if (!["on", "off"].includes(toggle)) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .goodbye on|off" });
      return;
    }
    await sock.sendMessage(msg.key.remoteJid, {
      text: `Goodbye messages turned *${toggle}* for this group.`,
    });
  },
};
