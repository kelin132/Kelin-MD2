import { getUser, saveUser, requireRegistration, addHistory, checkLevelUp } from "./database.js";
import { FISH_LOOT, SHOP_ITEMS, rollLoot } from "./_items.js";

const COOLDOWN = 10 * 1000; // 10 seconds

function fmt(n) {
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
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
      return reply(
`╭─❀「 🎣 *𝐅𝐈𝐒𝐇* 」❀─╮
│ ⏳ *Result*  :: *WAITING 🔴*
│ 🍃 *Flavour* :: _魚がまだ食いついてない..._
│
│ 🕐 *Next*    :: *${secs}s remaining*
╰───────────────❀`
      );
    }

    const loot    = rollLoot(FISH_LOOT);
    user.lastFish = now;

    let resultLine = "";
    let resultType = "";

    if (loot.type === "cash") {
      const amount  = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
      user.money    = (user.money || 0) + amount;
      await addHistory(sender, "fish", amount, `Caught $${amount.toLocaleString()} worth of fish`);
      resultLine = `🐟 Sold your catch for *${fmt(amount)}*!`;
      resultType = `+${fmt(amount)}`;
    } else if (loot.type === "item") {
      user.inventory = user.inventory || [];
      user.inventory.push(loot.name);
      const def  = SHOP_ITEMS[loot.name];
      resultLine = `${def?.emoji || "📦"} Reeled in a *${loot.name}*!`;
      resultType = loot.name;
      await addHistory(sender, "fish", 0, `Fished up ${loot.name}`);
    } else if (loot.type === "orbs") {
      const amount  = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
      user.orbs     = (user.orbs || 0) + amount;
      resultLine    = `🔮 Pulled up *${amount} orb(s)* from the deep!`;
      resultType    = `+${amount} orbs`;
      await addHistory(sender, "fish", 0, `Fished up ${amount} orbs`);
    } else {
      resultLine = "🪣 You caught a boot. Classic.";
      resultType = "Nothing";
    }

    user.xp = (user.xp || 0) + 8;
    const { leveled, newLevel } = checkLevelUp(user);
    await saveUser(sender, user);

    const castMessages = [
      "🎣 You cast your line into the water...",
      "🎣 You wait patiently at the riverbank...",
      "🎣 The bobber dips below the surface...",
      "🎣 You feel a tug on the line...",
    ];
    const flavour = castMessages[Math.floor(Math.random() * castMessages.length)];

    return reply(
`╭─❀「 🎣 *𝐅𝐈𝐒𝐇* 」❀─╮
│ 🌙 *Result*  :: *${resultType}*
│ 🍃 *Flavour* :: _${flavour}_
│
│ ${resultLine}
│
│ 💰 *Cash*    :: *${fmt(user.money || 0)}*
│ 🔮 *Orbs*    :: *${user.orbs || 0}*
│ 🎒 *Items*   :: *${(user.inventory || []).length}*
│ ⭐ *XP*      :: *+8*${leveled ? `\n│\n│ 🎉 *LEVEL UP!* — Now Level ${user.level}` : ""}
╰───────────────❀`
    );
  },
};
