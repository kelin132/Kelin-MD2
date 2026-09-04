import { getUser, saveUser, requireRegistration, maybeAwardDiamonds } from "./database.js";
import { randomChoice } from "../../lib/gambling.mjs";
import { parseAmount } from "./parseAmount.js";
import { MAX_BET, maxBetMessage } from "./bettingLimits.js";
import { formatGamblingResult } from "../../lib/gamblingFormat.mjs";

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

function fmt(n) {
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

const deal = () => randomChoice(DECK);

export default {
  name: "blackjack",
  description: "Play blackjack — beat the dealer!",
  category: "economy",
  usage: ".blackjack <bet>",
  aliases: ["bj"],
  discordColor: "#F1C40F",
  discordTitle: "🃏 Blackjack",
  cooldown: 6,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid = msg.key.remoteJid;

    if (!args[0]) {
      const user = await getUser(sender);
      return sock.sendMessage(jid, {
        text:
`╭─❀「 🃏 *𝐁𝐋𝐀𝐂𝐊𝐉𝐀𝐂𝐊* 」❀─╮
│ 📖 *Usage*   :: *.blackjack <amount>*
│ 💰 *Min Bet* :: *$100*
│ 💰 *Max Bet* :: *$300B*
│
│ 🃏 *Rules:*
│   Get 21 or closer than dealer
│   Over 21 = BUST
│   Ace = 11 or 1
│
│ 💰 *Wallet*  :: *${fmt(user.money)}*
╰───────────────❀`
      }, { quoted: msg });
    }

    const user = await getUser(sender);
    const bet  = parseAmount(args[0].toLowerCase(), user.money);

    if (isNaN(bet) || bet < 100) {
      return sock.sendMessage(jid, {
        text:
`╭─❀「 🃏 *𝐁𝐋𝐀𝐂𝐊𝐉𝐀𝐂𝐊* 」❀─╮
│ ❌ *Result*  :: *INVALID BET 🔴*
│
│ 💰 *Min Bet* :: *$100*
│ 💰 *Max Bet* :: *$300B*
╰───────────────❀`
      }, { quoted: msg });
    }

    if (bet > MAX_BET) {
      return sock.sendMessage(jid, { text: maxBetMessage() }, { quoted: msg });
    }

    if (user.money < bet) {
      return sock.sendMessage(jid, {
        text:
`╭─❀「 🃏 *𝐁𝐋𝐀𝐂𝐊𝐉𝐀𝐂𝐊* 」❀─╮
│ ❌ *Result*  :: *NOT ENOUGH 🔴*
│
│ 💰 *Bet*     :: *${fmt(bet)}*
│ 💰 *Wallet*  :: *${fmt(user.money)}*
╰───────────────❀`
      }, { quoted: msg });
    }

    const player = [deal(), deal()];
    const dealer = [deal(), deal()];
    const pv     = handValue(player);
    const dv     = handValue(dealer);

    const startingMoney = user.money;
    let resultMsg  = "";
    let resultLine = "";
    let won        = false;

    if (pv > 21) {
      resultMsg  = "BUST 🔴";
      resultLine = "💀 *You went over 21! BUST!*";
      user.money -= bet;
    } else if (dv > 21) {
      resultMsg  = "WIN 🟢";
      resultLine = "✨ *Dealer BUSTED! YOU WIN!* おめでとう！";
      user.money += bet;
      won = true;
    } else if (pv > dv) {
      resultMsg  = "WIN 🟢";
      resultLine = "✨ *YOU WIN!* おめでとう！";
      user.money += bet;
      won = true;
    } else if (pv < dv) {
      resultMsg  = "LOSE 🔴";
      resultLine = "💀 *Dealer wins! 残念...*";
      user.money -= bet;
    } else {
      resultMsg  = "PUSH 🟡";
      resultLine = "🤝 *PUSH — It's a draw! Bet returned.*";
    }

    const diamondReward = maybeAwardDiamonds(user, pv === 21 ? 0.005 : 0.002, 1, 2);
    await saveUser(sender, user);

    await sock.sendMessage(jid, {
      text: formatGamblingResult({
        icon: "🃏",
        title: "Blackjack",
        won,
        push: resultMsg.startsWith("PUSH"),
        bet,
        got: `You ${player.join(" ")} (${pv}) │ Dealer ${dealer.join(" ")} (${dv})`,
        details: [resultLine.replace(/^\S+\s*/, "")],
        net: user.money - startingMoney,
        balance: user.money,
      }),
    }, { quoted: msg });
  }
};
