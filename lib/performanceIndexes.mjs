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
  ["pokemon_trainers", { jid: 1 }, "pokemon_trainer_jid"],
  ["pokemon_owned", { level: -1 }, "pokemon_owned_level"],
  ["pokemon_owned", { ownerJid: 1, inParty: 1 }, "pokemon_owned_owner_party"],
  ["naruto_players", { level: -1, xp: -1 }, "naruto_level_xp"],
  ["naruto_players", { jid: 1 }, "naruto_player_jid"],
  ["mn_users", { totalCards: -1, userId: 1 }, "cards_total"],
  ["mn_users", { userId: 1 }, "cards_user_id"],
  ["mn_users", { "cards.cardId": 1 }, "cards_card_id"],
  ["mn_users", { "cards.series": 1 }, "cards_series"],
  ["mn_card_market", { sellerId: 1, listedAt: 1 }, "market_seller_listed_at"],
  ["mn_card_market", { listedAt: 1 }, "market_listed_at"],
  ["mn_spawn_settings", { chatId: 1 }, "spawn_chat_id"],
  ["companies", { ownerId: 1 }, "companies_owner"],
];

export function ensurePerformanceIndexes(db) {
  if (!db) return Promise.resolve();
  if (!indexesPromise) {
    indexesPromise = Promise.allSettled(
      INDEXES.map(([collectionName, spec, name]) =>
        db.collection(collectionName).createIndex(spec, { name }),
      ),
    ).then(async (results) => {
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length) {
        console.warn(`[indexes] ${failed.length} performance index(es) could not be created`);
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
      } catch (error) {
        console.warn(`[indexes] wealth total backfill failed: ${error.message}`);
      }
    });
  }
  return indexesPromise;
}