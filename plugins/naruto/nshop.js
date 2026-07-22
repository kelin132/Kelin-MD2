// plugins/naruto/nshop.js
// Buy ninja items — shows Tsunade (Konoha's shop keeper / Hokage) art
// Supports buying by index number OR item_id

import players from "../../lib/naruto/players.js";
import items   from "../../lib/naruto/items.js";
import { sendWithCharacterImage } from "../../lib/gifHelper.mjs";

export default {
  name: "nshop",
  description: "Buy ninja items",
  category: "naruto",
  usage: ".nshop [index or item_id]",
  cooldown: 120,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;
    const SHOP_COOLDOWN_MS = 120 * 1000;

    try {
      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(jid, {
          text: "🥷 You don't have a ninja profile.\n\nUse .nstart first."
        }, { quoted: msg });
      }

      // No argument — show shop with numbered list
      if (!text) {
        const grouped = {};
        for (const i of items) {
          if (!grouped[i.type]) grouped[i.type] = [];
          grouped[i.type].push(i);
        }

        const typeEmoji = {
          consumable: "🧪", battle: "💣", weapon: "⚔️",
          armor: "🛡️", special: "📜", boost: "💫",
        };

        // Build a flat ordered list for index-based buying
        const orderedItems = [];
        for (const type of Object.keys(grouped)) {
          for (const i of grouped[type]) {
            orderedItems.push(i);
          }
        }

        const shopList = Object.entries(grouped).map(([type, arr]) => {
          const emoji = typeEmoji[type] || "📦";
          const lines = arr.map(i => {
            const idx = orderedItems.findIndex(x => x.id === i.id) + 1;
            return `  ${emoji} *[${idx}] ${i.name}* | 💰${i.price} Ryo\n     ${i.description}`;
          }).join("\n");
          return `*${type.toUpperCase()}*\n${lines}`;
        }).join("\n\n");

        return sendWithCharacterImage(sock, jid, msg,
`🏪 *NINJA SHOP*

${shopList}

💰 Your Ryo: ${player.ryo}

Use *.nshop <number>* or *.nshop <item_id>* to buy.
Example: .nshop 1   or   .nshop small_hp_potion`,
          "Tsunade", "shop");
      }

      // ── Resolve item by index or id ───────────────────────────────────────
      const input = text.trim();

      // Build flat ordered list (same order as display)
      const grouped = {};
      for (const i of items) {
        if (!grouped[i.type]) grouped[i.type] = [];
        grouped[i.type].push(i);
      }
      const orderedItems = [];
      for (const type of Object.keys(grouped)) {
        for (const i of grouped[type]) orderedItems.push(i);
      }

      let item;
      const idx = parseInt(input, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= orderedItems.length) {
        // Index-based purchase
        item = orderedItems[idx - 1];
      } else {
        // ID-based purchase (fallback)
        item = items.find(i => i.id === input.toLowerCase());
      }

      if (!item) {
        return sock.sendMessage(jid, {
          text: `❌ Item "*${input}*" not found.\n\nUse *.nshop* to see available items with their numbers.`
        }, { quoted: msg });
      }

      // Purchase cooldown
      const now = Date.now();
      if (player.cooldowns?.shop && now < player.cooldowns.shop) {
        const remaining = Math.ceil((player.cooldowns.shop - now) / 1000);
        return sock.sendMessage(jid, {
          text: `⏳ Tsunade is still processing your last order!\n\nWait *${remaining}s* before buying again.`
        }, { quoted: msg });
      }

      if (player.ryo < item.price) {
        return sock.sendMessage(jid, {
          text: `💰 Not enough Ryo!\n\nCost: ${item.price} Ryo\nYour Ryo: ${player.ryo}`
        }, { quoted: msg });
      }

      player.ryo -= item.price;

      if (!Array.isArray(player.inventory)) player.inventory = [];

      const existing = player.inventory.find(i => i.id === item.id);
      if (existing) {
        existing.amount = (existing.amount || 1) + 1;
      } else {
        player.inventory.push({ id: item.id, name: item.name, amount: 1 });
      }

      if (!player.cooldowns) player.cooldowns = {};
      player.cooldowns.shop = now + SHOP_COOLDOWN_MS;

      await player.save();

      return sendWithCharacterImage(sock, jid, msg,
`✅ *PURCHASE COMPLETE*

🛒 ${item.name}
📝 ${item.description}
💰 Paid: ${item.price} Ryo
💳 Remaining: ${player.ryo} Ryo

Use .ninventory to view and use items.`,
        "Tsunade", "shop");

    } catch (err) {
      console.error("NSHOP ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Shop error." }, { quoted: msg });
    }
  }
};
