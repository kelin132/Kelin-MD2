let indexesPromise = null;

const INDEXES = [
  ["users", { registered: 1, level: -1, xp: -1 }, "users_registered_level"],
  ["rpg_users", { level: -1, xp: -1 }, "rpg_level_xp"],
  ["pokemon_trainers", { wins: -1 }, "pokemon_trainer_wins"],
  ["pokemon_trainers", { level: -1, xp: -1 }, "pokemon_trainer_level_xp"],
  ["pokemon_owned", { level: -1 }, "pokemon_owned_level"],
  ["pokemon_owned", { ownerJid: 1 }, "pokemon_owned_owner"],
  ["naruto_players", { level: -1, xp: -1 }, "naruto_level_xp"],
  ["mn_users", { totalCards: -1, userId: 1 }, "cards_total"],
  ["mn_users", { "cards.series": 1 }, "cards_series"],
  ["companies", { ownerId: 1 }, "companies_owner"],
];

export function ensurePerformanceIndexes(db) {
  if (!db) return Promise.resolve();
  if (!indexesPromise) {
    indexesPromise = Promise.allSettled(
      INDEXES.map(([collectionName, spec, name]) =>
        db.collection(collectionName).createIndex(spec, { name }),
      ),
    ).then((results) => {
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length) {
        console.warn(`[indexes] ${failed.length} performance index(es) could not be created`);
      }
    });
  }
  return indexesPromise;
}