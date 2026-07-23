/**
 * .resetpokemon @user
 * Wipe a trainer's Pokémon journey: deletes every Pokémon they own and
 * resets their trainer profile (level, XP, coins, badges, party, PC,
 * inventory) back to day-one defaults.
 *
 * Accessible by owner and mods only. Hidden from regular users.
 * Requires a confirmation step (30-second window) before executing.
 */
import { getTrainer, updateTrainer } from "../../lib/pokemon/players.mjs";
import { getDb } from "../../lib/mongo.mjs";
import { getUser } from "../economy/database.js";

// ── Confirmation store ────────────────────────────────────────────────────────
const pending = new Map();
const CONFIRM_MS = 30_000;

// ── Starter inventory (mirrors lib/pokemon/players.mjs) ──────────────────────
const STARTER_INVENTORY = {
  pokeball: 3, greatball: 0, ultraball: 0, masterball: 0, premierball: 0,
  healball: 0, duskball: 0, netball: 0, potion: 3, superpotion: 0,
  hyperpotion: 0, fullrestore: 0, maxrevive: 0, revive: 0,
  xattack: 0, xdefense: 0, xspeed: 0,
  firestone: 0, waterstone: 0, thunderstone: 0, leafstone: 0,
  moonstone: 0, sunstone: 0, icestone: 0, shinystone: 0,
  dawnstone: 0, duskstone: 0, keystone: 0,
};

export default {
  name: "resetpokemon",
  description: "Wipe a player's Pokémon journey and reset their trainer profile",
  category: "staff",
  usage: ".resetpokemon @user [confirm]",
  aliases: ["pokemonreset", "wipepokemon"],
  isOwner: true,   // owner + mods can use (pluginManager allows isMod too)
  hidden: true,    // invisible in .help for regular users

  async run({ sock, msg, args, sender }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    // ── Resolve target ────────────────────────────────────────────────────────
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    let targetJid = null;

    if (mentioned) {
      targetJid = mentioned;
    } else if (args[0]?.match(/^\d+$/)) {
      targetJid = `${args[0]}@s.whatsapp.net`;
    } else {
      return reply(
`❓ *Usage:* \`.resetpokemon @user\`

Wipes the target's Pokémon journey:
  • Deletes *all* their Pokémon (party + PC)
  • Resets trainer stats: level, XP, coins, badges
  • Restores starter inventory

A confirmation step is required.`
      );
    }

    // ── Check trainer exists ──────────────────────────────────────────────────
    const trainer = await getTrainer(targetJid);
    if (!trainer) {
      return reply("❌ That player hasn't started a Pokémon journey yet.");
    }

    // ── Get display name (economy db → trainer username → number fallback) ────
    let displayName = trainer.username || targetJid.split("@")[0];
    try {
      const econUser = await getUser(targetJid);
      if (econUser?.name) displayName = econUser.name;
    } catch { /* economy db may not have this user — fine */ }

    const targetNum  = targetJid.split("@")[0];
    const confirmKey = `${sender}:${targetJid}`;
    const now        = Date.now();

    // ── Confirmation step ─────────────────────────────────────────────────────
    if (args.includes("confirm")) {
      const pend = pending.get(confirmKey);
      if (!pend || now - pend.ts > CONFIRM_MS) {
        pending.delete(confirmKey);
        return reply("⚠️ Confirmation expired. Run `.resetpokemon @user` again to restart.");
      }
      pending.delete(confirmKey);

      // Count their Pokémon before deleting
      const db       = getDb();
      const ownedCol = db.collection("pokemon_owned");
      const count    = await ownedCol.countDocuments({ ownerJid: targetJid });

      // 1. Delete all owned Pokémon
      await ownedCol.deleteMany({ ownerJid: targetJid });

      // 2. Reset the trainer document to day-one state
      await updateTrainer(targetJid, {
        level:         1,
        xp:            0,
        coins:         1000,
        party:         [],
        pc:            [],
        inventory:     { ...STARTER_INVENTORY },
        wins:          0,
        losses:        0,
        badges:        [],
        leadPokemonId: null,
      });

      return sock.sendMessage(jid, {
        text:
`🗑️ *Pokémon Journey Reset*

👤 Trainer  : ${displayName} (@${targetNum})
🔴 Pokémon deleted : ${count}
📋 Stats reset : level 1 · 0 XP · $1,000 coins
🎒 Inventory : restored to starter kit
🏅 Badges   : cleared

_The trainer can start fresh with .startjourney_`,
        mentions: [targetJid],
      }, { quoted: msg });
    }

    // ── First call — show what will be wiped and ask to confirm ───────────────
    const ownedCount = await getDb()
      .collection("pokemon_owned")
      .countDocuments({ ownerJid: targetJid });

    pending.set(confirmKey, { ts: now });
    setTimeout(() => pending.delete(confirmKey), CONFIRM_MS);

    return sock.sendMessage(jid, {
      text:
`⚠️ *Confirm Pokémon Reset*

You are about to wipe the Pokémon journey of:
👤 *${displayName}* (@${targetNum})

What will be erased:
  🔴 *${ownedCount} Pokémon* (party + PC) — permanently deleted
  📉 Trainer level → 1
  📉 XP → 0
  📉 Coins → $1,000 (starter)
  📉 Wins / Losses → 0
  🏅 All badges cleared
  🎒 Inventory reset to starter kit

This action is *irreversible*.

Type \`.resetpokemon @${targetNum} confirm\` within 30 seconds to confirm.`,
      mentions: [targetJid],
    }, { quoted: msg });
  },
};
