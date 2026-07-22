// plugins/pokemon/bag.js
// Show everything a trainer has in their bag

import { getTrainer } from "../../lib/pokemon/players.mjs";
import { MART_ITEMS } from "../../lib/pokemon/martItems.mjs";

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

    // Group items by category
    const categories = {
      ball:   { label: "🎾 *POKÉBALLS*",        items: [] },
      heal:   { label: "💊 *HEALING ITEMS*",     items: [] },
      battle: { label: "⚔️  *BATTLE ITEMS*",     items: [] },
      stone:  { label: "🪨 *EVOLUTION STONES*",  items: [] },
      key:    { label: "🔑 *KEY ITEMS*",          items: [] },
      other:  { label: "🎒 *OTHER ITEMS*",        items: [] },
    };

    let totalItems = 0;

    for (const [key, qty] of Object.entries(inv)) {
      if (!qty || qty <= 0) continue;
      const itemData = MART_ITEMS[key];
      const cat      = itemData?.category || "other";
      const group    = categories[cat] || categories.other;
      group.items.push({
        emoji: itemData?.emoji || "📦",
        name:  itemData?.name  || key,
        qty,
        desc:  itemData?.desc  || "",
        key,
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

    // Build sections
    const sections = Object.values(categories)
      .filter(c => c.items.length > 0)
      .map(c => {
        const lines = c.items.map(it => {
          const usageHint = it.key.includes("ball")
            ? `_(use in battle: \`.battle pokeball ${it.key}\`)_`
            : it.key === "potion" || it.key === "superpotion" || it.key === "hyperpotion" || it.key === "fullrestore" || it.key === "revive" || it.key === "maxrevive"
              ? `_(use in battle: \`.battle item ${it.key}\`)_`
              : it.key.startsWith("xattack") || it.key.startsWith("xdefense") || it.key.startsWith("xspeed")
                ? `_(use in battle: \`.battle item ${it.key}\`)_`
                : it.key.endsWith("stone")
                  ? `_(evolve: \`.evolve <pokémon> ${it.key}\`)_`
                  : "";
          return `  ${it.emoji} *${it.name}* × *${it.qty}*\n    ↳ ${it.desc}${usageHint ? `\n    ↳ ${usageHint}` : ""}`;
        }).join("\n");
        return `${c.label}\n${lines}`;
      })
      .join("\n\n");

    await sock.sendMessage(jid, {
      text:
`🎒 *${trainer.username}'s BAG* (${totalItems} item${totalItems !== 1 ? "s" : ""})

${sections}

━━━━━━━━━━━━━━━━━━━━
🛒 Buy more at *.mart*
⚔️ Use items mid-battle with \`.battle item\``,
    }, { quoted: msg });
  },
};
