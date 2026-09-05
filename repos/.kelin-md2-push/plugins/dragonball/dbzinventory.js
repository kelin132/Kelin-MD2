/**
 * KELIN MD — .dbzinventory command
 * View items purchased from the DBZ shop.
 */

import players from "../../lib/dragonball/players.js";
import { DBZ_SHOP_ITEMS } from "../../lib/dragonball/shopItems.js";

const DIV = "╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌";

function prettyName(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default {
  name: "dbzinventory",
  aliases: ["dbzinv", "dbzitems", "dbzbag"],
  description: "View your DBZ items and gear",
  category: "dragonball",
  cooldown: 3,
  usage: ".dbzinventory",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

    const player = await players.get(sender);
    if (!player) {
      return reply("🐉 You don't have a fighter yet!\nUse *.dbzstart* to create one.");
    }

    const inv = player.inventory || [];

    if (inv.length === 0) {
      return reply(
        [
          `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
          `┃  📦 *DBZ Inventory*`,
          `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
          `┃`,
          `┃  Your inventory is empty!`,
          `┃`,
          `${DIV}`,
          `🛒 Visit *.dbzshop* to buy items~`,
          `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
        ].join("\n")
      );
    }

    const counts = {};
    for (const item of inv) {
      counts[item] = (counts[item] || 0) + 1;
    }

    const itemLines = Object.entries(counts).map(([key, count]) => {
      const def  = DBZ_SHOP_ITEMS[key];
      const emoji = def?.emoji || "📦";
      const name  = prettyName(key);
      const qty   = count > 1 ? ` x${count}` : "";
      return `┃  ${emoji}  *${name}*${qty}`;
    }).join("\n");

    return reply(
      [
        `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮`,
        `┃  📦 *DBZ Inventory*`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
        `┃`,
        itemLines,
        `┃`,
        `${DIV}`,
        `✨ _.dbzuse <name>_ to use an item`,
        `🛒 _.dbzshop_ to buy more items`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
      ].join("\n")
    );
  },
};
