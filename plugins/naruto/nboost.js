// plugins/naruto/nboost.js
// View active stat boosts or use a boost item — shows Naruto/Guy art

import players from "../../lib/naruto/players.js";
import items from "../../lib/naruto/items.js";
import { sendWithCharacterImage } from "../../lib/gifHelper.mjs";

export default {
  name: "nboost",
  description: "View your active stat boosts or use a boost item",
  category: "naruto",
  usage: ".nboost [item_id]",
  aliases: ["nbuff"],
  cooldown: 5,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    try {
      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(jid, {
          text: "🥷 You don't have a ninja profile.\n\nUse .nstart first."
        }, { quoted: msg });
      }

      // No argument — show active boosts and available boost items
      if (!text) {
        const activeBoosts = Object.entries(player.boosts || {});

        let boostText = "";
        if (activeBoosts.length === 0) {
          boostText = "  _(No active boosts)_";
        } else {
          boostText = activeBoosts
            .map(([stat, b]) => `  ⬆️ +${b.amount} ${stat.toUpperCase()} — ${b.turns} turn(s) left`)
            .join("\n");
        }

        const boostItems = (player.inventory || [])
          .filter(inv => {
            const def = items.find(i => i.id === inv.id);
            return def && def.type === "boost";
          })
          .map(inv => {
            const def = items.find(i => i.id === inv.id);
            return `  💫 *${def.name}* ×${inv.amount || 1}  \`${inv.id}\` — ${def.description}`;
          });

        return sock.sendMessage(jid, {
          text:
`💫 *STAT BOOSTS*

*🔥 Active Boosts:*
${boostText}

*🎒 Boost Items in Inventory:*
${boostItems.length ? boostItems.join("\n") : "  _(None)_"}

Use *.nshop* to buy boost items.
Use *.nboost <item_id>* to activate a boost item.`
        }, { quoted: msg });
      }

      // Use a boost item
      const itemId = text.trim().toLowerCase();
      const itemDef = items.find(i => i.id === itemId && i.type === "boost");

      if (!itemDef) {
        return sock.sendMessage(jid, {
          text: `❌ Boost item "*${itemId}*" not found.\n\nUse .nboost to see your available boost items.`
        }, { quoted: msg });
      }

      const invItem = (player.inventory || []).find(i => i.id === itemId);
      if (!invItem || (invItem.amount || 1) < 1) {
        return sock.sendMessage(jid, {
          text: `❌ You don't have *${itemDef.name}* in your inventory.\n\nBuy it from *.nshop*.`
        }, { quoted: msg });
      }

      // Consume item
      invItem.amount = (invItem.amount || 1) - 1;
      if (invItem.amount <= 0) {
        player.inventory = player.inventory.filter(i => i.id !== itemId);
      }

      // Apply boost
      if (!player.boosts) player.boosts = {};
      const boostStat = itemDef.boostStat || "attack";
      player.boosts[boostStat] = {
        amount: itemDef.boostAmount || 10,
        turns: itemDef.boostTurns || 3,
      };

      await player.save();

      const char = ["Might Guy", "Rock Lee", "Naruto Uzumaki"][Math.floor(Math.random() * 3)];

      return sendWithCharacterImage(sock, jid, msg,
`💫 *BOOST ACTIVATED!*

🧪 ${itemDef.name}
📝 ${itemDef.description}

⬆️ +${itemDef.boostAmount || 10} ${(itemDef.boostStat || "attack").toUpperCase()}
⏳ Duration: ${itemDef.boostTurns || 3} battle turns

Boost active in your next battle! Use *.nboost* to check active buffs.`,
        char, "train");

    } catch (err) {
      console.error("NBOOST ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Boost error." }, { quoted: msg });
    }
  }
};
