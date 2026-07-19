import { getUser, saveUser, requireRegistration } from "../economy/database.js";

export default {
  name: "dicegame",
  description: "Roll dice against the bot — highest roll wins",
  category: "games",
  usage: ".dicegame <bet>",
  aliases: ["dicebet", "rollbet"],
  cooldown: 5,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const bet  = parseInt(args[0]);
    const user = await getUser(sender);

    if (!bet || bet < 50) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "🎲 *Dice Game*\n\nUsage: *.dicegame <bet>*\nMin bet: $50\nHighest roll wins!"
      }, { quoted: msg });
    }

    if (user.money < bet) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Not enough money!\n💵 Balance: $${user.money.toLocaleString()}`
      }, { quoted: msg });
    }

    const playerRoll = Math.floor(Math.random() * 6) + 1;
    const botRoll    = Math.floor(Math.random() * 6) + 1;
    const diceMap    = ["⚀","⚁","⚂","⚃","⚄","⚅"];

    let result = "";
    if (playerRoll > botRoll)      { user.money += bet; result = "✅ *YOU WIN!*"; }
    else if (playerRoll < botRoll) { user.money -= bet; result = "❌ *Bot wins!*"; }
    else                           { result = "🤝 *TIE! No money lost.*"; }

    await saveUser(sender, user);

    await sock.sendMessage(msg.key.remoteJid, {
      text:
`🎲 *DICE GAME*

👤 Your roll : ${diceMap[playerRoll-1]} (${playerRoll})
🤖 Bot roll  : ${diceMap[botRoll-1]} (${botRoll})

${result}

💰 Bet    : $${bet.toLocaleString()}
💵 Balance: $${user.money.toLocaleString()}`
    }, { quoted: msg });
  }
};
