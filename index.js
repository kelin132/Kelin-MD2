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
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { createRequire } from "module";
import { log } from "./lib/logger.mjs";
import { getRuntimeSettings } from "./lib/runtimeSettings.mjs";
import { hasBotConfigDirectory, hasBotEntries, loadBotConfigs } from "./lib/botConfig.mjs";
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
const botDefinitions = loadBotConfigs();
const multiBotMode =
  hasBotConfigDirectory() && (botDefinitions.length > 0 || hasBotEntries() || !BOT_NUMBER);

if (multiBotMode) {
  if (!botDefinitions.length && BOT_NUMBER) {
    log("error", "[bots] .bots contains entries but no valid bot definitions were loaded. Fix the JSON/config before restarting.");
  }
  log("info", `[bots] Found ${botDefinitions.length} bot(s) in .bots/`);
  await startBotSupervisor();
} else {
  // Parallel import of modules
  const [{ connectBot }, { loadPlugins }, { autoUpdate }, { connectDb, getDb }, { initGroupSettings }, { startCardSpawner }, { startTaxScheduler }] =
    await Promise.all([
      import("./lib/bot.mjs"),
      import("./lib/pluginManager.mjs"),
      import("./lib/updater.js"),
      import("./lib/mongo.mjs"),
      import("./lib/groupSettings.js"),
      import("./lib/cardSpawner.mjs"),
      import("./lib/taxScheduler.mjs"),
    ]);

  // ── Session check (Async / Non-blocking) ───────────────────────────────────
  const CREDS = path.resolve("sessions", "auth", "creds.json");
  async function isRegistered() {
    if (!existsSync(CREDS)) return false;
    try {
      const data = await readFile(CREDS, "utf8");
      return JSON.parse(data).registered === true;
    } catch {
      return false;
    }
  }

  const registered = await isRegistered();
  if (!registered) {
    if (!BOT_NUMBER) {
      log("error", "No BOT_NUMBER set and no valid session found.");
      log("error", "Add BOT_NUMBER=<number with country code, no +> to your .env / panel env vars.");
      process.exit(1);
    }
    log("info", `No valid session found. Will request pairing code for +${BOT_NUMBER} ...`);
  } else {
    log("info", "Existing session found — skipping pairing.");
  }

  // ── Load plugins parallel to DB setup ──────────────────────────────────────
  const pluginPromise = loadPlugins(PREFIX);

  // ── Connect to MongoDB ──────────────────────────────────────────────────────
  let databaseReady = false;
  try {
    await connectDb();
    await initGroupSettings(); // load group settings from MongoDB
    databaseReady = true;

    // Async Non-Blocking Migration (Runs safely in background).
    // getDb() is a synchronous getter; only connectDb() is async.
    // Keeping that distinction explicit prevents the old startup/plugin
    // promise-type error.
    const db = getDb();
    void db.collection("mn_users").updateMany(
      { cardLimit: { $lt: 250 } },
      { $set: { cardLimit: 250 } }
    )
      .then((result) => {
        if (result?.modifiedCount > 0) {
          log("info", `[migration] Bumped cardLimit to 250 for ${result.modifiedCount} existing user(s)`);
        }
      })
      .catch((migErr) => {
        log("warn", "[migration] cardLimit migration failed: " + String(migErr));
      });

  } catch (err) {
    log("error", "MongoDB startup failed: " + String(err));
    log("warn", "Starting in degraded mode. Database-backed commands (RPG/economy) will retry after MongoDB is fixed.");
  }

  // Await plugins complete
  const { totalPlugins, totalCommands } = await pluginPromise;
  log("info", `Plugins loaded: ${totalPlugins} plugins, ${totalCommands} commands`);

  // ── Connect bot ─────────────────────────────────────────────────────────────
  await connectBot(BOT_NUMBER || null, PREFIX);

  // ── Background Schedulers ──────────────────────────────────────────────────
  if (databaseReady) {
    startCardSpawner();
    startTaxScheduler();
  }

  // ── Auto-update check ───────────────────────────────────────────────────────
  const updateTimer = setTimeout(() => autoUpdate(), 30_000);
  updateTimer.unref?.();
}
