// plugins/pokemon/bag.js
// Show everything a trainer has in their bag, grouped by category

import { getTrainer } from "../../lib/pokemon/players.mjs";
import { MART_ITEMS } from "../../lib/pokemon/martItems.mjs";
import { formatAnimeLeaderboard } from "../../lib/animeLeaderboard.mjs";

// Category display order and labels
const CAT_META = {
  ball:    { label: "🎾 *POKÉBALLS*",           hint: (k) => `\`\`.battle pokeball ${k}\`\` ` },
  heal:    { label: "💊 *HEALING ITEMS*",        hint: (k) => `\`\`.battle item ${k}\`\` ` },
  battle:  { label: "⚔️  *BATTLE ITEMS*",        hint: (k) => `\`\`.battle item ${k}\`\` ` },
  stone:   { label: "🪨 *EVOLUTION STONES*",     hint: (k) => `\`\`.evolve <pokémon> ${k}\`\` ` },
  mega:    { label: "💠 *MEGA EVOLUTION STONES*", hint: (k) => `\`\`.evolve <pokémon> ${k}\`\` ` },
  cure:    { label: "🩹 *STATUS CURES*",         hint: (k) => `\`\`.battle item ${k}\`\` ` },
  vitamin: { label: "💊 *VITAMINS & BOOSTERS*",  hint: (k) => `\`\`.use ${k} <pokémon>\`\` ` },
  key:     { label: "🔑 *KEY ITEMS*",            hint: (k) => k === "keystone" ? `\`\`.equip <pokémon>\`\` ` : `\`\`.item use ${k}\`\` ` },
  other:   { label: "🎒 *OTHER ITEMS*",          hint: (k) => `\`\`.use ${k}\`\` ` },
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
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use ``.startjourney``" }, { quoted: msg });
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
Visit \`\`.mart\`\` to buy items.`,
      }, { quoted: msg });
    }

    // Render inventory rows with the same boxed leaderboard layout as `.lb`.
    const catOrder = ["ball", "heal", "cure", "battle", "vitamin", "stone", "mega", "key", "other"];
    const rows = catOrder
      .filter(cat => groups[cat] && groups[cat].length > 0)
      .flatMap(cat => {
        const meta = CAT_META[cat] || CAT_META.other;
        return groups[cat].map(it => ({
          name: `${it.emoji} ${it.name}`,
          valueText: `🎒 × \`\`${it.qty}\`\` · ${it.desc || "No description"}\n│    ↳ ${meta.hint(it.key)}`,
        }));
      });

    const text = formatAnimeLeaderboard({
      title: "INVENTORY",
      subtitle: `${trainer.username}'S BAG · ${totalItems} ITEMS`,
      rows,
      valueIcon: "🎒",
      valueLabel: "ITEMS",
      footer: "🌸 AIDORU ITEMS",
      limit: rows.length,
    }) + "\n🛒 Buy more at ``.mart``\n⚔️ Use items with ``.battle item``";

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
