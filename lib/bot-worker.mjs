/**
 * One isolated bot worker.
 *
 * The supervisor starts one worker process per .bots definition. Keeping the
 * Baileys socket and plugin module state in the worker means reconnects,
 * credentials, queues, and bot-specific settings cannot collide.
 */
import "dotenv/config";
import { existsSync, readFileSync, renameSync } from "fs";
import path from "path";

const config = JSON.parse(process.env.BOT_CONFIG_JSON || "{}");
const owners = Array.isArray(config.ownerNumber) ? config.ownerNumber : [];
const requestedFolder = path.resolve(String(config.sessionFolder || `.bots/${config.id || "bot"}`));

function findCredentialFolder(folder) {
  return [folder, path.join(folder, "auth")].find((candidate) =>
    existsSync(path.join(candidate, "creds.json")) ||
    existsSync(path.join(candidate, "cred.json"))
  );
}

const sessionFolder = findCredentialFolder(requestedFolder);
if (!sessionFolder) {
  console.error(
    `[bots] ${config.id || "bot"} has no creds.json in ${requestedFolder} or its auth/ folder; not starting.`,
  );
  process.exit(0);
}

const baileysCreds = path.join(sessionFolder, "creds.json");
const legacyCreds = path.join(sessionFolder, "cred.json");
if (!existsSync(baileysCreds) && existsSync(legacyCreds)) {
  // Keep one canonical Baileys credential file instead of creating a second
  // copy that can drift and cause the bot to reconnect with stale state.
  renameSync(legacyCreds, baileysCreds);
}

let credentialData;
try {
  credentialData = JSON.parse(readFileSync(baileysCreds, "utf8"));
} catch (error) {
  console.error(`[bots] ${config.id || "bot"} has invalid creds.json: ${error.message}`);
  process.exit(0);
}
if (credentialData?.registered !== true) {
  console.error(
    `[bots] ${config.id || "bot"} has an unregistered session; pairing codes are disabled for .bots.`,
  );
  process.exit(0);
}

process.env.BOT_ID = String(config.id || "bot");
process.env.SESSION_DIR = sessionFolder;
process.env.BOT_NUMBER = "";
process.env.DISABLE_PAIRING_CODE = "1";
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
console.log(`[bots] Login: existing creds.json only`);

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