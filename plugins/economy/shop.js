/**
 * KELIN MD — .shop command (Anime RPG Edition)
 * Browse and purchase items using Coins 🪙, Orbs 🔮, and Diamonds 💎.
 */

import { getUser, saveUser, requireRegistration } from "./database.js";
import { SHOP_ITEMS as shopItems, RARITY_COLORS as rarityColors, SHOP_CATEGORIES } from "./_items.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCoins(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return `${n.toLocaleString()}`;
}

function itemCostLine(item) {
  const parts = [];
  if (item.price   > 0) parts.push(`🪙 ${fmtCoins(item.price)}`);
  if (item.orbCost > 0) parts.push(`🔮 ${item.orbCost}`);
  if (item.gemCost > 0) parts.push(`💎 ${item.gemCost}`);
  return parts.join(" │ ") || "🆓 Free";
}

function rarityBadge(rarity) {
  const map = { common: "⚪ Common", rare: "🔵 Rare", legendary: "🟡 Legendary" };
  return map[rarity] || rarity;
}

const ANIME_BORDERS = {
  top:    "╔══════════════════════════════╗",
  mid:    "╠══════════════════════════════╣",
  bot:    "╚══════════════════════════════╝",
  row:    "║",
  div:    "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄",
};

// ─── Buy handler ──────────────────────────────────────────────────────────────

async function handleBuy(sock, msg, jid, sender, args) {
  const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

  const itemNumber = Number(args[1]);
  const orderedItems = Object.entries(shopItems);
  const selected = Number.isInteger(itemNumber) && itemNumber >= 1
    ? orderedItems[itemNumber - 1]
    : null;

  if (!selected) {
    return reply(
`❌ *Invalid item number!*

Use *.shop <category>* to browse numbered items.
Example: *.shop weapons* then *.shop buy 1*`
    );
  }

  const [itemName, item] = selected;
  const user = await getUser(sender);

  const userCoins    = user.money    ?? 0;
  const userOrbs     = user.orbs     ?? 0;
  const userDiamonds = user.diamonds ?? 0;

  const needCoins = item.price    ?? 0;
  const needOrbs  = item.orbCost  ?? 0;
  const needGems  = item.gemCost  ?? 0;

  // Check funds
  const shortCoins = Math.max(0, needCoins - userCoins);
  const shortOrbs  = Math.max(0, needOrbs  - userOrbs);
  const shortGems  = Math.max(0, needGems  - userDiamonds);

  if (shortCoins > 0 || shortOrbs > 0 || shortGems > 0) {
    let shortage = "";
    if (shortCoins > 0) shortage += `\n🪙 Short: *${fmtCoins(shortCoins)} Coins*`;
    if (shortOrbs  > 0) shortage += `\n🔮 Short: *${shortOrbs} Orbs*`;
    if (shortGems  > 0) shortage += `\n💎 Short: *${shortGems} Diamonds*`;

    return reply(
`╔══════════════════════════════╗
║  💸  *INSUFFICIENT FUNDS!*   ║
╚══════════════════════════════╝

${item.emoji} *${itemName.replace(/_/g, " ").toUpperCase()}*
${ANIME_BORDERS.div}
*Cost:*  ${itemCostLine(item)}
*Yours:* 🪙 ${fmtCoins(userCoins)} │ 🔮 ${userOrbs} │ 💎 ${userDiamonds}
${shortage}

💡 Earn more via *.daily* *.work* *.fish* *.dig*`
    );
  }

  // Deduct costs
  user.money    = userCoins    - needCoins;
  user.orbs     = userOrbs     - needOrbs;
  user.diamonds = userDiamonds - needGems;
  user.xp       = (user.xp || 0) + (item.xpBonus || 0);
  user.inventory = user.inventory || [];
  user.inventory.push(itemName);
  await saveUser(sender, user);

  return reply(
`╔══════════════════════════════╗
║   ✅  *PURCHASE COMPLETE!*   ║
╚══════════════════════════════╝

${item.emoji} *${itemName.replace(/_/g, " ").toUpperCase()}*
📖 ${item.description || "Item acquired!"}
${ANIME_BORDERS.div}
*Paid:*    ${itemCostLine(item)}
⭐ *XP:*   +${item.xpBonus || 0}
${ANIME_BORDERS.div}
*Wallet:*  🪙 ${fmtCoins(user.money)} │ 🔮 ${user.orbs} │ 💎 ${user.diamonds}

Use *.inventory* to see your items!`
  );
}

// ─── Category list handler ────────────────────────────────────────────────────

function buildCategoryList(catKey) {
  const cat   = SHOP_CATEGORIES[catKey];
  const items = Object.entries(shopItems).filter(([, i]) => i.category === catKey);

  if (items.length === 0) {
    return `❌ No items found in *${cat.label}*.`;
  }

  const allKeys = Object.keys(shopItems);
  const list = items.map(([name, i]) => {
    const num  = allKeys.indexOf(name) + 1;
    const desc = i.description ? `\n   📖 _${i.description}_` : "";
    const cost = itemCostLine(i);
    const rar  = rarityBadge(i.rarity);
    return `*${num}.* ${i.emoji} *${name.replace(/_/g, " ")}*${desc}\n   ${cost} • ${rar}`;
  }).join(`\n${ANIME_BORDERS.div}\n`);

  return (
`╔══════════════════════════════╗
║  ${cat.emoji} *${cat.label.toUpperCase().padEnd(26)}* ║
╚══════════════════════════════╝

${list}

${ANIME_BORDERS.div}
🛒 Buy: *.shop buy <number>*`
  );
}

// ─── Main menu ────────────────────────────────────────────────────────────────

function buildMainMenu(userCoins, userOrbs, userDiamonds) {
  const catList = Object.entries(SHOP_CATEGORIES).map(([key, cat]) => {
    const count = Object.values(shopItems).filter(i => i.category === key).length;
    return `${cat.emoji} *.shop ${key}*\n   └ ${cat.label} (${count} items)`;
  }).join("\n\n");

  return (
`╔══════════════════════════════╗
║  ⚔️  *KELIN MD ANIME SHOP*  🏯 ║
║  ✨ _RPG Item Marketplace_ ✨  ║
╚══════════════════════════════╝

💼 *Your Wallet*
🪙 ${fmtCoins(userCoins)} Coins │ 🔮 ${userOrbs} Orbs │ 💎 ${userDiamonds} Diamonds

╠══════════════════════════════╣
       📂 *SHOP CATEGORIES*
╚══════════════════════════════╝

${catList}

${ANIME_BORDERS.div}
🛒 *Browse:* *.shop <category>*
💳 *Buy:* *.shop buy <number>*
📦 *Inventory:* *.inventory*`
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default {
  name: "shop",
  description: "Browse and buy items from the Anime RPG Shop",
  category: "economy",
  cooldown: 6,
  usage: ".shop [category] | .shop buy <number>",

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

    const sub = (args[0] || "").toLowerCase();

    // ── BUY ─────────────────────────────────────────────────────────────────
    if (sub === "buy") {
      return handleBuy(sock, msg, jid, sender, args);
    }

    // ── CATEGORY ALIASES ────────────────────────────────────────────────────
    const catAlias = {
      weapon: "weapons", sword: "weapons", combat: "weapons", fight: "weapons",
      shield: "armor",   acc: "armor",     accessory: "armor",
      pet: "pets",       companion: "pets", animal: "pets",
      base: "bases",     home: "bases",     house: "bases",   building: "bases",
      box: "gacha",      loot: "gacha",     chest: "gacha",   mystery: "gacha",
      title: "cosmetics", skin: "cosmetics", theme: "cosmetics", flex: "cosmetics",
      tool: "tools",     equipment: "tools", fishing: "tools",
      ticket: "consumables", consume: "consumables", boost: "consumables",
      potion: "potions", heal: "potions",   recovery: "potions",
      scroll: "scrolls", special: "scrolls",
      exchange: "exchange", trade: "exchange", convert: "exchange",
    };

    const catKeys = Object.keys(SHOP_CATEGORIES);
    const catKey  = catAlias[sub] || (catKeys.includes(sub) ? sub : null);

    if (catKey) {
      return reply(buildCategoryList(catKey));
    }

    // ── MAIN MENU ────────────────────────────────────────────────────────────
    if (!sub || sub === "list" || sub === "menu" || sub === "help") {
      const user  = await getUser(sender);
      return reply(buildMainMenu(user.money ?? 0, user.orbs ?? 0, user.diamonds ?? 0));
    }

    return reply(
`❌ *Unknown category:* _${sub}_

Use *.shop* to see all categories.`
    );
  },
};
