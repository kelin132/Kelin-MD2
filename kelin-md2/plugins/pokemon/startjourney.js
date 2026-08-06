// plugins/pokemon/startjourney.js
// Begin a trainer's Pokémon journey.
// - .startjourney           → shows all 28 starter Pokémon (Gens 1–9 + Pikachu) and prompts a choice
// - .startjourney <1-28>    → pick by number
// - .startjourney <name>    → pick by name (e.g. ".startjourney charmander")

import { getTrainer, createTrainer, addToParty, setLeadPokemonId } from "../../lib/pokemon/players.mjs";
import { fetchPokemon } from "../../lib/pokemon/api.mjs";
import { buildPokemon, savePokemon, updatePokemon } from "../../lib/pokemon/pokemonDb.mjs";
import { generateStarterCanvas } from "../../lib/pokemon/canvas.mjs";

// ── All official starters from Gens 1–9 + Pikachu ─────────────────────────────
const STARTERS = [
  // ── Gen 1 (Kanto) ──────────────────────────────────────────────────────────
  { id: 1,   name: "bulbasaur",   displayName: "Bulbasaur",   type: "Grass/Poison", emoji: "🌿", gen: 1 },
  { id: 4,   name: "charmander",  displayName: "Charmander",  type: "Fire",         emoji: "🔥", gen: 1 },
  { id: 7,   name: "squirtle",    displayName: "Squirtle",    type: "Water",        emoji: "💧", gen: 1 },
  // ── Gen 2 (Johto) ──────────────────────────────────────────────────────────
  { id: 152, name: "chikorita",   displayName: "Chikorita",   type: "Grass",        emoji: "🌿", gen: 2 },
  { id: 155, name: "cyndaquil",   displayName: "Cyndaquil",   type: "Fire",         emoji: "🔥", gen: 2 },
  { id: 158, name: "totodile",    displayName: "Totodile",    type: "Water",        emoji: "💧", gen: 2 },
  // ── Gen 3 (Hoenn) ──────────────────────────────────────────────────────────
  { id: 252, name: "treecko",     displayName: "Treecko",     type: "Grass",        emoji: "🌿", gen: 3 },
  { id: 255, name: "torchic",     displayName: "Torchic",     type: "Fire",         emoji: "🔥", gen: 3 },
  { id: 258, name: "mudkip",      displayName: "Mudkip",      type: "Water/Ground", emoji: "💧", gen: 3 },
  // ── Gen 4 (Sinnoh) ─────────────────────────────────────────────────────────
  { id: 387, name: "turtwig",     displayName: "Turtwig",     type: "Grass",        emoji: "🌿", gen: 4 },
  { id: 390, name: "chimchar",    displayName: "Chimchar",    type: "Fire",         emoji: "🔥", gen: 4 },
  { id: 393, name: "piplup",      displayName: "Piplup",      type: "Water",        emoji: "💧", gen: 4 },
  // ── Gen 5 (Unova) ──────────────────────────────────────────────────────────
  { id: 495, name: "snivy",       displayName: "Snivy",       type: "Grass",        emoji: "🌿", gen: 5 },
  { id: 498, name: "tepig",       displayName: "Tepig",       type: "Fire",         emoji: "🔥", gen: 5 },
  { id: 501, name: "oshawott",    displayName: "Oshawott",    type: "Water",        emoji: "💧", gen: 5 },
  // ── Gen 6 (Kalos) ──────────────────────────────────────────────────────────
  { id: 650, name: "chespin",     displayName: "Chespin",     type: "Grass",        emoji: "🌿", gen: 6 },
  { id: 653, name: "fennekin",    displayName: "Fennekin",    type: "Fire",         emoji: "🔥", gen: 6 },
  { id: 656, name: "froakie",     displayName: "Froakie",     type: "Water",        emoji: "💧", gen: 6 },
  // ── Gen 7 (Alola) ──────────────────────────────────────────────────────────
  { id: 722, name: "rowlet",      displayName: "Rowlet",      type: "Grass/Flying", emoji: "🌿", gen: 7 },
  { id: 725, name: "litten",      displayName: "Litten",      type: "Fire",         emoji: "🔥", gen: 7 },
  { id: 728, name: "popplio",     displayName: "Popplio",     type: "Water",        emoji: "💧", gen: 7 },
  // ── Gen 8 (Galar) ──────────────────────────────────────────────────────────
  { id: 810, name: "grookey",     displayName: "Grookey",     type: "Grass",        emoji: "🌿", gen: 8 },
  { id: 813, name: "scorbunny",   displayName: "Scorbunny",   type: "Fire",         emoji: "🔥", gen: 8 },
  { id: 816, name: "sobble",      displayName: "Sobble",      type: "Water",        emoji: "💧", gen: 8 },
  // ── Gen 9 (Paldea) ─────────────────────────────────────────────────────────
  { id: 906, name: "sprigatito",  displayName: "Sprigatito",  type: "Grass",        emoji: "🌿", gen: 9 },
  { id: 909, name: "fuecoco",     displayName: "Fuecoco",     type: "Fire",         emoji: "🔥", gen: 9 },
  { id: 912, name: "quaxly",      displayName: "Quaxly",      type: "Water",        emoji: "💧", gen: 9 },
  // ── Bonus ───────────────────────────────────────────────────────────────────
  { id: 25,  name: "pikachu",     displayName: "Pikachu",     type: "Electric",     emoji: "⚡", gen: 1 },
  { id: 133, name: "eevee",       displayName: "Eevee",       type: "Normal",       emoji: "⭐", gen: 1 },
];

const GEN_NAMES = {
  1: "Gen 1 — Kanto",
  2: "Gen 2 — Johto",
  3: "Gen 3 — Hoenn",
  4: "Gen 4 — Sinnoh",
  5: "Gen 5 — Unova",
  6: "Gen 6 — Kalos",
  7: "Gen 7 — Alola",
  8: "Gen 8 — Galar",
  9: "Gen 9 — Paldea",
};

// Pending selections: trainerJid → timestamp
const pendingSelections = new Map();
const PENDING_TTL = 5 * 60 * 1000; // 5 minutes to choose

function isPendingValid(jid) {
  const t = pendingSelections.get(jid);
  return t && Date.now() - t < PENDING_TTL;
}

export default {
  name: "startjourney",
  aliases: ["pokéstart", "pokestart"],
  description: "Begin your Pokémon journey and choose a starter",
  category: "pokemon",
  usage: ".startjourney [number or name]",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    // ── Already a trainer ─────────────────────────────────────────────────────
    const existing = await getTrainer(sender);
    if (existing) {
      return sock.sendMessage(jid, {
        text: `🎮 You already started your Pokémon journey!\n\nUse *.party* to see your team or *.pokeinfo [name]* to look up Pokémon.`,
      }, { quoted: msg });
    }

    const username = msg.pushName || "Trainer";
    const input = args.join(" ").trim().toLowerCase();

    // ── No input → show starter selection screen ───────────────────────────
    if (!input) {
      pendingSelections.set(sender, Date.now());

      // Group starters by generation for display
      const genGroups = {};
      STARTERS.forEach((s, i) => {
        const g = s.gen;
        if (!genGroups[g]) genGroups[g] = [];
        genGroups[g].push({ ...s, num: i + 1 });
      });

      // Bonus Pokémon (Pikachu, Eevee) are index 25 & 26
      const bonusStarters = STARTERS.slice(24);
      const mainGens = [1, 2, 3, 4, 5, 6, 7, 8, 9];

      let list = "";
      let num = 1;
      for (const g of mainGens) {
        // Collect only the 3 main starters per gen (not bonus at gen 1)
        const pool = STARTERS.filter((s, idx) => s.gen === g && idx < 24);
        if (!pool.length) continue;
        list += `*— ${GEN_NAMES[g]} —*\n`;
        for (const s of pool) {
          list += `*${num}.* ${s.emoji} *${s.displayName}* — ${s.type}\n`;
          num++;
        }
      }
      // Bonus
      list += `*— Bonus —*\n`;
      for (const s of bonusStarters) {
        list += `*${num}.* ${s.emoji} *${s.displayName}* — ${s.type}\n`;
        num++;
      }

      // Try to generate a canvas image of all starters (first 7 for canvas)
      try {
        const buf = await generateStarterCanvas(STARTERS.slice(0, 7));
        await sock.sendMessage(jid, {
          image: buf,
          caption:
`🌟 *CHOOSE YOUR STARTER POKÉMON!*
Welcome, *${username}*! All *${STARTERS.length}* starters from every generation are available!

${list}
Reply *.startjourney <number or name>* to choose!
Example: \`.startjourney 4\` or \`.startjourney froakie\`

⏳ You have 5 minutes to choose.`,
        }, { quoted: msg });
      } catch {
        // Fallback: text only
        await sock.sendMessage(jid, {
          text:
`🌟 *CHOOSE YOUR STARTER POKÉMON!*
Welcome, *${username}*! All *${STARTERS.length}* starters from every generation are available!

${list}
Reply *.startjourney <number or name>* to choose!
Example: \`.startjourney 4\` or \`.startjourney froakie\`

⏳ You have 5 minutes to choose.`,
        }, { quoted: msg });
      }
      return;
    }

    // ── Input provided → find chosen starter ──────────────────────────────────
    let chosen = null;

    // Try number
    const numChoice = parseInt(input);
    if (!isNaN(numChoice) && numChoice >= 1 && numChoice <= STARTERS.length) {
      chosen = STARTERS[numChoice - 1];
    }

    // Try name (exact or display name)
    if (!chosen) {
      chosen = STARTERS.find(
        (s) => s.name === input || s.displayName.toLowerCase() === input
      );
    }

    if (!chosen) {
      const examples = STARTERS.slice(0, 5).map((s, i) => `*${i + 1}.* ${s.emoji} ${s.displayName}`).join("  |  ");
      return sock.sendMessage(jid, {
        text:
`❌ *Invalid choice!*
Use *.startjourney* (no number) to see the full list of ${STARTERS.length} available starters.

Or type the name directly:
Examples: \`.startjourney charmander\`, \`.startjourney sobble\`, \`.startjourney fuecoco\``,
      }, { quoted: msg });
    }

    // ── Fetch Pokémon data and create trainer ─────────────────────────────────
    let apiData;
    try {
      apiData = await fetchPokemon(chosen.id);
    } catch {
      try { apiData = await fetchPokemon(chosen.name); } catch {
        return sock.sendMessage(jid, { text: "❌ Couldn't fetch starter data. Please try again!" }, { quoted: msg });
      }
    }

    const trainer = await createTrainer(sender, username);
    const starter = buildPokemon(apiData, sender, 5, true);
    starter.isStarter = true; // starter is protected — cannot give away or sell
    await savePokemon(starter);
    await addToParty(sender, starter._id.toString());
    await setLeadPokemonId(sender, starter._id.toString()); // starter begins as lead

    pendingSelections.delete(sender);

    const typeEmojis = { fire:"🔥", water:"💧", grass:"🍃", electric:"⚡", psychic:"🔮",
      normal:"⭐", flying:"🌤️", bug:"🐛", poison:"☠️", rock:"🪨", ground:"🌍",
      ice:"❄️", fighting:"🥊", ghost:"👻", dragon:"🐉", dark:"🌑", steel:"⚙️", fairy:"🌸" };
    const typeStr = (apiData.types || []).map((t) => `${typeEmojis[t] || ""}${t}`).join(" / ");
    const shinyTag = starter.shiny ? "\n✨ *WOW! Your starter is SHINY!*" : "";
    const genTag = chosen.gen ? ` *(Gen ${chosen.gen})*` : "";

    // Build starter moves description
    const moveList = (starter.moves || []).map((m, i) =>
      `  *${i + 1}.* ${m.name} (Power: ${m.power || "—"})`
    ).join("\n");

    await sock.sendMessage(jid, {
      image: { url: apiData.imageUrl },
      caption:
`🎮 *POKÉMON JOURNEY STARTED!*${shinyTag}

👤 Trainer: *${username}*
🌟 Starter: *${starter.displayName}*${genTag}
🏷️ Type: ${typeStr}
❤️ HP: ${starter.hp}/${starter.maxHp}
⚔️ Attack: ${starter.attack}
🛡️ Defense: ${starter.defense}
💨 Speed: ${starter.speed}
📊 Level: ${starter.level}

🎯 *Starter Moves:*
${moveList}

🎾 Starter Pokéballs: 3

*Your adventure begins!* 🌟
Use *.spawnpoke* to find wild Pokémon
Use *.party* to view your team
Use *.mart* to visit the shop
Use *.heal* to heal your Pokémon`,
    }, { quoted: msg });
  },
};
