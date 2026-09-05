/**
 * One isolated bot worker.
 *
 * The supervisor starts one worker process per .bots definition. Keeping the
 * Baileys socket and plugin module state in the worker means reconnects,
 * credentials, queues, and bot-specific settings cannot collide.
 */
import "dotenv/config";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const config = JSON.parse(process.env.BOT_CONFIG_JSON || "{}");
const owners = Array.isArray(config.ownerNumber) ? config.ownerNumber : [];
const sessionFolder = path.resolve(String(config.sessionFolder || `.bots/${config.id || "bot"}`));

mkdirSync(sessionFolder, { recursive: true });
// Baileys writes `creds.json`. Accept the common singular `cred.json` name
// too, so an existing backup can be dropped into a bot folder unchanged.
const legacyCreds = path.join(sessionFolder, "cred.json");
const baileysCreds = path.join(sessionFolder, "creds.json");
if (!existsSync(baileysCreds) && existsSync(legacyCreds)) {
  copyFileSync(legacyCreds, baileysCreds);
}

process.env.BOT_ID = String(config.id || "bot");
process.env.SESSION_DIR = sessionFolder;
process.env.BOT_NUMBER = String(config.phoneNumber || "");
process.env.OWNER_NUMBER = owners[0] || "";
process.env.OWNER_NUMBERS = owners.join(",");
process.env.BOT_NAME = String(config.botName || config.id || "KELIN MD");
process.env.BOT_OWNER_NAME = String(config.ownerName || config.id || "Owner");
process.env.PREFIX = String(config.prefix || ".");

const [{ connectBot }, { loadPlugins }, { connectDb }, { initGroupSettings }, { log }] =
  await Promise.all([
    import("./bot.mjs"),
    import("./pluginManager.mjs"),
    import("./mongo.mjs"),
    import("./groupSettings.js"),
    import("./logger.mjs"),
  ]);

const botLabel = `${process.env.BOT_NAME} [${process.env.BOT_ID}]`;
console.log(`\n[bots] Starting ${botLabel}`);
console.log(`[bots] Session folder: ${process.env.SESSION_DIR}`);
console.log(`[bots] Login: ${process.env.BOT_NUMBER ? "pairing code when needed" : "existing creds.json only"}`);

try {
  await connectDb();
  await initGroupSettings();
} catch (error) {
  log("warn", `[${process.env.BOT_ID}] MongoDB unavailable; continuing in degraded mode: ${error.message}`);
}

const { totalPlugins, totalCommands } = await loadPlugins(process.env.PREFIX);
log("info", `[${process.env.BOT_ID}] Plugins loaded: ${totalPlugins} plugins, ${totalCommands} commands`);

if (!process.env.BOT_NUMBER) {
  log("info", `[${process.env.BOT_ID}] No phoneNumber configured; waiting for an existing creds.json session.`);
}

await connectBot(process.env.BOT_NUMBER || null, process.env.PREFIX);