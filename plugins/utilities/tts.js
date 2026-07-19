export default {
  name: "tts",
  description: "Repeat text back stylishly",
  category: "utilities",
  usage: ".tts <text>",
  aliases: ["say", "echo"],
  cooldown: 3,

  async run({ sock, msg, text }) {
    if (!text) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Usage: *.tts <your message>*"
      }, { quoted: msg });
    }
    await sock.sendMessage(msg.key.remoteJid, {
      text: `🗣️ ${text}`
    }, { quoted: msg });
  }
};
