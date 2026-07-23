// plugins/pokemon/mart.js
// The Pokémon Mart — buy items with economy money
// 7 pages of items, .mart page <n> to navigate
// 30-second per-user cooldown on purchases

import { getTrainer, addItem, hasItem } from "../../lib/pokemon/players.mjs";
import { getMartPage, getItem, TOTAL_PAGES, PAGE_LABELS } from "../../lib/pokemon/martItems.mjs";
import { getUser, addMoney } from "../economy/database.js";
import { getBattle } from "../../lib/pokemon/battleState.mjs";

// 30-second buy cooldown per user
const buyCooldowns = new Map(); // jid → timestamp
const BUY_COOLDOWN_MS = 30_000;

export default {
  name: "mart",
  aliases: ["pokemart", "shop", "pokeshop"],
  description: "Visit the Pokémon Mart to buy items",
  category: "pokemon",
  usage: ".mart [buy <item> [qty]] [page <n>]",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }

    // Block mart use during an active battle
    const activeBattle = getBattle(jid);
    if (activeBattle && (activeBattle.challengerJid === sender || activeBattle.opponentJid === sender)) {
      return sock.sendMessage(jid, {
        text: "❌ You can't use the Mart during a battle!\nUse *.battle item* to access your bag, or finish the battle first.",
      }, { quoted: msg });
    }

    const sub = (args[0] || "").toLowerCase();

    // ── .mart page <n> ─────────────────────────────────────────────────────
    if (sub === "page") {
      const pageNum = parseInt(args[1]);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > TOTAL_PAGES) {
        return sock.sendMessage(jid, {
          text: `❌ Invalid page. Choose between *1* and *${TOTAL_PAGES}*.\nUse *.mart* to see the item index.`,
        }, { quoted: msg });
      }

      const econUser = await getUser(sender);
      const content  = getMartPage(pageNum);

      return sock.sendMessage(jid, {
        text:
`🏪 *POKÉMON MART — Page ${pageNum}/${TOTAL_PAGES}*
💵 Balance: *$${(econUser.money || 0).toLocaleString()}*

${content}

━━━━━━━━━━━━━━━━━━━━
📖 Pages: *.mart page 1–${TOTAL_PAGES}*
🛒 Buy:   *.mart buy <item> [qty]*`,
      }, { quoted: msg });
    }

    // ── .mart buy <item> [qty] ─────────────────────────────────────────────
    if (sub === "buy") {
      const itemKey = (args[1] || "").toLowerCase().replace(/\s/g, "");
      const qty     = Math.max(1, Math.min(99, parseInt(args[2]) || 1));

      if (!itemKey) {
        return sock.sendMessage(jid, {
          text: "Usage: *.mart buy <item> [qty]*\nExample: `.mart buy pokeball 5`\n\nUse *.mart* to browse pages.",
        }, { quoted: msg });
      }

      const itemData = getItem(itemKey);
      if (!itemData) {
        return sock.sendMessage(jid, {
          text: `❌ Item *${itemKey}* not found.\nUse *.mart* to browse all items.`,
        }, { quoted: msg });
      }

      // 30-second cooldown on buying
      const lastBuy = buyCooldowns.get(sender) || 0;
      const elapsed = Date.now() - lastBuy;
      if (elapsed < BUY_COOLDOWN_MS) {
        const remaining = Math.ceil((BUY_COOLDOWN_MS - elapsed) / 1000);
        return sock.sendMessage(jid, {
          text: `⏳ Please wait *${remaining}s* before buying again.`,
        }, { quoted: msg });
      }

      // Keystone: one per trainer
      if (itemKey === "keystone") {
        const alreadyHas = (trainer.inventory?.keystone || 0) > 0;
        if (alreadyHas) {
          return sock.sendMessage(jid, {
            text: `❌ You already own a *Key Stone*! A trainer can only hold one.\nUse *.equip <pokémon>* to attach it.`,
          }, { quoted: msg });
        }
        // Force qty 1
        if (qty > 1) {
          return sock.sendMessage(jid, {
            text: "❌ You can only buy *1 Key Stone* total.",
          }, { quoted: msg });
        }
      }

      const totalCost = itemData.price * qty;
      const econUser  = await getUser(sender);
      const balance   = econUser.money || 0;

      if (balance < totalCost) {
        return sock.sendMessage(jid, {
          text: `❌ Not enough money!\n💵 You have: *$${balance.toLocaleString()}*\n🏷️ Cost: *$${totalCost.toLocaleString()}* (${qty}x ${itemData.name})`,
        }, { quoted: msg });
      }

      buyCooldowns.set(sender, Date.now());
      await addMoney(sender, -totalCost);
      await addItem(sender, itemKey, qty);

      return sock.sendMessage(jid, {
        text:
`🛒 *PURCHASE SUCCESSFUL!*

${itemData.emoji} *${qty}x ${itemData.name}*
💵 Paid: *$${totalCost.toLocaleString()}*
💵 Balance: *$${(balance - totalCost).toLocaleString()}*

${itemData.desc}${itemKey === "keystone" ? "\n\n💎 Use *.equip <pokémon>* to attach it!" : ""}`,
      }, { quoted: msg });
    }

    // ── Default: show page index ────────────────────────────────────────────
    const econUser = await getUser(sender);
    const inv      = trainer.inventory || {};
    const ballCount = ["pokeball","greatball","ultraball","masterball","premierball","healball","duskball","netball","luxuryball","quickball","beastball"]
      .reduce((n, k) => n + (inv[k] || 0), 0);

    const pageIndex = Object.entries(PAGE_LABELS)
      .map(([n, label]) => `  *${n}.* ${label} → \`.mart page ${n}\``)
      .join("\n");

    await sock.sendMessage(jid, {
      text:
`🏪 *POKÉMON MART*
💵 Balance: *$${(econUser.money || 0).toLocaleString()}*
🎾 Pokéballs: ${ballCount}

*Choose a page to browse:*

${pageIndex}

━━━━━━━━━━━━━━━━━━━━
📖 Browse: *.mart page <1–${TOTAL_PAGES}>*
🛒 Buy:    *.mart buy <item> [qty]*
🎒 My bag: *.bag*`,
    }, { quoted: msg });
  },
};
