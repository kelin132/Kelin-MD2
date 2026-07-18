export default {
  name: "welcome",
  description: "Toggle welcome messages for new members",
  category: "group",
  usage: ".welcome <on|off>",
  aliases: ["setwelcome"],
  cooldown: 5,
  isOwner: false,
  isAdmin: true,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, args }) {
    const toggle = args[0]?.toLowerCase();
    if (!["on", "off"].includes(toggle)) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .welcome on|off" });
      return;
    }
    await sock.sendMessage(msg.key.remoteJid, {
      text: `Welcome messages turned *${toggle}* for this group.`,
    });
  },
};
