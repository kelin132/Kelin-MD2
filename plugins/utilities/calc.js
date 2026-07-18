export default {
  name: "calc",
  description: "Calculate a math expression",
  category: "utilities",
  usage: ".calc <expression>",
  aliases: ["calculate", "math"],
  cooldown: 3,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, text }) {
    if (!text) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .calc <expression>" });
      return;
    }
    try {
      // Safe math eval — only allow numbers and operators
      if (!/^[\d\s\+\-\*\/\.\(\)\^%]+$/.test(text)) {
        await sock.sendMessage(msg.key.remoteJid, { text: "Invalid expression. Only math operators allowed." });
        return;
      }
      // eslint-disable-next-line no-eval
      const result = eval(text);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `🧮 ${text} = *${result}*`,
      });
    } catch {
      await sock.sendMessage(msg.key.remoteJid, { text: "Invalid math expression." });
    }
  },
};
