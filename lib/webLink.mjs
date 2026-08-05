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
export async function createWebLinkCode(jid) {
  const normalizedJid = normalizeJid(jid);
  const identifier = normalizeWhatsAppNumber(normalizedJid.split("@")[0].split(":")[0]);

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
    createdAt: now,
    expiresAt,
    usedAt: null,
  });

  return { code, expiresAt };
}