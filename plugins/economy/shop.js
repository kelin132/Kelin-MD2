/**
 * KELIN MD — .shop command (Anime RPG Edition)
 * Browse and purchase items using Coins 🪙, Orbs 🔮, and Diamonds 💎.
 * Layout matches the AFK anime aesthetic: ╭━━╮ borders, ꔫ separators, Japanese text.
 */

import { getUser, saveUser, requireRegistration } from "./database.js";
import { SHOP_ITEMS as shopItems, SHOP_CATEGORIES } from "./_items.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCoins(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return `${n.toLocaleString()}`;
}

function costLine(item) {
  const parts = [];
  if (item.price   > 0) parts.push(`🪙 ${fmtCoins(item.price)}`);
  if (item.orbCost > 0) parts.push(`🔮 ${item.orbCost}`);
  if (item.gemCost > 0) parts.push(`💎 ${item.gemCost}`);
  return parts.join("  ·  ") || "🆓 Free";
}

function rarityBadge(r) {
  return { common: "⚪ Common", rare: "🔵 Rare", legendary: "🟡 Legendary" }[r] ?? r ?? "";
}

const DIV = "╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌";

// ─── Main menu ────────────────────────────────────────────────────────────────

function buildMainMenu(coins, orbs, gems) {
  const catLines = Object.entries(SHOP_CATEGORIES).map(([key, cat]) => {
    const count = Object.values(shopItems).filter(i => i.category === key).length;
    return `${cat.emoji} *.shop ${key}*\n┃   └ _${cat.label}_ (${count} items)`;
  }).join("\n");

  return [
    `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
    `┃  ⚔️  *ケ リ ン  S H O P*  🏯  ┃`,
    `┃   ✨ _Anime RPG Marketplace_ ✨  ┃`,
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
    `┃`,
    `┃  💼 *お財布 — Your Wallet*`,
    `┃  🪙 ${fmtCoins(coins)}  ·  🔮 ${orbs}  ·  💎 ${gems}`,
    `┃`,
    `${DIV}`,
    `┃  📂 *カテゴリー — Categories*`,
    `${DIV}`,
    catLines,
    `${DIV}`,
    `🛒 *.shop <category>* — Browse items`,
    `💳 *.shop buy <number>* — Purchase`,
    `📦 *.inventory* — Your items`,
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
  ].join("\n");
}

// ─── Category list ────────────────────────────────────────────────────────────

function buildCategoryList(catKey) {
  const cat   = SHOP_CATEGORIES[catKey];
  const items = Object.entries(shopItems).filter(([, i]) => i.category === catKey);

  if (items.length === 0) {
    return `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n┃  ❌ No items in this category\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
  }

  const allKeys = Object.keys(shopItems);

  const itemLines = items.map(([name, item]) => {
    const num  = allKeys.indexOf(name) + 1;
    const displayName = name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return [
      `*${num}.* ${item.emoji}  *${displayName}*`,
      item.description ? `┃    📖 _${item.description}_` : null,
      `┃    💰 ꔫ ${costLine(item)}`,
      `┃    ${rarityBadge(item.rarity)}  ·  ⭐ +${item.xpBonus ?? 0} XP`,
    ].filter(Boolean).join("\n");
  }).join(`\n${DIV}\n`);

  const catTitle = cat.label.toUpperCase();

  return [
    `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
    `┃  ${cat.emoji}  *${catTitle}*`,
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
    `┃`,
    itemLines,
    `┃`,
    `${DIV}`,
    `🛒 *.shop buy <number>* to purchase~`,
    `🔙 *.shop* to return to menu`,
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
  ].join("\n");
}

// ─── Buy handler ─────────────────────────────────────────────────────────────

async function handleBuy(sock, msg, jid, sender, args) {
  const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

  const itemNumber  = Number(args[1]);
  const orderedItems = Object.entries(shopItems);
  const selected    = Number.isInteger(itemNumber) && itemNumber >= 1
    ? orderedItems[itemNumber - 1]
    : null;

  if (!selected) {
    return reply(
      [
        `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
        `┃  ❌ *番号が無効です！*`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
        ``,
        `_Invalid item number!_`,
        `Browse a category first, then use the number shown.`,
        ``,
        `Example: *.shop weapons* → *.shop buy 1*`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
      ].join("\n")
    );
  }

  const [itemName, item] = selected;
  const user = await getUser(sender);

  const userCoins = user.money    ?? 0;
  const userOrbs  = user.orbs     ?? 0;
  const userGems  = user.diamonds ?? 0;
  const needCoins = item.price    ?? 0;
  const needOrbs  = item.orbCost  ?? 0;
  const needGems  = item.gemCost  ?? 0;

  const shortCoins = Math.max(0, needCoins - userCoins);
  const shortOrbs  = Math.max(0, needOrbs  - userOrbs);
  const shortGems  = Math.max(0, needGems  - userGems);

  const displayName = itemName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  // ── Insufficient funds ───────────────────────────────────────────────────
  if (shortCoins > 0 || shortOrbs > 0 || shortGems > 0) {
    const shortLines = [];
    if (shortCoins > 0) shortLines.push(`┃  🪙 _Need ${fmtCoins(shortCoins)} more Coins_`);
    if (shortOrbs  > 0) shortLines.push(`┃  🔮 _Need ${shortOrbs} more Orbs_`);
    if (shortGems  > 0) shortLines.push(`┃  💎 _Need ${shortGems} more Diamonds_`);

    return reply(
      [
        `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
        `┃  💸 *残 高 不 足！* 💸`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
        `┃`,
        `┃  ${item.emoji}  *${displayName}*`,
        `┃`,
        `${DIV}`,
        `┃  💰 Cost  ꔫ ${costLine(item)}`,
        `┃  💳 Yours ꔫ 🪙 ${fmtCoins(userCoins)}  ·  🔮 ${userOrbs}  ·  💎 ${userGems}`,
        `${DIV}`,
        ...shortLines,
        `${DIV}`,
        `┃  💡 _.daily .work .fish .dig_`,
        `┃     _to earn more currencies~_`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
      ].join("\n")
    );
  }

  // ── Purchase ──────────────────────────────────────────────────────────────
  user.money    = userCoins - needCoins;
  user.orbs     = userOrbs  - needOrbs;
  user.diamonds = userGems  - needGems;
  user.xp       = (user.xp || 0) + (item.xpBonus || 0);
  user.inventory = user.inventory || [];
  user.inventory.push(itemName);
  await saveUser(sender, user);

  return reply(
    [
      `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
      `┃  ✅ *購 入 完 了 ！* ✅   ┃`,
      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
      `┃`,
      `┃  ${item.emoji}  *${displayName}*`,
      item.description ? `┃  📖 _${item.description}_` : null,
      `┃`,
      `${DIV}`,
      `┃  💰 Paid  ꔫ ${costLine(item)}`,
      `┃  ⭐ XP    ꔫ +${item.xpBonus ?? 0}`,
      `${DIV}`,
      `┃  💼 Wallet ꔫ 🪙 ${fmtCoins(user.money)}  ·  🔮 ${user.orbs}  ·  💎 ${user.diamonds}`,
      `${DIV}`,
      `┃  📦 *.inventory* to see your items！`,
      `┃  _やった！ Item acquired~_ 🌸`,
      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
    ].filter(Boolean).join("\n")
  );
}

// ─── Command export ───────────────────────────────────────────────────────────

export default {
  name:        "shop",
  aliases:     ["store", "market", "buy"],
  description: "Browse and buy items from the Anime RPG Shop",
  category:    "economy",
  cooldown:    6,
  usage:       ".shop [category] | .shop buy <number>",

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const sub   = (args[0] || "").toLowerCase();

    // ── Buy ──────────────────────────────────────────────────────────────────
    if (sub === "buy") {
      return handleBuy(sock, msg, jid, sender, args);
    }

    // ── Category aliases ─────────────────────────────────────────────────────
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

    if (catKey) return reply(buildCategoryList(catKey));

    // ── Main menu ─────────────────────────────────────────────────────────────
    if (!sub || sub === "list" || sub === "menu" || sub === "help") {
      const user = await getUser(sender);
      return reply(buildMainMenu(user.money ?? 0, user.orbs ?? 0, user.diamonds ?? 0));
    }

    // ── Unknown ───────────────────────────────────────────────────────────────
    return reply(
      [
        `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
        `┃  ❓ *Unknown:* _${sub}_`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
        `Use *.shop* to see all categories~`,
      ].join("\n")
    );
  },
};
