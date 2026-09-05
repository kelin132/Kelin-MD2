/**
 * One isolated bot process.
 *
 * The supervisor starts this file once per bot. Keeping the connection,
 * plugin state, queues, and runtime settings inside the child process means
 * one bot can reconnect or log out without interrupting the others.
 */
import "dotenv/config";
import path from "path";
import { log } from "./logger.mjs";

let definition;
try {
  definition = JSON.parse(process.env.BOT_DEFINITION_JSON || "{}");
} catch (error) {
  log("error", `[bots] Worker received invalid definition: ${error.message}`);
  process.exit(1);
}

const botRoot = path.resolve(definition.botRoot || ".bots", definition.id || "bot");
process.env.SESSION_DIR = path.resolve(definition.sessionFolder || path.join(botRoot, "auth"));
process.env.BOT_SETTINGS_FILE = path.resolve(definition.settingsFile || path.join(botRoot, "botSettings.json"));
process.env.BOT_ID = String(definition.id || "bot");
process.env.MULTI_BOT_MODE = "1";

if (definition.botName) process.env.BOT_NAME = String(definition.botName);
if (definition.botNumber) process.env.BOT_NUMBER = String(definition.botNumber);
if (definition.ownerNumber) process.env.OWNER_NUMBER = String(definition.ownerNumber);
if (definition.prefix) process.env.PREFIX = String(definition.prefix);
if (definition.botImage) process.env.BOT_IMAGE = String(definition.botImage);
if (definition.layout) process.env.BOT_LAYOUT = String(definition.layout);

const [
  { connectBot },
  { loadPlugins },
  { connectDb },
  { initGroupSettings },
  { startCardSpawner },
  { startTaxScheduler },
] = await Promise.all([
  import("./bot.mjs"),
  import("./pluginManager.mjs"),
  import("./mongo.mjs"),
  import("./groupSettings.js"),
  import("./cardSpawner.mjs"),
  import("./taxScheduler.mjs"),
]);

const prefix = process.env.PREFIX || ".";
let databaseReady = false;

try {
  await connectDb();
  await initGroupSettings();
  databaseReady = true;
} catch (error) {
  log("error", `[bots:${definition.id}] MongoDB startup failed: ${error.message}`);
  log("warn", `[bots:${definition.id}] Starting in degraded mode.`);
}

const loaded = await loadPlugins(prefix);
log("info", `[bots:${definition.id}] Plugins loaded: ${loaded.totalPlugins} plugins, ${loaded.totalCommands} commands`);

await connectBot(process.env.BOT_NUMBER || null, prefix);

// Only the first supervisor child runs global periodic jobs. This prevents
// three bot processes from dropping duplicate cards or running duplicate tax
// cycles against the same database.
if (databaseReady && process.env.RUN_SCHEDULED_JOBS === "1") {
  startCardSpawner();
  startTaxScheduler();
}