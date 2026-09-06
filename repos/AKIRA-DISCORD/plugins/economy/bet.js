/**
 * KELIN MD — .bet
 * Gamble a chosen amount of cash. 55% win rate.
 * Usage: .bet <amount|all|half>
 */
import { getUser, saveUser, requireRegistration, addHistory, maybeAwardDiamonds, checkLevelUp } from "./database.js";
import { randomChoice, randomChance } from "../../lib/gambling.mjs";
import { parseAmount } from "./parseAmount.js";
import { MAX_BET, maxBetMessage } from "./bettingLimits.js";
import { getNewlyUnlockedRole, buildLevelUpMsg } from "../../lib/levelRoles.mjs";
import { formatGamblingResult } from "../../lib/gamblingFormat.mjs";
import { flattenEconomyText, sendEconomyReply } from "../../lib/discordEconomyReply.mjs";
import { compactMoney } from "../../lib/compactMoney.mjs";

const COOLDOWN = 30 * 1000;

const WIN_LINES  = [
  "Luck is on your side!",
  "Fortune favors the bold!",
  "Huge victory!",
  "Jackpot! You nailed it!",
  "A perfect call!"
];

const LOSE_LINES = [
  "Bummer! You'll get it next time!",
  "So close! Try again!",
  "Luck wasn't with you...",
  "Give it another shot!",
  "Don't give up after a loss!"
];

/** Short money formatter */
function fmt(n) {
  return compactMoney(n);
}

export default {
  name: "bet",
  description: "Gamble your cash — 55% fair chance",
  category: "economy",
  usage: ".bet <amount | all | half>  ✦ shorthand OK: 10k / 5m / 1b",
  aliases: ["gamble2", "wager"],
  cooldown: 2,
  checkJail: true,

  async run({ sock, msg, sender, args, discord }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid  = msg.key.remoteJid;
    const user = await getUser(sender);
    const now  = Date.now();
    const sendText = (text, options = {}) => sendEconomyReply({
      sock,
      jid,
      msg,
      discord,
      text,
      title: options.title || "🎲 Bet",
      color: options.color || "#FFD166",
      fields: options.fields || [],
      simpleText: options.simpleText
        ?? `🎲 bet: ${flattenEconomyText(text)}`,
      mentions: [sender],
    });
    const sendResult = ({ won, flavour, amount, net, balance, diamondReward }) => {
      if (discord?.message) {
        return sock.sendMessage(jid, {
          text: [
            `🎲 bet: ${won ? "🎉 Won" : "😢 Lost"} ${fmt(amount)}.`,
            `${flavour}.`,
            `Net: ${net >= 0 ? "+" : "-"}${fmt(Math.abs(net))}.`,
            `Wallet: ${fmt(balance)}.`,
            ...(diamondReward ? [`Gem bonus: +${diamondReward}.`] : []),
          ].join(" "),
          mentions: [sender],
        }, { quoted: msg });
      }
      return sock.sendMessage(jid, {
        text: formatGamblingResult({
          icon: "🎲",
          title: "Bet",
          won,
          bet: amount,
          got: flavour,
          details: [diamondReward ? `💎 Bonus: +\`${diamondReward}\` Gem${diamondReward === 1 ? "" : "s"}` : ""],
          net,
          balance,
        }),
      }, { quoted: msg });
    };

    if (now - (user.lastBet || 0) < COOLDOWN) {
      const secs = Math.ceil((COOLDOWN - (now - user.lastBet)) / 1000);
      return sendText(`⏳ Cooldown! You can bet again in \`${secs}s\`.`, {
        title: "⏳ Bet Cooldown",
        color: "#E67E22",
        fields: [{ name: "Next bet", value: `${secs}s`, inline: true }],
      });
    }

    const raw = args[0]?.toLowerCase();
    if (!raw) {
      return sendText(
`╭─❀「 🎲 *𝐁𝐄𝐓* 」❀─╮
│ Usage: \`.bet <amount>\`
│ Examples: \`.bet 500\`  /  \`.bet 10k\`  /  \`.bet 1b\`
│ Maximum: \`$300B\`
│ \`.bet all\` — bet everything in wallet
│ \`.bet half\` — bet half your wallet
│
│ 💰 *Wallet* :: \`${fmt(user.money)}\`
│ 💰 *Max Bet* :: \`$300B\`
│ 🎯 *Win Rate* :: \`53.1%\`
╰───────────────❀`,
        {
          fields: [
            { name: "Wallet", value: fmt(user.money), inline: true },
            { name: "Maximum", value: "$300B", inline: true },
            { name: "Win rate", value: "53.1%", inline: true },
          ],
        },
      );
    }

    let amount = parseAmount(raw, user.money);
    if (!amount || isNaN(amount) || amount <= 0)
      return sendText("❌ Enter a valid amount. Example: `.bet 500`", {
        title: "❌ Invalid Bet",
        color: "#E74C3C",
      });
    if (amount > MAX_BET)
      return sendText(maxBetMessage(), {
        title: "❌ Bet Limit",
        color: "#E74C3C",
      });
    if (amount > user.money)
      return sendText(`❌ You only have \`${fmt(user.money)}\` in your wallet.`, {
        title: "❌ Insufficient Wallet",
        color: "#E74C3C",
        fields: [{ name: "Wallet", value: fmt(user.money), inline: true }],
      });
    if (amount < 10)
      return sendText("❌ Minimum bet is `$10`.", {
        title: "❌ Bet Too Small",
        color: "#E74C3C",
      });

    const won          = randomChance(0.53,1);
    const diamondReward = maybeAwardDiamonds(user, won ? 0.003 : 0.001, 1, 2);
    const flavour      = randomChoice(won ? WIN_LINES : LOSE_LINES);

    user.lastBet = now;

    if (won) {
      user.money += amount;
      user.xp     = (user.xp || 0) + 15;

      const { leveled, startLevel, newLevel } = checkLevelUp(user);
      await saveUser(sender, user);
      await addHistory(sender, "bet", +amount, `Bet won — wagered $${amount.toLocaleString()}`);

      const tag = user.name || sender.split("@")[0].split(":")[0];
      await sendResult({
        won: true,
        flavour,
        amount,
        net: amount,
        balance: user.money,
        diamondReward,
      });

      if (leveled) {
        const newRole = getNewlyUnlockedRole(startLevel, newLevel);
        await sock.sendMessage(jid, { text: buildLevelUpMsg(tag, startLevel, newLevel, newRole) }, { quoted: msg });
      }
    } else {
      user.money = Math.max(0, user.money - amount);
      await saveUser(sender, user);
      await addHistory(sender, "bet", -amount, `Bet lost — wagered $${amount.toLocaleString()}`);

      await sendResult({
        won: false,
        flavour,
        amount,
        net: -amount,
        balance: user.money,
        diamondReward,
      });
    }
  },
};
