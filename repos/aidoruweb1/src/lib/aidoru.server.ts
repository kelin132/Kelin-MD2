import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import {
  battleRooms,
  cardMarket,
  cardUsers,
  getDb,
  guilds,
  pets,
  users,
  type GuildDoc,
  type PetDoc,
  type WebBattleMoveDoc,
  type WebBattlePokemonDoc,
  type WebBattleRoomDoc,
  type WebBattleTrainerDoc,
} from "./db.server";
import { currentUserId, requireUser, toPublicUser } from "./auth.server";
import { BOT_MART_ITEMS } from "./martCatalog";
import { GYM_DEFINITIONS, gymBadgeIds } from "./gyms";
import {
  GUILD_CREATION_COST,
  type LeaderboardMetric,
  type LeaderboardRow,
  type PublicGuild,
  type PublicGuildMember,
  type PublicUser,
  guildTaxRateForLevel,
  guildUpgradeRequirementsForLevel,
  type ShopItem,
  type Rarity,
  type OwnedCard,
  type CardMarketListing,
  type OwnedPet,
  type BattleAction,
  type BattleRoom,
  type BattleRoomSummary,
  petImageForSpecies,
} from "./game";

const SLOT_POOL = [
  ...Array(6).fill("🍒"),
  ...Array(5).fill("🍋"),
  ...Array(5).fill("🍊"),
  ...Array(4).fill("🍇"),
  ...Array(3).fill("🔔"),
  ...Array(2).fill("💎"),
  "7️⃣",
  ...Array(2).fill("🃏"),
] as const;
const SLOT_PAYOUTS: Record<string, number> = {
  "7️⃣": 10,
  "💎": 7,
  "🔔": 5,
  "🍇": 4,
  "🍊": 3,
  "🍋": 2.5,
  "🍒": 2,
  "🃏": 1.5,
};

function rarityForPrice(price: number): Rarity {
  if (price >= 10000) return "legend";
  if (price >= 2500) return "epic";
  if (price >= 800) return "rare";
  return "common";
}

function userKey(user: { _id: unknown }): string {
  return String(user._id);
}

function identityVariants(value: unknown): string[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  const withoutDevice = raw.replace(/:\d+(?=@)/, "");
  const parts = withoutDevice.split("@");
  const bare = parts[0] ?? withoutDevice;
  const domain = parts[1] || "s.whatsapp.net";
  
  const variants = [raw, withoutDevice, bare, `${bare}@${domain}`];
  if (domain === "s.whatsapp.net") {
    variants.push(`${bare}:0@s.whatsapp.net`);
  }
  
  return [...new Set(variants.filter(Boolean))];
}

function identityLookup(ids: unknown[]) {
  const variants = [...new Set(ids.flatMap(identityVariants))];
  if (variants.length === 0) return { _id: "__none__" };
  const objectIds = variants.filter((id) => typeof id === "string" && id.length === 24 && ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return {
    $or: [
      { _id: { $in: variants } },
      { userId: { $in: variants } },
      { whatsappNumber: { $in: variants } },
      { jid: { $in: variants } },
      { owner: { $in: variants } },
      { websiteId: { $in: variants } },
      { _id: { $in: objectIds } },
    ],
  };
}

function randomChoice<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function validWager(value: unknown, minimum: number, maximum: number): number {
  const amount = Math.floor(Number(value));
  if (!Number.isFinite(amount) || amount < minimum || amount > maximum) {
    throw new Error(
      `Wager must be between $${minimum.toLocaleString()} and $${maximum.toLocaleString()}.`,
    );
  }
  return amount;
}

async function publicCurrentUser(): Promise<PublicUser> {
  return toPublicUser(await requireUser());
}

async function appendHistory(jid: string, type: string, amount: number, desc: string) {
  const db = await getDb();
  await db
    .collection("users")
    .updateOne(
      { _id: jid } as never,
      {
        $push: { history: { $each: [{ type, amount, desc, ts: Date.now() }], $slice: -10 } },
      } as never,
    );
}

async function claimCooldown(
  jid: string,
  field: string,
  cooldownMs: number,
): Promise<{ ok: boolean; remainingMs: number }> {
  const now = Date.now();
  const result = await (
    await users()
  ).updateOne(
    {
      _id: jid,
      $or: [{ [field]: { $exists: false } }, { [field]: { $lte: now - cooldownMs } }],
    } as never,
    { $set: { [field]: now } } as never,
  );
  if (result.modifiedCount === 1) return { ok: true, remainingMs: 0 };
  const current = await (await users()).findOne({ _id: jid } as never);
  const last = Number(current?.[field as keyof typeof current] ?? now);
  return { ok: false, remainingMs: Math.max(0, cooldownMs - (now - last)) };
}

async function refundWallet(jid: string, amount: number) {
  if (amount <= 0) return;
  await (await users()).updateOne({ _id: jid }, { $inc: { money: amount } } as never);
}

export async function listShopItems(): Promise<ShopItem[]> {
  return BOT_MART_ITEMS.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    category: item.category as ShopItem["category"],
    price: item.price,
    rarity: rarityForPrice(item.price),
    description: item.description,
    sprite: item.slug,
    emoji: item.emoji,
    page: item.page,
    index: item.index,
    imageUrl: item.imageUrl,
  }));
}

export async function getLiveSession(): Promise<PublicUser | null> {
  const user = await requireUser();
  return toPublicUser(user);
}

function recordString(record: Record<string, unknown>, fields: string[]): string | null {
  const value = fields
    .map((field) => record[field])
    .find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);
  return value ? value.trim() : null;
}

function recordAvatar(record: Record<string, unknown>): string | null {
  return recordString(record, [
    "profilePictureUrl",
    "profileImage",
    "avatarUrl",
    "profilePic",
    "pfp",
    "imageUrl",
    "image",
  ]);
}

async function guildMembersToPublic(doc: GuildDoc, preloaded?: Map<string, Record<string, unknown>>): Promise<PublicGuildMember[]> {
  const memberIds = (Array.isArray(doc.members) ? doc.members : []).map(String);
  if (!memberIds.length) return [];
  
  let byAlias = preloaded;
  if (!byAlias) {
    const lookup = identityLookup(memberIds) as never;
    const [websiteDocs, botDocs] = await Promise.all([
      (await users()).find(lookup).toArray(),
      (await cardUsers()).find(lookup).toArray(),
    ]);
    byAlias = new Map<string, Record<string, unknown>>();
    for (const source of [...websiteDocs, ...botDocs]) {
      const record = source as unknown as Record<string, unknown>;
      for (const field of ["_id", "userId", "whatsappNumber", "jid", "owner", "websiteId"]) {
        for (const alias of identityVariants(record[field])) {
          if (!byAlias.get(alias)) byAlias.set(alias, record);
        }
      }
    }
  }

  const ownerAliases = new Set(identityVariants(doc.owner));
  return memberIds.map((memberId) => {
    const record = identityVariants(memberId).map((alias) => byAlias!.get(alias)).find(Boolean) ?? {};
    const memberLocal = memberId.split("@")[0] ?? memberId;
    const name = recordString(record, ["name", "username", "pushName", "notifyName", "ownerName"])
      ?? `Trainer ${(memberLocal.split(":")[0] ?? memberLocal).slice(-4)}`;
    return {
      id: memberId,
      name,
      avatarUrl: recordAvatar(record),
      avatarVideoUrl: recordString(record, ["profileVideoUrl", "videoUrl", "profileVideo"]) || null,
      isOwner: identityVariants(memberId).some((alias) => ownerAliases.has(alias)),
    };
  });
}

async function guildToPublic(doc: GuildDoc, userId: string, preloadedMembers?: Map<string, Record<string, unknown>>): Promise<PublicGuild> {
  const record = doc as unknown as Record<string, unknown>;
  const id = String(doc._id ?? "");
  const members = Array.isArray(doc.members) ? doc.members.map(String) : [];
  const level = Math.max(1, Number(doc.level) || 1);
  const requirements = guildUpgradeRequirementsForLevel(level);
  const userAliases = new Set(identityVariants(userId));
  const ownerAliases = new Set(identityVariants(doc.owner));
  return {
    id,
    name: doc.name ?? "Unnamed guild",
    tag: (String(doc.tag ?? doc.name ?? "GUILD")).slice(0, 5).toUpperCase(),
    description: doc.description ?? "",
    iconUrl: typeof doc.icon === "string" && doc.icon.trim() ? doc.icon : null,
    leaderId: doc.owner ?? (record["leaderId"] as string) ?? "",
    memberCount: members.length,
    memberCapacity: requirements.memberCapacity,
    level,
    guildXp: Number(record["guildXp"]) || 0,
    guildXpRequired: requirements.guildXp,
    bank: Number(doc.treasury) || 0,
    upgradeTreasuryRequired: requirements.treasury,
    upgradeMembersRequired: requirements.members,
    taxRate: Number(record["taxRate"]) || guildTaxRateForLevel(level),
    isMember: members.some((member) => identityVariants(member).some((alias) => userAliases.has(alias))),
    isOwner: identityVariants(doc.owner).some((alias) => userAliases.has(alias)),
    members: await guildMembersToPublic(doc, preloadedMembers),
  };
}

export async function listGuilds(): Promise<PublicGuild[]> {
  // Use currentUserId instead of requireUser to allow public listing if needed
  // and to avoid throwing during initial session loading.
  const userId = await currentUserId();
  const guildCol = await guilds();
  
  // Find all guilds. Kelin-MD2 stores them in the "guilds" collection.
  const docs = await guildCol.find({}).sort({ level: -1, guildXp: -1, treasury: -1 }).limit(100).toArray();
  
  if (!docs.length) {
    console.log("[guilds] No guilds found in collection.");
    return [];
  }

  // Batch member lookup to avoid N+1 queries
  const allMemberIds = [...new Set(docs.flatMap(g => Array.isArray(g.members) ? g.members : []).map(String))];
  const lookup = identityLookup(allMemberIds) as never;
  
  let websiteDocs: any[] = [];
  let botDocs: any[] = [];
  try {
    [websiteDocs, botDocs] = await Promise.all([
      (await users()).find(lookup).toArray(),
      (await cardUsers()).find(lookup).toArray(),
    ]);
  } catch (err) {
    console.error("[guilds] Member lookup failed:", err);
  }

  const byAlias = new Map<string, Record<string, unknown>>();
  for (const source of [...websiteDocs, ...botDocs]) {
    const record = source as unknown as Record<string, unknown>;
    const fields = ["_id", "userId", "whatsappNumber", "jid", "owner", "websiteId"];
    for (const field of fields) {
      if (record[field]) {
        for (const alias of identityVariants(record[field])) {
          if (!byAlias.has(alias)) byAlias.set(alias, record);
        }
      }
    }
  }

  const results = await Promise.all(
    docs.map(async (guild) => {
      try {
        // Pass the resolved userId (or empty string) for membership checks
        return await guildToPublic(guild, userId || "", byAlias);
      } catch (err) {
        console.error(`[guilds] Failed to process guild ${guild._id}:`, err);
        return null;
      }
    })
  );

  const filtered = results.filter((g): g is PublicGuild => g !== null);
  console.log(`[guilds] Returning ${filtered.length} guilds.`);
  return filtered;
}

function trainerTotalXp(level: number, currentXp: number): number {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const safeXp = Math.max(0, Math.floor(Number(currentXp) || 0));
  return ((safeLevel - 1) * safeLevel * 100) / 2 + safeXp;
}

function rowFromUser(
  doc: Record<string, unknown>,
  metric: LeaderboardMetric,
  score: number,
  counts?: { pokemonCount?: number; cardCount?: number },
): LeaderboardRow {
  const title = String(doc["job"] ?? (doc["isPremium"] ? "Premium Player" : "Player"));
  const avatar = [
    "profilePictureUrl",
    "profileImage",
    "avatarUrl",
    "profilePic",
    "pfp",
    "imageUrl",
    "image",
  ].find((key) => typeof doc[key] === "string" && String(doc[key]).trim());
  const name = [doc["name"], doc["username"], doc["pushName"], doc["notifyName"]]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0)
    ?.trim() ?? "Player";
  return {
    id: String(doc["_id"] ?? doc["jid"] ?? doc["userId"] ?? ""),
    name,
    title,
    score,
    scoreLabel:
      metric === "xp"
        ? "XP"
        : metric === "coins"
          ? "COINS"
                      : metric === "cards"
              ? "CARDS"
              : metric === "pokemon"
                ? "POKÉMON"
                : "BADGES",

    xp: Number(doc["xp"]) || 0,
    trainerXp: Number(doc["trainerXp"] ?? doc["xp"]) || 0,
    trainerLevel: Number(doc["trainerLevel"] ?? 1) || 1,
    coins: (Number(doc["money"]) || 0) + (Number(doc["bank"]) || 0),
    avatarUrl: avatar ? String(doc[avatar]) : null,
    avatarVideoUrl: recordString(doc, ["avatarVideo", "avatarVideoUrl", "profileVideoUrl", "videoUrl", "profileVideo"]) || null,
    pokemonCount: counts?.pokemonCount ?? 0,
    cardCount: counts?.cardCount ?? 0,
  };
}

export async function leaderboard(metric: LeaderboardMetric = "xp"): Promise<LeaderboardRow[]> {
  const db = await getDb();
  const userCollection = await users();

  if (metric === "xp") {
    const docs = await userCollection
      .find({ $or: [{ level: { $exists: true } }, { xp: { $exists: true } }] } as never)
      .limit(500)
      .toArray();
    return docs
      .map((doc) => {
        const record = doc as Record<string, unknown>;
        const level = Number(record["level"] ?? record["trainerLevel"]) || 1;
        const trainerXp = Number(record["xp"] ?? record["trainerXp"]) || 0;
        const normalized: Record<string, unknown> = { ...record, trainerXp, trainerLevel: level };
        return { record: normalized, level, trainerXp, totalXp: trainerTotalXp(level, trainerXp) };
      })
      .sort((a, b) => b.totalXp - a.totalXp || b.trainerXp - a.trainerXp || String(a.record["_id"] ?? "").localeCompare(String(b.record["_id"] ?? "")))
      .slice(0, 10)
      .map(({ record, totalXp }) => rowFromUser(record, metric, totalXp));
  }

  if (metric === "cards") {
    const cardDocs = await (await cardUsers())
      .find({} as never)
      .limit(1000)
      .toArray();
    const ranked = cardDocs
      .map((doc) => {
        const record = doc as Record<string, unknown>;
        const cards = Array.isArray(record["cards"]) ? (record["cards"] as Array<Record<string, unknown>>) : [];
        // Kelin-MD2 ranks the actual cards array; keep totalCards only as a
        // compatibility fallback for older profile documents.
        const count = cards.length || Number(record["totalCards"]) || 0;
        const userId = String(record["userId"] ?? record["_id"] ?? "").trim();
        const jid = String(record["whatsappNumber"] ?? record["jid"] ?? record["owner"] ?? userId).trim();
        const username = [record["username"], record["name"], record["ownerName"]]
          .find((value) => typeof value === "string" && value.trim().length > 0);
        return {
          userId,
          jid,
          username: typeof username === "string" ? username.trim() : "",
          score: count,
          count,
          cardRecord: record,
        };
      })
      .filter((entry) => entry.jid && entry.score > 0)
      .sort((a, b) => b.score - a.score || a.jid.localeCompare(b.jid))
      .slice(0, 10);
    const docs = await userCollection.find(identityLookup(ranked.map((entry) => entry.jid)) as never).toArray();
    const byId = new Map<string, Record<string, unknown>>();
    for (const doc of docs) {
      const record = doc as Record<string, unknown>;
      for (const field of ["_id", "userId", "whatsappNumber", "jid", "owner"]) {
        for (const alias of identityVariants(record[field])) byId.set(alias, record);
      }
    }
    return ranked
      .map((entry) => {
        const doc = identityVariants(entry.jid).map((alias) => byId.get(alias)).find(Boolean);
        const fallbackName =
          entry.username ||
          String(entry.cardRecord["name"] ?? "").trim() ||
          `User_${entry.userId.slice(-4) || entry.jid.slice(-4)}`;
        const publicDoc: Record<string, unknown> = {
          ...(entry.cardRecord ?? {}),
          ...(doc ?? {}),
          _id: doc?.["_id"] ?? entry.jid,
          name: [doc?.["name"], entry.username, doc?.["pushName"], fallbackName].find(
            (value) => typeof value === "string" && value.trim().length > 0,
          ),
          username: [doc?.["username"], entry.username, doc?.["name"], fallbackName].find(
            (value) => typeof value === "string" && value.trim().length > 0,
          ),
          registered: doc?.["registered"] || entry.cardRecord?.["registered"] || false,
        };
        return rowFromUser(publicDoc, metric, entry.score, { cardCount: entry.count });
      });
  }

  if (metric === "gyms") {
    const knownGymIds = new Set(GYM_DEFINITIONS.map((gym) => gym.id));
    const trainerDocs = await db.collection("pokemon_trainers").find({} as never).limit(1000).toArray();
    const ranked = trainerDocs
      .map((doc) => {
        const record = doc as Record<string, unknown>;
        const jid = String(record["jid"] ?? record["userId"] ?? record["_id"] ?? "").trim();
        const badgeCount = gymBadgeIds(record["badges"]).filter((badge) => knownGymIds.has(badge)).length;
        const rewards = record["gymRewards"] as Record<string, unknown> | undefined;
        const rewardCount = rewards && typeof rewards === "object"
          ? Object.keys(rewards).filter((gymId) => knownGymIds.has(gymId) && rewards[gymId] === true).length
          : 0;
        return { jid, score: Math.max(badgeCount, rewardCount), trainer: record };
      })
      .filter((entry) => entry.jid && entry.score > 0)
      .sort((a, b) => b.score - a.score || a.jid.localeCompare(b.jid))
      .slice(0, 10);
    const docs = await userCollection.find(identityLookup(ranked.map((entry) => entry.jid)) as never).toArray();
    const byId = new Map<string, Record<string, unknown>>();
    for (const doc of docs) {
      const record = doc as Record<string, unknown>;
      for (const field of ["_id", "userId", "whatsappNumber", "jid", "owner"]) {
        for (const alias of identityVariants(record[field])) byId.set(alias, record);
      }
    }
    return ranked.map((entry) => {
      const userDoc = identityVariants(entry.jid).map((alias) => byId.get(alias)).find(Boolean);
      const trainerName = typeof entry.trainer["username"] === "string" ? String(entry.trainer["username"]) : "";
      const publicDoc = {
        ...(userDoc ?? {}),
        _id: userDoc?.["_id"] ?? entry.jid,
        name: userDoc?.["name"] ?? userDoc?.["username"] ?? trainerName ?? `Trainer_${(entry.jid.split("@")[0] ?? entry.jid).slice(-4)}`,
        username: userDoc?.["username"] ?? trainerName,
      } as Record<string, unknown>;
      return rowFromUser(publicDoc, metric, entry.score);
    });
  }

  if (metric === "pokemon") {
    const ranked = await db
      .collection("pokemon_owned")
      .aggregate([
        { $group: { _id: "$ownerJid", score: { $sum: 1 } } },
        { $sort: { score: -1 } },
        { $limit: 10 },
      ])
      .toArray();
    const ids = ranked.map((entry) => String(entry["_id"]));
    const docs = await userCollection.find(identityLookup(ids) as never).toArray();
    const trainerDocs = await db.collection("pokemon_trainers").find({ jid: { $in: ids } }, { projection: { jid: 1, username: 1 } }).toArray();
    const byId = new Map<string, Record<string, unknown>>();
    for (const doc of docs) {
      const record = doc as Record<string, unknown>;
      for (const field of ["_id", "userId", "whatsappNumber", "jid", "owner"]) {
        for (const alias of identityVariants(record[field])) byId.set(alias, record);
      }
    }
    const trainerNames = new Map<string, string>();
    for (const trainer of trainerDocs) {
      const record = trainer as Record<string, unknown>;
      const name = typeof record["username"] === "string" ? String(record["username"]) : "";
      if (name) for (const alias of identityVariants(record["jid"])) trainerNames.set(alias, name);
    }
    return ranked.flatMap((entry) => {
      const jid = String(entry["_id"]);
      const doc = identityVariants(jid).map((alias) => byId.get(alias)).find(Boolean);
      const score = Number(entry["score"]) || 0;
      const fallbackName = identityVariants(jid).map((alias) => trainerNames.get(alias)).find(Boolean);
      const shortJid = (jid.split("@")[0] ?? jid).slice(-4);
      return [rowFromUser(doc ?? { _id: jid, username: fallbackName ?? `Trainer_${shortJid}` }, metric, score, { pokemonCount: score })];
    });
  }

  const docs = await userCollection
    .find(
      {},
      {
        projection: {
          name: 1,
          username: 1,
          pushName: 1,
          notifyName: 1,
          websiteId: 1,
          xp: 1,
          money: 1,
          bank: 1,
          job: 1,
          isPremium: 1,
          profilePictureUrl: 1,
          profileImage: 1,
          avatarUrl: 1,
          profilePic: 1,
          pfp: 1,
          imageUrl: 1,
          image: 1,
        },
      },
    )
    .limit(500)
    .toArray();
  return docs
    .map((doc) => {
      const record = doc as Record<string, unknown>;
      const score =
        metric === "coins"
          ? (Number(record["money"]) || 0) + (Number(record["bank"]) || 0)
          : Number(record["xp"]) || 0;
      return { record, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const xpA = Number(a.record["xp"]) || 0;
      const xpB = Number(b.record["xp"]) || 0;
      if (xpA !== xpB) return xpB - xpA;
      return String(a.record["name"] ?? a.record["username"] ?? "").localeCompare(
        String(b.record["name"] ?? b.record["username"] ?? ""),
      );
    })
    .slice(0, 10)
    .map(({ record, score }) => rowFromUser(record, metric, score));
}

function ownerKeys(user: { _id: unknown }): string[] {
  return identityVariants(userKey(user));
}

function normalizeCard(card: Record<string, unknown>, index: number): OwnedCard {
  return {
    cardId: String(card["cardId"] ?? card["id"] ?? `card-${index}`),
    name: String(card["name"] ?? "Unnamed card"),
    tier: String(card["tier"] ?? card["rarity"] ?? "common"),
    tierNum: Number(card["tierNum"] ?? 0) || 0,
    index: Number.isInteger(Number(card["index"])) ? Number(card["index"]) : index,
    spawnId: card["spawnId"] ? String(card["spawnId"]) : null,
    price: Number(card["price"] ?? 0) || 0,
    series: String(card["series"] ?? "AIDORU"),
    media: typeof card["media"] === "string" ? card["media"] : "",
    mediaType: String(card["mediaType"] ?? "image"),
    obtainedAt: card["obtainedAt"] ? String(card["obtainedAt"]) : null,
    ownerName: card["ownerName"] ? String(card["ownerName"]) : null,
    ownerId: card["ownerId"] ? String(card["ownerId"]) : null,
  };
}

export async function listCards(scope: "mine" | "global" = "mine"): Promise<OwnedCard[]> {
  const user = await requireUser();
  if (scope === "mine") {
    const keys = ownerKeys(user);
    const doc = await (await cardUsers()).findOne({
      $or: [{ userId: { $in: keys } }, { whatsappNumber: { $in: keys } }, { jid: { $in: keys } }, { owner: { $in: keys } }],
    } as never);
    const cards = Array.isArray(doc?.cards) ? doc.cards : [];
    return cards.map((card, index) => normalizeCard(card, index));
  }

  const docs = await (await cardUsers())
    .find(
      { cards: { $exists: true, $type: "array", $ne: [] } } as never,
      { projection: { _id: 1, userId: 1, whatsappNumber: 1, jid: 1, owner: 1, username: 1, name: 1, ownerName: 1, profilePictureUrl: 1, profileImage: 1, avatarUrl: 1, cards: 1 } } as never,
    )
    .limit(500)
    .toArray();
  const allCards = docs.flatMap((doc, ownerIndex) => {
    const record = doc as Record<string, unknown>;
    const cards = Array.isArray(record["cards"]) ? record["cards"] : [];
    const ownerId = String(record["userId"] ?? record["jid"] ?? record["_id"] ?? ownerIndex);
    const ownerName = String(record["username"] ?? record["name"] ?? record["ownerName"] ?? "Trainer");
    return cards.map((card, cardIndex) => ({
      ...(card as Record<string, unknown>),
      cardId: `${ownerId}:${String((card as Record<string, unknown>)["cardId"] ?? cardIndex)}`,
      ownerId,
      ownerName,
    }));
  });
  return allCards
    .map((card, index) => normalizeCard(card, index))
    .sort((left, right) => right.tierNum - left.tierNum || right.price - left.price)
    .slice(0, 1000);
}

export async function listMyCards(): Promise<OwnedCard[]> {
  return listCards("mine");
}

function marketplaceListingFilter(listingId: string) {
  const raw = String(listingId ?? "").trim();
  return ObjectId.isValid(raw) ? { $or: [{ _id: new ObjectId(raw) }, { _id: raw }] } : { _id: raw };
}

function marketListingFromDoc(doc: Record<string, unknown>, sellerName: string): CardMarketListing {
  const listedAt = doc["listedAt"] instanceof Date ? doc["listedAt"] : new Date(String(doc["listedAt"] ?? Date.now()));
  return {
    id: String(doc["_id"] ?? ""),
    sellerId: String(doc["sellerId"] ?? ""),
    sellerName,
    cardId: String(doc["cardId"] ?? ""),
    name: String(doc["cardName"] ?? doc["name"] ?? "Unnamed card"),
    tier: String(doc["cardRarity"] ?? doc["tier"] ?? "common"),
    price: Math.max(0, Number(doc["price"] ?? 0) || 0),
    media: String(doc["cardImage"] ?? doc["media"] ?? ""),
    listedAt: listedAt.toISOString(),
  };
}

function sellerNameFromDoc(doc: Record<string, unknown>): string | null {
  const value = ["sellerName", "username", "name", "ownerName", "pushName", "notifyName"]
    .map((key) => doc[key])
    .find((candidate) => typeof candidate === "string" && candidate.trim().length > 0);
  return value ? String(value).trim() : null;
}

export async function listCardMarket(): Promise<CardMarketListing[]> {
  await requireUser();
  const listings = await (await cardMarket()).find({ price: { $gt: 0 } } as never).sort({ listedAt: -1 }).limit(250).toArray();
  if (!listings.length) return [];
  const sellerIds = [...new Set(listings.map((listing) => String(listing.sellerId)))];
  const [sellerDocs, cardSellerDocs] = await Promise.all([
    (await users()).find(identityLookup(sellerIds) as never, { projection: { _id: 1, userId: 1, whatsappNumber: 1, jid: 1, owner: 1, username: 1, name: 1, pushName: 1, notifyName: 1 } } as never).toArray(),
    (await cardUsers()).find(identityLookup(sellerIds) as never, { projection: { _id: 1, userId: 1, whatsappNumber: 1, jid: 1, owner: 1, username: 1, name: 1, ownerName: 1, pushName: 1, notifyName: 1 } } as never).toArray(),
  ]);
  const sellerNames = new Map<string, string>();
  for (const seller of [...sellerDocs, ...cardSellerDocs]) {
    const record = seller as unknown as Record<string, unknown>;
    const name = sellerNameFromDoc(record);
    if (!name) continue;
    for (const field of ["_id", "userId", "whatsappNumber", "jid", "owner"]) {
      for (const key of identityVariants(record[field])) sellerNames.set(key, name);
    }
  }
  return listings.map((listing) => {
    const record = listing as unknown as Record<string, unknown>;
    const sellerId = String(record["sellerId"] ?? "");
    const storedName = sellerNameFromDoc(record);
    const shortSellerId = sellerId.split("@")[0]?.slice(-4);
    const sellerName =
      storedName ??
      sellerNames.get(sellerId) ??
      sellerNames.get(identityVariants(sellerId)[0] ?? "") ??
      (shortSellerId ? `Trainer · ${shortSellerId}` : "Unknown seller");
    return marketListingFromDoc(record, sellerName);
  });
}

export async function purchaseCardListing(listingId: string): Promise<{ ok: true; listing: CardMarketListing; balance: number }> {
  const buyer = await requireUser();
  const buyerId = userKey(buyer);
  const market = await cardMarket();
  const reserved = await market.findOneAndDelete(marketplaceListingFilter(listingId) as never);
  const listingDoc = reserved as unknown as Record<string, unknown> | null;
  if (!listingDoc) throw new Error("This card listing is no longer available.");

  const price = Math.max(0, Number(listingDoc["price"] ?? 0) || 0);
  const sellerId = String(listingDoc["sellerId"] ?? "");
  const sellerName = String(listingDoc["sellerName"] ?? "Trainer");
  const restoreListing = async () => {
    await market.insertOne(listingDoc as never).catch(() => undefined);
  };

  if (!price || identityVariants(sellerId).some((key) => identityVariants(buyerId).includes(key))) {
    await restoreListing();
    throw new Error(!price ? "This listing has an invalid price." : "You cannot buy your own card listing.");
  }

  const buyerUsers = await users();
  const sellerUser = await buyerUsers.findOne(identityLookup([sellerId]) as never);
  if (!sellerUser) {
    await restoreListing();
    throw new Error("The seller account could not be found.");
  }
  const buyerDebit = await buyerUsers.updateOne({ _id: buyerId, money: { $gte: price } } as never, { $inc: { money: -price } } as never);
  if (!buyerDebit.modifiedCount) {
    await restoreListing();
    throw new Error("You do not have enough coins for this card.");
  }

  let buyerCardAdded = false;
  let sellerCredited = false;
  try {
    const sellerCards = await cardUsers();
    // `.sellc` removes the card from mn_users.cards when it creates the listing.
    // The listing is therefore the source of truth for the card being transferred.
    // If an older/manual listing left a duplicate behind, remove one duplicate if it exists.
    const sellerFilter = { 
      ...identityLookup([sellerId]), 
      cards: { $elemMatch: { cardId: String(listingDoc["cardId"] ?? "") } } 
    } as never;
    
    const hasDuplicate = await sellerCards.findOne(sellerFilter);
    if (hasDuplicate) {
      await sellerCards.updateOne(
        sellerFilter,
        { $unset: { "cards.$": "" } } as never
      );
      await sellerCards.updateOne(
        identityLookup([sellerId]) as never,
        { $pull: { cards: null } } as never
      );
    }

    const buyerCardDoc = await sellerCards.findOne(identityLookup([buyerId]) as never);
    const purchasedCard = {
      cardId: String(listingDoc["cardId"] ?? ""),
      name: String(listingDoc["cardName"] ?? listingDoc["name"] ?? "Unnamed card"),
      tier: String(listingDoc["cardRarity"] ?? listingDoc["tier"] ?? "common"),
      price,
      media: String(listingDoc["cardImage"] ?? listingDoc["media"] ?? ""),
      obtainedAt: new Date().toISOString(),
      ownerId: buyerId,
      ownerName: String(buyer.name ?? "Trainer"),
    };
    if (buyerCardDoc?._id !== undefined) {
      const result = await sellerCards.updateOne({ _id: buyerCardDoc._id } as never, { $push: { cards: purchasedCard } } as never);
      if (result.modifiedCount !== 1) throw new Error("The buyer collection could not be updated.");
    } else {
      await sellerCards.insertOne({ userId: buyerId, username: String(buyer.name ?? "Trainer"), cards: [purchasedCard] } as never);
    }
    buyerCardAdded = true;

    const sellerCredit = await buyerUsers.updateOne({ _id: sellerUser._id } as never, { $inc: { money: price } } as never);
    if (sellerCredit.modifiedCount !== 1) throw new Error("The seller wallet could not be credited.");
    sellerCredited = true;
    const updatedBuyer = await buyerUsers.findOne({ _id: buyerId } as never);
    return { ok: true, listing: marketListingFromDoc(listingDoc, sellerName), balance: Number(updatedBuyer?.money ?? 0) || 0 };
  } catch (error) {
    if (sellerCredited) {
      await buyerUsers.updateOne({ _id: sellerUser._id } as never, { $inc: { money: -price } } as never).catch(() => undefined);
    }
    if (buyerCardAdded) {
      await (await cardUsers()).updateOne(
        identityLookup([buyerId]) as never,
        { $pull: { cards: { cardId: String(listingDoc["cardId"] ?? "") } } } as never,
      ).catch(() => undefined);
    }
    await buyerUsers.updateOne({ _id: buyerId } as never, { $inc: { money: price } } as never).catch(() => undefined);
    await restoreListing();
    throw error;
  }
}

function normalizePet(doc: PetDoc): OwnedPet {
  const record = doc as unknown as Record<string, unknown>;
  const directImage = ["imageUrl", "image", "avatarUrl", "sprite", "img"].map((key) => record[key]).find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return {
    petId: String(doc.petId ?? ""),
    name: String(doc.name ?? doc.species ?? "Companion"),
    species: String(doc.species ?? "companion"),
    rarity: String(doc.rarity ?? "common"),
    level: Number(doc.level) || 1,
    exp: Number(doc.exp) || 0,
    expNeeded: Number(doc.expNeeded) || 100,
    hp: Number(doc.hp) || 0,
    maxHp: Number(doc.maxHp) || 0,
    attack: Number(doc.attack) || 0,
    defense: Number(doc.defense) || 0,
    speed: Number(doc.speed) || 0,
    hunger: Math.max(0, Math.min(100, Number(doc.hunger ?? 100))),
    happiness: Math.max(0, Math.min(100, Number(doc.happiness ?? 100))),
    imageUrl: (directImage?.includes("image.pollinations.ai") ? directImage : null) ?? petImageForSpecies(doc.species, doc.name) ?? directImage ?? "https://api.dicebear.com/9.x/fun-emoji/svg?seed=aidoru-companion",
    skill: String(doc.skill ?? "Companion skill"),
    isActive: doc.isActive === true,
    lastFed: doc.lastFed ? new Date(doc.lastFed).toISOString() : null,
    lastPlayed: doc.lastPlayed ? new Date(doc.lastPlayed).toISOString() : null,
  };
}

export async function listMyPets(): Promise<OwnedPet[]> {
  const user = await requireUser();
  const docs = await (await pets()).find({ owner: { $in: ownerKeys(user) } } as never).sort({ isActive: -1, level: -1, createdAt: 1 }).toArray();
  return docs.map((doc) => normalizePet(doc));
}

async function findMyPet(petId?: string): Promise<{ user: Awaited<ReturnType<typeof requireUser>>; doc: PetDoc; keys: string[] }> {
  const user = await requireUser();
  const keys = ownerKeys(user);
  const doc = await (await pets()).findOne({ owner: { $in: keys }, ...(petId ? { petId: String(petId) } : { isActive: true }) } as never);
  if (!doc) throw new Error(petId ? "That companion was not found in your stable." : "You do not have an active companion yet.");
  return { user, doc, keys };
}

const PET_HATCH_POOL = [
  { species: "cat", name: "Cat", rarity: "common", skill: "Scratch", weight: 40 },
  { species: "dog", name: "Dog", rarity: "common", skill: "Bite", weight: 40 },
  { species: "bunny", name: "Bunny", rarity: "common", skill: "Quick Step", weight: 28 },
  { species: "fox", name: "Fox", rarity: "uncommon", skill: "Fox Fire", weight: 28 },
  { species: "wolf", name: "Wolf", rarity: "uncommon", skill: "Shadow Fang", weight: 28 },
  { species: "panda", name: "Panda", rarity: "uncommon", skill: "Bamboo Strike", weight: 28 },
  { species: "tiger", name: "Tiger", rarity: "rare", skill: "Tiger Pounce", weight: 18 },
  { species: "falcon", name: "Falcon", rarity: "rare", skill: "Dive Bomb", weight: 18 },
  { species: "spirit_wolf", name: "Spirit Wolf", rarity: "rare", skill: "Soul Howl", weight: 18 },
  { species: "kitsune", name: "Kitsune", rarity: "epic", skill: "Nine Lives", weight: 9 },
  { species: "phoenix_chick", name: "Phoenix Chick", rarity: "epic", skill: "Ember Rebirth", weight: 9 },
  { species: "baby_dragon", name: "Baby Dragon", rarity: "legendary", skill: "Dragon Breath", weight: 4 },
  { species: "shadow_dragon", name: "Shadow Dragon", rarity: "mythic", skill: "Void Roar", weight: 1 },
] as const;

function hatchSpecies() {
  const total = PET_HATCH_POOL.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of PET_HATCH_POOL) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return PET_HATCH_POOL[0];
}

export async function feedPet(petId?: string): Promise<OwnedPet[]> {
  const { doc, keys } = await findMyPet(petId);
  const lastFed = doc.lastFed ? new Date(doc.lastFed).getTime() : 0;
  const remainingMs = 2 * 60 * 60 * 1000 - (Date.now() - lastFed);
  if (remainingMs > 0) throw new Error(`This companion can be fed again in ${Math.ceil(remainingMs / 60000)} minute(s).`);
  await (await pets()).updateOne({ owner: { $in: keys }, petId: String(doc.petId ?? "") }, {
    $set: { hunger: Math.min(100, Number(doc.hunger ?? 100) + 30), happiness: Math.min(100, Number(doc.happiness ?? 100) + 5), lastFed: new Date().toISOString() },
  } as never);
  return listMyPets();
}

export async function playPet(petId?: string): Promise<OwnedPet[]> {
  const { doc, keys } = await findMyPet(petId);
  const lastPlayed = doc.lastPlayed ? new Date(doc.lastPlayed).getTime() : 0;
  const remainingMs = 60 * 60 * 1000 - (Date.now() - lastPlayed);
  if (remainingMs > 0) throw new Error(`This companion is resting for ${Math.ceil(remainingMs / 60000)} minute(s).`);
  await (await pets()).updateOne({ owner: { $in: keys }, petId: String(doc.petId ?? "") }, {
    $set: { hunger: Math.max(0, Number(doc.hunger ?? 100) - 5), happiness: Math.min(100, Number(doc.happiness ?? 100) + 20), lastPlayed: new Date().toISOString() },
  } as never);
  return listMyPets();
}

export async function selectPet(petId: string): Promise<OwnedPet[]> {
  const { keys } = await findMyPet(petId);
  const collection = await pets();
  await collection.updateMany({ owner: { $in: keys }, isActive: true } as never, { $set: { isActive: false } } as never);
  await collection.updateOne({ owner: { $in: keys }, petId }, { $set: { isActive: true } } as never);
  return listMyPets();
}

export async function releasePet(petId: string): Promise<OwnedPet[]> {
  const { doc, keys } = await findMyPet(petId);
  const collection = await pets();
  await collection.deleteOne({ owner: { $in: keys }, petId: String(doc.petId ?? "") } as never);
  if (doc.isActive) {
    const next = await collection.findOne({ owner: { $in: keys } } as never, { sort: { level: -1, createdAt: 1 } } as never);
    if (next) await collection.updateOne({ _id: next._id } as never, { $set: { isActive: true } } as never);
  }
  return listMyPets();
}

export async function hatchPet(): Promise<OwnedPet[]> {
  const user = await requireUser();
  const keys = ownerKeys(user);
  const collection = await pets();
  const total = await collection.countDocuments({ owner: { $in: keys } } as never);
  if (total >= 5) throw new Error("Your stable is full. Release a companion before hatching another egg.");
  const species = hatchSpecies();
  const petId = String(Math.floor(10000 + Math.random() * 90000));
  const level = 1;
  const base = species.rarity === "mythic" ? 180 : species.rarity === "legendary" ? 150 : species.rarity === "epic" ? 125 : species.rarity === "rare" ? 110 : 90;
  const doc: PetDoc = { petId, owner: userKey(user), name: species.name, species: species.species, rarity: species.rarity, level, exp: 0, expNeeded: 100, hp: base, maxHp: base, attack: Math.round(base * 0.2), defense: Math.round(base * 0.16), speed: Math.round(base * 0.14), hunger: 100, happiness: 100, imageUrl: petImageForSpecies(species.species, species.name) ?? `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(species.name)}`, skill: species.skill, isActive: total === 0, createdAt: new Date().toISOString(), lastFed: null, lastPlayed: null };
  if (doc.isActive) await collection.updateMany({ owner: { $in: keys }, isActive: true } as never, { $set: { isActive: false } } as never);
  await collection.insertOne(doc as never);
  return listMyPets();
}

const PET_SHOP: Record<string, { name: string; price: number; effect: string }> = {
  kibble: { name: "Kibble", price: 200, effect: "hunger" },
  meal: { name: "Premium Meal", price: 500, effect: "meal" },
  toy: { name: "Toy", price: 300, effect: "happiness" },
  exppotion: { name: "EXP Potion", price: 800, effect: "exp" },
  revival: { name: "Revival Tonic", price: 600, effect: "revival" },
  berry: { name: "Sweet Berry", price: 150, effect: "berry" },
  energy: { name: "Energy Drink", price: 700, effect: "energy" },
  deluxemeal: { name: "Deluxe Bento", price: 1200, effect: "deluxe" },
  grooming: { name: "Grooming Kit", price: 1000, effect: "grooming" },
  friendship: { name: "Friendship Ribbon", price: 2500, effect: "friendship" },
  superxp: { name: "Super EXP Potion", price: 2500, effect: "superxp" },
  goldenmeal: { name: "Golden Meal", price: 4000, effect: "golden" },
};

export async function buyPetCare(itemKey: string, petId?: string): Promise<{ pets: OwnedPet[]; spent: number; itemName: string }> {
  const item = PET_SHOP[itemKey];
  if (!item) throw new Error("Choose a valid pet-care item.");
  const { user, doc, keys } = await findMyPet(petId);
  const jid = userKey(user);
  const wallet = await (await users()).updateOne({ _id: jid, money: { $gte: item.price } } as never, { $inc: { money: -item.price } } as never);
  if (wallet.modifiedCount !== 1) throw new Error("You do not have enough wallet coins for that pet-care item.");
  try {
    const changes: Record<string, number> = {};
    if (item.effect === "hunger") changes["hunger"] = Math.min(100, Number(doc["hunger"] ?? 100) + 40);
    if (item.effect === "berry") { changes["hunger"] = Math.min(100, Number(doc["hunger"] ?? 100) + 20); changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 20); }
    if (item.effect === "energy") changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 50);
    if (item.effect === "deluxe") { changes["hunger"] = 100; changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 25); }
    if (item.effect === "grooming") changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 70);
    if (item.effect === "friendship") changes["happiness"] = 100;
    if (item.effect === "golden") { changes["hunger"] = 100; changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 50); }
    if (item.effect === "meal") { changes["hunger"] = 100; changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 10); }
    if (item.effect === "happiness") changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 35);
    if (item.effect === "revival") { changes["hunger"] = Math.min(100, Number(doc["hunger"] ?? 100) + 60); changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 40); }
    if (item.effect === "exp" || item.effect === "superxp") {
      let level = Number(doc.level) || 1;
      let exp = (Number(doc.exp) || 0) + (item.effect === "superxp" ? 500 : 150);
      let expNeeded = Number(doc.expNeeded) || Math.floor(100 * Math.pow(level, 1.3));
      while (exp >= expNeeded) {
        exp -= expNeeded;
        level += 1;
        expNeeded = Math.floor(100 * Math.pow(level, 1.3));
      }
      const scale = 1 + (level - 1) * 0.08;
      changes["exp"] = exp;
      changes["level"] = level;
      changes["expNeeded"] = expNeeded;
      changes["maxHp"] = Math.floor((Number(doc["maxHp"] ?? 100) || 100) * scale / (1 + (Number(doc["level"] ?? 1) - 1) * 0.08));
      changes["hp"] = changes["maxHp"];
      changes["attack"] = Math.floor((Number(doc["attack"] ?? 10) || 10) * scale / (1 + (Number(doc["level"] ?? 1) - 1) * 0.08));
      changes["defense"] = Math.floor((Number(doc["defense"] ?? 10) || 10) * scale / (1 + (Number(doc["level"] ?? 1) - 1) * 0.08));
      changes["speed"] = Math.floor((Number(doc["speed"] ?? 10) || 10) * scale / (1 + (Number(doc["level"] ?? 1) - 1) * 0.08));
    }
    await (await pets()).updateOne({ owner: { $in: keys }, petId: String(doc.petId ?? "") }, { $set: changes } as never);
  } catch (error) {
    await refundWallet(jid, item.price);
    throw error;
  }
  return { pets: await listMyPets(), spent: item.price, itemName: item.name };
}

export async function updateProfile(input?: {
  name?: string;
  bio?: string;
  title?: string;
  avatar?: string;
  banner?: string;
  avatarImage?: string | undefined;
  avatarVideo?: string | undefined;
  background?: string | undefined;
}): Promise<PublicUser> {
  const user = await requireUser();
  const profileImage = String(input?.avatarImage ?? user.profilePictureUrl ?? "").trim().slice(0, 1_500_000) || null;
  const profileVideo = String(input?.avatarVideo ?? user.avatarVideo ?? "").trim().slice(0, 5_000_000) || null;
  const profileBackground = String(input?.background ?? user.profileBackground ?? "").trim().slice(0, 1_500_000) || null;
  const updates = {
    name:
      String(input?.name ?? user.name ?? "Player")
        .trim()
        .slice(0, 32) || "Player",
    bio: String(input?.bio ?? user.bio ?? "")
      .trim()
      .slice(0, 240),
    job:
      String(input?.title ?? user.job ?? "Player")
        .trim()
        .slice(0, 40) || "Player",
    avatar: String(input?.avatar ?? "default").slice(0, 24),
    banner: String(input?.banner ?? "aurora").slice(0, 24),
    profilePictureUrl: profileImage,
    avatarVideo: profileVideo,
    profileBackground,
  };
  await (await users()).updateOne({ _id: userKey(user) }, { $set: updates } as never);

  // Kelin-MD2 reads the shared mn_users record for card ownership and profile
  // rendering. Mirror the explicit website avatar/background there so `.p`
  // can honor the trainer’s chosen artwork instead of always using WhatsApp.
  try {
    const rawUser = user as unknown as Record<string, unknown>;
    const identityFields = [
      userKey(user),
      rawUser["userId"],
      rawUser["whatsappNumber"],
      rawUser["jid"],
    ];
    const botProfiles = await cardUsers();
    const botProfile = await botProfiles.findOne(identityLookup(identityFields) as never);
    const botUserId = String(rawUser["userId"] ?? rawUser["whatsappNumber"] ?? userKey(user))
      .replace(/:\d+(?=@)/, "")
      .split("@")[0];
    const botFields = {
      profilePictureUrl: profileImage,
      avatarVideo: profileVideo,
      profileBackground,
      name: updates.name,
      username: updates.name,
    };
    if (botProfile?._id) {
      await botProfiles.updateOne({ _id: botProfile._id } as never, { $set: botFields } as never);
    } else if (botUserId) {
      await botProfiles.updateOne(
        { userId: botUserId } as never,
        { $set: { userId: botUserId, ...botFields } } as never,
        { upsert: true },
      );
    }
  } catch (syncError) {
    console.warn("[profile] Could not mirror website profile to Kelin-MD2:", syncError);
  }

  return publicCurrentUser();
}

export async function chooseStarter(_starterId?: string): Promise<PublicUser> {
  throw new Error(
    "Start your Pokémon trainer with .startjourney in WhatsApp, then return here to manage the live party.",
  );
}

export async function claimDaily(): Promise<{ user: PublicUser; reward: number; streak: number }> {
  const user = await requireUser();
  const jid = userKey(user);
  const cooldown = await claimCooldown(jid, "lastDaily", 24 * 60 * 60 * 1000);
  if (!cooldown.ok) {
    throw new Error(
      `Daily reward is cooling down for ${Math.ceil(cooldown.remainingMs / 3600000)} more hour(s).`,
    );
  }
  const previousStreak = Number(user.streak) || 0;
  const streak = Math.min(previousStreak + 1, 14);
  const reward = 50_000 + Math.floor(Math.random() * 50_000);
  await (
    await users()
  ).updateOne({ _id: jid }, { $inc: { money: reward, xp: 200 }, $set: { streak } } as never);
  await appendHistory(jid, "daily", reward, `Daily reward: day ${streak}`);
  return { user: await publicCurrentUser(), reward, streak };
}

export async function buyItem(input?: {
  itemId?: string;
  qty?: number;
}): Promise<{ user: PublicUser; itemName: string; spent: number }> {
  const user = await requireUser();
  const item = BOT_MART_ITEMS.find((entry) => entry.id === input?.itemId);
  if (!item) throw new Error("That Mart item is no longer available.");
  const qty = Math.max(1, Math.min(99, Math.floor(Number(input?.qty) || 1)));
  const db = await getDb();
  const trainerCollection = db.collection("pokemon_trainers");
  const trainer = await trainerCollection.findOne({ jid: userKey(user) });
  if (!trainer) throw new Error("Start your Pokémon journey with .startjourney in WhatsApp first.");
  const existingQty =
    Number((trainer["inventory"] as Record<string, unknown> | undefined)?.[item.id]) || 0;
  if (item.id === "keystone" && existingQty > 0)
    throw new Error("Your trainer can only own one Keystone.");
  const spent = item.price * qty;
  const wallet = await (
    await users()
  ).updateOne({ _id: userKey(user), registered: true, money: { $gte: spent } }, {
    $inc: { money: -spent, xp: 3 },
  } as never);
  if (wallet.modifiedCount !== 1)
    throw new Error("You do not have enough wallet coins for that purchase.");
  try {
    const updated = await trainerCollection.updateOne(
      { jid: userKey(user) },
      { $inc: { [`inventory.${item.id}`]: qty } },
    );
    if (updated.modifiedCount !== 1) throw new Error("Trainer inventory could not be updated.");
  } catch (error) {
    await refundWallet(userKey(user), spent);
    throw error;
  }
  await appendHistory(userKey(user), "mart", -spent, `Bought ${qty} ${item.name}`);
  return { user: await publicCurrentUser(), itemName: item.name, spent };
}

export async function joinGuild(guildId?: string): Promise<PublicUser> {
  const user = await requireUser();
  const jid = userKey(user);
  const guild = await (await guilds()).findOne({ _id: String(guildId ?? "") } as never);
  if (!guild) throw new Error("Guild not found.");
  const current = await (await guilds()).findOne({ members: jid } as never);
  if (current && String(current._id) !== String(guild._id))
    throw new Error("Leave your current guild before joining another.");
  const currentMembers = Array.isArray(guild.members) ? guild.members.length : 0;
  const requirements = guildUpgradeRequirementsForLevel(Number(guild.level) || 1);
  if (!current && currentMembers >= requirements.memberCapacity) {
    throw new Error(`This guild is full at ${requirements.memberCapacity} members. Upgrade the guild before adding more trainers.`);
  }
  await (await guilds()).updateOne({ _id: guild._id }, { $addToSet: { members: jid } } as never);
  return publicCurrentUser();
}

export async function leaveGuild(): Promise<PublicUser> {
  const user = await requireUser();
  await (
    await guilds()
  ).updateOne({ members: userKey(user) } as never, { $pull: { members: userKey(user) } } as never);
  return publicCurrentUser();
}

export async function createGuild(input?: {
  name?: string;
  tag?: string;
  description?: string;
}): Promise<PublicUser> {
  const user = await requireUser();
  const name = String(input?.name ?? "")
    .trim()
    .slice(0, 32);
  const tag = String(input?.tag ?? "")
    .trim()
    .slice(0, 5)
    .toUpperCase();
  if (name.length < 3 || tag.length < 2)
    throw new Error("Enter a guild name and a 2–5 character tag.");
  if (await (await guilds()).findOne({ members: userKey(user) } as never))
    throw new Error("Leave your current guild before creating one.");
  const wallet = await (
    await users()
  ).updateOne({ _id: userKey(user), money: { $gte: GUILD_CREATION_COST } }, {
    $inc: { money: -GUILD_CREATION_COST },
  } as never);
  if (wallet.modifiedCount !== 1)
    throw new Error(`Creating a guild costs ${GUILD_CREATION_COST.toLocaleString()} coins.`);
  try {
    await (
      await guilds()
    ).insertOne({
      _id: `guild-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      owner: userKey(user),
        members: [userKey(user)],
        level: 1,
        guildXp: 0,
        treasury: 0,
        taxRate: guildTaxRateForLevel(1),
        tag,
        description: String(input?.description ?? "")
        .trim()
        .slice(0, 200),
      icon: null,
      bannerUrl: null,
    } as never);
  } catch (error) {
    await refundWallet(userKey(user), GUILD_CREATION_COST);
    throw error;
  }
  return publicCurrentUser();
}

export async function upgradeGuild(): Promise<PublicUser> {
  const user = await requireUser();
  const jid = userKey(user);
  const guild = await (await guilds()).findOne({ owner: jid } as never);
  if (!guild) throw new Error("Only the guild owner can upgrade the guild.");

  const currentLevel = Number(guild.level) || 1;
  if (currentLevel >= 20) throw new Error("Guild has already reached the maximum level.");

  const requirements = guildUpgradeRequirementsForLevel(currentLevel);
  const guildXp = Number(guild.guildXp ?? 0);
  const treasury = Number(guild.treasury ?? 0);
  const memberCount = guild.members?.length ?? 0;
  if (guildXp < requirements.guildXp)
    throw new Error(`Guild needs ${requirements.guildXp.toLocaleString()} XP to upgrade (Current: ${guildXp.toLocaleString()}).`);
  if (treasury < requirements.treasury)
    throw new Error(`Guild treasury needs ${requirements.treasury.toLocaleString()} coins to upgrade (Current: ${treasury.toLocaleString()}).`);
  if (memberCount < requirements.members)
    throw new Error(`Guild needs at least ${requirements.members} members to upgrade.`);

  await (await guilds()).updateOne(
    { _id: guild._id },
    {
      $inc: { level: 1, treasury: -requirements.treasury, guildXp: -requirements.guildXp },
      $set: { taxRate: guildTaxRateForLevel(currentLevel + 1) },
    } as never
  );

  return publicCurrentUser();
}

export async function updateGuildInfo(data: { description?: string | undefined; iconUrl?: string | undefined; bannerUrl?: string | undefined }): Promise<PublicUser> {
  const user = await requireUser();
  const jid = userKey(user);
  const guild = await (await guilds()).findOne({ owner: jid } as never);
  if (!guild) throw new Error("Only the guild owner can update guild settings.");

  const update: any = {};
  if (typeof data.description === "string") update.description = data.description.trim().slice(0, 200);
  if (data.iconUrl) update.icon = data.iconUrl;
  if (data.bannerUrl) update.bannerUrl = data.bannerUrl;

  if (Object.keys(update).length > 0) {
    await (await guilds()).updateOne({ _id: guild._id }, { $set: update } as never);
  }

  return publicCurrentUser();
}

export async function playCoinFlip(input?: {
  wager?: number;
  pick?: "heads" | "tails";
}): Promise<{ user: PublicUser; result: "heads" | "tails"; won: boolean; delta: number }> {
  const user = await requireUser();
  const wager = validWager(input?.wager, 10, 1_000_000_000);
  if (input?.pick !== "heads" && input?.pick !== "tails") throw new Error("Choose heads or tails.");
  const cooldown = await claimCooldown(userKey(user), "lastCoinflip", 8_000);
  if (!cooldown.ok)
    throw new Error(`Coinflip cooldown: wait ${Math.ceil(cooldown.remainingMs / 1000)}s.`);
  if (Number(user.money) < wager)
    throw new Error("You do not have enough wallet coins for that wager.");
  const won = Math.random() < 0.55;
  const result = won ? input.pick : input.pick === "heads" ? "tails" : "heads";
  const delta = won ? wager : -wager;
  await (
    await users()
  ).updateOne({ _id: userKey(user) }, { $inc: { money: delta, xp: won ? 8 : 0 } } as never);
  await appendHistory(
    userKey(user),
    "coinflip",
    delta,
    `Coinflip ${won ? "win" : "loss"}: ${input.pick}`,
  );
  return { user: await publicCurrentUser(), result, won, delta };
}

export async function playBet(input?: {
  wager?: number;
}): Promise<{ user: PublicUser; won: boolean; delta: number }> {
  const user = await requireUser();
  const wager = validWager(input?.wager, 10, 1_000_000_000);
  const cooldown = await claimCooldown(userKey(user), "lastBet", 30_000);
  if (!cooldown.ok)
    throw new Error(`Bet cooldown: wait ${Math.ceil(cooldown.remainingMs / 1000)}s.`);
  if (Number(user.money) < wager)
    throw new Error("You do not have enough wallet coins for that wager.");
  const won = Math.random() < 0.53;
  const delta = won ? wager : -wager;
  await (
    await users()
  ).updateOne({ _id: userKey(user) }, { $inc: { money: delta, xp: won ? 15 : 0 } } as never);
  await appendHistory(userKey(user), "bet", delta, `Website bet ${won ? "win" : "loss"}`);
  return { user: await publicCurrentUser(), won, delta };
}

export async function playSlots(input?: {
  wager?: number;
}): Promise<{ user: PublicUser; reels: string[]; delta: number; multiplier: number }> {
  const user = await requireUser();
  const wager = validWager(input?.wager, 50, 50_000);
  const cooldown = await claimCooldown(userKey(user), "lastSlots", 15_000);
  if (!cooldown.ok)
    throw new Error(`Slots cooldown: wait ${Math.ceil(cooldown.remainingMs / 1000)}s.`);
  if (Number(user.money) < wager)
    throw new Error("You do not have enough wallet coins for that wager.");
  const reels = [randomChoice(SLOT_POOL), randomChoice(SLOT_POOL), randomChoice(SLOT_POOL)];
  let multiplier = 0;
  if (reels[0] === reels[1] && reels[1] === reels[2]) multiplier = SLOT_PAYOUTS[reels[0]] || 2;
  else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2])
    multiplier = 0.5;
  const winnings = Math.floor(wager * multiplier);
  const delta = winnings - wager;
  await (
    await users()
  ).updateOne({ _id: userKey(user) }, { $inc: { money: delta, xp: 5 } } as never);
  await appendHistory(userKey(user), "slots", delta, `Website slots: bet $${wager}`);
  return { user: await publicCurrentUser(), reels, delta, multiplier };
}

export async function playDice(input?: {
  wager?: number;
  guess?: number;
}): Promise<{ user: PublicUser; roll: number; won: boolean; delta: number }> {
  const user = await requireUser();
  const wager = validWager(input?.wager, 50, 500_000_000);
  const guess = Math.floor(Number(input?.guess));
  if (isNaN(guess) || guess < 1 || guess > 6) throw new Error("Guess a number between 1 and 6.");
  
  const cooldown = await claimCooldown(userKey(user), "lastDice", 5_000);
  if (!cooldown.ok)
    throw new Error(`Dice cooldown: wait ${Math.ceil(cooldown.remainingMs / 1000)}s.`);
    
  if (Number(user.money) < wager)
    throw new Error("You do not have enough wallet coins for that wager.");

  const roll = Math.floor(Math.random() * 6) + 1;
  const won = roll === guess;
  const delta = won ? wager * 5 : -wager;

  await (
    await users()
  ).updateOne({ _id: userKey(user) }, { $inc: { money: delta, xp: won ? 20 : 2 } } as never);
  await appendHistory(userKey(user), "dice", delta, `Website dice: roll ${roll}, guess ${guess}`);
  
  return { user: await publicCurrentUser(), roll, won, delta };
}

export async function playRoulette(input?: {
  wager?: number;
  color?: "red" | "black" | "green";
}): Promise<{ user: PublicUser; roll: number; rollColor: string; won: boolean; delta: number }> {
  const user = await requireUser();
  const wager = validWager(input?.wager, 100, 1_000_000_000);
  if (!["red", "black", "green"].includes(input?.color || "")) throw new Error("Pick red, black, or green.");
  
  const cooldown = await claimCooldown(userKey(user), "lastRoulette", 10_000);
  if (!cooldown.ok)
    throw new Error(`Roulette cooldown: wait ${Math.ceil(cooldown.remainingMs / 1000)}s.`);
    
  if (Number(user.money) < wager)
    throw new Error("You do not have enough wallet coins for that wager.");

  const roll = Math.floor(Math.random() * 37); // 0-36
  let rollColor = "";
  if (roll === 0) rollColor = "green";
  else if ([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(roll)) rollColor = "red";
  else rollColor = "black";

  const won = input?.color === rollColor;
  let multiplier = 0;
  if (won) {
    multiplier = rollColor === "green" ? 35 : 1;
  }
  
  const delta = won ? wager * multiplier : -wager;

  await (
    await users()
  ).updateOne({ _id: userKey(user) }, { $inc: { money: delta, xp: won ? 25 : 5 } } as never);
  await appendHistory(userKey(user), "roulette", delta, `Website roulette: roll ${roll} (${rollColor})`);
  
  return { user: await publicCurrentUser(), roll, rollColor, won, delta };
}

export async function setLeadPokemon(pokemonId?: string): Promise<PublicUser> {
  const user = await requireUser();
  const jid = userKey(user);
  const db = await getDb();
  const trainer = await db.collection("pokemon_trainers").findOne({ jid });
  if (!trainer) throw new Error("Start your Pokémon journey in WhatsApp first.");
  const id = String(pokemonId ?? "");
  if (!Array.isArray(trainer["party"]) || !(trainer["party"] as unknown[]).map(String).includes(id))
    throw new Error("That Pokémon is not in your party.");
  const pokemon = await db.collection("pokemon_owned").findOne({ _id: id } as never);
  if (pokemon && Number(pokemon["hp"] ?? 0) <= 0)
    throw new Error("A fainted Pokémon cannot be your lead.");
  await db.collection("pokemon_trainers").updateOne({ jid }, { $set: { leadPokemonId: id } });
  return publicCurrentUser();
}

export async function swapParty(input?: { first?: number; second?: number }): Promise<PublicUser> {
  const user = await requireUser();
  const jid = userKey(user);
  const first = Math.floor(Number(input?.first));
  const second = Math.floor(Number(input?.second));
  if (![first, second].every((slot) => slot >= 1 && slot <= 6) || first === second)
    throw new Error("Choose two different party slots from 1 to 6.");
  const db = await getDb();
  const trainer = await db.collection("pokemon_trainers").findOne({ jid });
  if (!trainer || !Array.isArray(trainer["party"]))
    throw new Error("Start your Pokémon journey in WhatsApp first.");
  const party = [...(trainer["party"] as unknown[])];
  if (!party[first - 1] || !party[second - 1])
    throw new Error("Both selected party slots must contain a Pokémon.");
  [party[first - 1], party[second - 1]] = [party[second - 1], party[first - 1]];
  await db
    .collection("pokemon_trainers")
    .updateOne(
      { jid },
      { $set: { party, ...(first === 1 || second === 1 ? { leadPokemonId: party[0] } : {}) } },
    );
  return publicCurrentUser();
}

export async function movePokemon(input?: {
  pokemonId?: string;
  destination?: "party" | "pc";
}): Promise<PublicUser> {
  const user = await requireUser();
  const jid = userKey(user);
  const id = String(input?.pokemonId ?? "");
  const destination = input?.destination;
  if (!id || (destination !== "party" && destination !== "pc"))
    throw new Error("Choose a Pokémon and destination.");
  const db = await getDb();
  const trainers = db.collection("pokemon_trainers");
  const pokemonCollection = db.collection("pokemon_owned");
  const trainer = await trainers.findOne({ jid });
  if (!trainer) throw new Error("Start your Pokémon journey in WhatsApp first.");
  const party = Array.isArray(trainer["party"]) ? (trainer["party"] as unknown[]).map(String) : [];
  const pc = Array.isArray(trainer["pc"]) ? (trainer["pc"] as unknown[]).map(String) : [];
  if (destination === "party") {
    if (party.length >= 6) throw new Error("Your party is full. Move one Pokémon to the PC first.");
    if (!pc.includes(id)) throw new Error("That Pokémon is not in your PC.");
    await trainers.updateOne({ jid }, { $pull: { pc: id }, $addToSet: { party: id } } as never);
    await pokemonCollection.updateOne(
      { _id: id, ownerJid: jid } as never,
      { $set: { inParty: true } } as never,
    );
  } else {
    if (!party.includes(id)) throw new Error("That Pokémon is not in your party.");
    if (party.length <= 1) throw new Error("Keep at least one Pokémon in your party.");
    const nextParty = party.filter((entry) => entry !== id);
    await trainers.updateOne({ jid }, {
      $pull: { party: id },
      $addToSet: { pc: id },
      $set: { party: nextParty, leadPokemonId: nextParty[0] },
    } as never);
    await pokemonCollection.updateOne(
      { _id: id, ownerJid: jid } as never,
      { $set: { inParty: false } } as never,
    );
  }
  return publicCurrentUser();
}
