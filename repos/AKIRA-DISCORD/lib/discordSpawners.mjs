import {
  createSpawnId,
  pickRandomCard,
  resolveMediaUrl,
} from "./cardApi.mjs";
import { getEnabledDiscordSpawnChannels } from "../plugins/cards/db.js";
import { fetchRandom, getImageMessage } from "./pokemon/api.mjs";
import { getMovesForType, randomWildLevel } from "./pokemon/gameLogic.mjs";
import { getRepel } from "./pokemon/itemState.mjs";
import { getWild, setWild } from "./pokemon/wildState.mjs";
import { getDb } from "./mongo.mjs";
import { findSpawnRole } from "./discordSpawnRoles.mjs";

const CARD_MIN_MS = 20 * 60 * 1000;
const CARD_MAX_MS = 25 * 60 * 1000;
const POKE_MIN_MS = 15 * 60 * 1000;
const POKE_MAX_MS = 20 * 60 * 1000;
const POKE_COLLECTION = "pokemon_autospawn_chats";
const CARD_EXPIRE_MS = 10 * 60 * 1000;
const PREFIX = process.env.PREFIX || ".";

const TYPE_EMOJIS = {
  fire: "🔥", water: "💧", grass: "🍃", electric: "⚡", psychic: "🔮", normal: "⭐",
  flying: "🌤️", bug: "🐛", poison: "☠️", rock: "🪨", ground: "🌍", ice: "❄️",
  fighting: "🥊", ghost: "👻", dragon: "🐉", dark: "🌑", steel: "⚙️", fairy: "🌸",
};

const randomBetween = (min, max) => min + Math.random() * (max - min);

async function getEnabledPokeChannels() {
  const db = await getDb();
  const docs = await db.collection(POKE_COLLECTION).find({
    platform: "discord",
    enabled: true,
    channelId: { $exists: true, $ne: null },
  }).toArray();
  return docs.map((doc) => String(doc.channelId));
}

async function getDiscordChannel(client, channelId) {
  const channel = await client.channels.fetch(String(channelId)).catch(() => null);
  if (!channel?.guild || !channel.isTextBased?.() || typeof channel.send !== "function") return null;
  return channel;
}

function discordFile(media, name) {
  if (!media) return null;
  if (Buffer.isBuffer(media) || media instanceof Uint8Array) {
    return { attachment: Buffer.from(media), name };
  }
  if (media.url) return { attachment: media.url, name };
  return null;
}

async function sendDiscordCard(channel, card, spawnId) {
  const role = findSpawnRole(channel.guild, "card");
  const roleMention = role ? `<@&${role.id}>` : "";
  const embed = {
    title: "🃏 𝐂𝐀𝐑𝐃 𝐒𝐏𝐀𝐖𝐍",
    description: "A new collectible card has appeared in AIDORU!",
    color: "#31C8FF",
    fields: [
      { name: "🃏 Name", value: String(card.name || "Unknown"), inline: false },
      { name: "⭐ Tier", value: String(card.tier || "Common"), inline: true },
      { name: "📺 Series", value: String(card.series || "Unknown"), inline: true },
      { name: "🆔 Card ID", value: `\`${card.cardId}\``, inline: true },
      { name: "🔹 Spawn ID", value: `\`${spawnId}\``, inline: true },
    ],
    footer: {
      text: `Use ${PREFIX}claim ${card.cardId} • First come, first served`,
    },
  };
  const payload = { embeds: [embed] };
  if (roleMention) {
    payload.content = roleMention;
    payload.allowedMentions = { roles: [role.id] };
  }

  if (card.media) {
    const url = await resolveMediaUrl(card.media);
    const extension = card.mediaType === "gif" || card.tierNum === "6" || card.tierNum === "S"
      ? "gif"
      : "jpg";
    embed.image = { url: `attachment://card.${extension}` };
    payload.files = [{ attachment: url, name: `card.${extension}` }];
  }

  return channel.send(payload);
}

async function spawnCard(channel) {
  const spawns = global.activeSpawns || (global.activeSpawns = {});
  if (spawns[channel.id]) return;

  const card = await pickRandomCard();
  if (!card) return;
  const spawnId = createSpawnId();
  spawns[channel.id] = { cardId: card.cardId, spawnId, card };

  try {
    await sendDiscordCard(channel, card, spawnId);
    setTimeout(() => {
      if (spawns[channel.id]?.spawnId !== spawnId) return;
      delete spawns[channel.id];
      channel.send(`⏰ **${card.name}** was not claimed in time and vanished.`).catch(() => {});
    }, CARD_EXPIRE_MS).unref?.();
  } catch (error) {
    delete spawns[channel.id];
    console.error(`[discord cardspawn] Failed in ${channel.id}:`, error.message);
  }
}

async function runCardCycle(client) {
  const channels = await getEnabledDiscordSpawnChannels();
  for (const channelId of channels) {
    const channel = await getDiscordChannel(client, channelId);
    if (channel) await spawnCard(channel);
  }
}

async function spawnPokemon(channel) {
  if (getWild(channel.id) || getRepel(channel.id)) return;

  let apiData;
  try {
    apiData = await fetchRandom();
  } catch (error) {
    console.error(`[discord pokespawn] Pokémon API failed:`, error.message);
    return;
  }

  const level = randomWildLevel();
  const maxHp = Math.max(10, Math.floor(apiData.baseHp * (1 + level * 0.05)));
  const wildPokemon = {
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
    moves: getMovesForType(apiData.primaryType, apiData.types),
  };

  setWild(channel.id, wildPokemon, null, (name) => {
    channel.send(`🌿 **${name}** got tired of waiting and fled away!`).catch(() => {});
  });

  const typeText = apiData.types.map((type) => `${TYPE_EMOJIS[type] || ""}${type}`).join(" / ");
  const role = findSpawnRole(channel.guild, "pokemon");
  const roleMention = role ? `<@&${role.id}>` : "";
  const embed = {
    title: "🌿 𝐖𝐈𝐋𝐃 𝐏𝐎𝐊É𝐌𝐎𝐍 𝐀𝐏𝐏𝐄𝐀𝐑𝐄𝐃",
    description: "A wild Pokémon appeared in AIDORU!",
    color: "#FF4FA3",
    fields: [
      { name: "🐾 Name", value: String(wildPokemon.displayName), inline: false },
      { name: "🏷️ Type", value: typeText || "Unknown", inline: true },
      { name: "📊 Level", value: String(level), inline: true },
      { name: "❤️ HP", value: `${maxHp}/${maxHp}`, inline: true },
    ],
    footer: {
      text: `Use ${PREFIX}catch to battle • Flees in 30 minutes`,
    },
  };
  const payload = { embeds: [embed] };
  if (roleMention) {
    payload.content = roleMention;
    payload.allowedMentions = { roles: [role.id] };
  }

  try {
    const media = await getImageMessage(apiData);
    const file = discordFile(media?.image, "pokemon.png");
    if (file) {
      embed.image = { url: "attachment://pokemon.png" };
      payload.files = [file];
    }
    await channel.send(payload);
  } catch (error) {
    console.error(`[discord pokespawn] Failed in ${channel.id}:`, error.message);
    delete embed.image;
    delete payload.files;
    channel.send(payload).catch(() => {});
  }
}

async function runPokemonCycle(client) {
  const channels = await getEnabledPokeChannels();
  for (const channelId of channels) {
    const channel = await getDiscordChannel(client, channelId);
    if (channel) await spawnPokemon(channel);
  }
}

function schedule(label, callback, min, max) {
  const timer = setTimeout(async () => {
    try {
      await callback();
    } catch (error) {
      console.error(`[discord ${label}] cycle failed:`, error.message);
    } finally {
      schedule(label, callback, min, max);
    }
  }, randomBetween(min, max));
  timer.unref?.();
  console.log(`[discord ${label}] next cycle scheduled`);
}

export function startDiscordSpawners(client) {
  if (global.__discordSpawnersStarted) return;
  global.__discordSpawnersStarted = true;
  schedule("cardspawn", () => runCardCycle(client), CARD_MIN_MS, CARD_MAX_MS);
  schedule("pokespawn", () => runPokemonCycle(client), POKE_MIN_MS, POKE_MAX_MS);
}