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
import { ensurePerformanceIndexes } from "./performanceIndexes.mjs";

let client = null;
let db = null;
let connecting = null;
let lastConnectFailure = null;
let lastConnectFailureAt = 0;
const CONNECT_FAILURE_COOLDOWN_MS = 10_000;
const SLOW_MONGO_QUERY_MS = Math.max(
  100,
  Number(process.env.MONGO_SLOW_QUERY_MS || 250),
);
const MONITOR_MONGO_COMMANDS = process.env.MONGO_MONITOR_COMMANDS === "true";

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function attachMongoDiagnostics(nextClient) {
  nextClient.on("commandSucceeded", (event) => {
    const duration = Number(event.duration || 0);
    if (duration >= SLOW_MONGO_QUERY_MS && event.commandName !== "hello") {
      log(
        "warn",
        `[mongo] slow ${event.commandName} ${duration}ms`,
      );
    }
  });

  nextClient.on("commandFailed", (event) => {
    log(
      "warn",
      `[mongo] failed ${event.commandName} after ${Number(event.duration || 0)}ms`,
    );
  });
}

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
  if (connecting) return connecting;
  if (lastConnectFailure && Date.now() - lastConnectFailureAt < CONNECT_FAILURE_COOLDOWN_MS) {
    throw lastConnectFailure;
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not set! Add it to your .env file.");
  }

  connecting = (async () => {
    const nextClient = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
      maxPoolSize: positiveInt(process.env.MONGO_MAX_POOL_SIZE, 50),
      minPoolSize: positiveInt(process.env.MONGO_MIN_POOL_SIZE, 5),
      maxConnecting: positiveInt(process.env.MONGO_MAX_CONNECTING, 4),
      waitQueueTimeoutMS: positiveInt(process.env.MONGO_WAIT_QUEUE_TIMEOUT_MS, 10000),
      retryWrites: true,
      monitorCommands: MONITOR_MONGO_COMMANDS,
    });
    if (MONITOR_MONGO_COMMANDS) attachMongoDiagnostics(nextClient);
    await nextClient.connect();
    client = nextClient;
    db = client.db("kelin_md");
    lastConnectFailure = null;
    lastConnectFailureAt = 0;
    log("info", "✅ Connected to MongoDB (kelin_md)");
    await ensurePerformanceIndexes(db);
    return db;
  })();

  try {
    return await connecting;
  } catch (error) {
    lastConnectFailure = error;
    lastConnectFailureAt = Date.now();
    throw error;
  } finally {
    connecting = null;
  }
}

/** Ensure command handlers have a live database, even under alternate launchers. */
export async function ensureDb() {
  return db || connectDb();
}

/** Called on graceful shutdown */
export async function closeDb() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    connecting = null;
  }
}
