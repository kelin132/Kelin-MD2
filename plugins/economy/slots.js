/**
 * KELIN MD — .slots
 * Spin the slot machine — match symbols to win big!
 * Usage: .slots <amount>
 */
import { getUser, saveUser, requireRegistration, addHistory, maybeAwardDiamonds, checkLevelUp } from "./database.js";
import { randomChoice } from "../../lib/gambling.mjs";
import { parseAmount } from "./parseAmount.js";
import { getNewlyUnlockedRole, buildLevelUpMsg } from "../../lib/levelRoles.mjs";
import { generateSlotsImage } from "../../lib/economyCanvas.mjs";

const COOLDOWN = 15 * 1000;

const SYMBOL_POOL = [
  ...Array(6).fill("🍒"), ...Array(5).fill("🍋"), ...Array(5).fill("🍊"),
  ...Array(4).fill("🍇"), ...Array(3).fill("🔔"), ...Array(2).fill("💎"),
  ...Array(1).fill("7️⃣"), ...Array(2).fill("🃏"),
];
const PAYOUTS = { "7️⃣": 10, "💎": 7, "🔔": 5, "🍇": 4, "🍊": 3, "🍋": 2.5, "🍒": 2, "🃏": 1.5 };

function spin() { return [0, 0, 0].map(() => randomChoice(SYMBOL_POOL)); }

function fmt(n) {
  if (n >= 1e12) return `$${(n/1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3)  return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export default {
  name: "slots",
  aliases: ["slot", "slotmachine"],
  category: "economy",
  cooldown: 6,
  description: "Spin the slot machine — match 3 symbols to win!",
  usage: ".slots <amount>",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const now   = Date.now();
    const user  = await getUser(sender);

    if (now - (user.lastSlots || 0) < COOLDOWN) {
      const secs = Math.ceil((COOLDOWN - (now - user.lastSlots)) / 1000);
      return reply(
`╭─❀「 🎰 *𝐒𝐋𝐎𝐓𝐒* 」❀─╮
│ ⏳ *Result* :: *COOLDOWN 🔴*
│ 🕐 *Wait*   :: *${secs}s remaining*
╰───────────────❀`
      );
    }

    const raw = (args[0] || "").toLowerCase();
    if (!raw) {
      return reply(
`╭─❀「 🎰 *𝐒𝐋𝐎𝐓𝐒* 」❀─╮
│ 📖 *Usage*    :: *.slots <amount>*
│ 💴 *Min Bet*  :: *$50*
│ 💴 *Max Bet*  :: *$50,000*
│
│ 💎 *Payouts* (match 3):
│   7️⃣ ×10  💎 ×7  🔔 ×5  🍇 ×4
│   🍊 ×3  🍋 ×2.5  🍒 ×2  🃏 ×1.5
│   Two matching → ×0.5 (partial win)
│
│ 💵 *Wallet*  :: *${fmt(user.money)}*
╰───────────────❀`
      );
    }

    let amount = parseAmount(raw, user.money);
    if (!amount || isNaN(amount) || amount < 50) return reply("❌ Minimum bet is *$50*.");
    if (amount > 50000)  return reply("❌ Maximum bet is *$50,000*.");
    if (amount > user.money) return reply(`❌ You only have *${fmt(user.money)}*.`);

    user.lastSlots = now;
    const reels    = spin();
    const [a, b, c] = reels;

    let winnings = 0, resultMsg = "", resultLine = "";

    if (a === b && b === c) {
      const mult = PAYOUTS[a] || 2;
      winnings   = Math.floor(amount * mult);
      resultMsg  = `JACKPOT! ×${mult}`;
      resultLine = `│ ✨ *JACKPOT!* Three ${a}s! おめでとう！🎉`;
    } else if (a === b || b === c || a === c) {
      winnings   = Math.floor(amount * 0.5);
      resultMsg  = "Partial Win ×0.5";
      resultLine = `│ 🌸 *Partial Win!* Two matching 🎊`;
    } else {
      winnings   = 0;
      resultMsg  = "No Match";
      resultLine = `│ 💀 *Better luck next time!* 頑張れ！`;
    }

    const net = winnings - amount;
    user.money = Math.max(0, user.money + net);
    user.xp    = (user.xp || 0) + 5;
    const diamondReward = maybeAwardDiamonds(user, winnings >= amount * 2 ? 0.005 : 0.001, 1, 2);

    const { leveled, startLevel, newLevel } = checkLevelUp(user);
    await saveUser(sender, user);
    await addHistory(sender, "slots", net, `Slots: bet $${amount.toLocaleString()}`);

    const tag = user.name || sender.split("@")[0].split(":")[0];

    const won    = winnings > 0;
    const jackpot = resultMsg.toLowerCase().startsWith("jackpot");

    const caption =
`╭─❀「 🎰 *𝐒𝐋𝐎𝐓𝐒* 」❀─╮
│ 🌙 *Result*  :: *${resultMsg} ${jackpot ? "🟡" : won ? "🟢" : "🔴"}*
│
│   ╔══${a}══${b}══${c}══╗
│   ╚═══════════╝
│
│ 💴 *Wagered* :: *${fmt(amount)}*
│ ${won ? `💰 *Won*     :: *+${fmt(winnings)}*` : `📉 *Lost*    :: *-${fmt(amount)}*`}
│ 💵 *Wallet*  :: *${fmt(user.money)}*${diamondReward ? `\n│ 💎 *Bonus*   :: *+${diamondReward} Gem${diamondReward === 1 ? "" : "s"}*` : ""}
│
${resultLine}
╰───────────────❀`;

    try {
      const imgBuffer = await generateSlotsImage({
        reels:         [a, b, c],
        resultMsg,
        bet:           amount,
        winnings,
        balance:       user.money,
        diamondReward: diamondReward || 0,
        leveled,
        level:         newLevel,
      });
      await sock.sendMessage(jid, { image: imgBuffer, caption }, { quoted: msg });
    } catch {
      await reply(caption);
    }

    if (leveled) {
      const newRole = getNewlyUnlockedRole(startLevel, newLevel);
      await sock.sendMessage(jid, { text: buildLevelUpMsg(tag, startLevel, newLevel, newRole) }, { quoted: msg });
    }
  },
};
