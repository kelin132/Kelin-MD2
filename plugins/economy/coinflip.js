/**
 * KELIN MD — .coinflip
 * Call heads or tails — 55% win rate with a twist.
 * Usage: .coinflip <heads|tails> <amount>
 */
import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

const COOLDOWN = 8 * 1000; // 8 seconds

export default {
  name: "coinflip",
  aliases: ["cf", "flip2"],
  category: "economy",
  description: "Flip a coin — call it right to double your money! (55% win)",
  usage: ".coinflip <heads|tails> <amount>",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const now   = Date.now();
    const user  = await getUser(sender);

    if (now - (user.lastCoinflip || 0) < COOLDOWN) {
      const secs = Math.ceil((COOLDOWN - (now - user.lastCoinflip)) / 1000);
      return reply(`🪙 The coin hasn't landed yet! Try in *${secs}s*.`);
    }

    const call   = (args[0] || "").toLowerCase();
    const rawAmt = (args[1] || "").toLowerCase();

    if (!["heads", "tails", "h", "t"].includes(call) || !rawAmt) {
      return reply(
`🪙 *COIN FLIP*

Usage: *.coinflip <heads|tails> <amount>*
Example: .coinflip heads 1000

🎯 Win rate: *55%*
💰 Win: ×2 your bet`
      );
    }

    const normalCall = call === "h" ? "heads" : call === "t" ? "tails" : call;
    let amount = rawAmt === "all" ? user.money : rawAmt === "half" ? Math.floor(user.money / 2) : parseInt(rawAmt.replace(/\D/g, ""), 10);

    if (!amount || isNaN(amount) || amount < 10) return reply("❌ Minimum bet is *$10*.");
    if (amount > user.money) return reply(`❌ You only have *$${user.money.toLocaleString()}*.`);

    user.lastCoinflip = now;

    const result = Math.random() < 0.5 ? "heads" : "tails";
    const won    = Math.random() < 0.55 ? normalCall === result : normalCall !== result;
    const coinEmoji = result === "heads" ? "🪙 Heads!" : "🌑 Tails!";

    if (won) {
      user.money += amount;
      user.xp     = (user.xp || 0) + 8;
      await saveUser(sender, user);
      await addHistory(sender, "coinflip", amount, `Coinflip win: ${normalCall}`);
      return reply(`🪙 *COIN FLIP*\n\nYou called *${normalCall}*...\n\n${coinEmoji}\n\n✅ *CORRECT!* +$${amount.toLocaleString()}\n💰 Balance: $${user.money.toLocaleString()}`);
    } else {
      user.money = Math.max(0, user.money - amount);
      await saveUser(sender, user);
      await addHistory(sender, "coinflip", -amount, `Coinflip loss: ${normalCall}`);
      return reply(`🪙 *COIN FLIP*\n\nYou called *${normalCall}*...\n\n${coinEmoji}\n\n❌ *WRONG!* -$${amount.toLocaleString()}\n💰 Balance: $${user.money.toLocaleString()}`);
    }
  },
};
