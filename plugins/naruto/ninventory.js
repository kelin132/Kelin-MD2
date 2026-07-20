// plugins/naruto/ninventory.js

import players from "../../lib/naruto/players.js";
import items from "../../lib/naruto/items.js";
import { sendWithGif } from "../../lib/gifHelper.mjs";

export default {
  name: "ninventory",
  description: "View and use ninja items",
  category: "naruto",
  usage: ".ninventory [item_id]",
  aliases: ["ninv", "nbag"],

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    try {
      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(jid, {
          text: "🥷 You don't have a ninja profile.\n\nUse .nstart first."
        }, { quoted: msg });
      }

      // No argument — view inventory
      if (!text) {
        const inv = Array.isArray(player.inventory) && player.inventory.length
          ? player.inventory.map(i => `🎒 *${i.name}* ×${i.amount || 1}`).join("\n")
          : "Your inventory is empty.\n\nVisit .nshop to buy items.";

        return sendWithGif(sock, jid, msg,
`🎒 *NINJA INVENTORY*

🥷 ${player.username}

${inv}

Use *.ninventory <item_id>* to use an item.
Example: .ninventory small_hp_potion`, "ninja inventory bag");
      }

      const itemId    = text.trim().toLowerCase();
      const itemIndex = Array.isArray(player.inventory)
        ? player.inventory.findIndex(i => i.id === itemId)
        : -1;

      if (itemIndex === -1) {
        return sock.sendMessage(jid, {
          text: `❌ You don't have "*${itemId}*" in your bag.\n\nUse .ninventory to see what you own.`
        }, { quoted: msg });
      }

      const itemDef = items.find(i => i.id === itemId);
      if (!itemDef) {
        return sock.sendMessage(jid, { text: "❌ Invalid item." }, { quoted: msg });
      }

      let effects = [];

      if (itemDef.effect?.hp) {
        const healed   = Math.min(itemDef.effect.hp, player.maxHp - player.hp);
        player.hp      = Math.min(player.maxHp, player.hp + itemDef.effect.hp);
        effects.push(`❤️ Restored ${healed} HP (${player.hp}/${player.maxHp})`);
      }

      if (itemDef.effect?.chakra) {
        const restored  = Math.min(itemDef.effect.chakra, player.maxChakra - player.chakra);
        player.chakra   = Math.min(player.maxChakra, player.chakra + itemDef.effect.chakra);
        effects.push(`💙 Restored ${restored} Chakra (${player.chakra}/${player.maxChakra})`);
      }

      if (itemDef.xp) {
        player.xp += itemDef.xp;
        effects.push(`✨ Gained ${itemDef.xp} XP`);
      }

      // Remove 1 from stack
      player.inventory[itemIndex].amount = (player.inventory[itemIndex].amount || 1) - 1;
      if (player.inventory[itemIndex].amount <= 0) {
        player.inventory.splice(itemIndex, 1);
      }

      await player.save();

      return sendWithGif(sock, jid, msg,
`✅ *ITEM USED*

🎒 ${itemDef.name}
📝 ${itemDef.description}

${effects.join("\n") || "No effect."}`, "naruto potion heal");

    } catch (err) {
      console.error("NINVENTORY ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Inventory error." }, { quoted: msg });
    }
  }
};
