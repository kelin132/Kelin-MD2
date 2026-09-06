// plugins/pokemon/spawnpoke.js
// Spawn a random wild Pokémon in the group

import { fetchRandom, getImageMessage } from "../../lib/pokemon/api.mjs";
import { getWild, setWild } from "../../lib/pokemon/wildState.mjs";
import { getTrainer } from "../../lib/pokemon/players.mjs";
import { randomWildLevel, getMovesForType } from "../../lib/pokemon/gameLogic.mjs";
import { getRepel } from "../../lib/pokemon/itemState.mjs";

const SPAWN_COOLDOWN_MS = 100 * 1000; // 100 seconds between spawns per group
const spawnCooldowns = new Map();

export default {
  name: "spawnpoke",
  aliases: ["wildpoke", "encounter"],
  description: "Spawn a random wild Pokémon in the group",
  category: "pokemon",
  usage: ".spawnpoke",

  async run({ sock, msg, sender, discord }) {
    const jid = msg.key.remoteJid;
    const stateKey = msg.discordChannelId || jid;

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, {
        text: "❌ You haven't started your journey yet!\nUse `.startjourney` to begin.",
      }, { quoted: msg });
    }

    const activeRepel = getRepel(stateKey);
    if (activeRepel) {
      return sock.sendMessage(jid, {
        text: `🌿 *${activeRepel.itemName}* is active. Wild Pokémon cannot appear right now.`,
      }, { quoted: msg });
    }

    // Check if a wild Pokémon is already present
    if (getWild(stateKey)) {
      return sock.sendMessage(jid, {
        text: "⚠️ A wild Pokémon is already here!\nUse `.catch` to fight it.",
      }, { quoted: msg });
    }

    // Cooldown check (non-mods)
    const lastSpawn = spawnCooldowns.get(stateKey) || 0;
    if (Date.now() - lastSpawn < SPAWN_COOLDOWN_MS) {
      const remaining = Math.ceil((SPAWN_COOLDOWN_MS - (Date.now() - lastSpawn)) / 1000);
      return sock.sendMessage(jid, {
        text: `⏳ Wild Pokémon spawn cooldown! Wait \`${remaining}s\` before spawning again.`,
      }, { quoted: msg });
    }

    let apiData;
    try {
      apiData = await fetchRandom();
    } catch {
      return sock.sendMessage(jid, { text: "❌ Couldn't fetch a Pokémon right now. Try again!" }, { quoted: msg });
    }

    const level = randomWildLevel();
    const maxHp = Math.max(10, Math.floor(apiData.baseHp * (1 + level * 0.05)));
    const wildPoke = {
      pokedexId: apiData.pokedexId,
      name: apiData.name,
      displayName: apiData.displayName,
      types: apiData.types,
      primaryType: apiData.primaryType,
      level,
      hp: maxHp,
      maxHp,
      attack: Math.max(5, Math.floor(apiData.baseAttack * (1 + level * 0.05))),
      defense: Math.max(5, Math.floor(apiData.baseDefense * (1 + level * 0.05))),
      speed: Math.max(5, Math.floor(apiData.baseSpeed * (1 + level * 0.05))),
      imageUrl: apiData.imageUrl,
      moves: getMovesForType(apiData.primaryType, apiData.types, level),
    };

    setWild(stateKey, wildPoke, sender, (pokeName) => {
      // Send "fled away" message when the 30-min timer fires
      sock.sendMessage(jid, {
        text: `🌿 *${pokeName}* got tired of waiting and *fled away!* 🏃\nUse \`.spawnpoke\` to encounter a new wild Pokémon.`,
      }).catch(() => {});
    });
    spawnCooldowns.set(stateKey, Date.now());

    const typeEmojis = { fire:"🔥",water:"💧",grass:"🍃",electric:"⚡",psychic:"🔮",
      normal:"⭐",flying:"🌤️",bug:"🐛",poison:"☠️",rock:"🪨",ground:"🌍",
      ice:"❄️",fighting:"🥊",ghost:"👻",dragon:"🐉",dark:"🌑",steel:"⚙️",fairy:"🌸" };
    const typeStr = apiData.types.map(t => `${typeEmojis[t]||""}${t}`).join(" / ");

    const spawnCaption =
`🌿 *A WILD POKÉMON APPEARED!*

🐾 Name: *${wildPoke.displayName}*
🏷️ Type: ${typeStr}
📊 Level: \`${level}\`
❤️ HP: \`${maxHp}/${maxHp}\`

Use \`.catch\` to battle this Pokémon!
⏰ It will flee in 30 minutes.`;

    if (discord?.message) {
      const imgMsg = await getImageMessage(apiData);
      const image = imgMsg?.image;
      const imageUrl = image && typeof image === "object" && typeof image.url === "string"
        ? image.url
        : apiData.imageUrl;
      return sock.sendMessage(jid, {
        ...(image && !imageUrl ? { image, fileName: "pokemon.png" } : {}),
        mentions: [sender],
        discordEmbed: {
          title: "🌿 Wild Pokémon Appeared",
          description: "**A wild Pokémon appeared in this channel.**\nUse `.catch` to battle it.",
          color: "#FF4FA3",
          fields: [
            { name: "Pokémon", value: String(wildPoke.displayName), inline: false },
            { name: "Type", value: typeStr || "Unknown", inline: true },
            { name: "Level", value: String(level), inline: true },
            { name: "HP", value: `${maxHp}/${maxHp}`, inline: true },
          ],
          ...(imageUrl
            ? { image: imageUrl }
            : image
              ? { image: "attachment" }
              : {}),
          footer: { text: "✦ AIDORU • Use .catch to battle • Flees in 30 minutes" },
        },
      }, { quoted: msg });
    }

    // Use local sprite file when available (no CDN); falls back to URL, then text-only
    const imgMsg = await getImageMessage(apiData);
    if (imgMsg) {
      try {
        await sock.sendMessage(jid, { ...imgMsg, caption: spawnCaption }, { quoted: msg });
        return;
      } catch { /* fall through to text */ }
    }
    await sock.sendMessage(jid, { text: spawnCaption }, { quoted: msg });
  },
};
