import { createHash, randomInt } from "crypto";
import { getDb } from "./mongo.mjs";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LINK_TTL_MS = 10 * 60 * 1000;

function normalize(value) {
  return String(value || "").trim();
}

function normalizeWhatsAppId(value) {
  const normalized = normalize(value);
  if (!normalized.includes("@")) return normalized;
  const [number, server] = normalized.split("@");
  return `${number.split(":")[0]}@${server || "s.whatsapp.net"}`;
}

function hashCode(code) {
  return createHash("sha256").update(normalize(code).toUpperCase()).digest("hex");
}

function makeCode(length = 8) {
  return Array.from({ length }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

export async function createWhatsAppLinkCode(whatsappId) {
  const normalizedWhatsAppId = normalizeWhatsAppId(whatsappId);
  if (!normalizedWhatsAppId) throw new Error("WhatsApp identity is required");

  const db = await getDb();
  const now = Date.now();
  const code = makeCode();

  await db.collection("account_links").deleteMany({
    whatsappId: normalizedWhatsAppId,
    status: "pending",
  });
  await db.collection("account_links").insertOne({
    whatsappId: normalizedWhatsAppId,
    codeHash: hashCode(code),
    status: "pending",
    createdAt: now,
    expiresAt: now + LINK_TTL_MS,
  });

  return { code, expiresAt: now + LINK_TTL_MS };
}

export async function claimWhatsAppLink(code, discordId) {
  const normalizedDiscordId = normalize(discordId);
  const normalizedCode = normalize(code);
  if (!normalizedDiscordId || !normalizedCode) return null;

  const db = await getDb();
  const now = Date.now();
  const record = await db.collection("account_links").findOneAndUpdate(
    {
      codeHash: hashCode(normalizedCode),
      status: "pending",
      expiresAt: { $gt: now },
    },
    {
      $set: {
        discordId: normalizedDiscordId,
        status: "active",
        linkedAt: now,
      },
    },
    { returnDocument: "after", includeResultMetadata: false },
  );

  if (!record) return null;

  await db.collection("account_links").updateMany(
    {
      discordId: normalizedDiscordId,
      status: "active",
      _id: { $ne: record._id },
    },
    { $set: { status: "revoked", revokedAt: now } },
  );
  await db.collection("account_links").updateMany(
    {
      whatsappId: record.whatsappId,
      status: "active",
      _id: { $ne: record._id },
    },
    { $set: { status: "revoked", revokedAt: now } },
  );

  return {
    whatsappId: record.whatsappId,
    discordId: normalizedDiscordId,
  };
}

export async function resolveDiscordAccount(discordId) {
  const normalizedDiscordId = normalize(discordId);
  if (!normalizedDiscordId) return null;

  const db = await getDb();
  const record = await db.collection("account_links").findOne({
    discordId: normalizedDiscordId,
    status: "active",
  });
  return record?.whatsappId || null;
}

export async function unlinkDiscordAccount(discordId) {
  const normalizedDiscordId = normalize(discordId);
  if (!normalizedDiscordId) return false;

  const db = await getDb();
  const result = await db.collection("account_links").updateMany(
    { discordId: normalizedDiscordId, status: "active" },
    { $set: { status: "revoked", revokedAt: Date.now() } },
  );
  return result.modifiedCount > 0;
}