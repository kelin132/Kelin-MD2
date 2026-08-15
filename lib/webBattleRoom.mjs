import { randomUUID } from "node:crypto";
import { getDb } from "./mongo.mjs";

const ROOM_TTL_MS = 10 * 60 * 1000;
const roomCreationInFlight = new Map();

function text(value, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function snapshotMove(move = {}) {
  const desc = typeof move.desc === "string" ? move.desc : null;
  return {
    name: text(move.name, "Unknown move"),
    type: text(move.type, "normal").toLowerCase(),
    power: number(move.power),
    accuracy: number(move.accuracy, 100),
    pp: number(move.pp),
    priority: number(move.priority),
    ...(desc ? { desc } : {}),
  };
}

function snapshotPokemon(pokemon = {}) {
  const id = text(pokemon._id ?? pokemon.id);
  const pokedexId = number(pokemon.pokedexId);
  const imageUrl = text(
    pokemon.imageUrl,
    pokedexId > 0
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokedexId}.png`
      : "",
  );
  const hp = Math.max(0, number(pokemon.hp));
  return {
    id,
    pokedexId,
    name: text(pokemon.name, "Unknown"),
    displayName: text(pokemon.displayName ?? pokemon.nickname ?? pokemon.name, "Unknown"),
    level: Math.max(1, number(pokemon.level, 1)),
    hp,
    maxHp: Math.max(1, number(pokemon.maxHp, 1)),
    attack: Math.max(1, number(pokemon.attack, 10)),
    defense: Math.max(1, number(pokemon.defense, 10)),
    speed: Math.max(1, number(pokemon.speed, 10)),
    types: Array.isArray(pokemon.types) ? pokemon.types.map((type) => text(type).toLowerCase()) : [text(pokemon.primaryType, "normal").toLowerCase()],
    imageUrl,
    frontSpriteUrl: text(pokemon.frontSpriteUrl, imageUrl),
    backSpriteUrl: text(pokemon.backSpriteUrl ?? pokemon.backImageUrl, imageUrl),
    shiny: Boolean(pokemon.shiny),
    fainted: hp <= 0,
    moves: Array.isArray(pokemon.moves) ? pokemon.moves.map(snapshotMove) : [],
  };
}

function orderedParty(trainer, party) {
  const docs = Array.isArray(party) ? party : [];
  const byId = new Map(docs.map((pokemon) => [text(pokemon._id ?? pokemon.id), pokemon]));
  const ordered = [];
  for (const id of Array.isArray(trainer?.party) ? trainer.party : []) {
    const pokemon = byId.get(text(id));
    if (pokemon && !ordered.includes(pokemon)) ordered.push(pokemon);
  }
  for (const pokemon of docs) {
    if (!ordered.includes(pokemon)) ordered.push(pokemon);
  }
  const leadId = text(trainer?.leadPokemonId);
  const leadIndex = leadId ? ordered.findIndex((pokemon) => text(pokemon._id ?? pokemon.id) === leadId && number(pokemon.hp) > 0) : -1;
  if (leadIndex > 0) {
    const [lead] = ordered.splice(leadIndex, 1);
    ordered.unshift(lead);
  }
  return ordered;
}

function trainerSnapshot({ trainer, party, jid, name, avatarUrl }) {
  const partyDocs = orderedParty(trainer, party).slice(0, 6);
  return {
    id: jid,
    name: text(name, jid.split("@")[0] || "Trainer"),
    avatarUrl: avatarUrl || null,
    trainerSpriteUrl: null,
    ready: false,
    party: partyDocs.map(snapshotPokemon),
    activeIndex: 0,
    inventory: Object.fromEntries(Object.entries(trainer?.inventory || {}).map(([item, qty]) => [item, number(qty)])),
  };
}

/**
 * Create a durable website room for a WhatsApp challenge. The opponent is
 * invited by JID and joins the same room link with their own authenticated
 * website session; all party members are snapshotted in bot order.
 */
export async function createWebBattleRoom(input) {
  const existingRequest = roomCreationInFlight.get(input.challengerJid);
  if (existingRequest) return existingRequest;

  const request = createWebBattleRoomInternal(input);
  roomCreationInFlight.set(input.challengerJid, request);
  try {
    return await request;
  } finally {
    if (roomCreationInFlight.get(input.challengerJid) === request) roomCreationInFlight.delete(input.challengerJid);
  }
}

async function createWebBattleRoomInternal({ challengerJid, challengerName, challengerAvatarUrl = null, challengerTrainer, challengerParty, opponentJid }) {
  const db = getDb();
  const rooms = db.collection("web_battle_rooms");
  const existing = await rooms.findOne({
    "challenger.id": challengerJid,
    status: { $in: ["waiting", "active"] },
  });
  if (existing) return existing;

  const now = new Date();
  const room = {
    _id: `battle-${randomUUID().replaceAll("-", "").slice(0, 16)}`,
    status: "waiting",
    challenger: trainerSnapshot({
      trainer: challengerTrainer,
      party: challengerParty,
      jid: challengerJid,
      name: challengerName,
      avatarUrl: challengerAvatarUrl,
    }),
    opponent: null,
    invitedOpponentId: opponentJid || null,
    spectatorIds: [],
    turn: null,
    forcedSwitch: null,
    round: 0,
    winnerId: null,
    combatLog: ["Room opened from a WhatsApp challenge. Waiting for the challenged trainer to join."],
    version: 1,
    createdAt: now,
    lastActionAt: now,
    expiresAt: new Date(now.getTime() + ROOM_TTL_MS),
  };
  await rooms.insertOne(room);
  return room;
}

export function webBattleUrl(roomId) {
  const base = process.env.AIDORU_WEB_URL || process.env.WEBSITE_URL || "https://aidoruweb1.onrender.com";
  return `${base.replace(/\/$/, "")}/battle/${encodeURIComponent(roomId)}`;
}
