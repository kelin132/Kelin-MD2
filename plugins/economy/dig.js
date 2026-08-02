import { getUser, saveUser, requireRegistration, addHistory, maybeAwardDiamonds, checkLevelUp } from "./database.js";
import { DIG_LOOT, SHOP_ITEMS, rollLoot } from "./_items.js";

const COOLDOWN = 10 * 1000; // 10 seconds

export default {
  name: "dig",
  aliases: ["mine"],
  category: "economy",
  cooldown: 6,
  description: "Dig for buried treasure — cash, items, or orbs (10 sec cooldown)",
  usage: ".dig",

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const now   = Date.now();

    const user = await getUser(sender);

    if (now - (user.lastDig || 0) < COOLDOWN) {
      const rem  = COOLDOWN - (now - user.lastDig);
      const mins = Math.floor(rem / 60000);
      const secs = Math.ceil((rem % 60000) / 1000);
      const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      return reply(`⛏️ *Tired!*\n\nYour arms need rest. Come back in *${timeStr}*.`);
    }

    const loot = rollLoot(DIG_LOOT);
    user.lastDig = now;
    const hasDiamondShovel = (user.inventory || []).includes("diamond_shovel");
    const diamondReward = maybeAwardDiamonds(user, hasDiamondShovel ? 0.01 : 0.005, 1, 2);

    let resultLine = "";

    if (loot.type === "cash") {
      const amount  = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
      user.money    = (user.money || 0) + amount;
      await addHistory(sender, "dig", amount, `Dug up $${amount.toLocaleString()}`);
      resultLine    = `💰 Found *$${amount.toLocaleString()}* in the ground!`;
    } else if (loot.type === "item") {
      user.inventory = user.inventory || [];
      user.inventory.push(loot.name);
      const def = SHOP_ITEMS[loot.name];
      resultLine    = `${def?.emoji || "📦"} Found a *${loot.name}*! (worth ~$${Math.floor((def?.price || 0) * (def?.sellPct || 0.4)).toLocaleString()})`;
      await addHistory(sender, "dig", 0, `Dug up ${loot.name}`);
    } else if (loot.type === "orbs") {
      const amount  = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
      user.orbs     = (user.orbs || 0) + amount;
      resultLine    = `🔮 Found *${amount} orb(s)*!`;
      await addHistory(sender, "dig", 0, `Dug up ${amount} orbs`);
    } else {
      resultLine    = "🪨 You just found a rock. Useless.";
    }

    // Small XP bonus for digging
    user.xp    = (user.xp || 0) + 10;
    const { leveled, newLevel } = checkLevelUp(user);

    await saveUser(sender, user);

    const digMessages = [
      hasDiamondShovel
        ? "🪏 Your Diamond Shovel glints as you dig deep into the earth..."
        : "⛏️ You dig deep into the earth...",
      hasDiamondShovel
        ? "🪏 Your lucky shovel sweeps through the soil..."
        : "⛏️ You strike something with your pickaxe...",
      hasDiamondShovel
        ? "🪏 The Diamond Shovel points toward a promising glimmer..."
        : "⛏️ The ground gives way beneath your feet...",
      hasDiamondShovel
        ? "🪏 You sift the earth carefully with your Diamond Shovel..."
        : "⛏️ You tunnel through layers of soil...",
    ];
    const intro = digMessages[Math.floor(Math.random() * digMessages.length)];

    let text =
`${intro}

${resultLine}

💵 Cash   : $${(user.money || 0).toLocaleString()}
🔮 Orbs   : ${user.orbs || 0}
🎒 Items  : ${(user.inventory || []).length}
⭐ XP     : ${user.xp.toLocaleString()}`;

    if (leveled) text += `\n\n🎉 *LEVEL UP!* You are now Level ${user.level}!`;
    if (diamondReward) text += `\n\n💎 *RARE FIND!* You uncovered *${diamondReward} Diamond${diamondReward === 1 ? "" : "s"}*!`;

    return reply(text);
  },
};
