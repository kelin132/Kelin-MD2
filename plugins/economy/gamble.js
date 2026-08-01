import { getUser, saveUser, requireRegistration, addHistory, maybeAwardDiamonds, checkLevelUp } from "./database.js";
import { randomChoice, randomChance } from "../../lib/gambling.mjs";
import { parseAmount } from "./parseAmount.js";
import { getNewlyUnlockedRole, buildLevelUpMsg } from "../../lib/levelRoles.mjs";

const COOLDOWN = 5 * 60 * 1000;
const MAX_BET  = 10_000;

function fmt(n) {
  if (n >= 1e12) return `$${(n/1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3)  return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export default {
  name: "gamble",
  aliases: ["bet2", "gbl"],
  category: "economy",
  cooldown: 6,
  description: "Gamble your cash — 55% chance to double it (5 min cooldown, max $10k)",
  usage: ".gamble <amount|all|half>",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const now   = Date.now();
    const user  = await getUser(sender);

    if (now - (user.lastGamble || 0) < COOLDOWN) {
      const rem  = COOLDOWN - (now - user.lastGamble);
      const mins = Math.floor(rem / 60000);
      const secs = Math.floor((rem % 60000) / 1000);
      return reply(
`╭─❀「 🎰 *𝐆𝐀𝐌𝐁𝐋𝐄* 」❀─╮
│ ⏳ *Cooldown!*
│ Try again in *${mins}m ${secs}s*.
╰───────────────❀`
      );
    }

    if (!args[0]) return reply(
`╭─❀「 🎰 *𝐆𝐀𝐌𝐁𝐋𝐄* 」❀─╮
│ Usage: *.gamble <amount|all|half>*
│ Max bet: *$10,000*
│ Win rate: *55%*  │  Reward: *×2*
│
│ 💵 *Wallet* :: *${fmt(user.money)}*
╰───────────────❀`
    );

    const input  = args[0].toLowerCase();
    let   amount = parseAmount(input, user.money);

    if (isNaN(amount) || amount <= 0) return reply("❌ Enter a valid amount.");
    if (amount > MAX_BET)             amount = MAX_BET;
    if (amount > user.money)          return reply(`❌ You only have *${fmt(user.money)}* in your wallet.`);
    if (amount < 10)                  return reply("❌ Minimum bet is $10.");

    user.lastGamble = now;

    const won = randomChance(0.55);
    const diamondReward = maybeAwardDiamonds(user, won ? 0.003 : 0.001, 1, 2);

    const FACES = ["🎰 🍒 🍋 💎", "🎰 💎 💎 🍒", "🎰 🍀 🍋 🍋",
                   "🎰 🎯 🎯 💥", "🎰 💀 🍒 🍀", "🎰 7️⃣  7️⃣  🍋"];
    const spin  = randomChoice(FACES);
    const tag   = user.name || sender.split("@")[0].split(":")[0];

    if (won) {
      user.money = (user.money || 0) + amount;
      user.xp    = (user.xp || 0) + 12;

      const { leveled, startLevel, newLevel } = checkLevelUp(user);
      await saveUser(sender, user);
      await addHistory(sender, "slots", amount, `Gamble win +$${amount.toLocaleString()}`);

      await reply(
`╭─❀「 🎰 *𝐆𝐀𝐌𝐁𝐋𝐄* 」❀─╮
│ 🎲 *Spin*    :: ${spin}
│
│ 💴 *Bet*     :: *${fmt(amount)}*
│ 💰 *Won*     :: *+${fmt(amount)}*
│ 💵 *Balance* :: *${fmt(user.money)}*${diamondReward ? `\n│ 💎 *Bonus*   :: *+${diamondReward} Gem${diamondReward === 1 ? "" : "s"}*` : ""}
│
│ ✨ *YOU WON!* おめでとう！🎉
╰───────────────❀`
      );

      if (leveled) {
        const newRole = getNewlyUnlockedRole(startLevel, newLevel);
        await sock.sendMessage(jid, { text: buildLevelUpMsg(tag, startLevel, newLevel, newRole) }, { quoted: msg });
      }
    } else {
      user.money = Math.max(0, (user.money || 0) - amount);
      await saveUser(sender, user);
      await addHistory(sender, "slots", -amount, `Gamble loss -$${amount.toLocaleString()}`);

      await reply(
`╭─❀「 🎰 *𝐆𝐀𝐌𝐁𝐋𝐄* 」❀─╮
│ 🎲 *Spin*    :: ${spin}
│
│ 💴 *Bet*     :: *${fmt(amount)}*
│ 💸 *Lost*    :: *-${fmt(amount)}*
│ 💵 *Balance* :: *${fmt(user.money)}*${diamondReward ? `\n│ 💎 *Bonus*   :: *+${diamondReward} Gem${diamondReward === 1 ? "" : "s"}*` : ""}
│
│ 💀 *YOU LOST!* 残念... 頑張れ！
╰───────────────❀`
      );
    }
  },
};
