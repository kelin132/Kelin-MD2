/**
 * KELIN MD — DBZ Heal (plugins/dbz/dbzheal.js)
 * .dbzheal — restore your fighter to full HP
 * Parallel to Pokémon's potion/heal commands.
 */

import { getFighter, healFighter } from "../../lib/dbz/dbzDb.mjs";
import { hasBattle } from "../../lib/dbz/battleState.mjs";

const HEAL_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// Simple in-memory cooldown map (jid → lastHealTimestamp)
const cooldowns = new Map();

export default {
  name:        "dbzheal",
  aliases:     ["dbzrecover", "dbzrest"],
  description: "Heal your DBZ fighter to full HP (10 min cooldown)",
  category:    "dbz",
  usage:       ".dbzheal",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    if (hasBattle(jid)) {
      return sock.sendMessage(jid, {
        text: "❌ Cannot heal during a battle!",
      }, { quoted: msg });
    }

    const fighter = await getFighter(sender);
    if (!fighter) {
      return sock.sendMessage(jid, {
        text: "❌ You don't have a DBZ fighter!\nUse *.dbzselect* to pick your character.",
      }, { quoted: msg });
    }

    if (fighter.hp >= fighter.maxHp) {
      return sock.sendMessage(jid, {
        text: `✅ *${fighter.name}* is already at full health! ❤️ ${fighter.hp}/${fighter.maxHp}`,
      }, { quoted: msg });
    }

    // Cooldown check
    const last = cooldowns.get(sender) || 0;
    const remaining = HEAL_COOLDOWN_MS - (Date.now() - last);
    if (remaining > 0) {
      const mins = Math.ceil(remaining / 60000);
      return sock.sendMessage(jid, {
        text: `⏳ *${fighter.name}* is still recovering!\nCooldown: *${mins} minute(s)* remaining.`,
      }, { quoted: msg });
    }

    cooldowns.set(sender, Date.now());
    const healed = await healFighter(sender);

    await sock.sendMessage(jid, {
      text:
`💊 *${fighter.name} has been healed!*

❤️ HP: ${fighter.hp} → ${healed.maxHp}/${healed.maxHp} *(FULL!)*
💠 Ki: ${healed.ki}/${healed.maxKi}

Ready to fight! 💪
Use *.dbzfight* when a villain appears.`,
    }, { quoted: msg });
  },
};
