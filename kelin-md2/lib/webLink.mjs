import { randomInt } from "node:crypto";
import { getDb } from "./mongo.mjs";

export const WEB_LINK_CODE_TTL_MS = 10 * 60 * 1000;
const LINK_COLLECTION = "web_link_codes";

function normalizeJid(jid) {
  return String(jid || "").trim();
}

export function normalizeWhatsAppNumber(value) {
  return String(value || "")
    .replace(/[^\d]/g, "")
    .replace(/^00/, "");
}

function unique(values) {
  return [...new Set(values.map(normalizeJid).filter(Boolean))];
}

function jidNumber(jid) {
  return normalizeWhatsAppNumber(String(jid).split("@")[0].split(":")[0]);
}

/**
 * Baileys can expose a sender as a phone JID, device JID, or LID depending on
 * the message. Resolve all available aliases back to the bot's registered
 * phone-JID user before issuing a web code.
 */
export async function findRegisteredWebIdentity(jids) {
  const candidates = unique(jids);
  if (candidates.length === 0) return null;

  const db = await getDb();
  const users = db.collection("users");
  const exact = await users.findOne({
    _id: { $in: candidates },
    registered: true,
  });
  if (exact?._id) return String(exact._id);

  const numbers = unique(candidates.map(jidNumber)).filter(Boolean);
  for (const number of numbers) {
    const byNumber = await users.findOne({
      registered: true,
      _id: { $regex: `^${number}(?::\\d+)?@` },
    });
    if (byNumber?._id) return String(byNumber._id);
  }

  return null;
}

function createCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Create a one-time website link code for a WhatsApp sender.
 *
 * The website and bot share the MongoDB database. The record intentionally
 * contains both the complete JID and normalized number so the website can
 * accept the number format shown in its login form without guessing a JID.
 */
export async function createWebLinkCode(jid, aliases = []) {
  const normalizedJid = normalizeJid(jid);
  const jids = unique([normalizedJid, ...aliases]);
  const identifier = jidNumber(normalizedJid) || jids.map(jidNumber).find(Boolean) || "";

  if (!normalizedJid || !identifier) {
    throw new Error("A valid WhatsApp sender is required.");
  }

  const db = await getDb();
  const collection = db.collection(LINK_COLLECTION);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + WEB_LINK_CODE_TTL_MS);

  await collection.deleteMany({
    $or: [
      { jid: normalizedJid },
      { userId: normalizedJid },
      { identifier },
      { identifiers: identifier },
      { identifiers: { $in: [identifier] } },
    ],
  });

  let code = createCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await collection.findOne({
      code,
      expiresAt: { $gt: now },
    });
    if (!existing) break;
    code = createCode();
  }

  await collection.insertOne({
    code,
    jid: normalizedJid,
    userId: normalizedJid,
    identifier,
    whatsapp: identifier,
    identifiers: [...new Set(jids.map(jidNumber).filter(Boolean))],
    jids,
    jidAliases: jids.filter((candidate) => candidate !== normalizedJid),
    createdAt: now,
    expiresAt,
    usedAt: null,
  });

  return { code, expiresAt };
}