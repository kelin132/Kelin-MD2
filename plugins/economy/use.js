import { getUser, saveUser, checkLevelUp, requireRegistration, addHistory } from "./database.js";
import { SHOP_ITEMS } from "./_items.js";
import { formatRyu } from "./currency.js";

const ITEM_USE_MSGS = {
  potion: "🧪 You drank a potion and felt energised!",
  small_health_potion: "🩹 You used a recovery potion!",
  scroll: "📜 You read the scroll and gained ancient knowledge!",
  elixir: "🍶 The elixir surged through your veins!",
  basic_fishing_rod: "🎣 You practised casting with your rod!",
  pickaxe: "⛏️ You sharpened your mining skills!",
  rob_charm: "🧿 Rob Charm activated!",
  stealth_hood: "🪄 Stealth Hood activated!",
  xp_bomb: "💥 XP Bomb detonated!",
};

const TIMED_EFFECTS = {
  rob_shield: (user, ms) => {
    user.robShieldExpiry = Date.now() + ms;
    return `🧿 Rob Shield: ${ms / 60000} min`;
  },
  stealth: (user, ms) => {
    user.stealthExpiry = Date.now() + ms;
    return `🪄 Stealth: ${ms / 60000} min`;
  },
};

export default {
  name: "use",
  aliases: ["useitem"],
  category: "economy",
  cooldown: 6,
  description: "Use an item from your inventory",
  usage: ".use <item name>",

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const itemName = args.join("_").toLowerCase();
    if (!itemName) return reply("❌ Usage: .use <item>\n\nCheck your items with *.inventory*");

    const itemDef = SHOP_ITEMS[itemName];
    if (!itemDef?.useEffect) {
      const usable = Object.entries(SHOP_ITEMS).filter(([, item]) => item.useEffect).map(([name]) => name);
      return reply(`❌ *${itemName}* cannot be used.\n\nUsable items: ${usable.join(", ")}`);
    }

    const user = await getUser(sender);
    const inventory = Array.isArray(user.inventory) ? user.inventory : [];
    const index = inventory.indexOf(itemName);
    if (index === -1) return reply(`❌ You don't have *${itemName}* in your inventory.\n\nBuy one from *.shop* or find one with *.dig* / *.fish*.`);
    inventory.splice(index, 1);
    user.inventory = inventory;

    const gains = [];
    for (const effect of itemDef.useEffect.split(",")) {
      if (effect.includes(":")) {
        const [key, duration] = effect.split(":");
        const fn = TIMED_EFFECTS[key];
        if (fn) gains.push(fn(user, Number.parseInt(duration, 10)));
      } else if (effect.includes("+")) {
        const [stat, rawValue] = effect.split("+");
        const value = Number.parseInt(rawValue, 10);
        if (stat === "xp") { user.xp = (user.xp || 0) + value; gains.push(`+${value} XP`); }
        if (stat === "cash") { user.money = (user.money || 0) + value; gains.push(`+${formatRyu(value)}`); }
        if (stat === "orbs") { user.orbs = (user.orbs || 0) + value; gains.push(`+${value} 🔮`); }
      }
    }

    const { leveled } = checkLevelUp(user);
    await saveUser(sender, user);
    await addHistory(sender, "use", 0, `Used ${itemName}`);
    return reply([
      ITEM_USE_MSGS[itemName] || "✅ Item used!",
      "",
      `${itemDef.emoji} *${itemName}* consumed`,
      gains.length ? `✨ Effect: ${gains.join("  •  ")}` : null,
      leveled ? `🎉 *LEVEL UP!* You are now Level ${user.level}!` : null,
    ].filter(Boolean).join("\n"));
  },
};