/**
 * plugins/naruto/ninventory.js
 * View and use ninja items.
 *
 * Rules:
 *  - consumable / battle / boost items → usable ONLY during an active hunt (.nhunt)
 *    or PvP battle (.nbattle). Attempting to use them outside combat shows a clear error.
 *  - special items (XP scrolls, bounty vouchers, etc.) → usable any time.
 *  - weapon / armor — passive stat gear, no direct "use" action.
 */

import players from "../../lib/naruto/players.js";
import items   from "../../lib/naruto/items.js";
import { getHunt }           from "../../lib/huntState.mjs";
import { getBattleByPlayer } from "../../lib/battleState.mjs";
import { sendWithClanImage, sendWithNarutoTheme } from "../../lib/gifHelper.mjs";

/** Item types that are COMBAT-ONLY (cannot be used from inventory outside battle). */
const COMBAT_ONLY_TYPES = new Set(["consumable", "battle", "boost"]);

export default {
  name:        "ninventory",
  description: "View and use ninja items",
  category:    "naruto",
  usage:       ".ninventory | .ninventory <item_id>",
  aliases:     ["ninv", "nbag"],

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    try {
      const player = await players.get(sender);
      if (!player) {
        return sock.sendMessage(jid, {
          text: "🥷 You don't have a ninja profile.\n\nUse *.nstart* first."
        }, { quoted: msg });
      }

      /** Send with the player's clan character art, or the fallback theme. */
      const sendReply = async (caption) => {
        if (player.clan?.name) {
          return sendWithClanImage(sock, jid, msg, caption, player.clan.name, "inventory");
        }
        return sendWithNarutoTheme(sock, jid, msg, caption, "inventory");
      };

      const inventory = Array.isArray(player.inventory) ? player.inventory : [];

      // ── VIEW INVENTORY (no argument) ─────────────────────────────────────
      if (!text) {
        if (!inventory.length) {
          return sendReply(
`🎒 *NINJA INVENTORY*

🥷 ${player.username}

Your inventory is empty.

Visit *.nshop* to buy items.`
          );
        }

        // Group items by type for readability
        const groups = {};
        for (const inv of inventory) {
          const def  = items.find(x => x.id === inv.id);
          const type = def?.type || "other";
          if (!groups[type]) groups[type] = [];
          const desc = def?.description ? ` — ${def.description}` : "";
          const badge = COMBAT_ONLY_TYPES.has(type) ? " ⚔️" : "";
          groups[type].push(`• *${def?.name || inv.id}* ×${inv.amount || 1}${badge}  \`${inv.id}\`\n  _${def?.description || ""}_`);
        }

        const typeLabels = {
          consumable: "💊 Consumables _(use in battle/hunt)_",
          battle:     "💣 Battle Items _(use in battle/hunt)_",
          boost:      "⬆️ Boost Items _(use in battle/hunt)_",
          weapon:     "⚔️ Weapons _(passive ATK bonus)_",
          armor:      "🛡️ Armor _(passive DEF bonus)_",
          special:    "⭐ Special Items _(use any time)_",
          other:      "📦 Other",
        };

        const sections = Object.entries(groups)
          .map(([type, lines]) => `${typeLabels[type] || type}\n${lines.join("\n")}`)
          .join("\n\n");

        return sendReply(
`🎒 *NINJA INVENTORY*

🥷 *${player.username}*
❤️ HP: ${player.hp}/${player.maxHp}  💙 Chakra: ${player.chakra}/${player.maxChakra}

${sections}

⚔️ _= usable only during .nhunt or .nbattle_

*To use a combat item:* *.nhunt item <id>* or *.nbattle item <id>*
*To use a special item:* *.ninventory <id>*`
        );
      }

      // ── USE ITEM ─────────────────────────────────────────────────────────
      const itemId   = text.trim().toLowerCase().split(/\s+/)[0];
      const invIndex = inventory.findIndex(i => i.id === itemId);

      if (invIndex === -1) {
        return sock.sendMessage(jid, {
          text: `❌ You don't have \`${itemId}\` in your bag.\n\nUse *.ninventory* to see what you own.`
        }, { quoted: msg });
      }

      const itemDef = items.find(i => i.id === itemId);
      if (!itemDef) {
        return sock.sendMessage(jid, { text: "❌ Unknown item." }, { quoted: msg });
      }

      // ── Combat-only items: block outside active battle/hunt ───────────────
      if (COMBAT_ONLY_TYPES.has(itemDef.type)) {
        const inHunt   = !!getHunt(sender);
        const inBattle = !!getBattleByPlayer(sender);

        if (!inHunt && !inBattle) {
          return sock.sendMessage(jid, {
            text: [
              `⚔️ *${itemDef.name}* can only be used during combat!`,
              ``,
              `Start a hunt with *.nhunt*, then use:`,
              `  *.nhunt item ${itemId}*`,
              ``,
              `Or use it in a PvP battle via *.nbattle item ${itemId}*`,
            ].join("\n")
          }, { quoted: msg });
        }

        // In combat — redirect to the right command
        if (inHunt) {
          return sock.sendMessage(jid, {
            text: `⚔️ You're in a hunt! Use *.nhunt item ${itemId}* to apply it in battle.`
          }, { quoted: msg });
        }
        if (inBattle) {
          return sock.sendMessage(jid, {
            text: `⚔️ You're in a PvP battle! Use *.nbattle item ${itemId}* to apply it.`
          }, { quoted: msg });
        }
      }

      // ── Special items: usable any time ───────────────────────────────────
      if (itemDef.type !== "special") {
        return sock.sendMessage(jid, {
          text: `❌ *${itemDef.name}* (type: ${itemDef.type}) cannot be used directly from your bag.`
        }, { quoted: msg });
      }

      const effects = [];

      if (itemDef.xp) {
        player.xp += itemDef.xp;
        effects.push(`✨ Gained ${itemDef.xp} XP`);
      }
      if (itemDef.ryo) {
        player.ryo += itemDef.ryo;
        effects.push(`💰 Gained ${itemDef.ryo} Ryo`);
      }

      // Level-up check after XP gain
      let levelsGained = 0;
      while (player.xp >= player.xpNeeded) {
        player.xp       -= player.xpNeeded;
        player.level++;
        player.xpNeeded  = Math.floor(player.xpNeeded * 1.25);
        player.maxHp    += 20;
        player.maxChakra += 15;
        player.attack   += 3;
        player.defense  += 2;
        player.speed    += 2;
        player.hp        = player.maxHp;
        player.chakra    = player.maxChakra;
        levelsGained++;
      }

      // Consume one from stack
      player.inventory[invIndex].amount = (player.inventory[invIndex].amount || 1) - 1;
      if (player.inventory[invIndex].amount <= 0) player.inventory.splice(invIndex, 1);

      await player.save();

      return sendReply(
`✅ *ITEM USED*

🎒 *${itemDef.name}*
📝 ${itemDef.description}

${effects.join("\n") || "No immediate effect."}
${levelsGained > 0 ? `\n🎉 *LEVEL UP ×${levelsGained}!* You are now *Lv ${player.level}*!` : ""}`
      );

    } catch (err) {
      console.error("NINVENTORY ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Inventory error." }, { quoted: msg });
    }
  },
};
