/**
 * KELIN MD — Individual Pokémon storage (MongoDB)
 * Collection: pokemon_owned
 */
import { getDb } from "../mongo.mjs";
import { ObjectId } from "mongodb";
import { TYPE_MOVES, getMovesForType } from "./gameLogic.mjs";

function col() { return getDb().collection("pokemon_owned"); }

/** Scale base stats to a given level */
function scaleStats(base, level) {
  return Math.floor(base * (1 + level * 0.05));
}

/** Build a Pokémon document from API data + level */
export function buildPokemon(apiData, ownerJid, level = 5, inParty = false) {
  const hp = Math.max(10, scaleStats(apiData.baseHp, level));
  return {
    _id: new ObjectId(),
    ownerJid,
    pokedexId: apiData.pokedexId,
    name: apiData.name,
    displayName: apiData.displayName,
    nickname: null,
    level,
    xp: 0,
    xpNeeded: level * 100,
    hp,
    maxHp: hp,
    attack: Math.max(5, scaleStats(apiData.baseAttack, level)),
    defense: Math.max(5, scaleStats(apiData.baseDefense, level)),
    speed: Math.max(5, scaleStats(apiData.baseSpeed, level)),
    spAtk: Math.max(5, scaleStats(apiData.baseSpAtk, level)),
    types: apiData.types,
    primaryType: apiData.primaryType,
    imageUrl: apiData.imageUrl,
    backImageUrl: apiData.backImageUrl,
    moves: getMovesForType(apiData.primaryType, apiData.types),
    shiny: Math.random() < 0.005, // 0.5% shiny chance
    inParty,
    caughtAt: new Date(),
    height: apiData.height,
    weight: apiData.weight,
  };
}

export async function savePokemon(pokemon) {
  await col().insertOne(pokemon);
  return pokemon;
}

export async function getPokemon(id) {
  const _id = typeof id === "string" ? ObjectId.createFromHexString(id) : id;
  return col().findOne({ _id });
}

export async function getTrainerParty(ownerJid) {
  return col().find({ ownerJid, inParty: true }).toArray();
}

export async function getTrainerPC(ownerJid) {
  return col().find({ ownerJid, inParty: false }).toArray();
}

export async function getAllTrainerPokemon(ownerJid) {
  return col().find({ ownerJid }).toArray();
}

export async function updatePokemon(id, updates) {
  const _id = typeof id === "string" ? ObjectId.createFromHexString(id) : id;
  await col().updateOne({ _id }, { $set: updates });
}

export async function healPokemon(id) {
  const pokemon = await getPokemon(id);
  if (!pokemon) return;
  await col().updateOne({ _id: pokemon._id }, { $set: { hp: pokemon.maxHp } });
}

export async function healParty(ownerJid) {
  const party = await getTrainerParty(ownerJid);
  for (const p of party) {
    await col().updateOne({ _id: p._id }, { $set: { hp: p.maxHp } });
  }
  return party.length;
}

export async function evolvePokemon(id, newApiData) {
  const pokemon = await getPokemon(id);
  if (!pokemon) return null;
  const newHp = Math.max(10, Math.floor(newApiData.baseHp * (1 + pokemon.level * 0.05)));
  const updates = {
    pokedexId: newApiData.pokedexId,
    name: newApiData.name,
    displayName: newApiData.displayName,
    types: newApiData.types,
    primaryType: newApiData.primaryType,
    imageUrl: newApiData.imageUrl,
    backImageUrl: newApiData.backImageUrl,
    hp: newHp,
    maxHp: newHp,
    attack: Math.max(5, Math.floor(newApiData.baseAttack * (1 + pokemon.level * 0.05))),
    defense: Math.max(5, Math.floor(newApiData.baseDefense * (1 + pokemon.level * 0.05))),
    speed: Math.max(5, Math.floor(newApiData.baseSpeed * (1 + pokemon.level * 0.05))),
    moves: getMovesForType(newApiData.primaryType, newApiData.types),
  };
  await col().updateOne({ _id: pokemon._id }, { $set: updates });
  return { ...pokemon, ...updates };
}

export async function deletePokemon(id) {
  const _id = typeof id === "string" ? ObjectId.createFromHexString(id) : id;
  await col().deleteOne({ _id });
}

export async function addPokemonXP(id, amount) {
  const pokemon = await getPokemon(id);
  if (!pokemon) return null;
  let xp = (pokemon.xp || 0) + amount;
  let level = pokemon.level;
  let leveledUp = false;
  while (xp >= level * 100) {
    xp -= level * 100;
    level++;
    leveledUp = true;
  }
  // Scale stats on level up
  const updates = { xp, level };
  if (leveledUp) {
    const newHp = Math.max(10, Math.floor((pokemon.maxHp / (1 + pokemon.level * 0.05)) * (1 + level * 0.05)));
    updates.maxHp = newHp;
    updates.hp = newHp; // full heal on level up
    updates.attack = Math.max(5, Math.floor((pokemon.attack / (1 + pokemon.level * 0.05)) * (1 + level * 0.05)));
    updates.defense = Math.max(5, Math.floor((pokemon.defense / (1 + pokemon.level * 0.05)) * (1 + level * 0.05)));
    updates.speed = Math.max(5, Math.floor((pokemon.speed / (1 + pokemon.level * 0.05)) * (1 + level * 0.05)));
  }
  await col().updateOne({ _id: pokemon._id }, { $set: updates });
  return { leveledUp, newLevel: level, pokemon: { ...pokemon, ...updates } };
}
