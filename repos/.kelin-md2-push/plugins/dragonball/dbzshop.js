/**
 * KELIN MD — .dbzshop command (Dragon Ball Z Edition)
 * Browse and purchase items using coins.
 * Layout mirrors the economy shop: ╭━━╮ borders, ꔫ separators, themed text.
 */

import players from "../../lib/dragonball/players.js";
import { DBZ_SHOP_ITEMS, DBZ_SHOP_CATEGORIES } from "../../lib/dragonball/shopItems.js";
import { getRankName } from "../../lib/dragonball/utils.js";

function fmtCoins(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return `${n.toLocaleString()}`;
}

function costLine(item) {
  return `$${fmtCoins(item.price)} coins`;
}

function rarityBadge(r) {
  return { common: "⚪ Common", rare: "🔵 Rare", legendary: "🟡 Legendary" }[r] ?? r ?? "";
}

const DIV = "╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌";

function buildMainMenu(coins, hp, maxHp, ki, maxKi, level, rank) {
  const catLines = Object.entries(DBZ_SHOP_CATEGORIES).map(([key, cat]) => {
    const count = Object.entries(DBZ_SHOP_ITEMS).filter(([, i]) => i.category === key).length;
    return `${cat.emoji} *.dbzshop ${key}*\n┃   └ _${cat.label}_ (${count} items)`;
  }).join("\n");

  return [
    `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
    `┃  🐉  *D B Z   S H O P*  🐉  ┃`,
    `┃   ⚡ _Coins Marketplace_ ⚡  ┃`,
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
    `┃`,
    `┃  💰 *Your Coins*`,
    `┃  💰 Coins: ${fmtCoins(coins)}`,
    `┃`,
    `┃  📊 *Fighter Status*`,
    `┃  ⭐ Lv ${level}  ·  ${rank}`,
    `┃  ❤️ ${hp}/${maxHp}  ·  💠 ${ki}/${maxKi}`,
    `┃`,
    `${DIV}`,
    `┃  📂 *Categories*`,
    `${DIV}`,
    catLines,
    `${DIV}`,
    `🛒 *.dbzshop <category>* — Browse items`,
    `💳 *.dbzshop buy <number>* — Purchase`,
    `📦 *.dbzinventory* — Your items`,
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
  ].join("\n");
}

function buildCategoryList(catKey) {
  const cat   = DBZ_SHOP_CATEGORIES[catKey];
  const items = Object.entries(DBZ_SHOP_ITEMS).filter(([, i]) => i.category === catKey);

  if (items.length === 0) {
    return `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n┃  ❌ No items in this category\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
  }

  const allKeys = Object.keys(DBZ_SHOP_ITEMS);

  const itemLines = items.map(([name, item]) => {
    const num  = allKeys.indexOf(name) + 1;
    const displayName = name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return [
      `*${num}.* ${item.emoji}  *${displayName}*`,
      item.description ? `┃    📖 _${item.description}_` : null,
      `┃    💰 ꔫ ${costLine(item)}`,
      `┃    ${rarityBadge(item.rarity)}`,
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
    `🛒 *.dbzshop buy <number>* to purchase~`,
    `🔙 *.dbzshop* to return to menu`,
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
  ].join("\n");
}

async function handleBuy(sock, msg, jid, sender, args) {
  const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

  const itemNumber  = Number(args[1]);
  const orderedItems = Object.entries(DBZ_SHOP_ITEMS);
  const selected    = Number.isInteger(itemNumber) && itemNumber >= 1
    ? orderedItems[itemNumber - 1]
    : null;

  if (!selected) {
    return reply(
      [
        `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
        `┃  ❌ *Invalid item number!*`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
        ``,
        `Browse a category first, then use the number shown.`,
        ``,
        `Example: *.dbzshop beans* → *.dbzshop buy 1*`,
      ].join("\n")
    );
  }

  const [itemKey, item] = selected;
  const player = await players.get(sender);

  if (!player) {
    return reply("🐉 You don't have a fighter yet!\nUse *.dbzstart* to create one.");
  }

  const displayName = itemKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  if (item.useEffect?.startsWith("learn:")) {
    const techId = item.useEffect.split(":")[1];
    if ((player.techniques || []).includes(techId)) {
      return reply(
        [
          `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
          `┃  ⚠️  *Already learned!*`,
          `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
          `┃`,
          `┃  ${item.emoji}  *${displayName}*`,
          `┃  You already know this technique!`,
        ].join("\n")
      );
    }
  }

  if (item.category === "gear" && (player.inventory || []).includes(itemKey)) {
    return reply(
      [
        `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
        `┃  ⚠️  *Already owned!*`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
          `┃`,
          `┃  ${item.emoji}  *${displayName}*`,
          `┃  You already have this gear equipped!`,
      ].join("\n")
    );
  }

  if ((player.zeni || 0) < item.price) {
    const short = item.price - (player.zeni || 0);
    return reply(
      [
        `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
        `┃  💸 *Not enough coins!* 💸`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
        `┃`,
        `┃  ${item.emoji}  *${displayName}*`,
        `┃`,
        `${DIV}`,
        `┃  💰 Cost  ꔫ ${costLine(item)}`,
        `┃  💳 Yours ꔫ $${fmtCoins(player.zeni || 0)} coins`,
        `${DIV}`,
        `┃  ❌ _Need ${fmtCoins(short)} more coins_`,
        `${DIV}`,
        `┃  💡 _.dbztrain .dbzhunt .dbzchallenge_`,
        `┃     _to earn more coins~_`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
      ].join("\n")
    );
  }

  const updated = await players.spendZeni(sender, item.price);
  if (!updated) {
    return reply("❌ Purchase failed — please try again.");
  }

  const inventory = player.inventory || [];
  inventory.push(itemKey);
  await players.update(sender, { $set: { inventory } });

  return reply(
    [
      `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
      `┃  ✅ *Purchase Complete!* ✅   ┃`,
      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
      `┃`,
      `┃  ${item.emoji}  *${displayName}*`,
      item.description ? `┃  📖 _${item.description}_` : null,
      `┃`,
      `${DIV}`,
      `┃  💰 Paid  ꔫ ${costLine(item)}`,
      `┃  💳 Wallet ꔫ $${fmtCoins(updated.zeni)} coins`,
      `${DIV}`,
      `┃  📦 *.dbzinventory* to see your items`,
      `┃  ✨ _.dbzuse <name>_ to use items!`,
      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
    ].filter(Boolean).join("\n")
  );
}

export default {
  name:        "dbzshop",
  aliases:     ["dbzstore", "dbzmarket", "dbzbuy"],
  description: "Browse and buy items from the DBZ Shop",
  category:    "dragonball",
  cooldown:    4,
  usage:       ".dbzshop [category] | .dbzshop buy <number>",

  async run({ sock, msg, sender, args }) {
    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const sub   = (args[0] || "").toLowerCase();

    const player = await players.get(sender);
    if (!player) {
      return reply("🐉 You don't have a fighter yet!\nUse *.dbzstart* to create one.");
    }

    if (sub === "buy") {
      return handleBuy(sock, msg, jid, sender, args);
    }

    const catAlias = {
      potion: "potions", heal: "potions", recovery: "potions",
      scroll: "scrolls", skill: "scrolls", learn: "scrolls", technique: "scrolls",
      gear: "gear", weapon: "gear", equipment: "gear", armor: "gear",
      boost: "boosts", power: "boosts", buff: "boosts",
      bean: "beans", senzu: "beans", food: "beans",
    };

    const catKeys = Object.keys(DBZ_SHOP_CATEGORIES);
    const catKey  = catAlias[sub] || (catKeys.includes(sub) ? sub : null);

    if (catKey) return reply(buildCategoryList(catKey));

    if (!sub || sub === "list" || sub === "menu" || sub === "help") {
      return reply(buildMainMenu(
        player.zeni || 0,
        player.hp || 0,
        player.maxHp || 100,
        player.ki || 0,
        player.maxKi || 80,
        player.level || 1,
        getRankName(player.level || 1)
      ));
    }

    return reply(
      [
        `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
        `┃  ❓ *Unknown:* _${sub}_`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
        `Use *.dbzshop* to see all categories~`,
      ].join("\n")
    );
  },
};
