/**
 * KELIN MD — Pet System Database (MongoDB-backed)
 * One document per pet; active pet tracked by isActive flag.
 * Collection: "pets"
 */
import { getDb } from "./mongo.mjs";
import { scaledStats, expForLevel, currentEvolStage, PET_SPECIES } from "./petData.js";
import { randomUUID } from "crypto";

async function col() {
  const db = getDb();
  return db.collection("pets");
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

/** Get the active pet for a user (isActive: true). */
export async function getActivePet(owner) {
  const c = await col();
  return c.findOne({ owner, isActive: true });
}

/** Get all pets for a user. */
export async function getAllPets(owner) {
  const c = await col();
  return c.find({ owner }).toArray();
}

/** Get a specific pet by its petId and owner. */
export async function getPetById(owner, petId) {
  const c = await col();
  return c.findOne({ owner, petId });
}

/** Count how many pets a user owns. */
export async function countPets(owner) {
  const c = await col();
  return c.countDocuments({ owner });
}

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Create a new pet.
 * @param {string} owner       – user JID
 * @param {string} speciesKey  – key in PET_SPECIES
 * @param {string} imageUrl    – URL fetched from nekos.best
 * @param {boolean} makeActive – set as active pet?
 */
export async function createPet(owner, speciesKey, imageUrl, makeActive = true) {
  const c       = await col();
  const sp      = PET_SPECIES[speciesKey];
  if (!sp) throw new Error(`Unknown species: ${speciesKey}`);

  const stage   = currentEvolStage(speciesKey, 1);
  const stats   = scaledStats(speciesKey, 1);
  const petId   = randomUUID();

  if (makeActive) {
    // Deactivate current active pet
    await c.updateMany({ owner, isActive: true }, { $set: { isActive: false } });
  }

  const doc = {
    petId,
    owner,
    name:      stage.name,
    species:   speciesKey,
    rarity:    sp.rarity,
    level:     1,
    exp:       0,
    expNeeded: expForLevel(1),
    hp:        stats.hp,
    maxHp:     stats.hp,
    attack:    stats.attack,
    defense:   stats.defense,
    speed:     stats.speed,
    hunger:    100,         // 0–100, drains over time
    happiness: 100,         // 0–100
    imageUrl,
    skill:     sp.skill,
    isActive:  makeActive,
    createdAt: new Date().toISOString(),
    lastFed:   null,
    lastPlayed:null,
  };

  await c.insertOne(doc);
  return doc;
}

// ── Update helpers ────────────────────────────────────────────────────────────

/** Save arbitrary fields to a pet doc (by petId). */
export async function savePet(owner, petId, fields) {
  const c = await col();
  await c.updateOne({ owner, petId }, { $set: fields });
}

/** Switch the active pet for a user. */
export async function setActivePet(owner, petId) {
  const c = await col();
  await c.updateMany({ owner, isActive: true },  { $set: { isActive: false } });
  await c.updateOne({ owner, petId },            { $set: { isActive: true  } });
}

/** Release (delete) a pet. */
export async function releasePet(owner, petId) {
  const c = await col();
  await c.deleteOne({ owner, petId });
}

// ── EXP / Level-up ───────────────────────────────────────────────────────────

/**
 * Award EXP to a pet and handle level-ups.
 * Returns { pet, levelsGained, evolved }
 */
export async function awardExp(owner, petId, amount) {
  const c   = await col();
  let pet   = await c.findOne({ owner, petId });
  if (!pet) return null;

  const sp          = PET_SPECIES[pet.species];
  let levelsGained  = 0;

  pet.exp += amount;

  while (pet.exp >= pet.expNeeded) {
    pet.exp      -= pet.expNeeded;
    pet.level++;
    pet.expNeeded = expForLevel(pet.level);
    levelsGained++;

    // Scale stats on level up
    const newStats  = scaledStats(pet.species, pet.level);
    pet.maxHp       = newStats.hp;
    pet.hp          = newStats.hp;
    pet.attack      = newStats.attack;
    pet.defense     = newStats.defense;
    pet.speed       = newStats.speed;
  }

  // Check if a new evolution stage name should apply
  const stage  = currentEvolStage(pet.species, pet.level);
  let evolved  = false;
  if (stage && stage.name !== pet.name && pet.level >= stage.minLevel) {
    // Name changed but we don't auto-evolve — user must do .evolve
  }

  const { _id, ...rest } = pet;
  await c.updateOne({ owner, petId }, { $set: rest });
  return { pet, levelsGained, evolved };
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

/** Get top N active pets sorted by level then exp. */
export async function getPetLeaderboard(limit = 10) {
  const c = await col();
  return c
    .find({ isActive: true })
    .sort({ level: -1, exp: -1 })
    .limit(limit)
    .toArray();
}
