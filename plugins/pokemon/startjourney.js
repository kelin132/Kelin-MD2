// plugins/pokemon/startjourney.js
// Begin a trainer's Pokémon journey.
// - .startjourney           → shows the 7 starter Pokémon and prompts a choice
// - .startjourney <1-7>     → pick by number
// - .startjourney <name>    → pick by name (e.g. ".startjourney charmander")

import { getTrainer, createTrainer } from "../../lib/pokemon/players.mjs";
import { fetchPokemon } from "../../lib/pokemon/api.mjs";
import { buildPokemon, savePokemon } from "../../lib/pokemon/pokemonDb.mjs";
import { addToParty } from "../../lib/pokemon/players.mjs";
import { generateStarterCanvas } from "../../lib/pokemon/canvas.mjs";

// ── The 7 starters shown to every new trainer ─────────────────────────────────
const STARTERS = [
  { id: 1,   name: "bulbasaur",  displayName: "Bulbasaur",  type: "Grass/Poison", emoji: "🌿" },
  { id: 4,   name: "charmander", displayName: "Charmander", type: "Fire",         emoji: "🔥" },
  { id: 7,   name: "squirtle",   displayName: "Squirtle",   type: "Water",        emoji: "💧" },
  { id: 152,  name: "chikorita",  displayName: "Chikorita",  type: "Grass",        emoji: "🍃" },
  { id: 155,  name: "cyndaquil",  displayName: "Cyndaquil",  type: "Fire",         emoji: "🔥" },
  { id: 158,  name: "totodile",   displayName: "Totodile",   type: "Water",        emoji: "💧" },
  { id: 25,   name: "pikachu",    displayName: "Pikachu",    type: "Electric",     emoji: "⚡" },
];

// Pending selections: trainerJid → timestamp (60s window)
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

      // Build the list text
      const list = STARTERS.map((s, i) =>
        `*${i + 1}.* ${s.emoji} *${s.displayName}* — ${s.type}`
      ).join("\n");

      // Try to generate a canvas image of all 7 starters
      try {
        const buf = await generateStarterCanvas(STARTERS);
        await sock.sendMessage(jid, {
          image: buf,
          caption:
`🌟 *CHOOSE YOUR STARTER POKÉMON!*
Welcome, *${username}*! Your adventure begins now.

${list}

Reply *.startjourney <number or name>* to choose!
Example: \`.startjourney 2\` or \`.startjourney charmander\`

⏳ You have 5 minutes to choose.`,
        }, { quoted: msg });
      } catch {
        // Fallback: text only
        await sock.sendMessage(jid, {
          text:
`🌟 *CHOOSE YOUR STARTER POKÉMON!*
Welcome, *${username}*! Your adventure begins now.

${list}

Reply *.startjourney <number or name>* to choose!
Example: \`.startjourney 2\` or \`.startjourney charmander\`

⏳ You have 5 minutes to choose.`,
        }, { quoted: msg });
      }
      return;
    }

    // ── Input provided → find chosen starter ──────────────────────────────────
    // Check pending window (allow direct pick even without pending)
    let chosen = null;

    // Try number
    const numChoice = parseInt(input);
    if (!isNaN(numChoice) && numChoice >= 1 && numChoice <= STARTERS.length) {
      chosen = STARTERS[numChoice - 1];
    }

    // Try name
    if (!chosen) {
      chosen = STARTERS.find(
        (s) => s.name === input || s.displayName.toLowerCase() === input
      );
    }

    if (!chosen) {
      const list = STARTERS.map((s, i) => `*${i + 1}.* ${s.emoji} ${s.displayName}`).join("  |  ");
      return sock.sendMessage(jid, {
        text:
`❌ *Invalid choice!* Please pick one of:\n${list}\n\nExample: \`.startjourney charmander\` or \`.startjourney 2\``,
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
    await savePokemon(starter);
    await addToParty(sender, starter._id.toString());

    pendingSelections.delete(sender);

    const typeEmojis = { fire:"🔥", water:"💧", grass:"🍃", electric:"⚡", psychic:"🔮",
      normal:"⭐", flying:"🌤️", bug:"🐛", poison:"☠️", rock:"🪨", ground:"🌍",
      ice:"❄️", fighting:"🥊", ghost:"👻", dragon:"🐉", dark:"🌑", steel:"⚙️", fairy:"🌸" };
    const typeStr = (apiData.types || []).map((t) => `${typeEmojis[t] || ""}${t}`).join(" / ");
    const shinyTag = starter.shiny ? "\n✨ *WOW! Your starter is SHINY!*" : "";

    // Build starter moves description
    const moveList = (starter.moves || []).map((m, i) =>
      `  *${i + 1}.* ${m.name} (Power: ${m.power || "—"})`
    ).join("\n");

    await sock.sendMessage(jid, {
      image: { url: apiData.imageUrl },
      caption:
`🎮 *POKÉMON JOURNEY STARTED!*${shinyTag}

👤 Trainer: *${username}*
🌟 Starter: *${starter.displayName}*
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
