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
 * If the pairing code doesn't appear, a QR code will be shown instead — scan it.
 */

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { connectBot } from "./lib/bot.mjs";
import { loadPlugins } from "./lib/pluginManager.mjs";
import { log } from "./lib/logger.mjs";
import { autoUpdate } from "./lib/updater.js";
import { getDb } from "./lib/mongo.mjs";

const BOT_NAME    = process.env.BOT_NAME    || "KELIN MD";
const BOT_NUMBER  = process.env.BOT_NUMBER  || "";
const OWNER_NUMBER = process.env.OWNER_NUMBER || process.env.BOT_NUMBER || "";
const PREFIX      = process.env.PREFIX      || ".";
const BOT_VERSION = "1.0.0";

// ── Banner ─────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(50));
console.log(`  ${BOT_NAME} v${BOT_VERSION} — Starting`);
console.log("═".repeat(50));
console.log(`  Prefix  : ${PREFIX}`);
console.log(`  Owner   : ${OWNER_NUMBER || "⚠  Not set — add OWNER_NUMBER to .env"}`);
console.log(`  Number  : ${BOT_NUMBER || "⚠  Not set — add BOT_NUMBER to .env"}`);
console.log("═".repeat(50) + "\n");

// ── Session check ─────────────────────────────────────────────────────────
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

// ── Connect to MongoDB ───────────────────────────────────────────────────────
try {
  await getDb();
} catch (err) {
  log("warn", "MongoDB connection failed: " + String(err));
  log("warn", "Economy/guild/staff features require MongoDB. Add MONGO_URI to your .env");
}

// ── Load plugins ─────────────────────────────────────────────────────────
const { totalPlugins, totalCommands } = await loadPlugins(PREFIX);
log("info", `Plugins loaded: ${totalPlugins} plugins, ${totalCommands} commands`);

// ── Connect bot ──────────────────────────────────────────────────────────
await connectBot(BOT_NUMBER || null, PREFIX, OWNER_NUMBER);

// ── Auto-update check ────────────────────────────────────────────────────────
autoUpdate();
