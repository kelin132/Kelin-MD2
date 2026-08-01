import { getUser, saveUser, requireRegistration, maybeAwardDiamonds } from "./database.js";
import { randomChoice } from "../../lib/gambling.mjs";
import { parseAmount } from "./parseAmount.js";

const DECK = [
  ...Array(4).fill("A"), ...Array(4).fill("K"), ...Array(4).fill("Q"),
  ...Array(4).fill("J"), ...Array(4).fill("10"), ...Array(4).fill("9"),
  ...Array(4).fill("8"), ...Array(4).fill("7"), ...Array(4).fill("6"),
  ...Array(4).fill("5"), ...Array(4).fill("4"), ...Array(4).fill("3"),
  ...Array(4).fill("2")
];

function cardValue(card) {
  if (card === "A") return 11;
  if (["K","Q","J"].includes(card)) return 10;
  return parseInt(card);
}

function handValue(hand) {
  let value = hand.reduce((s, c) => s + cardValue(c), 0);
  let aces  = hand.filter(c => c === "A").length;
  while (value > 21 && aces-- > 0) value -= 10;
  return value;
}

const deal = () => randomChoice(DECK);

export default {
  name: "blackjack",
  description: "Play blackjack — beat the dealer!",
  category: "economy",
  usage: ".blackjack <bet>",
  aliases: ["bj"],
  cooldown: 6,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    if (!args[0]) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🎰 *Blackjack*\n\nUsage: *.blackjack <amount>*  — e.g. .blackjack 10k\nMin bet: $100\n✦ Shorthand: k = thousand | m = million | b = billion\n\nRules: Get 21 or closer than dealer. Over 21 = bust.`
      }, { quoted: msg });
    }

    const user = await getUser(sender);
    const bet  = parseAmount(args[0].toLowerCase(), user.money);

    if (isNaN(bet) || bet < 100) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Minimum bet is $100." }, { quoted: msg });
    }

    if (user.money < bet) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ *Not enough money!*\n\nBet: $${bet.toLocaleString()}\nBalance: $${user.money.toLocaleString()}`
      }, { quoted: msg });
    }

    const player = [deal(), deal()];
    const dealer = [deal(), deal()];
    const pv     = handValue(player);
    const dv     = handValue(dealer);

    let result = "";
    if (pv > 21)      { result = "❌ *BUST!* You went over 21!"; user.money -= bet; }
    else if (dv > 21) { result = "✅ *Dealer BUSTED!* You WIN!"; user.money += bet; }
    else if (pv > dv) { result = "✅ *You WIN!*";               user.money += bet; }
    else if (pv < dv) { result = "❌ *Dealer wins!*";            user.money -= bet; }
    else              { result = "🤝 *PUSH!* It's a draw!"; }

    const diamondReward = maybeAwardDiamonds(user, pv === 21 ? 0.005 : 0.002, 1, 2);
    await saveUser(sender, user);
    await sock.sendMessage(msg.key.remoteJid, {
      text: `🎰 *BLACKJACK*\n\n🃏 Your hand : ${player.join(", ")} = ${pv}\n🎴 Dealer   : ${dealer.join(", ")} = ${dv}\n\n${result}\n\n💵 Bet     : $${bet.toLocaleString()}\n💰 Balance : $${user.money.toLocaleString()}${diamondReward ? `\n💎 Rare find: +${diamondReward} Diamond${diamondReward === 1 ? "" : "s"}` : ""}`
    }, { quoted: msg });
  }
};
