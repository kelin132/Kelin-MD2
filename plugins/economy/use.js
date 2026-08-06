import { getUser, saveUser, checkLevelUp, requireRegistration, addHistory } from "./database.js";
import { SHOP_ITEMS } from "./_items.js";

const ITEM_USE_MSGS = {
  potion:       "🧪 You drank a potion and felt energised!",
  scroll:       "📜 You read the scroll and gained ancient knowledge!",
  elixir:       "🍶 The elixir surged through your veins!",
  rod:          "🎣 You practised casting with your rod — XP gained!",
  pickaxe:      "⛏️ You sharpened your skills with the pickaxe!",
  orb:          "🔮 The orb crackled with energy and filled your reserves!",
  rob_charm:    "🧿 Rob Charm activated! You're protected from thieves for 1 day!",
  stealth_hood: "🪄 Stealth Hood on! You'll pay half the fine if you get caught robbing!",
  vault_guard:  "🔒 Vault Guard activated! Your vault is locked down!",
  xp_bomb:      "💥 XP Bomb detonated! Massive XP surge!",
};

// Timed buffs — useEffect format: "key:durationMs"
const TIMED_EFFECTS = {
  rob_shield:    (user, ms) => { user.robShieldExpiry   = Date.now() + ms; return `🧿 Rob Shield: ${ms / 60000} min`; },
  stealth:       (user, ms) => { user.stealthExpiry     = Date.now() + ms; return `🪄 Stealth: ${ms / 60000} min`; },
  vault_shield:  (user, ms) => { user.vaultShieldExpiry = Date.now() + ms; return `🔒 Vault Shield: ${ms / 60000} min`; },
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

    // Parse and apply effects
    // Formats supported: "xp+50", "cash+200", "orbs+5", "rob_shield:3600000"
    const effects  = itemDef.useEffect.split(",");
    const gains    = [];
    for (const effect of effects) {
      if (effect.includes(":")) {
        // Timed buff — "key:durationMs"
        const [key, durStr] = effect.split(":");
        const dur = parseInt(durStr, 10);
        const fn  = TIMED_EFFECTS[key];
        if (fn) gains.push(fn(user, dur));
      } else if (effect.includes("+")) {
        // Instant stat boost — "stat+value"
        const [stat, valStr] = effect.split("+");
        const val = parseInt(valStr, 10);
        if (stat === "xp")   { user.xp    = (user.xp    || 0) + val; gains.push(`+${val} XP`); }
        if (stat === "cash") { user.money = (user.money || 0) + val; gains.push(`+$${val.toLocaleString()}`); }
        if (stat === "orbs") { user.orbs  = (user.orbs  || 0) + val; gains.push(`+${val} 🔮`); }
      }
    }

    // Level-up check
    const { leveled, newLevel } = checkLevelUp(user);

    await saveUser(sender, user);
    await addHistory(sender, "use", 0, `Used ${itemName}`);

    let text = `${ITEM_USE_MSGS[itemName] || "✅ Item used!"}\n\n`;
    text += `${itemDef.emoji} *${itemName}* consumed\n`;
    if (gains.length) text += `✨ Effect: ${gains.join("  •  ")}\n`;
    if (leveled) text += `\n🎉 *LEVEL UP!* You are now Level ${user.level}!`;

    return reply(text);
  },
};
