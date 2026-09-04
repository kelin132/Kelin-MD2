import { randomChoice } from "../../lib/gambling.mjs";

export default {
  name: "flip",
  description: "Flip a coin",
  category: "utilities",
  usage: ".flip",
  aliases: ["coin"],
  cooldown: 2,

  async run({ sock, msg }) {
    const result = randomChoice(["🪙 *HEADS*", "🪙 *TAILS*"]);
    await sock.sendMessage(msg.key.remoteJid, {
      text: `🪙 *Coin Flip!*\n\nResult: ${result}`
    }, { quoted: msg });
  }
};
