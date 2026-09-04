export default {
  name: "roll",
  description: "Roll a dice (default: d6, or specify sides)",
  category: "utilities",
  usage: ".roll [sides]",
  aliases: ["dice", "d6"],
  cooldown: 2,

  async run({ sock, msg, args }) {
    const sides  = parseInt(args[0]) || 6;

    if (sides < 2 || sides > 100) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Dice must have between 2 and 100 sides."
      }, { quoted: msg });
    }

    const result = Math.floor(Math.random() * sides) + 1;

    await sock.sendMessage(msg.key.remoteJid, {
      text: `🎲 *Dice Roll (d${sides})*\n\nResult: *${result}*`
    }, { quoted: msg });
  }
};
