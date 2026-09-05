import { getUser, saveUser, requireRegistration, addHistory, maybeAwardDiamonds, checkLevelUp } from "./database.js";
import { DIG_LOOT, SHOP_ITEMS, rollLoot } from "./_items.js";

const COOLDOWN = 10 * 1000; // 10 seconds

function fmt(n) {
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

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
      const secs = Math.ceil(rem / 1000);
      return reply(
`╭─❀「 ⛏️ *𝐃𝐈𝐆* 」❀─╮
│ ⏳ *Result*  :: *TIRED 🔴*
│ 🍃 *Flavour* :: _腕が疲れた...もう少し待て！_
│
│ 🕐 *Next*    :: *${secs}s remaining*
╰───────────────❀`
      );
    }

    const loot = rollLoot(DIG_LOOT);
    user.lastDig = now;
    const hasDiamondShovel = (user.inventory || []).includes("diamond_shovel");
    const diamondReward = maybeAwardDiamonds(user, hasDiamondShovel ? 0.01 : 0.005, 1, 2);

    let resultLine = "";
    let resultType = "";

    if (loot.type === "cash") {
      const amount  = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
      user.money    = (user.money || 0) + amount;
      await addHistory(sender, "dig", amount, `Dug up $${amount.toLocaleString()}`);
      resultLine = `💰 Found *${fmt(amount)}* in the ground!`;
      resultType = `+${fmt(amount)}`;
    } else if (loot.type === "item") {
      user.inventory = user.inventory || [];
      user.inventory.push(loot.name);
      const def  = SHOP_ITEMS[loot.name];
      resultLine = `${def?.emoji || "📦"} Found a *${loot.name}*!`;
      resultType = loot.name;
      await addHistory(sender, "dig", 0, `Dug up ${loot.name}`);
    } else if (loot.type === "orbs") {
      const amount  = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
      user.orbs     = (user.orbs || 0) + amount;
      resultLine    = `🔮 Found *${amount} orb(s)*!`;
      resultType    = `+${amount} orbs`;
      await addHistory(sender, "dig", 0, `Dug up ${amount} orbs`);
    } else {
      resultLine = "🪨 You just found a rock. Useless.";
      resultType = "Nothing";
    }

    user.xp = (user.xp || 0) + 10;
    const { leveled, newLevel } = checkLevelUp(user);
    await saveUser(sender, user);

    const digMessages = [
      hasDiamondShovel
        ? "🪏 Your Diamond Shovel glints as you dig deep..."
        : "⛏️ You dig deep into the earth...",
      hasDiamondShovel
        ? "🪏 Your lucky shovel sweeps through the soil..."
        : "⛏️ You strike something with your pickaxe...",
      hasDiamondShovel
        ? "🪏 The Diamond Shovel finds a promising glimmer..."
        : "⛏️ The ground gives way beneath your feet...",
    ];
    const flavour = digMessages[Math.floor(Math.random() * digMessages.length)];

    return reply(
`╭─❀「 ⛏️ *𝐃𝐈𝐆* 」❀─╮
│ 🌙 *Result*  :: *${resultType}*
│ 🍃 *Flavour* :: _${flavour}_
│
│ ${resultLine}
│
│ 💰 *Cash*    :: *${fmt(user.money || 0)}*
│ 🔮 *Orbs*    :: *${user.orbs || 0}*
│ 🎒 *Items*   :: *${(user.inventory || []).length}*
│ ⭐ *XP*      :: *+10*${diamondReward ? `\n│ 💎 *Bonus*   :: *+${diamondReward} Gem${diamondReward === 1 ? "" : "s"}*` : ""}${leveled ? `\n│\n│ 🎉 *LEVEL UP!* — Now Level ${user.level}` : ""}
╰───────────────❀`
    );
  },
};
