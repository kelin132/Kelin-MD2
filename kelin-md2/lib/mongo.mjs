/**
 * KELIN MD — MongoDB connection singleton
 * All plugins that need the database import getDb() from here.
 *
 * Usage:
 *   - Call `await connectDb()` once at startup (index.js).
 *   - Call `getDb()` (synchronous) anywhere after that — returns the live db.
 */
import { MongoClient } from "mongodb";
import { log } from "./logger.mjs";

const MONGO_URI = process.env.MONGO_URI;

let client = null;
let db = null;

/**
 * Synchronous getter — returns the cached db instance.
 * Throws if connectDb() has not been called yet.
 * Used by Col helpers in plugins/cards/database.js and lib/cardSpawner.mjs.
 */
export function getDb() {
  if (!db) {
    throw new Error(
      "Database not connected yet. Make sure connectDb() is awaited before loading plugins."
    );
  }
  return db;
}

/**
 * Async initializer — call once at startup before loading plugins.
 * Safe to call multiple times (no-op after first successful connect).
 */
export async function connectDb() {
  if (db) return db;

  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not set! Add it to your .env file.");
  }

  client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 10000,
  });

  await client.connect();
  db = client.db("kelin_md");
  log("info", "✅ Connected to MongoDB (kelin_md)");
  return db;
}

/** Called on graceful shutdown */
export async function closeDb() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
