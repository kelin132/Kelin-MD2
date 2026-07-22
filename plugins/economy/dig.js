import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";
import { DIG_LOOT, SHOP_ITEMS, rollLoot } from "./_items.js";

const COOLDOWN = 5 * 1000; // 5 seconds

export default {
  name: "dig",
  aliases: ["mine"],
  category: "economy",
  description: "Dig for buried treasure — cash, items, or orbs (5 sec cooldown)",
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
      return reply(`⛏️ *Tired!*\n\nYour arms need rest. Come back in *${secs}s*.`);
    }

    const loot = rollLoot(DIG_LOOT);
    user.lastDig = now;

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
    const newLevel = Math.floor(user.xp / 1000) + 1;
    const leveled  = newLevel > (user.level || 1);
    user.level     = newLevel;

    await saveUser(sender, user);

    const digMessages = [
      "⛏️ You dig deep into the earth...",
      "⛏️ You strike something with your pickaxe...",
      "⛏️ The ground gives way beneath your feet...",
      "⛏️ You tunnel through layers of soil...",
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

    return reply(text);
  },
};
