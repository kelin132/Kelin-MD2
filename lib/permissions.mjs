/**
 * KELIN MD — Permission System
 *
 * Owner detection order (same logic as dara-studio-bot/lib/isOwner.js):
 *   1. msg.key.fromMe  — message came from the bot's own device = owner
 *   2. Digit comparison — strip JID to bare number, compare to ownerNumber
 *      Handles: 27628114340@s.whatsapp.net AND 27628114340:5@s.whatsapp.net
 *   3. @lid resolution  — WhatsApp group privacy JIDs (2024+)
 *      Look up participant in groupMetadata to get real phone number
 *
 * Owner number source of truth (in priority order):
 *   OWNER_NUMBER env var  →  settings.js ownerNumber  →  passed param
 *
 * Mod/staff source of truth: data/mods.json (set via .addmod command)
 * Premium/jail/staffLevel: MongoDB (falls back gracefully if unavailable)
 */

import { createRequire } from "module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { getRuntimeSettings } from "./runtimeSettings.mjs";

// Import settings.js (CommonJS) — this is the canonical owner number source
const _require  = createRequire(import.meta.url);
const _settings = _require("../settings.cjs");

const MODS_FILE = path.resolve("data", "mods.json");
const PERMISSION_CACHE_TTL_MS = 5_000;
const permissionCache = new Map();
const LID_CACHE_TTL_MS = 60_000;
const lidResolutionCache = new Map();
const lidResolutionInFlight = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve the owner's bare phone digits from all possible sources.
 * Runtime settings are passed by the bot and include .botconfig changes.
 * Fall back to OWNER_NUMBER and settings.cjs for panel deployments.
 */
function getOwnerDigitsList(passedParam = "") {
  const values = [
    passedParam,
    process.env.OWNER_NUMBERS,
    getRuntimeSettings().ownerNumber,
    process.env.OWNER_NUMBER,
    _settings.ownerNumber,
  ];
  const numbers = [];
  for (const value of values) {
    const candidates = Array.isArray(value) ? value : String(value || "").split(",");
    for (const candidate of candidates) {
      const number = String(candidate || "").replace(/\D/g, "");
      if (number && !numbers.includes(number)) numbers.push(number);
    }
  }
  return numbers;
}

/**
 * Strip a JID to bare phone digits.
 * "27628114340:5@s.whatsapp.net" → "27628114340"
 * "27628114340@s.whatsapp.net"   → "27628114340"
 * "123456:0@lid"                 → "123456"
 */
function jidToNum(jid = "") {
  return jid.split("@")[0].split(":")[0].replace(/\D/g, "");
}

/**
 * Resolve a @lid group JID to the member's real phone number.
 * WhatsApp started sending @lid privacy addresses in groups (2024).
 */
export async function resolveLid(senderJid, sock, chatId) {
  if (!senderJid.endsWith("@lid") || !sock || !chatId?.endsWith("@g.us")) {
    return jidToNum(senderJid);
  }

  const cacheKey = `${chatId}:${jidToNum(senderJid)}`;
  const cached = lidResolutionCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < LID_CACHE_TTL_MS) {
    return cached.value;
  }
  if (lidResolutionInFlight.has(cacheKey)) {
    return lidResolutionInFlight.get(cacheKey);
  }

  const resolution = (async () => {
    let value = null;
    const senderLidNum = jidToNum(senderJid);

    // Baileys 7 maintains a native reverse LID mapping. It is usually a
    // local cache lookup and also works when the member is not in the current
    // group, so prefer it before requesting full group metadata.
    try {
      const mapping = sock.signalRepository?.lidMapping;
      if (typeof mapping?.getPNForLID === "function") {
        value = jidToNum(await mapping.getPNForLID(`${senderLidNum}@lid`));
      }
    } catch { /* fall back to group metadata */ }

    try {
      if (value) {
        lidResolutionCache.set(cacheKey, { createdAt: Date.now(), value });
        lidResolutionInFlight.delete(cacheKey);
        return value;
      }

      const meta = await sock.groupMetadata(chatId);

      for (const p of meta.participants || []) {
        // Match via LID field
        if (jidToNum(p.lid || "") === senderLidNum) {
          value = jidToNum(p.id || "");
          break;
        }
      }

      // Check if it's the bot's own LID (owner = bot number case)
      if (!value) {
        const botLidNum = jidToNum(sock.user?.lid || "");
        if (botLidNum && botLidNum === senderLidNum) {
          value = jidToNum(sock.user?.id || "");
        }
      }
    } catch { /* groupMetadata unavailable — continue */ }

    lidResolutionCache.set(cacheKey, { createdAt: Date.now(), value });
    lidResolutionInFlight.delete(cacheKey);
    return value;
  })();

  lidResolutionInFlight.set(cacheKey, resolution);
  return resolution;
}

function clearExpiredLidCache() {
  const now = Date.now();
  for (const [key, entry] of lidResolutionCache) {
    if (now - entry.createdAt >= LID_CACHE_TTL_MS) {
      lidResolutionCache.delete(key);
    }
  }
}

// ── Mods file helpers (public — used by mods.js plugin) ──────────────────────

/**
 * Returns raw mod data: array of { num, name } objects.
 * Handles both old format (list of strings) and new format (list of objects).
 */
export function getModsData() {
  try {
    if (existsSync(MODS_FILE)) {
      const parsed = JSON.parse(readFileSync(MODS_FILE, "utf8"));
      const list = Array.isArray(parsed.list) ? parsed.list : [];
      // Normalise: old entries were plain strings
      return list.map(entry =>
        typeof entry === "string" ? { num: entry, name: entry } : entry
      );
    }
  } catch { /* ignore */ }
  return [];
}

/** Returns just the bare number strings — used for permission checks. */
export function getMods() {
  return getModsData().map(e => e.num);
}

/** Saves an array of { num, name } objects. */
export function saveModsData(data) {
  try {
    const dir = path.dirname(MODS_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(MODS_FILE, JSON.stringify({ list: data }, null, 2));
  } catch (err) {
    console.error("[permissions] Failed to save mods:", err.message);
  }
}

/** Legacy compat — accepts plain string array (converts to { num, name }). */
export function saveMods(list) {
  saveModsData(list.map(n => (typeof n === "string" ? { num: n, name: n } : n)));
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Build the full permission context for a message sender.
 *
 * @param {string}  sender      – full JID e.g. "27628114340@s.whatsapp.net"
 * @param {string}  ownerNumber – raw owner number from caller (optional — settings.js used as fallback)
 * @param {object}  opts
 * @param {boolean} [opts.fromMe=false]  – msg.key.fromMe
 * @param {object}  [opts.sock]          – Baileys socket (for @lid lookup)
 * @param {string}  [opts.chatId]        – msg.key.remoteJid (for @lid lookup)
 */
export async function getPermissions(sender, ownerNumber = "", { fromMe = false, sock, chatId } = {}) {
  // ── 1. fromMe shortcut ────────────────────────────────────────────────────
  // fromMe = true means the message came from the bot's own WhatsApp device.
  // Only auto-grant owner via fromMe when OWNER_NUMBER is not set (legacy/unconfigured),
  // OR when the bot's own number matches OWNER_NUMBER (owner IS the bot number).
  // When OWNER_NUMBER is a different personal number, fall through to digit comparison
  // so the real owner is recognised by their number, not the bot device.
  if (fromMe) return _ownerPerms();

  const ownerDigitsList = getOwnerDigitsList(ownerNumber);
  const ownerDigits = ownerDigitsList[0] || "";
  let senderNum = jidToNum(sender);

  if (ownerDigitsList.length) {
    // ── 2. Direct digit comparison ──────────────────────────────────────────
    if (senderNum && ownerDigitsList.includes(senderNum)) return _ownerPerms();

    // ── 3. @lid group privacy JID resolution ────────────────────────────────
    if (sender.endsWith("@lid") && sock) {
      const resolved = await resolveLid(sender, sock, chatId);
      if (resolved) senderNum = resolved;
      if (resolved && ownerDigitsList.includes(resolved)) return _ownerPerms();
    }
  }

  // Most users send several commands close together. Reusing a very short
  // permission snapshot avoids one MongoDB read per command without making
  // staff, premium, jail, or ban changes stale for long.
  const cacheKey = `${sender}|${ownerDigitsList.join(",")}`;
  const cached = permissionCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < PERMISSION_CACHE_TTL_MS) {
    return cached.value;
  }

  // ── Non-owner: check mods list ────────────────────────────────────────────
  clearExpiredLidCache();
  const mods        = getMods();
  const isModByFile = mods.includes(senderNum);

  // ── Optional MongoDB enrichment ───────────────────────────────────────────
  try {
    const { getDb } = await import("./mongo.mjs");
    const db   = await getDb();
    const user = await db.collection("users").findOne(
      { _id: sender },
      { projection: { staffLevel: 1, isPremium: 1, jailed: 1, jailUntil: 1, staffImmunity: 1, banned: 1 } }
    );

    // Mods file always grants at least level 1
    const staffLevel = Math.max(user?.staffLevel ?? 0, isModByFile ? 1 : 0);

    let isJailed = !!(user?.jailed);
    if (isJailed && user?.jailUntil && user.jailUntil <= Date.now()) {
      isJailed = false;
      db.collection("users")
        .updateOne({ _id: sender }, { $set: { jailed: false, jailUntil: null } })
        .catch(() => {});
    }

    const value = {
      isOwner:       false,
      isStaff:       staffLevel >= 2,
      isMod:         staffLevel >= 1 || isModByFile,
      isPremium:     !!(user?.isPremium) || staffLevel >= 1 || isModByFile,
      isJailed,
      isBanned:      !!(user?.banned),
      staffImmunity: !!(user?.staffImmunity) || staffLevel >= 2,
      staffLevel,
    };
    permissionCache.set(cacheKey, { createdAt: Date.now(), value });
    return value;
  } catch {
    // MongoDB not available — mods.json is the only source
    const value = {
      isOwner:       false,
      isStaff:       false,
      isMod:         isModByFile,
      isPremium:     isModByFile,
      isJailed:      false,
      isBanned:      false,
      staffImmunity: false,
      staffLevel:    isModByFile ? 1 : 0,
    };
    permissionCache.set(cacheKey, { createdAt: Date.now(), value });
    return value;
  }
}

function _ownerPerms() {
  return {
    isOwner:       true,
    isStaff:       true,
    isMod:         true,
    isPremium:     true,
    isJailed:      false,
    staffImmunity: true,
    staffLevel:    99,
  };
}

// ── Standalone helpers (importable by any plugin) ─────────────────────────────

/** Returns true if jid is the owner (no sock/chatId needed for DM checks). */
export async function isOwnerCheck(jid, ownerNumber = "") {
  const p = await getPermissions(jid, ownerNumber);
  return p.isOwner;
}

/** Returns true if jid is a mod (checks mods.json + MongoDB). */
export async function isMod(jid, ownerNumber = "") {
  const p = await getPermissions(jid, ownerNumber);
  return p.isMod;
}
