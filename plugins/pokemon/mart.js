// plugins/pokemon/mart.js
// The Pokémon Mart — buy items with economy money

import { getTrainer, addItem } from "../../lib/pokemon/players.mjs";
import { getMartMenu, getItem } from "../../lib/pokemon/martItems.mjs";
import { getUser, addMoney } from "../economy/database.js";

export default {
  name: "mart",
  aliases: ["pokemart", "shop", "pokeshop"],
  description: "Visit the Pokémon Mart to buy items",
  category: "pokemon",
  usage: ".mart [buy <item> [qty]]",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }

    // Buy subcommand
    if (args[0]?.toLowerCase() === "buy") {
      const itemKey = (args[1] || "").toLowerCase().replace(/\s/g, "");
      const qty = Math.max(1, Math.min(99, parseInt(args[2]) || 1));

      if (!itemKey) {
        return sock.sendMessage(jid, {
          text: "Usage: *.mart buy <item> [qty]*\nExample: `.mart buy pokeball 5`\n\nUse *.mart* to see all items.",
        }, { quoted: msg });
      }

      const itemData = getItem(itemKey);
      if (!itemData) {
        return sock.sendMessage(jid, {
          text: `❌ Item *${itemKey}* not found in the mart.\nUse *.mart* to see available items.`,
        }, { quoted: msg });
      }

      const totalCost = itemData.price * qty;
      const econUser = await getUser(sender);
      const balance = econUser.money || 0;

      if (balance < totalCost) {
        return sock.sendMessage(jid, {
          text: `❌ Not enough money!\n💵 You have: *$${balance}*\n🏷️ Cost: *$${totalCost}* (${qty}x ${itemData.name})`,
        }, { quoted: msg });
      }

      await addMoney(sender, -totalCost);
      await addItem(sender, itemKey, qty);

      return sock.sendMessage(jid, {
        text:
`🛒 *PURCHASE SUCCESSFUL!*

${itemData.emoji} *${qty}x ${itemData.name}*
💵 Paid: *$${totalCost}*
💵 Balance: *$${balance - totalCost}*

${itemData.desc}`,
      }, { quoted: msg });
    }

    // Show mart menu
    const inv = trainer.inventory || {};
    const ballCount = (inv.pokeball || 0) + (inv.greatball || 0) + (inv.ultraball || 0) + (inv.masterball || 0);
    const econUser = await getUser(sender);

    await sock.sendMessage(jid, {
      text:
`🏪 *POKÉMON MART*
💵 Your balance: *$${econUser.money || 0}*
🎾 Pokéballs: ${ballCount}

${getMartMenu()}

*To buy:* \`.mart buy <item> [qty]\`
Example: \`.mart buy pokeball 5\`
Example: \`.mart buy thunderstone\``,
    }, { quoted: msg });
  },
};
