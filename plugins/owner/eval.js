export default {
  name: "eval",
  description: "Evaluate JavaScript code (owner only)",
  category: "owner",
  usage: ".eval <code>",
  aliases: ["exec", "js"],
  cooldown: 3,
  isOwner: true,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, text }) {
    if (!text) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .eval <code>" });
      return;
    }
    try {
      // eslint-disable-next-line no-eval
      const result = await eval(text);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `Result:\n${JSON.stringify(result, null, 2)}`,
      });
    } catch (err) {
      await sock.sendMessage(msg.key.remoteJid, { text: `Error: ${String(err)}` });
    }
  },
};
