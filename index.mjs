/**
 * KELIN MD — WhatsApp Multi-Device Bot
 * Standalone entry point for panel hosting (Pterodactyl, katabump, bothosting, etc.)
 *
 * Setup:
 *   1. Copy .env.example → .env
 *   2. Fill in BOT_NUMBER and OWNER_NUMBER
 *   3. npm install   (or pnpm install)
 *   4. node index.mjs
 *
 * On first run the pairing code will appear in this console.
 * Enter it in WhatsApp → Settings → Linked Devices → Link a Device.
 */

import "dotenv/config";
import { connectBot, hasSession } from "./lib/bot.mjs";
import { loadPlugins } from "./lib/pluginManager.mjs";
import { log } from "./lib/logger.mjs";

const BOT_NAME    = process.env.BOT_NAME    || "KELIN MD";
const BOT_NUMBER  = process.env.BOT_NUMBER  || "";
const PREFIX      = process.env.PREFIX      || ".";
const BOT_VERSION = "1.0.0";

// ── Banner ──────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(50));
console.log(`  ${BOT_NAME} v${BOT_VERSION} — Starting`);
console.log("═".repeat(50));
console.log(`  Prefix  : ${PREFIX}`);
console.log(`  Number  : ${BOT_NUMBER || "⚠ Not set — add BOT_NUMBER to .env"}`);
console.log("═".repeat(50) + "\n");

// ── Load plugins ─────────────────────────────────────────────────────────────
const { totalPlugins, totalCommands } = await loadPlugins(PREFIX);
log("info", `Plugins loaded: ${totalPlugins} plugins, ${totalCommands} commands`);

// ── Connect ───────────────────────────────────────────────────────────────────
if (!hasSession()) {
  if (!BOT_NUMBER) {
    log("error", "No BOT_NUMBER in .env — cannot request pairing code.");
    log("error", "Add BOT_NUMBER=<your number with country code, no +> to .env then restart.");
    process.exit(1);
  }
  log("info", `No session found. Requesting pairing code for +${BOT_NUMBER} ...`);
}

await connectBot(BOT_NUMBER || null, PREFIX);
