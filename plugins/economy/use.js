import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";
import { SHOP_ITEMS } from "./_items.js";

const ITEM_USE_MSGS = {
  potion:  "🧪 You drank a potion and felt energised!",
  scroll:  "📜 You read the scroll and gained ancient knowledge!",
  elixir:  "🍶 The elixir surged through your veins!",
  rod:     "🎣 You practised casting with your rod — XP gained!",
  pickaxe: "⛏️ You sharpened your skills with the pickaxe!",
  orb:     "🔮 The orb crackled with energy and filled your reserves!",
};

export default {
  name: "use",
  aliases: ["useitem"],
  category: "economy",
  description: "Use an item from your inventory",
  usage: ".use <item name>",

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

    if (!args[0]) return reply("❌ Usage: .use <item>\n\nCheck your items with *.inventory*");

    const itemName = args[0].toLowerCase();
    const itemDef  = SHOP_ITEMS[itemName];

    if (!itemDef?.useEffect) {
      const known = Object.entries(SHOP_ITEMS)
        .filter(([, v]) => v.useEffect)
        .map(([k]) => k).join(", ");
      return reply(`❌ *${itemName}* can't be used.\n\nUsable items: ${known}`);
    }

    const user = await getUser(sender);
    const inv  = user.inventory || [];
    const idx  = inv.indexOf(itemName);

    if (idx === -1) {
      return reply(`❌ You don't have a *${itemName}* in your inventory.\n\nBuy one from *.shop*`);
    }

    // Remove one instance
    inv.splice(idx, 1);
    user.inventory = inv;

    // Parse and apply effects — format: "xp+50,cash+200,orbs+5"
    const effects  = itemDef.useEffect.split(",");
    const gains    = [];
    for (const effect of effects) {
      const [stat, valStr] = effect.split("+");
      const val = parseInt(valStr);
      if (stat === "xp")   { user.xp    = (user.xp    || 0) + val; gains.push(`+${val} XP`); }
      if (stat === "cash") { user.money = (user.money || 0) + val; gains.push(`+$${val}`);  }
      if (stat === "orbs") { user.orbs  = (user.orbs  || 0) + val; gains.push(`+${val} 🔮`); }
    }

    // Level-up check
    const newLevel = Math.floor((user.xp || 0) / 1000) + 1;
    const leveled  = newLevel > (user.level || 1);
    user.level     = newLevel;

    await saveUser(sender, user);
    await addHistory(sender, "use", 0, `Used ${itemName}`);

    let text = `${ITEM_USE_MSGS[itemName] || "✅ Item used!"}\n\n`;
    text += `${itemDef.emoji} *${itemName}* consumed\n`;
    text += `✨ Gains: ${gains.join("  •  ")}\n`;
    if (leveled) text += `\n🎉 *LEVEL UP!* You are now Level ${user.level}!`;

    return reply(text);
  },
};
