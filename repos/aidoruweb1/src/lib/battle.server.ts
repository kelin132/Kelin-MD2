import { createHash, randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { requireUser } from "./auth.server";
import {
  battleRooms,
  getDb,
  type WebBattleMoveDoc,
  type WebBattlePokemonDoc,
  type WebBattleRoomDoc,
  type WebBattleTrainerDoc,
} from "./db.server";
import type { BattleAction, BattleRoom, BattleRoomSummary } from "./game";
import { GYM_DEFINITIONS, gymById, gymSpriteUrls, gymBadgeId, gymBadgeIds } from "./gyms";

const ROOM_TTL_MS = 2 * 60 * 1000;
const INACTIVITY_TTL_MS = 2 * 60 * 1000;
const GYM_SWITCH_DELAY_MS = 1800;
const GYM_PROGRESS_COOLDOWN_MS = 10 * 60 * 60 * 1000;

function pauseBattle(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
const FINISHED_TTL_MS = 30_000;
const TRAINER_SPRITES = [
  "/battle-trainers/leaf.png",
  "/battle-trainers/red.png",
  "/battle-trainers/brendan.png",
  "/battle-trainers/may.png",
] as const;

type Role = "challenger" | "opponent";

type BattleRoomInput = WebBattleRoomDoc;

const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5, grass: 2, ice: 2, bug: 2, steel: 2 },
  water: { water: 0.5, grass: 0.5, dragon: 0.5, fire: 2, ground: 2, rock: 2 },
  electric: { electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0, flying: 2, water: 2 },
  grass: {
    fire: 0.5,
    grass: 0.5,
    poison: 0.5,
    flying: 0.5,
    bug: 0.5,
    dragon: 0.5,
    steel: 0.5,
    water: 2,
    ground: 2,
    rock: 2,
  },
  ice: { water: 0.5, ice: 0.5, steel: 0.5, fire: 0.5, grass: 2, ground: 2, flying: 2, dragon: 2 },
  fighting: {
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    fairy: 0.5,
    ghost: 0,
    normal: 2,
    ice: 2,
    rock: 2,
    dark: 2,
    steel: 2,
  },
  poison: { poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, grass: 2, fairy: 2 },
  ground: { grass: 0.5, bug: 0.5, flying: 0, electric: 2, fire: 2, poison: 2, rock: 2, steel: 2 },
  flying: { electric: 0.5, rock: 0.5, steel: 0.5, ground: 0, grass: 2, fighting: 2, bug: 2 },
  psychic: { psychic: 0.5, steel: 0.5, dark: 0, fighting: 2, poison: 2 },
  bug: {
    fire: 0.5,
    fighting: 0.5,
    flying: 0.5,
    ghost: 0.5,
    steel: 0.5,
    fairy: 0.5,
    grass: 2,
    psychic: 2,
    dark: 2,
  },
  rock: { fighting: 0.5, ground: 0.5, steel: 0.5, normal: 2, fire: 2, flying: 2, ice: 2, bug: 2 },
  ghost: { normal: 0, dark: 0.5, psychic: 2, ghost: 2 },
  dragon: { steel: 0.5, fairy: 0, dragon: 2 },
  dark: { fighting: 0.5, dark: 0.5, fairy: 0.5, psychic: 2, ghost: 2 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5, ice: 2, rock: 2, fairy: 2 },
  fairy: { fire: 0.5, poison: 0.5, steel: 0.5, fighting: 2, dragon: 2, dark: 2 },
};

const ITEM_HEAL: Record<string, number> = {
  potion: 20,
  superpotion: 50,
  hyperpotion: 120,
  fullrestore: Number.MAX_SAFE_INTEGER,
};

function value(value: unknown, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function userName(user: Record<string, unknown>) {
  return value(
    user["name"] ?? user["username"] ?? user["pushName"] ?? user["notifyName"],
    "Trainer",
  );
}

function userAvatar(user: Record<string, unknown>) {
  const candidate = user["avatarUrl"] ?? user["profilePicUrl"] ?? user["profilePictureUrl"] ?? null;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function fallbackTrainerSprite(id: string) {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return TRAINER_SPRITES[Math.abs(hash) % TRAINER_SPRITES.length] ?? TRAINER_SPRITES[0] ?? null;
}

function publicTrainer(trainer: WebBattleTrainerDoc): WebBattleTrainerDoc {
  return {
    ...trainer,
    trainerSpriteUrl: trainer.trainerSpriteUrl ?? fallbackTrainerSprite(trainer.id),
  };
}

function mongoId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : id;
}

function fallbackRoomCode(id: string) {
  return id
    .replace(/[^a-z0-9]/gi, "")
    .slice(-6)
    .toUpperCase();
}

function makeRoomCode() {
  return fallbackRoomCode(randomUUID());
}

function canonicalIdentity(value: unknown) {
  const raw = String(value ?? "")
    .trim()
    .replace(/:\d+(?=@)/, "");
  return (raw.split("@")[0] || raw).toLowerCase();
}

function soloPairKey(jid: string) {
  return `solo:${canonicalIdentity(jid)}`;
}

function deterministicRoomId(key: string) {
  return `battle-${createHash("sha256").update(key).digest("hex").slice(0, 24)}`;
}

function identityVariants(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value).trim();
  if (!raw) return [] as string[];
  const withoutDevice = raw.replace(/:\d+(?=@)/, "");
  const bare = withoutDevice.split("@")[0] ?? withoutDevice;
  return Array.from(
    new Set(
      [raw, withoutDevice, bare, `${bare}@s.whatsapp.net`].filter((item): item is string =>
        Boolean(item),
      ),
    ),
  );
}

function userIdentityAliases(user: Record<string, unknown>) {
  return Array.from(
    new Set(
      ["_id", "id", "jid", "userId", "phone", "number", "whatsappNumber", "remoteJid"].flatMap(
        (key) => identityVariants(user[key]),
      ),
    ),
  );
}

function identityMatches(value: unknown, aliases: string[]) {
  const candidates = identityVariants(value);
  return candidates.some((candidate) => aliases.includes(candidate));
}

async function resolveBattleJid(user: Record<string, unknown>) {
  const aliases = userIdentityAliases(user);
  const db = await getDb();
  const trainer = aliases.length
    ? await db
        .collection("pokemon_trainers")
        .findOne({ $or: aliases.map((jid) => ({ jid })) } as never)
    : null;
  return trainer?.["jid"] ? String(trainer["jid"]) : String(user["_id"] ?? "");
}

function publicMove(move: Record<string, unknown>): WebBattleMoveDoc {
  const desc = typeof move["desc"] === "string" ? move["desc"] : null;
  return {
    name: value(move["name"], "Unknown move"),
    type: value(move["type"], "normal").toLowerCase(),
    power: numberValue(move["power"], 0),
    accuracy: numberValue(move["accuracy"], 100),
    pp: numberValue(move["pp"], 0),
    priority: numberValue(move["priority"], 0),
    ...(desc ? { desc } : {}),
  };
}

function publicPokemon(doc: Record<string, unknown>): WebBattlePokemonDoc {
  const id = value(doc["_id"] ?? doc["id"]);
  const pokedexId = numberValue(doc["pokedexId"], 0);
  const imageUrl = value(doc["imageUrl"], "");
  return {
    id,
    pokedexId,
    name: value(doc["name"], "Unknown"),
    displayName: value(doc["displayName"] ?? doc["nickname"] ?? doc["name"], "Unknown"),
    level: numberValue(doc["level"], 1),
    hp: Math.max(0, numberValue(doc["hp"], 0)),
    maxHp: Math.max(1, numberValue(doc["maxHp"], 1)),
    attack: Math.max(1, numberValue(doc["attack"], 10)),
    defense: Math.max(1, numberValue(doc["defense"], 10)),
    speed: Math.max(1, numberValue(doc["speed"], 10)),
    types: Array.isArray(doc["types"])
      ? (doc["types"] as unknown[]).map((item) => value(item).toLowerCase())
      : [value(doc["primaryType"], "normal").toLowerCase()],
    imageUrl,
    frontSpriteUrl: value(doc["frontSpriteUrl"], imageUrl),
    backSpriteUrl: value(doc["backSpriteUrl"] ?? doc["backImageUrl"], imageUrl),
    shiny: Boolean(doc["shiny"]),
    fainted: numberValue(doc["hp"], 0) <= 0,
    moves: Array.isArray(doc["moves"])
      ? (doc["moves"] as unknown[])
          .filter((item): item is Record<string, unknown> =>
            Boolean(item && typeof item === "object"),
          )
          .map(publicMove)
      : [],
  };
}

async function loadTrainerSnapshot(
  jid: string,
  fallbackName?: string,
  fallbackAvatar?: string | null,
): Promise<WebBattleTrainerDoc> {
  const db = await getDb();
  const aliases = identityVariants(jid);
  const userFilter = aliases.length
    ? {
        $or: aliases.flatMap((alias) => [
          { _id: alias },
          { jid: alias },
          { userId: alias },
          { whatsappNumber: alias },
        ]),
      }
    : { _id: jid };
  const [user, trainer, allPokemon] = await Promise.all([
    (await db.collection("users")).findOne(userFilter as never),
    db
      .collection("pokemon_trainers")
      .findOne({ $or: aliases.map((alias) => ({ jid: alias })) } as never),
    db
      .collection("pokemon_owned")
      .find({ ownerJid: { $in: aliases } } as never)
      .toArray(),
  ]);
  if (!trainer) throw new Error("Start your Pokémon journey in WhatsApp first.");

  const docs = allPokemon as unknown as Array<Record<string, unknown>>;
  const byId = new Map(docs.map((doc) => [value(doc["_id"] ?? doc["id"]), doc]));
  const partyIds = Array.isArray(trainer["party"])
    ? (trainer["party"] as unknown[]).map(String)
    : [];
  const ordered = partyIds.map((id) => byId.get(id)).filter(Boolean) as Array<
    Record<string, unknown>
  >;
  for (const doc of docs) {
    const id = value(doc["_id"] ?? doc["id"]);
    if (!ordered.some((item) => value(item["_id"] ?? item["id"]) === id)) ordered.push(doc);
  }

  const userRecord = (user ?? {}) as Record<string, unknown>;
  return {
    id: jid,
    name: user ? userName(userRecord) : (fallbackName ?? jid.split("@")[0] ?? "Trainer"),
    avatarUrl: user ? userAvatar(userRecord) : (fallbackAvatar ?? null),
    trainerSpriteUrl: null,
    ready: false,
    party: ordered.slice(0, 6).map(publicPokemon),
    activeIndex: 0,
    inventory: Object.fromEntries(
      Object.entries((trainer["inventory"] ?? {}) as Record<string, unknown>).map(([key, qty]) => [
        key,
        numberValue(qty),
      ]),
    ),
  };
}

function cloneTrainer(trainer: WebBattleTrainerDoc): WebBattleTrainerDoc {
  return {
    ...trainer,
    inventory: { ...trainer.inventory },
    party: trainer.party.map((pokemon) => ({
      ...pokemon,
      types: [...pokemon.types],
      moves: pokemon.moves.map((move) => ({ ...move })),
    })),
  };
}

function cloneRoom(room: WebBattleRoomDoc): WebBattleRoomDoc {
  return {
    ...room,
    challenger: cloneTrainer(room.challenger),
    opponent: room.opponent ? cloneTrainer(room.opponent) : null,
    spectatorIds: [...room.spectatorIds],
    combatLog: [...room.combatLog],
  };
}

function opposite(role: Role): Role {
  return role === "challenger" ? "opponent" : "challenger";
}

function trainerFor(room: BattleRoomInput, role: Role) {
  return role === "challenger" ? room.challenger : room.opponent;
}

function activePokemon(room: BattleRoomInput, role: Role) {
  const trainer = trainerFor(room, role);
  return trainer?.party[trainer.activeIndex] ?? null;
}

function healthyPokemon(trainer: WebBattleTrainerDoc | null) {
  return trainer?.party.some((pokemon) => pokemon.hp > 0) ?? false;
}

function roomRole(room: BattleRoomInput, aliases: string[]): Role | "spectator" {
  if (identityMatches(room.challenger.id, aliases)) return "challenger";
  if (room.opponent && identityMatches(room.opponent.id, aliases)) return "opponent";
  return "spectator";
}

function addLog(room: BattleRoomInput, message: string) {
  room.combatLog = [...room.combatLog.slice(-11), message];
}

function effectiveness(moveType: string, defenderTypes: string[]) {
  const chart = TYPE_CHART[moveType] ?? {};
  return defenderTypes.reduce((multiplier, type) => multiplier * (chart[type] ?? 1), 1);
}

function calcDamage(
  attacker: WebBattlePokemonDoc,
  defender: WebBattlePokemonDoc,
  move: WebBattleMoveDoc,
) {
  if (!move.power) return 0;
  const level = attacker.level || 5;
  const base =
    (((2 * level) / 5 + 2) * move.power * attacker.attack) / Math.max(1, defender.defense) / 50 + 2;
  const roll = 0.85 + Math.random() * 0.15;
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const multiplier = effectiveness(move.type, defender.types);
  return Math.max(1, Math.floor(base * roll * stab * multiplier));
}

async function clearExpired() {
  const now = new Date();
  const staleAt = new Date(now.getTime() - INACTIVITY_TTL_MS);
  return (await battleRooms()).deleteMany({
    $or: [
      {
        status: { $in: ["waiting", "active"] },
        $or: [
          { expiresAt: { $lte: now } },
          { lastActionAt: { $lte: staleAt } },
          { lastActionAt: { $exists: false }, createdAt: { $lte: staleAt } },
        ],
      },
      { status: "finished", expiresAt: { $lte: now } },
    ],
  } as never);
}

async function loadRoomByReference(roomId: string) {
  const rooms = await battleRooms();
  const normalizedRoomId = roomId.trim();
  let room = await rooms.findOne({ _id: normalizedRoomId });
  if (!room && /^[a-z0-9]{6}$/i.test(normalizedRoomId)) {
    const code = normalizedRoomId.toUpperCase();
    room = await rooms.findOne({
      $or: [{ code }, { _id: { $regex: `${code}$`, $options: "i" } }],
    } as never);
  }
  return room;
}

function summary(room: WebBattleRoomDoc): BattleRoomSummary {
  return {
    id: room._id,
    code: room.code || fallbackRoomCode(room._id),
    status: room.status,
    challenger: {
      id: room.challenger.id,
      name: room.challenger.name,
      avatarUrl: room.challenger.avatarUrl,
      ready: room.challenger.ready,
    },
    opponent: room.opponent
      ? {
          id: room.opponent.id,
          name: room.opponent.name,
          avatarUrl: room.opponent.avatarUrl,
          ready: room.opponent.ready,
        }
      : null,
    spectators: room.spectatorIds.length,
    createdAt: room.createdAt.toISOString(),
    lastActionAt: room.lastActionAt.toISOString(),
    gym: room.gym ?? null,
  };
}

function serializeRoom(room: WebBattleRoomDoc, joinedAs: BattleRoom["joinedAs"]): BattleRoom {
  return {
    ...summary(room),
    turn: room.turn,
    forcedSwitch: room.forcedSwitch,
    round: room.round,
    winnerId: room.winnerId,
    challenger: publicTrainer(room.challenger),
    opponent: room.opponent ? publicTrainer(room.opponent) : null,
    combatLog: room.combatLog,
    expiresAt: room.expiresAt?.toISOString() ?? null,
    joinedAs,
    gym: room.gym ?? null,
  };
}

async function persistHealth(room: WebBattleRoomDoc) {
  const pokemonCollection = (await getDb()).collection("pokemon_owned");
  const trainers = [room.challenger, room.opponent].filter(Boolean) as WebBattleTrainerDoc[];
  await Promise.all(
    trainers.flatMap((trainer) =>
      trainer.party.map((pokemon) =>
        pokemonCollection.updateOne(
          { _id: mongoId(pokemon.id), ownerJid: trainer.id } as never,
          { $set: { hp: pokemon.hp } } as never,
        ),
      ),
    ),
  );
}

async function finishRoom(room: WebBattleRoomDoc, winnerId: string | null, message: string) {
  const finishedAt = new Date();
  room.status = "finished";
  room.winnerId = winnerId;
  room.turn = null;
  room.forcedSwitch = null;
  room.finishedAt = finishedAt;
  room.expiresAt = new Date(finishedAt.getTime() + FINISHED_TTL_MS);
  addLog(room, message);
  await persistHealth(room);
}

async function saveRoom(room: WebBattleRoomDoc) {
  room.version += 1;
  room.lastActionAt = new Date();
  if (room.status === "finished") {
    const finishedAt = room.finishedAt ?? new Date();
    room.finishedAt = finishedAt;
    room.expiresAt = new Date(finishedAt.getTime() + FINISHED_TTL_MS);
  } else {
    room.finishedAt = null;
    room.expiresAt = new Date(Date.now() + ROOM_TTL_MS);
  }
  await (await battleRooms()).replaceOne({ _id: room._id }, room, { upsert: false });
}

function scheduleFinishedRoomCleanup(roomId: string) {
  setTimeout(() => {
    void battleRooms()
      .then((collection) => collection.deleteOne({ _id: roomId, status: "finished" }))
      .catch(() => undefined);
  }, FINISHED_TTL_MS);
}

export async function listBattleRooms() {
  await clearExpired();
  const rooms = await battleRooms();
  const docs = await rooms
    .find({ status: { $in: ["waiting", "active"] } } as never)
    .sort({ createdAt: 1 })
    .limit(100)
    .toArray();
  const seen = new Map<string, WebBattleRoomDoc>();
  const duplicates: string[] = [];
  for (const room of docs) {
    const key = room.pairKey || `solo:${canonicalIdentity(room.challenger.id)}`;
    if (seen.has(key)) duplicates.push(room._id);
    else seen.set(key, room);
  }
  if (duplicates.length) await rooms.deleteMany({ _id: { $in: duplicates } } as never);
  return [...seen.values()]
    .sort((a, b) => b.lastActionAt.getTime() - a.lastActionAt.getTime())
    .slice(0, 40)
    .map(summary);
}

function gymOpponentSnapshot(gymId: string) {
  const gym = gymById(gymId);
  if (!gym) throw new Error("That gym does not exist.");
  const party = gym.team.map((pokemon, index) => {
    const sprites = gymSpriteUrls(pokemon);
    return publicPokemon({
      _id: `gym-${gym.id}-${index}`,
      id: `gym-${gym.id}-${index}`,
      pokedexId: pokemon.pokedexId,
      name: pokemon.name,
      displayName: pokemon.name,
      level: pokemon.level,
      hp: pokemon.maxHp,
      maxHp: pokemon.maxHp,
      attack: pokemon.attack,
      defense: pokemon.defense,
      speed: pokemon.speed,
      types: pokemon.types,
      imageUrl: sprites.imageUrl,
      frontSpriteUrl: sprites.frontSpriteUrl,
      backSpriteUrl: sprites.backSpriteUrl,
      moves: pokemon.moves,
    });
  });
  return {
    id: `gym:${gym.id}`,
    name: `${gym.leader} · ${gym.name}`,
    avatarUrl: null,
    trainerSpriteUrl: "/battle-trainers/red.png",
    ready: true,
    party,
    activeIndex: 0,
    inventory: {},
  } satisfies WebBattleTrainerDoc;
}

async function ensureGymOpponentTeam(room: WebBattleRoomDoc) {
  if (!room.gym || !room.opponent) return false;
  const gym = gymById(room.gym.id);
  if (!gym || room.opponent.party.length >= gym.team.length) return false;
  const previousReady = room.opponent.ready;
  room.opponent = gymOpponentSnapshot(gym.id);
  room.opponent.ready = previousReady;
  addLog(room, `${gym.leader} has entered the full six-Pokémon ${gym.name} roster.`);
  return true;
}

export async function listGyms() {
  const user = await requireUser();
  const aliases = userIdentityAliases(user as unknown as Record<string, unknown>);
  const trainer = await (await getDb()).collection("pokemon_trainers").findOne({ $or: aliases.map((jid) => ({ jid })) } as never) as Record<string, unknown> | null;
  const badges = new Set(gymBadgeIds(trainer?.badges));
  return (await Promise.resolve(GYM_DEFINITIONS.map((gym) => gymById(gym.id)).filter(Boolean))).map((gym) => ({
    ...gym!,
    unlocked: !gym!.unlockAfter || badges.has(gym!.unlockAfter.toLowerCase()),
    earned: badges.has(gym!.id),
  }));
}

export async function createGymBattleRoom(gymId: string) {
  await clearExpired();
  const user = await requireUser();
  const gym = gymById(gymId);
  if (!gym) throw new Error("That gym does not exist.");
  const jid = await resolveBattleJid(user as unknown as Record<string, unknown>);
  const db = await getDb();
  const trainerDoc = await db.collection("pokemon_trainers").findOne({ $or: identityVariants(jid).map((value) => ({ jid: value })) } as never) as Record<string, unknown> | null;
  const badges = new Set(gymBadgeIds(trainerDoc?.badges));
  const cooldownUntil = trainerDoc?.gymCooldownUntil ? new Date(String(trainerDoc.gymCooldownUntil)).getTime() : 0;
  if (Number.isFinite(cooldownUntil) && cooldownUntil > Date.now()) {
    const remainingHours = Math.ceil((cooldownUntil - Date.now()) / 3600000);
    throw new Error(`Gym cooldown active. You can challenge the next gym in about ${remainingHours} hour${remainingHours === 1 ? "" : "s"}.`);
  }
  if (gym.unlockAfter && !badges.has(gym.unlockAfter.toLowerCase())) {
    throw new Error(`Earn the ${gymById(gym.unlockAfter)?.badge ?? "previous badge"} first.`);
  }
  const challenger = await loadTrainerSnapshot(jid);
  if (!challenger.party.some((pokemon) => pokemon.hp > 0)) throw new Error("You need one healthy Pokémon to challenge a gym.");
  const rooms = await battleRooms();
  const roomId = deterministicRoomId(`gym:${gym.id}:${canonicalIdentity(jid)}`);
  const existing = await rooms.findOne({ _id: roomId } as never);
  if (existing && existing.status !== "finished") return serializeRoom(existing, "challenger");
  const now = new Date();
  const room: WebBattleRoomDoc = {
    _id: roomId,
    code: "",
    status: "active",
    gym: { id: gym.id, name: gym.name, type: gym.type, leader: gym.leader, badge: gym.badge, theme: gym.theme, accent: gym.accent, background: gym.background, music: gym.music, rewardCoins: gym.rewardCoins, rewardXp: gym.rewardXp },
    rewardGrantedAt: null,
    pairKey: `gym:${gym.id}:${canonicalIdentity(jid)}`,
    challenger: { ...challenger, ready: true },
    opponent: gymOpponentSnapshot(gym.id),
    spectatorIds: [],
    turn: "challenger",
    forcedSwitch: null,
    round: 1,
    winnerId: null,
    combatLog: [`${gym.leader} welcomes you to ${gym.name}. Defeat the gym team to earn the ${gym.badge}.`],
    version: 1,
    createdAt: now,
    lastActionAt: now,
    expiresAt: new Date(now.getTime() + ROOM_TTL_MS),
  };
  let code = makeRoomCode();
  while (await rooms.findOne({ code } as never)) code = makeRoomCode();
  room.code = code;
  await rooms.replaceOne({ _id: room._id }, room, { upsert: true });
  return serializeRoom(room, "challenger");
}

async function grantGymReward(room: WebBattleRoomDoc) {
  if (!room.gym || room.rewardGrantedAt) return;
  const db = await getDb();
  const aliases = identityVariants(room.challenger.id);
  const now = new Date();
  const trainerFilter = { $or: aliases.map((jid) => ({ jid })) } as never;
  const claimed = await db.collection("pokemon_trainers").updateOne(
    { ...trainerFilter, [`gymRewards.${room.gym.id}`]: { $ne: true } } as never,
    { $set: { [`gymRewards.${room.gym.id}`]: true, gymCooldownUntil: new Date(now.getTime() + GYM_PROGRESS_COOLDOWN_MS) }, $addToSet: { badges: gymBadgeId(room.gym.id) }, $inc: { coins: room.gym.rewardCoins, xp: room.gym.rewardXp } } as never,
  );
  if (claimed.modifiedCount > 0) {
    await db.collection("users").updateOne({ $or: aliases.flatMap((jid) => [{ _id: jid }, { whatsappNumber: jid }, { jid }]) } as never, { $inc: { money: room.gym.rewardCoins, xp: room.gym.rewardXp } } as never);
    room.rewardGrantedAt = now;
  }
}

export async function createBattleRoom() {
  await clearExpired();
  const user = await requireUser();
  const jid = await resolveBattleJid(user as unknown as Record<string, unknown>);
  const rooms = await battleRooms();
  const identityIds = identityVariants(jid);
  const activeRooms = await rooms
    .find({
      "challenger.id": { $in: identityIds },
      status: { $in: ["waiting", "active"] },
    } as never)
    .sort({ createdAt: 1 })
    .toArray();
  const existing = activeRooms[0] ?? null;
  if (activeRooms.length > 1) {
    await rooms.deleteMany({ _id: { $in: activeRooms.slice(1).map((room) => room._id) } } as never);
  }
  if (existing) return serializeRoom(existing, "challenger");
  const invitedRoom = await rooms.findOne({
    invitedOpponentId: { $in: identityIds },
    status: { $in: ["waiting", "active"] },
  } as never);
  if (invitedRoom) return serializeRoom(invitedRoom, roomRole(invitedRoom, identityIds));
  const challenger = await loadTrainerSnapshot(jid);
  if (!challenger.party.some((pokemon) => pokemon.hp > 0))
    throw new Error("You need one healthy Pokémon to open a room.");
  const now = new Date();
  const room: WebBattleRoomDoc = {
    _id: deterministicRoomId(soloPairKey(jid)),
    pairKey: soloPairKey(jid),
    status: "waiting",
    code: "",
    challenger,
    opponent: null,
    spectatorIds: [],
    turn: null,
    forcedSwitch: null,
    round: 0,
    winnerId: null,
    combatLog: ["Room opened. Waiting for an opponent to join."],
    version: 1,
    createdAt: now,
    lastActionAt: now,
    expiresAt: new Date(now.getTime() + ROOM_TTL_MS),
  };
  let code = makeRoomCode();
  while (await rooms.findOne({ code } as never)) code = makeRoomCode();
  room.code = code;
  try {
    await rooms.insertOne(room);
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      const concurrent = await rooms.findOne({ _id: room._id } as never);
      if (concurrent) return serializeRoom(concurrent, "challenger");
    }
    throw error;
  }
  return serializeRoom(room, "challenger");
}

export async function getBattleRoom(roomId: string) {
  await clearExpired();
  const user = await requireUser();
  let room = await loadRoomByReference(roomId);
  if (!room) throw new Error("That battle room has expired or does not exist.");
  if (room.gym && (await ensureGymOpponentTeam(room))) await saveRoom(room);
  const aliases = userIdentityAliases(user as unknown as Record<string, unknown>);
  const battleJid = await resolveBattleJid(user as unknown as Record<string, unknown>);
  const roleAliases = Array.from(new Set([...aliases, ...identityVariants(battleJid)]));
  let role = roomRole(room, roleAliases);
  if (room.status === "waiting" && room.autoStart && room.opponent && role !== "spectator") {
    const next = cloneRoom(room);
    const opponent = next.opponent;
    if (!opponent) throw new Error("The challenged trainer is missing from this room.");
    next.challenger.ready = true;
    opponent.ready = true;
    next.status = "active";
    next.turn = "challenger";
    next.round = 1;
    addLog(next, "Both challenged trainers are loaded. The web battle has started.");
    await saveRoom(next);
    room = next;
  }
  if (role === "spectator") {
    const next = cloneRoom(room);
    const isChallenger = identityMatches(next.challenger.id, roleAliases);
    const invited = !next.invitedOpponentId || identityMatches(next.invitedOpponentId, roleAliases);
    if (!next.opponent && !isChallenger && invited) {
      next.opponent = await loadTrainerSnapshot(battleJid);
      role = "opponent";
      if (next.autoStart) {
        next.challenger.ready = true;
        next.opponent.ready = true;
        next.status = "active";
        next.turn = "challenger";
        next.round = 1;
        addLog(next, `${next.opponent.name} joined the room. The web battle has started.`);
      } else {
        addLog(next, `${next.opponent.name} joined the room. Both trainers must ready up.`);
      }
    } else {
      if (!next.spectatorIds.includes(battleJid)) next.spectatorIds.push(battleJid);
      role = "spectator";
    }
    await saveRoom(next);
    room = next;
  }
  // Website rooms created by the bot can contain both trainer snapshots
  // before either player opens the link. Start those rooms immediately so
  // the shared URL lands in the live arena instead of a ready/lobby screen.
  if (room.gym && (await ensureGymOpponentTeam(room))) await saveRoom(room);
  if (room.opponent && room.autoStart && room.status === "waiting") {
    const next = cloneRoom(room);
    const opponent = next.opponent;
    if (!opponent) throw new Error("The challenged trainer is missing from this room.");
    next.challenger.ready = true;
    opponent.ready = true;
    next.status = "active";
    next.turn = "challenger";
    next.round = Math.max(1, next.round);
    addLog(next, "Both trainers are loaded. The arena is live.");
    await saveRoom(next);
    room = next;
  }
  return serializeRoom(room, role);
}

export async function performBattleAction(roomId: string, action: BattleAction) {
  const user = await requireUser();
  const aliases = userIdentityAliases(user as unknown as Record<string, unknown>);
  const battleJid = await resolveBattleJid(user as unknown as Record<string, unknown>);
  const roleAliases = Array.from(new Set([...aliases, ...identityVariants(battleJid)]));
  const current = await loadRoomByReference(roomId);
  if (!current) throw new Error("That battle room has expired or does not exist.");
  const room = cloneRoom(current);
  const role = roomRole(room, roleAliases);
  if (role === "spectator")
    throw new Error("Spectators can watch this room but cannot control a trainer.");
  const trainer = trainerFor(room, role);
  if (!trainer) throw new Error("This trainer is no longer in the room.");

  if (action.type === "ready") {
    trainer.ready = true;
    if (room.opponent?.ready && room.challenger.ready) {
      room.status = "active";
      room.turn = "challenger";
      room.round = 1;
      addLog(room, "Both trainers are ready. The challenger moves first.");
    } else {
      addLog(room, `${trainer.name} is ready.`);
    }
    await saveRoom(room);
    return serializeRoom(room, role);
  }

  if (room.status !== "active") throw new Error("The battle is not active yet.");

      if (room.gym) {
      if (await ensureGymOpponentTeam(room)) await saveRoom(room);
      if (role !== "challenger") throw new Error("Only the trainer can control a gym battle.");

    const trainer = room.challenger;
    const gymOpponent = room.opponent;
    if (!gymOpponent) throw new Error("The gym leader is missing from this room.");
    if (room.forcedSwitch === "challenger") {
      if (action.type !== "switch") throw new Error("Choose a healthy replacement Pokémon first.");
      const replacement = trainer.party[action.pokemonIndex];
      if (!replacement || replacement.hp <= 0) throw new Error("Choose a healthy Pokémon.");
      trainer.activeIndex = action.pokemonIndex;
      room.forcedSwitch = null;
      room.turn = "challenger";
      addLog(room, `${trainer.name} sent out ${replacement.displayName}.`);
      await saveRoom(room);
      return serializeRoom(room, role);
    }
    if (action.type === "forfeit") {
      await finishRoom(room, gymOpponent.id, `${trainer.name} forfeited the gym challenge.`);
      await saveRoom(room);
      scheduleFinishedRoomCleanup(room._id);
      return serializeRoom(room, role);
    }
    if (action.type === "switch") {
      const replacement = trainer.party[action.pokemonIndex];
      if (!replacement || replacement.hp <= 0) throw new Error("Choose a healthy Pokémon.");
      trainer.activeIndex = action.pokemonIndex;
      addLog(room, `${trainer.name} switched to ${replacement.displayName}.`);
    } else if (action.type === "item") {
      throw new Error("Healing items are disabled during gym battles.");
    } else {
      if (action.type !== "move") throw new Error("Choose a move, switch, item, or forfeit.");
      const attacker = activePokemon(room, role);
      const defender = activePokemon(room, "opponent");
      if (!attacker || !defender) throw new Error("Both sides need an active Pokémon.");
      const move = attacker.moves[action.moveIndex];
      if (!move) throw new Error("Choose one of the visible moves.");
      const damage = Math.random() * 100 > (move.accuracy || 100) ? 0 : calcDamage(attacker, defender, move);
      defender.hp = Math.max(0, defender.hp - damage);
      addLog(room, `${attacker.displayName} used ${move.name}${damage ? ` for ${damage} damage.` : " It missed."}`);
    }

    const defender = activePokemon(room, "opponent");
    if (!defender || defender.hp <= 0) {
      const nextIndex = gymOpponent.party.findIndex((p, idx) => idx !== gymOpponent.activeIndex && p.hp > 0);
      if (nextIndex < 0) {
        await finishRoom(room, trainer.id, `${trainer.name} defeated ${room.gym.leader} and won the ${room.gym.badge}!`);
        await grantGymReward(room);
        await saveRoom(room);
        scheduleFinishedRoomCleanup(room._id);
        return serializeRoom(room, role);
      }
      const fainted = gymOpponent.party[gymOpponent.activeIndex];
      addLog(room, `${fainted?.displayName || "The opponent's Pokémon"} fainted!`);
      
      // Update index immediately so the next poll sees the new Pokémon
      gymOpponent.activeIndex = nextIndex;
      const nextPoke = gymOpponent.party[nextIndex];
      addLog(room, `${room.gym.leader} sent out ${nextPoke.displayName}.`);
      
      // Save and return immediately. The client handles the faint/send-out animation sequence.
      await saveRoom(room);
      return serializeRoom(room, role);
    }

    const player = activePokemon(room, role);
    const enemy = activePokemon(room, "opponent");
    if (player && enemy && player.hp > 0 && enemy.hp > 0) {
      const enemyMove = enemy.moves[0];
      const damage = enemyMove ? calcDamage(enemy, player, enemyMove) : Math.max(1, Math.floor(enemy.attack / 10));
      player.hp = Math.max(0, player.hp - damage);
      addLog(room, `${enemy.displayName} counterattacked for ${damage} damage.`);
      if (player.hp <= 0) {
        addLog(room, `${player.displayName} fainted.`);
        if (!healthyPokemon(trainer)) {
          await finishRoom(room, enemy.id, `${room.gym.leader} defeated ${trainer.name}.`);
          await saveRoom(room);
          scheduleFinishedRoomCleanup(room._id);
          return serializeRoom(room, role);
        }
        room.forcedSwitch = "challenger";
        room.turn = null;
        await saveRoom(room);
        return serializeRoom(room, role);
      }
    }
    room.turn = "challenger";
    room.round += 1;
    await saveRoom(room);
    return serializeRoom(room, role);
  }

  if (room.forcedSwitch && room.forcedSwitch !== role)
    throw new Error("Your opponent must choose a replacement Pokémon first.");

  if (action.type === "switch") {
    const index = action.pokemonIndex;
    if (!Number.isInteger(index) || index < 0 || index >= trainer.party.length)
      throw new Error("Choose a valid party slot.");
    if (index === trainer.activeIndex) throw new Error("That Pokémon is already in battle.");
    const replacement = trainer.party[index];
    if (!replacement || replacement.hp <= 0)
      throw new Error("A fainted Pokémon cannot be sent out.");
    const wasForced = room.forcedSwitch === role;
    trainer.activeIndex = index;
    room.forcedSwitch = null;
    room.turn = wasForced ? opposite(role) : opposite(role);
    addLog(room, `${trainer.name} sent out ${replacement.displayName}.`);
    await saveRoom(room);
    return serializeRoom(room, role);
  }

  if (room.forcedSwitch)
    throw new Error("Choose a replacement Pokémon before taking another action.");
  if (room.turn !== role) throw new Error("Wait for your turn.");

  if (action.type === "forfeit") {
    await finishRoom(
      room,
      room[opposite(role)]?.id ?? null,
      `${trainer.name} forfeited the battle.`,
    );
    await saveRoom(room);
    scheduleFinishedRoomCleanup(room._id);
    return serializeRoom(room, role);
  }

  if (action.type === "item") {
    throw new Error("Healing items are disabled during battles.");
  }

  if (action.type !== "move") throw new Error("Choose a move, switch, item, or forfeit.");
  const attacker = activePokemon(room, role);
  const defender = activePokemon(room, opposite(role));
  if (!attacker || !defender) throw new Error("Both trainers need an active Pokémon.");
  const move = attacker.moves[action.moveIndex];
  if (!move) throw new Error("Choose one of the visible moves.");
  const attackName = `${attacker.displayName} used ${move.name}.`;
  if (Math.random() * 100 > (move.accuracy || 100)) {
    addLog(room, `${attackName} It missed.`);
    room.turn = opposite(role);
    room.round += 1;
    await saveRoom(room);
    return serializeRoom(room, role);
  }

  const multiplier = effectiveness(move.type, defender.types);
  const damage = calcDamage(attacker, defender, move);
  defender.hp = Math.max(0, defender.hp - damage);
  const effectivenessText =
    multiplier === 0
      ? " It had no effect."
      : multiplier >= 2
        ? " Super effective!"
        : multiplier <= 0.5
          ? " It was not very effective."
          : "";
  addLog(room, `${attackName} ${damage} damage.${effectivenessText}`);

  if (defender.hp <= 0) {
    addLog(room, `${defender.displayName} fainted.`);
    const defenderTrainer = trainerFor(room, opposite(role));
    if (!healthyPokemon(defenderTrainer)) {
      await finishRoom(room, trainer.id, `${trainer.name} wins the battle!`);
      await saveRoom(room);
      scheduleFinishedRoomCleanup(room._id);
      return serializeRoom(room, role);
    }
    room.forcedSwitch = opposite(role);
    room.turn = null;
    await saveRoom(room);
    return serializeRoom(room, role);
  }

  room.turn = opposite(role);
  room.round += 1;
  await saveRoom(room);
  return serializeRoom(room, role);
}
