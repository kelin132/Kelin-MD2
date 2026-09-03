/**
 * KELIN MD — WhatsApp Multi-Device Bot
 * Standalone entry point for panel hosting (Pterodactyl, katabump, bothosting, etc.)
 *
 * Setup:
 *   1. Copy .env.example → .env and fill in your values
 *   2. npm install
 *   3. node index.js
 *
 * On first run a pairing code will appear in this console.
 * Enter it in WhatsApp → Settings → Linked Devices → Link a Device.
 * Multiple accounts can be configured under .bots/.
 */

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { createRequire } from "module";
import { connectBot } from "./lib/bot.mjs";
import { loadPlugins } from "./lib/pluginManager.mjs";
import { log } from "./lib/logger.mjs";
import { autoUpdate } from "./lib/updater.js";
import { connectDb } from "./lib/mongo.mjs";
import { initGroupSettings } from "./lib/groupSettings.js";
import { startCardSpawner }  from "./lib/cardSpawner.mjs";
import { startTaxScheduler } from "./lib/taxScheduler.mjs";
import { getRuntimeSettings } from "./lib/runtimeSettings.mjs";
import { hasBotConfigDirectory, loadBotConfigs } from "./lib/botConfig.mjs";
import { startBotSupervisor } from "./lib/botSupervisor.mjs";

// settings.js is CommonJS — import via createRequire
const _require  = createRequire(import.meta.url);
const _settings = _require("./settings.cjs");

const RUNTIME      = getRuntimeSettings();
const BOT_NAME     = RUNTIME.botName     || process.env.BOT_NAME    || _settings.botName    || "KELIN MD";
const BOT_NUMBER   = process.env.BOT_NUMBER  || "";
// OWNER_NUMBER: env var wins, then settings.js — NEVER falls back to BOT_NUMBER
const OWNER_NUMBER = RUNTIME.ownerNumber || (process.env.OWNER_NUMBER || _settings.ownerNumber || "").replace(/\D/g, "");
const PREFIX       = RUNTIME.prefix      || process.env.PREFIX      || ".";
const BOT_VERSION = "1.0.0";

// ── Banner ────────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(50));
console.log(`  ${BOT_NAME} v${BOT_VERSION} — Starting`);
console.log("═".repeat(50));
console.log(`  Prefix  : ${PREFIX}`);
console.log(`  Number  : ${BOT_NUMBER || "⚠  Not set — add BOT_NUMBER to .env"}`);
console.log("═".repeat(50) + "\n");

// ── Multi-bot mode ───────────────────────────────────────────────────────────
// A .bots directory with at least one JSON definition switches startup to the
// supervisor. The supervisor owns one isolated child process per WhatsApp
// account, so one slow reconnect or one account's auth state cannot affect the
// others. The legacy single-bot environment remains supported when .bots is
// not configured.
const botDefinitions = loadBotConfigs();
const multiBotMode =
  hasBotConfigDirectory() && (botDefinitions.length > 0 || !BOT_NUMBER);
if (multiBotMode) {
  log("info", `[bots] Found ${botDefinitions.length} bot definition(s) in .bots/`);
  await startBotSupervisor();
} else {

// ── Session check ─────────────────────────────────────────────────────────────
const CREDS = path.resolve("sessions", "auth", "creds.json");
function isRegistered() {
  if (!existsSync(CREDS)) return false;
  try {
    return JSON.parse(readFileSync(CREDS, "utf8")).registered === true;
  } catch { return false; }
}

if (!isRegistered()) {
  if (!BOT_NUMBER) {
    log("error", "No BOT_NUMBER set and no valid session found.");
    log("error", "Add BOT_NUMBER=<number with country code, no +> to your .env / panel env vars.");
    process.exit(1);
  }
  log("info", `No valid session found. Will request pairing code for +${BOT_NUMBER} ...`);
} else {
  log("info", "Existing session found — skipping pairing.");
}

// ── Connect to MongoDB ────────────────────────────────────────────────────────
let databaseReady = false;
try {
  await connectDb();
  await initGroupSettings();   // load group settings (welcome, antilink, etc.) from MongoDB
  databaseReady = true;

  // ── One-time migration: bump cardLimit from 100 → 250 for existing users ──
  try {
    const { getDb } = await import("./lib/mongo.mjs");
    const db = await getDb();
    const result = await db.collection("mn_users").updateMany(
      { cardLimit: { $lt: 250 } },
      { $set: { cardLimit: 250 } }
    );
    if (result.modifiedCount > 0) {
      log("info", `[migration] Bumped cardLimit to 250 for ${result.modifiedCount} existing user(s)`);
    }
  } catch (migErr) {
    log("warn", "[migration] cardLimit migration failed: " + String(migErr));
  }
} catch (err) {
  log("error", "MongoDB startup failed: " + String(err));
  log("warn", "Starting in degraded mode. Database-backed commands (RPG/economy) will retry after MongoDB is fixed.");
}

// ── Load plugins ──────────────────────────────────────────────────────────────
const { totalPlugins, totalCommands } = await loadPlugins(PREFIX);
log("info", `Plugins loaded: ${totalPlugins} plugins, ${totalCommands} commands`);

// ── Connect bot ───────────────────────────────────────────────────────────────
await connectBot(BOT_NUMBER || null, PREFIX);

// ── Card auto-spawner (drops a card in enabled groups every 15 min) ───────────
if (databaseReady) startCardSpawner();

// ── Tax scheduler (deducts 10% of wallet + bank every 48 h) ──────────────────
if (databaseReady) startTaxScheduler();

// ── Auto-update check ─────────────────────────────────────────────────────────
// Do not compete with the first connection/message burst for network and disk.
const updateTimer = setTimeout(() => autoUpdate(), 30_000);
updateTimer.unref?.();
}
