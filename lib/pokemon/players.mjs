/**
 * KELIN MD — Pokémon trainer data (MongoDB)
 * Collection: pokemon_trainers
 */
import { getDb } from "../mongo.mjs";

function col() { return getDb().collection("pokemon_trainers"); }

const STARTER_INVENTORY = {
  pokeball: 3,
  greatball: 0,
  ultraball: 0,
  masterball: 0,
  premierball: 0,
  healball: 0,
  duskball: 0,
  netball: 0,
  potion: 3,
  superpotion: 0,
  hyperpotion: 0,
  fullrestore: 0,
  maxrevive: 0,
  revive: 0,
  xattack: 0,
  xdefense: 0,
  xspeed: 0,
  firestone: 0,
  waterstone: 0,
  thunderstone: 0,
  leafstone: 0,
  moonstone: 0,
  sunstone: 0,
  icestone: 0,
  shinystone: 0,
  dawnstone: 0,
  duskstone: 0,
  keystone: 0,
};

export async function getTrainer(jid) {
  return col().findOne({ jid });
}

export async function createTrainer(jid, username) {
  const trainer = {
    jid,
    username,
    level: 1,
    xp: 0,
    coins: 1000,
    party: [],      // up to 6 pokemon _id strings
    pc: [],         // all other pokemon _id strings
    inventory: { ...STARTER_INVENTORY },
    wins: 0,
    losses: 0,
    badges: [],
    leadPokemonId: null,    // ID of the pokemon that goes first in every battle
    startedAt: new Date(),
  };
  await col().insertOne(trainer);
  return trainer;
}

export async function updateTrainer(jid, updates) {
  // Support both regular field updates and MongoDB update operators.
  // Battle rewards use operators such as {$inc: { wins: 1 }}; wrapping
  // those in $set creates an invalid replacement document.
  const update = Object.keys(updates).some((key) => key.startsWith("$"))
    ? updates
    : { $set: updates };
  await col().updateOne({ jid }, update);
}

export async function addCoins(jid, amount) {
  await col().updateOne({ jid }, { $inc: { coins: amount } });
}

export async function addItem(jid, item, qty = 1) {
  await col().updateOne({ jid }, { $inc: { [`inventory.${item}`]: qty } });
}

export async function removeItem(jid, item, qty = 1) {
  const trainer = await getTrainer(jid);
  if (!trainer) return false;
  const current = trainer.inventory?.[item] || 0;
  if (current < qty) return false;
  await col().updateOne({ jid }, { $inc: { [`inventory.${item}`]: -qty } });
  return true;
}

export async function hasItem(jid, item, qty = 1) {
  const trainer = await getTrainer(jid);
  return (trainer?.inventory?.[item] || 0) >= qty;
}

export async function addToParty(jid, pokemonId) {
  const trainer = await getTrainer(jid);
  if (!trainer) return false;
  if (trainer.party.length >= 6) return false;
  // Use $addToSet to prevent duplicate IDs if the same pokemon is added twice
  await col().updateOne({ jid }, { $addToSet: { party: pokemonId } });
  return true;
}

export async function removeFromParty(jid, pokemonId) {
  await col().updateOne({ jid }, { $pull: { party: pokemonId } });
}

export async function addToPC(jid, pokemonId) {
  await col().updateOne({ jid }, { $push: { pc: pokemonId } });
}

export async function removeFromPC(jid, pokemonId) {
  await col().updateOne({ jid }, { $pull: { pc: pokemonId } });
}

/** Set which Pokémon goes first in battles */
export async function setLeadPokemonId(jid, pokemonId) {
  await col().updateOne({ jid }, { $set: { leadPokemonId: pokemonId?.toString() || null } });
}

/**
 * From an already-loaded party array, pick the Pokémon that can start a battle.
 *
 * A configured lead gets priority while it is healthy. If that lead has fainted,
 * use the next healthy Pokémon in party order. Never return a fainted Pokémon:
 * callers use null to tell the trainer to heal before battling.
 */
export function pickLeadFromParty(trainer, party = []) {
  // Sort the party by the trainer's party ID array so fallback order matches
  // the visible party order, even when MongoDB returns documents differently.
  const partyIdArr = trainer?.party || [];
  const loadedParty = Array.isArray(party) ? party : [];
  let orderedParty = loadedParty;
  if (partyIdArr.length > 0) {
    const idMap = {};
    for (const p of loadedParty) idMap[(p._id || p.id)?.toString()] = p;
    const sorted = partyIdArr.map(id => idMap[id?.toString()]).filter(Boolean);
    // Append any Pokémon not found in the ID array (safety fallback)
    for (const p of loadedParty) {
      const k = (p._id || p.id)?.toString();
      if (!sorted.some(x => (x._id || x.id)?.toString() === k)) sorted.push(p);
    }
    orderedParty = sorted;
  }

  const leadId = trainer?.leadPokemonId?.toString();
  const configuredLead = leadId
    ? orderedParty.find(p => (p._id || p.id)?.toString() === leadId)
    : null;

  // A fainted configured lead must not be returned as a 0-HP battle snapshot.
  return (
    (configuredLead && Number(configuredLead.hp) > 0 ? configuredLead : null) ||
    orderedParty.find(p => Number(p.hp) > 0) ||
    null
  );
}

export async function addXP(jid, amount) {
  const trainer = await getTrainer(jid);
  if (!trainer) return null;
  let xp = (trainer.xp || 0) + amount;
  let level = trainer.level || 1;
  let leveledUp = false;
  const xpNeeded = () => level * 100;
  while (xp >= xpNeeded()) {
    xp -= xpNeeded();
    level++;
    leveledUp = true;
  }
  await col().updateOne({ jid }, { $set: { xp, level } });
  return { leveledUp, newLevel: level, xp };
}
