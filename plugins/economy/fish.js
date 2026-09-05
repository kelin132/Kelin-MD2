```javascript
import { getUser, saveUser, requireRegistration, addHistory, checkLevelUp } from "./database.js";
import { FISH_LOOT, SHOP_ITEMS, rollLoot } from "./_items.js";

const COOLDOWN = 10 * 1000; // 10 seconds

function fmt(n) {
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`;
  return `${n.toLocaleString()}`;
}

export default {
  name: "fish",
  aliases: ["fishing"],
  category: "economy",
  cooldown: 6,
  description: "Go fishing for cash, items, or orbs (10 sec cooldown)",
  usage: ".fish",

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const now   = Date.now();

    const user = await getUser(sender);

    if (now - (user.lastFish || 0) < COOLDOWN) {
      const rem  = COOLDOWN - (now - user.lastFish);
      const secs = Math.ceil(rem / 1000);

      const limitCaption = `⏳ The fish aren't biting yet! Next cast available in ${secs}s.`;

      return reply(limitCaption);
    }

    const loot    = rollLoot(FISH_LOOT);
    user.lastFish = now;

    let resultText = "";

    if (loot.type === "cash") {
      const amount  = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
      user.money    = (user.money || 0) + amount;
      await addHistory(sender, "fish", amount, `Caught $${amount.toLocaleString()} worth of fish`);
      resultText    = `🐟 sold your catch for 💰 ${fmt(amount)} coins`;
    } else if (loot.type === "item") {
      user.inventory = user.inventory || [];
      user.inventory.push(loot.name);
      const def     = SHOP_ITEMS[loot.name];
      const itemEmoji = def?.emoji || "📦";
      resultText    = `reeled in a ${itemEmoji} ${loot.name}`;
      await addHistory(sender, "fish", 0, `Fished up ${loot.name}`);
    } else if (loot.type === "orbs") {
      const amount  = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
      user.orbs     = (user.orbs || 0) + amount;
      resultText    = `pulled up 🔮 ${amount} orbs from the deep`;
      await addHistory(sender, "fish", 0, `Fished up ${amount} orbs`);
    } else {
      resultText    = "🪣 caught an old boot (nothing useful)";
    }

    user.xp = (user.xp || 0) + 8;
    const { leveled, newLevel } = checkLevelUp(user);
    await saveUser(sender, user);

    const claimCaption = `🎉 You cast your line 🎣 and ${resultText}! Your new balance is 💰 ${fmt(user.money || 0)} coins.${leveled ? `\n\n⭐ *LEVEL UP!* You are now Level ${newLevel}!` : ""}`;

    return reply(claimCaption);
  },
};

```
