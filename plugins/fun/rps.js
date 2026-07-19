const choices = ["rock", "paper", "scissors"];
const emoji   = { rock: "🪨", paper: "📄", scissors: "✂️" };
const beats   = { rock: "scissors", paper: "rock", scissors: "paper" };

export default {
  name: "rps",
  description: "Play Rock Paper Scissors against the bot",
  category: "fun",
  usage: ".rps <rock|paper|scissors>",
  aliases: ["rockpaperscissors"],
  cooldown: 3,

  async run({ sock, msg, args }) {
    const player = args[0]?.toLowerCase();

    if (!choices.includes(player)) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Choose: *.rps rock*, *.rps paper*, or *.rps scissors*"
      }, { quoted: msg });
    }

    const bot    = choices[Math.floor(Math.random() * 3)];
    let outcome  = "";

    if (player === bot)         outcome = "🤝 *It's a TIE!*";
    else if (beats[player] === bot) outcome = "🎉 *You WIN!*";
    else                        outcome = "😔 *You LOSE!*";

    await sock.sendMessage(msg.key.remoteJid, {
      text: `✊ *Rock Paper Scissors*\n\n${emoji[player]} You  : ${player}\n${emoji[bot]} Bot  : ${bot}\n\n${outcome}`
    }, { quoted: msg });
  }
};
