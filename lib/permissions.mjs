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

// Import settings.js (CommonJS) — this is the canonical owner number source
const _require  = createRequire(import.meta.url);
const _settings = _require("../settings.js");

const MODS_FILE = path.resolve("data", "mods.json");

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve the owner's bare phone digits from all possible sources.
 * Priority: OWNER_NUMBER env var → settings.js ownerNumber → passed param
 */
function getOwnerDigits(passedParam = "") {
  const fromEnv      = (process.env.OWNER_NUMBER || "").replace(/\D/g, "");
  const fromSettings = (_settings.ownerNumber   || "").replace(/\D/g, "");
  const fromParam    = (passedParam              || "").replace(/\D/g, "");
  return fromEnv || fromSettings || fromParam;
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
async function resolveLid(senderJid, sock, chatId) {
  if (!senderJid.endsWith("@lid") || !sock || !chatId?.endsWith("@g.us")) {
    return jidToNum(senderJid);
  }
  try {
    const meta         = await sock.groupMetadata(chatId);
    const senderLidNum = jidToNum(senderJid);

    for (const p of meta.participants || []) {
      // Match via LID field
      if (jidToNum(p.lid || "") === senderLidNum) {
        return jidToNum(p.id || "");
      }
    }
    // Check if it's the bot's own LID (owner = bot number case)
    const botLidNum = jidToNum(sock.user?.lid || "");
    if (botLidNum && botLidNum === senderLidNum) {
      return jidToNum(sock.user?.id || "");
    }
  } catch { /* groupMetadata unavailable — continue */ }
  return jidToNum(senderJid);
}

// ── Mods file helpers (public — used by mods.js plugin) ──────────────────────

export function getMods() {
  try {
    if (existsSync(MODS_FILE)) {
      const parsed = JSON.parse(readFileSync(MODS_FILE, "utf8"));
      return Array.isArray(parsed.list) ? parsed.list : [];
    }
  } catch { /* ignore */ }
  return [];
}

export function saveMods(list) {
  try {
    const dir = path.dirname(MODS_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(MODS_FILE, JSON.stringify({ list }, null, 2));
  } catch (err) {
    console.error("[permissions] Failed to save mods:", err.message);
  }
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
  // fromMe = true means the message was sent FROM the bot's own WhatsApp device.
  // That device is controlled by the owner, so it is always an owner command.
  if (fromMe) return _ownerPerms();

  const ownerDigits = getOwnerDigits(ownerNumber);

  if (ownerDigits) {
    // ── 2. Direct digit comparison ──────────────────────────────────────────
    const senderNum = jidToNum(sender);
    if (senderNum && senderNum === ownerDigits) return _ownerPerms();

    // ── 3. @lid group privacy JID resolution ────────────────────────────────
    if (sender.endsWith("@lid") && sock) {
      const resolved = await resolveLid(sender, sock, chatId);
      if (resolved && resolved === ownerDigits) return _ownerPerms();
    }
  }

  // ── Non-owner: check mods list ────────────────────────────────────────────
  const senderNum   = jidToNum(sender);
  const mods        = getMods();
  const isModByFile = mods.includes(senderNum);

  // ── Optional MongoDB enrichment ───────────────────────────────────────────
  try {
    const { getDb } = await import("./mongo.mjs");
    const db   = await getDb();
    const user = await db.collection("users").findOne(
      { _id: sender },
      { projection: { staffLevel: 1, isPremium: 1, jailed: 1, jailUntil: 1, staffImmunity: 1 } }
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

    return {
      isOwner:       false,
      isStaff:       staffLevel >= 2,
      isMod:         staffLevel >= 1 || isModByFile,
      isPremium:     !!(user?.isPremium) || staffLevel >= 1 || isModByFile,
      isJailed,
      staffImmunity: !!(user?.staffImmunity) || staffLevel >= 2,
      staffLevel,
    };
  } catch {
    // MongoDB not available — mods.json is the only source
    return {
      isOwner:       false,
      isStaff:       false,
      isMod:         isModByFile,
      isPremium:     isModByFile,
      isJailed:      false,
      staffImmunity: false,
      staffLevel:    isModByFile ? 1 : 0,
    };
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
