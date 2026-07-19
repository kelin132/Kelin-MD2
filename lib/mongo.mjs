/**
 * KELIN MD — MongoDB connection singleton
 * All plugins that need the database import getDb() from here.
 */
import { MongoClient } from "mongodb";
import { log } from "./logger.mjs";

const MONGO_URI = process.env.MONGO_URI;

let client = null;
let db = null;

export async function getDb() {
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
