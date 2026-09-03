/**
 * Discover bot definitions from .bots/.
 *
 * Supported layouts:
 *   .bots/Elyra.json
 *   .bots/Viora/config.json
 *   .bots/sessions.config.json   (array)
 *
 * Authentication files are never treated as definitions. Each bot's
 * sessionFolder is independent, so any number of accounts can run in one
 * Node server without sharing creds or reconnect state.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";

const BOTS_DIR = path.resolve(".bots");
const IGNORED_CONFIG_NAMES = new Set([
  "creds.json",
  "cred.json",
  "package.json",
]);

function readJson(filePath) {
  try {
    const value = JSON.parse(readFileSync(filePath, "utf8"));
    return value && typeof value === "object" ? value : null;
  } catch (error) {
    console.error(`[bots] Cannot read ${filePath}: ${error.message}`);
    return null;
  }
}

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeOwners(value) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map(digits).filter((number) => number.length >= 7))];
}

function safeId(value, fallback) {
  const id = String(value || fallback || "").trim();
  const normalized = id.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
  return normalized.replace(/^-|-$/g, "").slice(0, 64) || fallback;
}

function normalizeConfig(raw, sourcePath, fallbackId) {
  if (!raw || Array.isArray(raw)) return null;

  const id = safeId(raw.id || raw.name, fallbackId);
  const sessionFolder = String(raw.sessionFolder || path.join(".bots", id));
  const owners = normalizeOwners(raw.ownerNumber ?? raw.ownerNumbers);
  const phoneNumber = digits(raw.phoneNumber || raw.botNumber || raw.number);

  return {
    id,
    sourcePath,
    sessionFolder,
    phoneNumber,
    ownerNumber: owners,
    ownerName: String(raw.ownerName || raw.owner || id).trim().slice(0, 80),
    botName: String(raw.botName || id).trim().slice(0, 80),
    prefix: String(raw.prefix || ".").trim().slice(0, 4) || ".",
    enabled: raw.enabled !== false,
  };
}

function collectDefinitions() {
  if (!existsSync(BOTS_DIR)) return [];

  const definitions = [];
  const entries = readdirSync(BOTS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "README.md") continue;
    const entryPath = path.join(BOTS_DIR, entry.name);

    if (entry.isDirectory()) {
      const configPath = ["config.json", "bot.json", `${entry.name}.json`]
        .map((name) => path.join(entryPath, name))
        .find(existsSync);
      if (configPath) {
        const config = normalizeConfig(readJson(configPath), configPath, entry.name);
        if (config) definitions.push(config);
      }
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    if (IGNORED_CONFIG_NAMES.has(entry.name.toLowerCase())) continue;

    const value = readJson(entryPath);
    if (Array.isArray(value)) {
      for (const item of value) {
        const config = normalizeConfig(item, entryPath, item?.id || "bot");
        if (config) definitions.push(config);
      }
      continue;
    }

    const config = normalizeConfig(value, entryPath, path.basename(entry.name, ".json"));
    if (config) definitions.push(config);
  }

  const unique = new Map();
  for (const config of definitions) {
    if (!config.enabled) continue;
    if (unique.has(config.id)) {
      console.error(`[bots] Duplicate bot id "${config.id}" in ${config.sourcePath}; ignoring the later entry.`);
      continue;
    }
    unique.set(config.id, config);
  }
  return [...unique.values()];
}

export function loadBotConfigs() {
  return collectDefinitions();
}

export function hasBotConfigDirectory() {
  return existsSync(BOTS_DIR) && statSync(BOTS_DIR).isDirectory();
}

export function ensureBotsDirectory() {
  mkdirSync(BOTS_DIR, { recursive: true });
}