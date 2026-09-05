/**
 * Multi-bot configuration discovery.
 *
 * Supported layouts:
 *   .bots/eris/auth/creds.json
 *   .bots/eris/creds.json
 *   .bots/eris/config.json + auth/creds.json
 *   .bots/eris.json                 (with bot details only)
 *
 * A bot is never rejected just because its credentials are not in the one
 * layout used by an earlier loader. The only required file is creds.json.
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "fs";
import path from "path";
import { log } from "./logger.mjs";
import { hasUsableSessionCredentials } from "./sessionAuth.mjs";

export const BOTS_DIR = path.resolve(process.env.BOTS_DIR || ".bots");

function isDirectory(target) {
  try {
    return statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function hasCreds(target) {
  return hasUsableSessionCredentials(target);
}

function readJson(filePath) {
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    log("warn", `[bots] Invalid JSON in ${filePath}: ${error.message}`);
    return null;
  }
}

function findSessionFolder(botRoot, config = {}) {
  // The bot folder owns its session. Do not follow sessionFolder/auth values
  // from config.json into another bot's directory; that is how one account
  // can accidentally start with another account's credentials.
  // The most common layout is .bots/<name>/auth/creds.json.
  const auth = path.join(botRoot, "auth");
  if (hasCreds(auth)) return auth;

  // Also accept .bots/<name>/creds.json. Baileys can use the folder itself
  // as a multi-file auth state directory.
  if (hasCreds(botRoot)) return botRoot;

  // Some panel uploaders add one extra folder while extracting a session.
  // Prefer an auth folder, then accept any immediate child with credentials.
  const children = readdirSync(botRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(botRoot, entry.name));
  const nestedAuth = children.find((child) => path.basename(child).toLowerCase() === "auth" && hasCreds(child));
  if (nestedAuth) return nestedAuth;
  const nestedSessions = children.filter(hasCreds);
  if (nestedSessions.length > 0) return nestedSessions[0];

  // A bot with a phone number is allowed to start without an existing
  // credential file so Baileys can create the session and request pairing.
  if (config.botNumber || config.number || config.phoneNumber) {
    return auth;
  }

  return null;
}

function normalizeDefinition({ id, botRoot, configFile, config }) {
  const sessionFolder = findSessionFolder(botRoot, config);
  if (!sessionFolder) {
    log(
      "warn",
      `[bots] Skipping ${id}: no session credentials found under ${botRoot}. ` +
      "Add <bot>/auth/cred.json, <bot>/auth/creds.json, or botNumber in config.json for pairing.",
    );
    return null;
  }

  const name = String(config.name || config.botName || id).trim() || id;
  const definition = {
    id,
    name,
    botName: name,
    botNumber: String(config.botNumber || config.number || config.phoneNumber || "").replace(/\D/g, ""),
    ownerNumber: String(config.ownerNumber || "").replace(/\D/g, ""),
    prefix: config.prefix ? String(config.prefix) : "",
    botImage: String(config.botImage || config.menuImage || config.image || ""),
    layout: config.layout || config.menuLayout || "",
    enabled: config.enabled !== false && config.disabled !== true,
    botRoot,
    configFile,
    sessionFolder,
    settingsFile: path.join(botRoot, "botSettings.json"),
  };

  return definition;
}

function loadEntry(entryName) {
  const entryPath = path.join(BOTS_DIR, entryName);
  const entryStat = statSync(entryPath);

  if (entryStat.isFile() && entryName.toLowerCase().endsWith(".json")) {
    const config = readJson(entryPath);
    if (!config) return null;
    const id = path.basename(entryName, path.extname(entryName));
    const botRoot = path.dirname(entryPath);
    return normalizeDefinition({
      id,
      botRoot,
      configFile: entryPath,
      config,
    });
  }

  if (!entryStat.isDirectory()) return null;

  const configFile = path.join(entryPath, "config.json");
  let config = {};
  if (existsSync(configFile)) {
    const parsed = readJson(configFile);
    // A bad config should not hide a usable session. Use inferred defaults and
    // let the bot still start, while keeping the error visible in the panel.
    if (parsed) config = parsed;
  }

  return normalizeDefinition({
    id: entryName,
    botRoot: entryPath,
    configFile: existsSync(configFile) ? configFile : null,
    config,
  });
}

export function hasBotConfigDirectory() {
  return isDirectory(BOTS_DIR);
}

export function hasBotEntries() {
  if (!hasBotConfigDirectory()) return false;
  return readdirSync(BOTS_DIR).some((entry) => !entry.startsWith("."));
}

export function loadBotConfigs() {
  if (!hasBotConfigDirectory()) return [];

  const entries = readdirSync(BOTS_DIR)
    .filter((entry) => !entry.startsWith("."))
    .sort((a, b) => a.localeCompare(b));

  const definitions = [];
  const usedSessionFolders = new Map();
  for (const entry of entries) {
    try {
      const definition = loadEntry(entry);
      if (definition?.enabled) {
        const sessionFolder = path.resolve(definition.sessionFolder);
        const previousId = usedSessionFolders.get(sessionFolder);
        if (previousId) {
          log(
            "warn",
            `[bots] Skipping ${definition.id}: session folder ${sessionFolder} ` +
            `is already assigned to ${previousId}.`,
          );
          continue;
        }
        usedSessionFolders.set(sessionFolder, definition.id);
        definitions.push(definition);
      }
      else if (definition && !definition.enabled) {
        log("info", `[bots] Disabled ${definition.id}`);
      }
    } catch (error) {
      log("warn", `[bots] Could not inspect ${entry}: ${error.message}`);
    }
  }

  return definitions;
}

export function getBotConfigSignature(definition) {
  const parts = [
    definition.id,
    definition.name,
    definition.botNumber,
    definition.ownerNumber,
    definition.prefix,
    definition.botImage,
    definition.layout,
    definition.enabled,
    definition.sessionFolder,
  ];

  // Credential files are written whenever Baileys refreshes auth keys. They
  // must not be part of the definition signature or healthy workers would be
  // restarted every time WhatsApp saves a key.
  for (const file of [definition.configFile]) {
    try {
      parts.push(file ? statSync(file).mtimeMs : "missing");
    } catch {
      parts.push("missing");
    }
  }

  return parts.join("|");
}