export default {
  name: "translate",
  description: "Translate text using Google Translate API",
  category: "utilities",
  usage: ".translate <lang> <text>",
  aliases: ["tl", "tr"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, args }) {
    if (args.length < 2) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .translate <lang> <text>\nExample: .translate es Hello World" });
      return;
    }
    const lang = args[0];
    const text = args.slice(1).join(" ");
    await sock.sendMessage(msg.key.remoteJid, {
      text: `Translation to ${lang} for: "${text}" — configure Google Translate API to enable.`,
    });
  },
};
