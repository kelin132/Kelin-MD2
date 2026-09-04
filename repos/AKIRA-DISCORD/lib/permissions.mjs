import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { getDb } from "./mongo.mjs";
import { identityQuery } from "./identity.mjs";

const MODS_FILE = path.resolve("data", "discord_mods.json");

function getOwnerId(passedParam = "") {
  return passedParam || process.env.DISCORD_OWNER_ID || "";
}

function jidToNum(jid = "") {
  return String(jid).split("@")[0].split(":")[0].replace(/\D/g, "");
}

/**
 * Compatibility helper for the shared WhatsApp Pokémon modules.
 * Discord does not call this path, but exporting it keeps those modules
 * importable when the common plugin directory is scanned.
 */
export async function resolveLid(senderJid, sock, chatId) {
  if (!String(senderJid).endsWith("@lid") || !sock || !String(chatId || "").endsWith("@g.us")) {
    return jidToNum(senderJid);
  }

  try {
    const mapping = sock.signalRepository?.lidMapping;
    if (typeof mapping?.getPNForLID === "function") {
      const resolved = jidToNum(await mapping.getPNForLID(senderJid));
      if (resolved) return resolved;
    }
  } catch {
    // Fall back to group metadata.
  }

  try {
    const metadata = await sock.groupMetadata(chatId);
    const member = metadata.participants?.find((entry) =>
      entry.id === senderJid || entry.jid === senderJid || entry.lid === senderJid
    );
    return jidToNum(member?.id || member?.jid || member?.phoneNumber || senderJid);
  } catch {
    return jidToNum(senderJid);
  }
}

export function getModsData() {
  try {
    if (existsSync(MODS_FILE)) {
      const parsed = JSON.parse(readFileSync(MODS_FILE, "utf8"));
      return Array.isArray(parsed.list) ? parsed.list : [];
    }
  } catch {
    // A malformed optional file should not stop the bot from starting.
  }
  return [];
}

export function getMods() {
  return getModsData().map((entry) => String(entry.id));
}

export function saveModsData(data) {
  try {
    const dir = path.dirname(MODS_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(MODS_FILE, JSON.stringify({ list: data }, null, 2));
  } catch (error) {
    console.error("[permissions] Failed to save mods:", error.message);
  }
}

export async function getPermissions(senderId, ownerId = "", options = {}) {
  const canonicalOwnerId = getOwnerId(ownerId);
  const sender = String(senderId);
  const discordId = String(options.discordId || "");

  if (sender === String(canonicalOwnerId) || discordId === String(canonicalOwnerId)) {
    return ownerPermissions();
  }

  const mods = getMods();
  const isModByFile =
    mods.includes(sender) ||
    (discordId && (mods.includes(discordId) || mods.includes(`discord:${discordId}`)));

  try {
    const db = getDb();
    const user = await db.collection("users").findOne(
      identityQuery(sender, options.linkedAccount ? false : true),
      {
        projection: {
          staffLevel: 1,
          isPremium: 1,
          jailed: 1,
          jailUntil: 1,
          staffImmunity: 1,
          banned: 1,
        },
      },
    );

    const staffLevel = Math.max(Number(user?.staffLevel) || 0, isModByFile ? 1 : 0);
    let isJailed = user?.jailed === true;
    const jailUntil = Number(user?.jailUntil || 0);

    if (isJailed && jailUntil > 0 && jailUntil <= Date.now()) {
      isJailed = false;
      await db.collection("users").updateOne(
        identityQuery(sender, true),
        { $set: { jailed: false, jailUntil: null } },
      ).catch(() => {});
    }

    return {
      isOwner: false,
      isStaff: staffLevel >= 2,
      isMod: staffLevel >= 1 || isModByFile,
      isPremium: user?.isPremium === true || staffLevel >= 1 || isModByFile,
      isJailed,
      isBanned: user?.banned === true,
      staffImmunity: user?.staffImmunity === true || staffLevel >= 2,
      staffLevel,
    };
  } catch {
    return {
      isOwner: false,
      isStaff: false,
      isMod: isModByFile,
      isPremium: isModByFile,
      isJailed: false,
      isBanned: false,
      staffImmunity: false,
      staffLevel: isModByFile ? 1 : 0,
    };
  }
}

function ownerPermissions() {
  return {
    isOwner: true,
    isStaff: true,
    isMod: true,
    isPremium: true,
    isJailed: false,
    isBanned: false,
    staffImmunity: true,
    staffLevel: 99,
  };
}
