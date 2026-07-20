// plugins/naruto/nshop.js

import players from "../../lib/naruto/players.js";
import items from "../../lib/naruto/items.js";
import { sendWithGif } from "../../lib/gifHelper.mjs";

export default {
  name: "nshop",
  description: "Buy ninja items",
  category: "naruto",
  usage: ".nshop [item_id]",

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    try {
      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(jid, {
          text: "🥷 You don't have a ninja profile.\n\nUse .nstart first."
        }, { quoted: msg });
      }

      // No argument — show shop
      if (!text) {
        const shopList = items
          .map(i =>
`🛒 *${i.name}*
ID: \`${i.id}\`
💰 Price: ${i.price} Ryo
📝 ${i.description}`
          ).join("\n\n");

        return sendWithGif(sock, jid, msg,
`🏪 *NINJA SHOP*

${shopList}

💰 Your Ryo: ${player.ryo}

Use *.nshop <item_id>* to buy.
Example: .nshop small_hp_potion`, "anime shop");
      }

      const itemId = text.trim().toLowerCase();
      const item   = items.find(i => i.id === itemId);

      if (!item) {
        return sock.sendMessage(jid, {
          text: `❌ Item "*${itemId}*" not found.\n\nUse .nshop to see available items.`
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

      await player.save();

      return sendWithGif(sock, jid, msg,
`✅ *PURCHASE COMPLETE*

🛒 ${item.name}
📝 ${item.description}
💰 Paid: ${item.price} Ryo
💳 Remaining: ${player.ryo} Ryo

Use .ninventory to view and use items.`, "anime shopping");

    } catch (err) {
      console.error("NSHOP ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Shop error." }, { quoted: msg });
    }
  }
};
