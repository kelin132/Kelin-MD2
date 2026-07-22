// plugins/pokemon/bag.js
// Show everything a trainer has in their bag, grouped by category

import { getTrainer } from "../../lib/pokemon/players.mjs";
import { MART_ITEMS } from "../../lib/pokemon/martItems.mjs";

// Category display order and labels
const CAT_META = {
  ball:    { label: "🎾 *POKÉBALLS*",           hint: (k) => `\`.battle pokeball ${k}\`` },
  heal:    { label: "💊 *HEALING ITEMS*",        hint: (k) => `\`.battle item ${k}\`` },
  battle:  { label: "⚔️  *BATTLE ITEMS*",        hint: (k) => `\`.battle item ${k}\`` },
  stone:   { label: "🪨 *EVOLUTION STONES*",     hint: (k) => `\`.evolve <pokémon> ${k}\`` },
  cure:    { label: "🩹 *STATUS CURES*",         hint: (k) => `\`.battle item ${k}\`` },
  vitamin: { label: "💊 *VITAMINS & BOOSTERS*",  hint: (k) => `\`.use ${k} <pokémon>\`` },
  key:     { label: "🔑 *KEY ITEMS*",            hint: (k) => k === "keystone" ? `\`.equip <pokémon>\`` : `\`.use ${k}\`` },
  other:   { label: "🎒 *OTHER ITEMS*",          hint: (k) => `\`.use ${k}\`` },
};

export default {
  name: "bag",
  aliases: ["inventory", "inv", "items"],
  description: "View everything in your trainer bag",
  category: "pokemon",
  usage: ".bag",
  cooldown: 5,

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }

    const inv = trainer.inventory || {};

    // Group owned items by category
    const groups = {};
    let totalItems = 0;

    for (const [key, qty] of Object.entries(inv)) {
      if (!qty || qty <= 0) continue;
      const itemData = MART_ITEMS[key];
      const cat      = itemData?.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({
        key,
        qty,
        emoji: itemData?.emoji || "📦",
        name:  itemData?.name  || key,
        desc:  itemData?.desc  || "",
      });
      totalItems += qty;
    }

    if (totalItems === 0) {
      return sock.sendMessage(jid, {
        text:
`🎒 *${trainer.username}'s BAG*

Your bag is empty!
Visit *.mart* to buy items.`,
      }, { quoted: msg });
    }

    // Build sections in defined order
    const catOrder = ["ball", "heal", "cure", "battle", "vitamin", "stone", "key", "other"];
    const sections = catOrder
      .filter(cat => groups[cat] && groups[cat].length > 0)
      .map(cat => {
        const meta  = CAT_META[cat] || CAT_META.other;
        const lines = groups[cat].map(it => {
          const hint = meta.hint(it.key);
          return `  ${it.emoji} *${it.name}* × *${it.qty}*\n    ↳ ${it.desc}\n    ↳ ${hint}`;
        }).join("\n");
        return `${meta.label}\n${lines}`;
      })
      .join("\n\n");

    await sock.sendMessage(jid, {
      text:
`🎒 *${trainer.username}'s BAG* (${totalItems} item${totalItems !== 1 ? "s" : ""})

${sections}

━━━━━━━━━━━━━━━━━━━━
🛒 Buy more at *.mart*
⚔️ Use items in battle: \`.battle item\``,
    }, { quoted: msg });
  },
};
