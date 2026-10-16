let indexesPromise = null;

const INDEXES = [
  ["users", { registered: 1, level: -1, xp: -1 }, "users_registered_level"],
  ["users", { registered: 1, totalWealth: -1 }, "users_registered_total_wealth"],
  ["users", { userId: 1 }, "users_user_id"],
  ["users", { whatsappNumber: 1 }, "users_whatsapp_number"],
  ["users", { phoneNumber: 1 }, "users_phone_number"],
  ["users", { jid: 1 }, "users_jid"],
  ["rpg_users", { level: -1, xp: -1 }, "rpg_level_xp"],
  ["pokemon_trainers", { wins: -1 }, "pokemon_trainer_wins"],
  ["pokemon_trainers", { level: -1, xp: -1 }, "pokemon_trainer_level_xp"],
  ["pokemon_trainers", { pokemonCount: -1, jid: 1 }, "pokemon_trainer_count"],
  ["pokemon_trainers", { jid: 1 }, "pokemon_trainer_jid"],
  ["pokemon_owned", { level: -1 }, "pokemon_owned_level"],
  ["pokemon_owned", { ownerJid: 1, inParty: 1 }, "pokemon_owned_owner_party"],
  ["guilds", { owner: 1 }, "guild_owner"],
  ["guilds", { members: 1 }, "guild_members"],
  ["mn_users", { totalCards: -1, userId: 1 }, "cards_total"],
  ["mn_users", { userId: 1 }, "cards_user_id"],
  ["mn_users", { "cards.cardId": 1 }, "cards_card_id"],
  ["mn_users", { "cards.series": 1 }, "cards_series"],
  ["mn_card_market", { sellerId: 1, listedAt: 1 }, "market_seller_listed_at"],
  ["mn_card_market", { listedAt: 1 }, "market_listed_at"],
  ["mn_spawn_settings", { chatId: 1 }, "spawn_chat_id"],
  ["companies", { ownerId: 1 }, "companies_owner"],
];

function groupIndexesByCollection() {
  const grouped = new Map();
  for (const [collectionName, key, name] of INDEXES) {
    const indexes = grouped.get(collectionName) || [];
    indexes.push({ key, name });
    grouped.set(collectionName, indexes);
  }
  return grouped;
}

export function ensurePerformanceIndexes(db) {
  if (!db) return Promise.resolve();
  if (!indexesPromise) {
    indexesPromise = Promise.allSettled(
      [...groupIndexesByCollection()].map(([collectionName, indexes]) =>
        db.collection(collectionName).createIndexes(indexes),
      ),
    ).then(async (results) => {
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length) {
        console.warn(`[indexes] performance indexes failed for ${failed.length} collection(s)`);
      }
      try {
        // Existing accounts predate the materialized wealth field. Backfill
        // only missing values so this is cheap on subsequent restarts.
        await db.collection("users").updateMany(
          { totalWealth: { $exists: false } },
          [{
            $set: {
              totalWealth: {
                $add: [
                  { $ifNull: ["$money", 0] },
                  { $ifNull: ["$bank", 0] },
                ],
              },
            },
          }],
        );

        // Keep Pokémon count leaderboards on the compact trainer collection
        // instead of aggregating every document in pokemon_owned.
        await db.collection("pokemon_trainers").updateMany(
          { pokemonCount: { $exists: false } },
          [{
            $set: {
              pokemonCount: {
                $add: [
                  { $size: { $ifNull: ["$party", []] } },
                  { $size: { $ifNull: ["$pc", []] } },
                ],
              },
            },
          }],
        );
      } catch (error) {
        console.warn(`[indexes] wealth total backfill failed: ${error.message}`);
      }
    });
  }
  return indexesPromise;
}