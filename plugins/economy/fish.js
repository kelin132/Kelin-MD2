import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";
import { FISH_LOOT, SHOP_ITEMS, rollLoot } from "./_items.js";

const COOLDOWN = 5 * 1000; // 5 seconds

export default {
  name: "fish",
  aliases: ["fishing"],
  category: "economy",
  description: "Go fishing for cash, items, or orbs (5 sec cooldown)",
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
      return reply(`🎣 *Waiting...*\n\nThe fish aren't biting. Try again in *${secs}s*.`);
    }

    const loot   = rollLoot(FISH_LOOT);
    user.lastFish = now;

    let resultLine = "";

    if (loot.type === "cash") {
      const amount  = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
      user.money    = (user.money || 0) + amount;
      await addHistory(sender, "fish", amount, `Caught $${amount.toLocaleString()} worth of fish`);
      resultLine    = `🐟 Sold your catch for *$${amount.toLocaleString()}*!`;
    } else if (loot.type === "item") {
      user.inventory = user.inventory || [];
      user.inventory.push(loot.name);
      const def  = SHOP_ITEMS[loot.name];
      resultLine = `${def?.emoji || "📦"} Reeled in a *${loot.name}*!`;
      await addHistory(sender, "fish", 0, `Fished up ${loot.name}`);
    } else if (loot.type === "orbs") {
      const amount  = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
      user.orbs     = (user.orbs || 0) + amount;
      resultLine    = `🔮 Pulled up *${amount} orb(s)* from the deep!`;
      await addHistory(sender, "fish", 0, `Fished up ${amount} orbs`);
    } else {
      resultLine    = "🪣 You caught a boot. Classic.";
    }

    user.xp    = (user.xp || 0) + 8;
    const newLevel = Math.floor(user.xp / 1000) + 1;
    const leveled  = newLevel > (user.level || 1);
    user.level     = newLevel;

    await saveUser(sender, user);

    const castMessages = [
      "🎣 You cast your line into the water...",
      "🎣 You wait patiently at the riverbank...",
      "🎣 The bobber dips below the surface...",
      "🎣 You feel a tug on the line...",
    ];
    const intro = castMessages[Math.floor(Math.random() * castMessages.length)];

    let text =
`${intro}

${resultLine}

💵 Cash   : $${(user.money || 0).toLocaleString()}
🔮 Orbs   : ${user.orbs || 0}
🎒 Items  : ${(user.inventory || []).length}
⭐ XP     : ${user.xp.toLocaleString()}`;

    if (leveled) text += `\n\n🎉 *LEVEL UP!* You are now Level ${user.level}!`;

    return reply(text);
  },
};
