import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

const COOLDOWN = 5 * 60 * 1000; // 5 minutes
const MAX_BET  = 10_000;

export default {
  name: "gamble",
  aliases: ["bet2", "gbl"],
  category: "economy",
  description: "Gamble your cash — 48% chance to double it (5 min cooldown, max $10k)",
  usage: ".gamble <amount|all|half>",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const now   = Date.now();

    const user = await getUser(sender);

    if (now - (user.lastGamble || 0) < COOLDOWN) {
      const rem  = COOLDOWN - (now - user.lastGamble);
      const mins = Math.floor(rem / 60000);
      const secs = Math.floor((rem % 60000) / 1000);
      return reply(`🎰 *Cooldown!*\n\nHouse needs a break. Try again in *${mins}m ${secs}s*.`);
    }

    if (!args[0]) return reply("❌ Usage: .gamble <amount|all|half>\nMax bet: $10,000");

    const input  = args[0].toLowerCase();
    let   amount = input === "all"  ? user.money
                 : input === "half" ? Math.floor(user.money / 2)
                 : parseInt(input);

    if (isNaN(amount) || amount <= 0) return reply("❌ Enter a valid amount.");
    if (amount > MAX_BET)             amount = MAX_BET;
    if (amount > user.money)          return reply(`❌ You only have *$${user.money.toLocaleString()}* in your wallet.`);
    if (amount < 10)                  return reply("❌ Minimum bet is $10.");

    user.lastGamble = now;

    // 48% win (slight house edge)
    const won = Math.random() < 0.48;

    const FACES = ["🎰 🍒 🍋 💎", "🎰 💎 💎 🍒", "🎰 🍀 🍋 🍋", "🎰 🎯 🎯 💥",
                   "🎰 💀 🍒 🍀", "🎰 7️⃣  7️⃣  🍋"];
    const spin  = FACES[Math.floor(Math.random() * FACES.length)];

    if (won) {
      user.money = (user.money || 0) + amount;
      await saveUser(sender, user);
      await addHistory(sender, "slots", amount, `Gamble win +$${amount.toLocaleString()}`);

      return reply(
`${spin}

🎉 *YOU WON!*

💰 Won     : $${amount.toLocaleString()}
💵 Balance : $${user.money.toLocaleString()}`
      );
    } else {
      user.money = Math.max(0, (user.money || 0) - amount);
      await saveUser(sender, user);
      await addHistory(sender, "slots", -amount, `Gamble loss -$${amount.toLocaleString()}`);

      return reply(
`${spin}

💸 *YOU LOST!*

😭 Lost    : $${amount.toLocaleString()}
💵 Balance : $${user.money.toLocaleString()}`
      );
    }
  },
};
