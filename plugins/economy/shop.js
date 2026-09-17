/**
 * .shop — only live economy items and bank services.
 *
 * Item numbers are global and stable for the current catalogue. Use the
 * number shown after browsing a category: .shop buy <number>.
 */

import { getUser, saveUser, requireRegistration } from "./database.js";
import { SHOP_ITEMS as shopItems, SHOP_CATEGORIES } from "./_items.js";
import { BANK_LIMIT_TIERS, bankLimitForUser, formatRyu } from "./currency.js";
import { grantGun, formatDuration } from "../../lib/economySecurity.mjs";

const DIV = "╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌";

function costLine(item) {
  const parts = [];
  if (item.price > 0) parts.push(formatRyu(item.price));
  if (item.orbCost > 0) parts.push(`🔮 ${item.orbCost}`);
  if (item.gemCost > 0) parts.push(`💎 ${item.gemCost}`);
  return parts.join("  ·  ") || "🆓 Free";
}

function rarityBadge(rarity) {
  return { common: "⚪ Common", rare: "🔵 Rare", legendary: "🟡 Legendary" }[rarity]
    ?? rarity
    ?? "";
}

function displayName(name) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildMainMenu(coins, orbs, gems) {
  const catLines = Object.entries(SHOP_CATEGORIES)
    .map(([key, category]) => {
      const count = Object.values(shopItems).filter((item) => item.category === key).length;
      return `${category.emoji} *.shop ${key}*\n┃   └ _${category.label}_ (${count} items)`;
    })
    .join("\n");

  return [
    "╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮",
    "┃  ⚔️  *ケ リ ン  S H O P*  🏯  ┃",
    "┃   ✨ _Live Economy Shop_ ✨   ┃",
    "╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯",
    "┃",
    "┃  💼 *お財布 — Your Wallet*",
    `┃  ${formatRyu(coins)}  ·  🔮 ${orbs}  ·  💎 ${gems}`,
    "┃",
    DIV,
    "┃  📂 *カテゴリー — Categories*",
    DIV,
    catLines,
    DIV,
    "🛒 *.shop <category>* — Browse items",
    "💳 *.shop buy <number>* — Purchase",
    "📦 *.inventory* — Your items",
    "💰 *.sell <item>* — Sell an item",
    "╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯",
  ].join("\n");
}

function buildCategoryList(categoryKey) {
  const category = SHOP_CATEGORIES[categoryKey];
  const entries = Object.entries(shopItems).filter(([, item]) => item.category === categoryKey);
  if (!entries.length) return "╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n┃  ❌ No items in this category\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯";

  const allKeys = Object.keys(shopItems);
  const itemLines = entries.map(([name, item]) => {
    const number = allKeys.indexOf(name) + 1;
    return [
      `*${number}.* ${item.emoji}  *${displayName(name)}*`,
      item.description ? `┃    📖 _${item.description}_` : null,
      `┃    💰 ꔫ ${costLine(item)}`,
      item.bankTier
        ? `┃    🏦 Tier ${item.bankTier} · limit ${formatRyu(BANK_LIMIT_TIERS[item.bankTier].limit)}`
        : `┃    ${rarityBadge(item.rarity)}  ·  ⭐ +${item.xpBonus ?? 0} XP`,
    ].filter(Boolean).join("\n");
  }).join(`\n${DIV}\n`);

  return [
    "╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮",
    `┃  ${category.emoji}  *${category.label.toUpperCase()}*`,
    "╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯",
    "┃",
    itemLines,
    "┃",
    DIV,
    "🛒 *.shop buy <number>* to purchase",
    "🔙 *.shop* to return to menu",
    "╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯",
  ].join("\n");
}

async function handleBuy(sock, msg, jid, sender, args) {
  const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
  const itemNumber = Number(args[0] === "buy" ? args[1] : args[0]);
  const entries = Object.entries(shopItems);
  const selected = Number.isInteger(itemNumber) && itemNumber >= 1
    ? entries[itemNumber - 1]
    : null;

  if (!selected) {
    return reply("❌ Invalid item number. Browse *.shop <category>* first, then use the number shown.");
  }

  const [itemName, item] = selected;
  const user = await getUser(sender);
  const userCoins = Number(user.money ?? 0);
  const userOrbs = Number(user.orbs ?? 0);
  const userGems = Number(user.diamonds ?? 0);
  const needCoins = Number(item.price ?? 0);
  const needOrbs = Number(item.orbCost ?? 0);
  const needGems = Number(item.gemCost ?? 0);

  const shortCoins = Math.max(0, needCoins - userCoins);
  const shortOrbs = Math.max(0, needOrbs - userOrbs);
  const shortGems = Math.max(0, needGems - userGems);
  if (shortCoins || shortOrbs || shortGems) {
    const missing = [];
    if (shortCoins) missing.push(`💰 Need ${formatRyu(shortCoins)} more`);
    if (shortOrbs) missing.push(`🔮 Need ${shortOrbs} more orbs`);
    if (shortGems) missing.push(`💎 Need ${shortGems} more diamonds`);
    return reply(`💸 *Insufficient funds for ${displayName(itemName)}*\n\n${missing.join("\n")}`);
  }

  // Bank upgrades are services. They never pollute the inventory or become
  // sellable items, and they must be purchased one tier at a time.
  if (item.bankTier) {
    const currentTier = Math.max(0, Math.floor(Number(user.bankUpgradeLevel) || 0));
    if (item.bankTier <= currentTier) {
      return reply(`🏦 You already have this bank limit or a higher one (${formatRyu(bankLimitForUser(user))}).`);
    }
    if (item.bankTier !== currentTier + 1) {
      const next = BANK_LIMIT_TIERS[currentTier + 1];
      return reply(`🏦 Buy the next tier first: *${displayName(next.item)}* for ${formatRyu(next.price)}.`);
    }

    user.money = userCoins - needCoins;
    user.bankUpgradeLevel = item.bankTier;
    await saveUser(sender, user);
    return reply(
      `✅ *Bank limit upgraded!*\n\n` +
      `🏦 Tier ${item.bankTier}: ${formatRyu(BANK_LIMIT_TIERS[item.bankTier].limit)}\n` +
      `💸 Paid: ${formatRyu(needCoins)}\n` +
      `💰 Wallet: ${formatRyu(user.money)}`,
    );
  }

  user.money = userCoins - needCoins;
  user.orbs = userOrbs - needOrbs;
  user.diamonds = userGems - needGems;
  user.xp = (user.xp || 0) + (item.xpBonus || 0);
  user.inventory = Array.isArray(user.inventory) ? user.inventory : [];
  user.inventory.push(itemName);
  const gunExpiry = itemName === "gun" ? grantGun(user) : null;
  await saveUser(sender, user);

  return reply([
    "╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮",
    "┃  ✅ *購 入 完 了 ！* ✅   ┃",
    "╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯",
    "┃",
    `┃  ${item.emoji}  *${displayName(itemName)}*`,
    item.description ? `┃  📖 _${item.description}_` : null,
    "┃",
    DIV,
    `┃  💰 Paid  ꔫ ${costLine(item)}`,
    `┃  ⭐ XP    ꔫ +${item.xpBonus ?? 0}`,
    gunExpiry ? `┃  ⏳ Gun active for ${formatDuration(gunExpiry - Date.now())}` : null,
    DIV,
    `┃  💼 Wallet ꔫ ${formatRyu(user.money)}  ·  🔮 ${user.orbs}  ·  💎 ${user.diamonds}`,
    DIV,
    "┃  📦 *.inventory* to see your items",
    "╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯",
  ].filter(Boolean).join("\n"));
}

export default {
  name: "shop",
  aliases: ["store", "market", "buy"],
  description: "Browse and buy live economy items",
  category: "economy",
  cooldown: 6,
  usage: ".shop [category] | .shop buy <number>",

  async run({ sock, msg, sender, args, cmd }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const sub = (args[0] || "").toLowerCase();
    if (sub === "buy" || String(cmd || "").toLowerCase() === "buy") {
      return handleBuy(sock, msg, jid, sender, args);
    }

    const aliases = {
      weapon: "weapons", combat: "weapons", requirement: "weapons",
      tool: "tools", equipment: "tools", fishing: "tools",
      ticket: "consumables", consume: "consumables", boost: "consumables",
      potion: "potions", heal: "potions", recovery: "potions",
      scroll: "scrolls", special: "scrolls",
      bank: "banking", vault: "banking", limit: "banking",
    };
    const categoryKey = aliases[sub] || (Object.hasOwn(SHOP_CATEGORIES, sub) ? sub : null);
    if (categoryKey) return reply(buildCategoryList(categoryKey));

    if (!sub || ["list", "menu", "help"].includes(sub)) {
      const user = await getUser(sender);
      return reply(buildMainMenu(user.money ?? 0, user.orbs ?? 0, user.diamonds ?? 0));
    }
    return reply(`❓ Unknown shop section: *${sub}*\nUse *.shop* to see the live catalogue.`);
  },
};