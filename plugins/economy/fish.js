import { getUser, saveUser, requireRegistration, addHistory, checkLevelUp } from "./database.js";
import { FISH_LOOT, SHOP_ITEMS, rollLoot } from "./_items.js";

const COOLDOWN = 10 * 1000; // 10 seconds

function fmt(n) {
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function articleFor(value) {
  return /^[aeiou]/i.test(value) ? "an" : "a";
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

    const jid = msg.key.remoteJid;
    const tag = `@${sender.split("@")[0]}`;
    const reply = (text) => sock.sendMessage(
      jid,
      { text, mentions: [sender] },
      { quoted: msg },
    );
    const now = Date.now();

    const user = await getUser(sender);

    if (now - (user.lastFish || 0) < COOLDOWN) {
      const rem = COOLDOWN - (now - user.lastFish);
      const secs = Math.ceil(rem / 1000);
      return reply(`⏳ ${tag}, your fish cooldown is still active — ${secs}s left.`);
    }

    const loot = rollLoot(FISH_LOOT);
    user.lastFish = now;

    let resultLine;

    if (loot.type === "cash") {
      const amount = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
      user.money = (user.money || 0) + amount;
      await addHistory(sender, "fish", amount, `Caught $${amount.toLocaleString()} worth of fish`);
      resultLine = `💰 ${tag} used fish and caught ${fmt(amount)} worth of treasure!`;
    } else if (loot.type === "item") {
      user.inventory = user.inventory || [];
      user.inventory.push(loot.name);
      const def = SHOP_ITEMS[loot.name];
      resultLine = `${def?.emoji || "📦"} ${tag} used fish and reeled in ${articleFor(loot.name)} ${loot.name}!`;
      await addHistory(sender, "fish", 0, `Fished up ${loot.name}`);
    } else if (loot.type === "orbs") {
      const amount = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
      user.orbs = (user.orbs || 0) + amount;
      resultLine = `🔮 ${tag} used fish and discovered ${amount} orb${amount === 1 ? "" : "s"} beneath the waves!`;
      await addHistory(sender, "fish", 0, `Fished up ${amount} orbs`);
    } else {
      resultLine = `🪣 ${tag} used fish but caught an old boot. Classic!`;
    }

    user.xp = (user.xp || 0) + 8;
    const { leveled, newLevel } = checkLevelUp(user);
    await saveUser(sender, user);

    const details = [
      resultLine,
      `💰 Wallet: ${fmt(user.money || 0)}  •  🔮 Orbs: ${user.orbs || 0}  •  🎒 Items: ${(user.inventory || []).length}`,
      `⭐ XP gained: +8`,
    ];
    if (leveled) details.push(`🎉 Level up! You are now level ${newLevel}.`);

    return reply(details.join("\n"));
  },
};
