/**
 * KELIN MD — .nboost (OWNER ONLY)
 * Directly boost any player's Naruto stats.
 *
 * Usage:
 *   .nboost @user <stat> <amount>        — boost one stat
 *   .nboost @user all <amount>           — boost all stats equally
 *   .nboost @user reset                  — wipe all boosts on a player
 *
 * Valid stats: hp, attack, defense, speed, chakra
 */
import players from "../../lib/naruto/players.js";

const VALID_STATS = ["hp", "attack", "defense", "speed", "chakra"];

export default {
  name: "nboost",
  description: "[OWNER] Directly boost a player's Naruto stats",
  category: "naruto",
  usage: ".nboost @user <stat|all|reset> [amount]",
  aliases: ["nbuff"],
  cooldown: 0,
  isOwner: true,

  async run({ sock, msg, args, isOwner, isMod }) {
    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

    if (!isOwner && !isMod) return reply("❌ Owner/mod only command.");

    // Resolve target from @mention or first arg
    const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
    let targetJid = mentionedJids[0] || null;

    // Strip mention tokens from args to get clean arg list
    const cleanArgs = args.filter(a => !a.startsWith("@"));

    if (!targetJid) {
      // Try bare number as JID
      const bare = cleanArgs[0]?.replace(/\D/g, "");
      if (bare && bare.length > 4) {
        targetJid = `${bare}@s.whatsapp.net`;
        cleanArgs.shift();
      }
    }

    if (!targetJid) {
      return reply(
`❌ *Usage:*
.nboost @user <stat> <amount>
.nboost @user all <amount>
.nboost @user reset

*Stats:* hp, attack, defense, speed, chakra`
      );
    }

    const player = await players.get(targetJid);
    if (!player) {
      return reply(`❌ That player has no ninja profile. They need to use *.nstart* first.`);
    }

    const statArg   = (cleanArgs[0] || "").toLowerCase();
    const amountArg = parseInt(cleanArgs[1], 10);

    // ── RESET ────────────────────────────────────────────────────────────────
    if (statArg === "reset") {
      player.boosts = {};
      await player.save();
      return reply(`✅ All boosts cleared for *${player.name || targetJid.split("@")[0]}*.`);
    }

    // ── ALL ──────────────────────────────────────────────────────────────────
    if (statArg === "all") {
      const amount = isNaN(amountArg) ? 50 : amountArg;
      if (!player.boosts) player.boosts = {};
      for (const stat of VALID_STATS) {
        player.boosts[stat] = { amount, turns: 999 };
      }
      // Also bump base stats directly
      for (const stat of VALID_STATS) {
        if (stat === "hp") {
          player.maxHp   = (player.maxHp   || 100) + amount;
          player.hp      = player.maxHp;
        } else {
          player[stat] = (player[stat] || 0) + amount;
        }
      }
      await player.save();
      return reply(
`✅ *All stats boosted!*

👤 Player: *${player.name || targetJid.split("@")[0]}*
⬆️ +${amount} to: HP, Attack, Defense, Speed, Chakra`
      );
    }

    // ── SINGLE STAT ──────────────────────────────────────────────────────────
    if (!VALID_STATS.includes(statArg)) {
      return reply(`❌ Invalid stat "*${statArg}*".\n\nValid stats: ${VALID_STATS.join(", ")}, all, reset`);
    }
    if (isNaN(amountArg) || amountArg <= 0) {
      return reply(`❌ Provide a positive number for the boost amount.\n\nExample: *.nboost @user attack 100*`);
    }

    // Apply to base stat
    if (statArg === "hp") {
      player.maxHp = (player.maxHp || 100) + amountArg;
      player.hp    = player.maxHp;
    } else {
      player[statArg] = (player[statArg] || 0) + amountArg;
    }

    // Also register as an active boost (shows in .nboost check)
    if (!player.boosts) player.boosts = {};
    player.boosts[statArg] = { amount: amountArg, turns: 999 };

    await player.save();

    return reply(
`✅ *Stat Boosted!*

👤 Player : *${player.name || targetJid.split("@")[0]}*
📊 Stat   : *${statArg.toUpperCase()}*
⬆️ Boosted: *+${amountArg}*
📈 New ${statArg.toUpperCase()}: *${statArg === "hp" ? player.maxHp : player[statArg]}*`
    );
  }
};
