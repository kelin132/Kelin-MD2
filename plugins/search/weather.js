export default {
  name: "weather",
  description: "Get current weather for a city",
  category: "search",
  usage: ".weather <city>",
  aliases: ["w", "cuaca"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, text }) {
    if (!text) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .weather <city name>" });
      return;
    }
    await sock.sendMessage(msg.key.remoteJid, {
      text: `Weather for "${text}" — configure a Weather API key in Settings to enable this command.`,
    });
  },
};
