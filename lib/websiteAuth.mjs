import { createHash, randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getDb } from "./mongo.mjs";

const scrypt = promisify(scryptCallback);
const WEBSITE_ID_PREFIX = "AID";
const WEBSITE_ID_BYTES = 5;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 32 * 1024 * 1024;

let websiteIdIndexPromise;

function users() {
  return getDb().collection("users");
}

async function ensureWebsiteIdIndex() {
  websiteIdIndexPromise ??= users().createIndex(
    { websiteId: 1 },
    { unique: true, sparse: true, name: "users_websiteId_unique" },
  ).catch((error) => {
    websiteIdIndexPromise = undefined;
    throw error;
  });
  await websiteIdIndexPromise;
}

function createWebsiteId() {
  return `${WEBSITE_ID_PREFIX}-${randomBytes(WEBSITE_ID_BYTES).toString("hex").toUpperCase()}`;
}

function validatePassword(password) {
  if (typeof password !== "string") {
    throw new Error("Enter a password with at least 8 characters.");
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error("Your website password must be at least 8 characters.");
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new Error("Your website password must be 128 characters or fewer.");
  }
  if(/[\r\n\t]/.test(password)) {
    throw new Error("Your website password cannot contain line breaks or tabs.");
  }
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("hex"),
    Buffer.from(derivedKey).toString("hex"),
  ].join("$");
}

export async function verifyWebsitePassword(password, encodedHash) {
  if (typeof password !== "string" || typeof encodedHash !== "string") return false;
  const [algorithm, nText, rText, pText, saltHex, keyHex] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !saltHex || !keyHex) return false;

  const N = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (!Number.isSafeInteger(N) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p)) return false;

  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(keyHex, "hex");
    const actual = Buffer.from(await scrypt(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: SCRYPT_MAXMEM,
    }));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function getOrCreateWebsiteId(jid) {
  const normalizedJid = String(jid || "").trim();
  if (!normalizedJid) throw new Error("A valid WhatsApp account is required.");

  await ensureWebsiteIdIndex();
  const col = users();
  const existing = await col.findOne(
    { _id: normalizedJid },
    { projection: { registered: 1, websiteId: 1 } },
  );
  if (!existing?.registered) {
    throw new Error("You need to register first with .register <your_name>.");
  }
  if (existing.websiteId) return String(existing.websiteId);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const websiteId = createWebsiteId();
    try {
      const updated = await col.findOneAndUpdate(
        {
          _id: normalizedJid,
          registered: true,
          $or: [
            { websiteId: { $exists: false } },
            { websiteId: null },
            { websiteId: "" },
          ],
        },
        { $set: { websiteId, websiteIdCreatedAt: new Date() } },
        { returnDocument: "after" },
      );
      if (updated?.websiteId) return String(updated.websiteId);
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }

  const retry = await col.findOne(
    { _id: normalizedJid },
    { projection: { websiteId: 1 } },
  );
  if (retry?.websiteId) return String(retry.websiteId);
  throw new Error("Could not create your AIDORU ID. Please try again.");
}

export async function setWebsitePassword(jid, password) {
  const normalizedJid = String(jid || "").trim();
  validatePassword(password);

  const col = users();
  const user = await col.findOne(
    { _id: normalizedJid },
    { projection: { registered: 1 } },
  );
  if (!user?.registered) {
    throw new Error("You need to register first with .register <your_name>.");
  }

  const passwordHash = await hashPassword(password);
  const result = await col.updateOne(
    { _id: normalizedJid, registered: true },
    {
      $set: {
        websitePasswordHash: passwordHash,
        websitePasswordUpdatedAt: new Date(),
      },
    },
  );
  if (!result.matchedCount) throw new Error("Your bot profile could not be found.");
}

function normaliseWebsiteId(value) {
  return String(value ?? "").trim().toUpperCase();
}

function hashOtp(websiteId, otp, saltHex) {
  return createHash("sha256")
    .update(`${saltHex}:${websiteId}:${otp}`, "utf8")
    .digest("hex");
}

export async function generateOtp(websiteId) {
  const normalizedWebsiteId = normaliseWebsiteId(websiteId);
  if (!/^AID-[0-9A-F]{10}$/.test(normalizedWebsiteId)) {
    throw new Error("Enter a valid AIDORU ID first. Use .id in the bot if you need it.");
  }

  const col = users();
  const user = await col.findOne(
    { registered: true, websiteId: normalizedWebsiteId },
    { projection: { _id: 1 } },
  );
  if (!user?._id) {
    throw new Error("No registered WhatsApp profile was found for that AIDORU ID.");
  }

  const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const saltHex = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await col.updateOne(
    { _id: user._id, registered: true, websiteId: normalizedWebsiteId },
    {
      $set: {
        websiteOtpHash: hashOtp(normalizedWebsiteId, otp, saltHex),
        websiteOtpSalt: saltHex,
        websiteOtpExpiresAt: expiresAt,
        websiteOtpCreatedAt: new Date(),
      },
      $unset: {
        websiteResetToken: "",
        websiteResetTokenExpiresAt: "",
      },
    },
  );
  return otp;
}

export async function verifyAndConsumeOtp(websiteId, otp) {
  const normalizedWebsiteId = normaliseWebsiteId(websiteId);
  const normalizedOtp = String(otp ?? "").replace(/\D/g, "");
  if (!/^AID-[0-9A-F]{10}$/.test(normalizedWebsiteId)) return null;
  if (!/^\d{6}$/.test(normalizedOtp)) return null;

  const col = users();
  const user = await col.findOne(
    { registered: true, websiteId: normalizedWebsiteId },
    { projection: { _id: 1, websiteOtpHash: 1, websiteOtpSalt: 1, websiteOtpExpiresAt: 1 } },
  );
  if (!user?._id || typeof user.websiteOtpHash !== "string" || typeof user.websiteOtpSalt !== "string") return null;
  const expiry = new Date(user.websiteOtpExpiresAt ?? "").getTime();
  if (!Number.isFinite(expiry) || expiry < Date.now()) return null;

  const expected = Buffer.from(user.websiteOtpHash, "hex");
  const actual = Buffer.from(hashOtp(normalizedWebsiteId, normalizedOtp, user.websiteOtpSalt), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(actual, expected)) return null;

  const consumed = await col.findOneAndUpdate(
    {
      _id: user._id,
      registered: true,
      websiteId: normalizedWebsiteId,
      websiteOtpHash: user.websiteOtpHash,
    },
    {
      $unset: {
        websiteOtpHash: "",
        websiteOtpSalt: "",
        websiteOtpExpiresAt: "",
        websiteOtpCreatedAt: "",
      },
    },
    { returnDocument: "after" },
  );
  return consumed?._id ? String(consumed._id) : null;
}

export async function syncWebsiteProfilePicture(jid, profilePictureUrl) {
  const normalizedJid = String(jid || "").trim();
  if (!normalizedJid || !profilePictureUrl) return;
  await users().updateOne(
    { _id: normalizedJid },
    {
      $set: {
        profilePictureUrl: String(profilePictureUrl),
        profilePictureUpdatedAt: new Date(),
      },
      $setOnInsert: {
        registered: false,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export const WEBSITE_PASSWORD_MIN_LENGTH = PASSWORD_MIN_LENGTH;
export const WEBSITE_PASSWORD_MAX_LENGTH = PASSWORD_MAX_LENGTH;
