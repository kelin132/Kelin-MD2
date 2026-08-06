/**
 * KELIN MD — One-time migration: backfill imageUrl / backImageUrl
 * for all Pokémon that were stored without a sprite URL.
 *
 * Run once after pulling this update:
 *   node scripts/fix-pokemon-images.mjs
 *
 * Requires MONGO_URI to be set in your .env (loaded automatically).
 */

import { config } from "dotenv";
config();

import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌  MONGO_URI is not set. Check your .env file.");
  process.exit(1);
}

const ARTWORK_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";
const BACK_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back";

async function main() {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db("kelin_md");
  const col = db.collection("pokemon_owned");

  // Find all Pokémon missing a valid imageUrl
  const broken = await col
    .find({
      $or: [
        { imageUrl: { $exists: false } },
        { imageUrl: null },
        { imageUrl: "" },
      ],
    })
    .toArray();

  console.log(`Found ${broken.length} Pokémon with missing imageUrl.`);

  let fixed = 0;
  let skipped = 0;

  for (const p of broken) {
    const id = p.pokedexId;
    if (!id || id <= 0) {
      console.warn(`  ⚠️  Skipping ${p.name} — no valid pokedexId (${id})`);
      skipped++;
      continue;
    }

    const imageUrl    = `${ARTWORK_BASE}/${id}.png`;
    const backImageUrl = p.backImageUrl || `${BACK_BASE}/${id}.png`;

    await col.updateOne(
      { _id: p._id },
      { $set: { imageUrl, backImageUrl } }
    );

    console.log(`  ✅  Fixed #${id} ${p.displayName || p.name}`);
    fixed++;
  }

  console.log(`\nDone — fixed: ${fixed}, skipped: ${skipped}`);
  await client.close();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
