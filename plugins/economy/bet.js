/**
 * KELIN MD — .bet
 * Gamble a chosen amount of cash. 55% win rate.
 * Usage: .bet <amount|all|half>
 */
import { getUser, saveUser, requireRegistration, addHistory, maybeAwardDiamonds, checkLevelUp } from "./database.js";
import { randomChoice, randomChance } from "../../lib/gambling.mjs";
import { parseAmount } from "./parseAmount.js";
import { getNewlyUnlockedRole, buildLevelUpMsg } from "../../lib/levelRoles.mjs";

const COOLDOWN = 30 * 1000;

const WIN_LINES  = ["あなたの運はいい！", "運命はあなたの味方だ！", "大勝利！", "ラッキー！やりました！", "完璧な読み！"];
const LOSE_LINES = ["残念！次は勝てる！", "惜しい！もう一度！", "ツキがなかった...", "また挑戦してね！", "負けても諦めないで！"];

/** Short money formatter */
function fmt(n) {
  if (n >= 1e12) return `$${(n/1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3)  return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export default {
  name: "bet",
  description: "Gamble your cash — 55% fair chance",
  category: "economy",
  usage: ".bet <amount | all | half>  ✦ shorthand OK: 10k / 5m / 1b",
  aliases: ["gamble2", "wager"],
  cooldown: 2,
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid  = msg.key.remoteJid;
    const user = await getUser(sender);
    const now  = Date.now();

    if (now - (user.lastBet || 0) < COOLDOWN) {
      const secs = Math.ceil((COOLDOWN - (now - user.lastBet)) / 1000);
      return sock.sendMessage(jid, {
        text: `⏳ Cooldown! You can bet again in *${secs}s*.`,
      }, { quoted: msg });
    }

    const raw = args[0]?.toLowerCase();
    if (!raw) {
      return sock.sendMessage(jid, {
        text:
`╭─❀「 🎲 *𝐁𝐄𝐓* 」❀─╮
│ Usage: *.bet <amount>*
│ Examples: .bet 500  /  .bet 10k  /  .bet 5m
│ *.bet all* — bet everything in wallet
│ *.bet half* — bet half your wallet
│
│ 💵 *Wallet* :: *${fmt(user.money)}*
│ 🎯 *Win Rate* :: *53,1%*
╰───────────────❀`,
      }, { quoted: msg });
    }

    let amount = parseAmount(raw, user.money);
    if (!amount || isNaN(amount) || amount <= 0)
      return sock.sendMessage(jid, { text: "❌ Enter a valid amount. Example: *.bet 500*" }, { quoted: msg });
    if (amount > user.money)
      return sock.sendMessage(jid, { text: `❌ You only have *${fmt(user.money)}* in your wallet.` }, { quoted: msg });
    if (amount < 10)
      return sock.sendMessage(jid, { text: "❌ Minimum bet is *$10*." }, { quoted: msg });

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
      await sock.sendMessage(jid, {
        text:
`╭─❀「 🎲 *𝐁𝐄𝐓* 」❀─╮
│ 🌙 *Result*  :: *WIN* 🟢
│ 🍃 *Flavour* :: _${flavour}_
│
│ 💴 *Wagered* :: *${fmt(amount)}*
│ 💰 *Reward*  :: *+${fmt(amount)}*
│ 💵 *Wallet*  :: *${fmt(user.money)}*${diamondReward ? `\n│ 💎 *Bonus*   :: *+${diamondReward} Gem${diamondReward === 1 ? "" : "s"}*` : ""}
│
│ ✨ *YOU WON!* おめでとう！🎉
╰───────────────❀`,
      }, { quoted: msg });

      if (leveled) {
        const newRole = getNewlyUnlockedRole(startLevel, newLevel);
        await sock.sendMessage(jid, { text: buildLevelUpMsg(tag, startLevel, newLevel, newRole) }, { quoted: msg });
      }
    } else {
      user.money = Math.max(0, user.money - amount);
      await saveUser(sender, user);
      await addHistory(sender, "bet", -amount, `Bet lost — wagered $${amount.toLocaleString()}`);

      await sock.sendMessage(jid, {
        text:
`╭─❀「 🎲 *𝐁𝐄𝐓* 」❀─╮
│ 🌙 *Result*  :: *LOSE* 🔴
│ 🍃 *Flavour* :: _${flavour}_
│
│ 💴 *Wagered* :: *${fmt(amount)}*
│ 📉 *Lost*    :: *-${fmt(amount)}*
│ 💵 *Wallet*  :: *${fmt(user.money)}*${diamondReward ? `\n│ 💎 *Bonus*   :: *+${diamondReward} Gem${diamondReward === 1 ? "" : "s"}*` : ""}
│
│ 💀 *Better luck next time!* 頑張れ！
╰───────────────❀`,
      }, { quoted: msg });
    }
  },
};
