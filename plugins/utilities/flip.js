export default {
  name: "flip",
  description: "Flip a coin",
  category: "utilities",
  usage: ".flip",
  aliases: ["coin", "coinflip"],
  cooldown: 2,

  async run({ sock, msg }) {
    const result = Math.random() < 0.5 ? "🪙 *HEADS*" : "🪙 *TAILS*";
    await sock.sendMessage(msg.key.remoteJid, {
      text: `🪙 *Coin Flip!*\n\nResult: ${result}`
    }, { quoted: msg });
  }
};
