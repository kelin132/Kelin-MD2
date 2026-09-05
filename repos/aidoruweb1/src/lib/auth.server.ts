import {
  createHash,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { getDb, users, guilds, type UserDoc } from "./db.server";
import type { OwnedPokemon, PublicUser } from "./game";

function deriveScrypt(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number; maxmem: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(Buffer.from(derivedKey));
    });
  });
}

const COOKIE = "aidoru_session";
const MAX_AGE = 60 * 60 * 24 * 30;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 32 * 1024 * 1024;
const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const WEBSITE_ID_PATTERN = /^AID-[0-9A-F]{10}$/;
const DISCORD_STATE_COOKIE = "aidoru_discord_oauth_state";
const DISCORD_LOGIN_STATE_COOKIE = "aidoru_discord_login_oauth_state";
const DISCORD_STATE_TTL_SECONDS = 10 * 60;

function secret(): Uint8Array {
  const value = process.env["SESSION_SECRET"];
  if (!value) throw new Error("SESSION_SECRET is not configured.");
  return new TextEncoder().encode(value);
}

function normaliseWebsiteId(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export function normalisePhoneNumber(countryCode: string, localNumber: string): string {
  const country = String(countryCode ?? "").replace(/\D/g, "");
  const local = String(localNumber ?? "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");
  if (country.length < 1 || country.length > 4 || local.length < 5 || local.length > 14) {
    throw new Error("Enter a valid WhatsApp phone number.");
  }
  // Accept both the intended national input and a pasted international number
  // while the country field is already populated.
  return local.startsWith(country) && local.length >= country.length + 7
    ? local
    : `${country}${local}`;
}

function phoneLookupIds(phoneNumber: string): Array<string | number> {
  const digits = phoneNumber.replace(/\D/g, "");
  const numeric = Number(digits);
  return [
    ...new Set([
      digits,
      `+${digits}`,
      `${digits}@s.whatsapp.net`,
      `${digits}@c.us`,
      `${digits}:0@s.whatsapp.net`,
      `${digits}:0@c.us`,
      ...(Number.isSafeInteger(numeric) ? [numeric] : []),
    ]),
  ];
}

function phoneLookupClauses(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  const jidPattern = new RegExp(`^${digits}(?::\\d+)?@(s\\.whatsapp\\.net|c\\.us)$`, "i");
  const fields = ["_id", "phoneNumber", "whatsappNumber", "jid", "userId"];
  return fields.flatMap((field) => [
    { [field]: { $in: phoneLookupIds(phoneNumber) } },
    { [field]: { $regex: jidPattern } },
  ]);
}

async function hashWebsitePassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await deriveScrypt(password, salt, 64, {
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
    derivedKey.toString("hex"),
  ].join("$");
}

function validateWebsitePassword(password: string) {
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    throw new Error("Your password must be between 8 and 128 characters.");
  }
  if (/[\r\n\t]/.test(password)) {
    throw new Error("Your password cannot contain line breaks or tabs.");
  }
}

async function verifyWebsitePassword(password: string, encodedHash: unknown): Promise<boolean> {
  if (typeof encodedHash !== "string") return false;
  const [algorithm, nText, rText, pText, saltHex, keyHex] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !saltHex || !keyHex) return false;

  const N = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (!Number.isSafeInteger(N) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p))
    return false;

  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(keyHex, "hex");
    const actual = await deriveScrypt(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: SCRYPT_MAXMEM,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function inventoryEntries(value: unknown) {
  if (!Array.isArray(value)) {
    if (value && typeof value === "object") {
      return Object.entries(value).map(([itemId, qty]) => ({
        itemId,
        qty: Number(qty) || 1,
      }));
    }
    return [];
  }
  return value.map((entry) => {
    if (typeof entry === "string") return { itemId: entry, qty: 1 };
    if (!entry || typeof entry !== "object") return { itemId: "unknown", qty: 1 };
    const item = entry as Record<string, unknown>;
    return {
      itemId: String(item["itemId"] ?? item["id"] ?? item["name"] ?? item["label"] ?? "unknown"),
      qty: Number(item["qty"] ?? item["quantity"] ?? item["count"] ?? item["amount"] ?? 1) || 1,
    };
  });
}

function pokemonToPublic(doc: Record<string, unknown>): OwnedPokemon {
  const pokedexId = Number(doc["pokedexId"]) || 0;
  return {
    id: String(doc["_id"] ?? ""),
    name: String(doc["name"] ?? "Unknown"),
    displayName: String(doc["displayName"] ?? doc["name"] ?? "Unknown"),
    nickname: typeof doc["nickname"] === "string" ? doc["nickname"] : null,
    level: Number(doc["level"]) || 1,
    xp: Number(doc["xp"]) || 0,
    xpNeeded: Number(doc["xpNeeded"]) || 0,
    hp: Number(doc["hp"]) || 0,
    maxHp: Number(doc["maxHp"]) || 1,
    types: Array.isArray(doc["types"]) ? doc["types"].map(String) : [],
    primaryType: String(doc["primaryType"] ?? "normal"),
    imageUrl: String(
      doc["imageUrl"] ??
        (pokedexId > 0
          ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokedexId}.png`
          : ""),
    ),
    shiny: Boolean(doc["shiny"]),
    inParty: Boolean(doc["inParty"]),
    isStarter: Boolean(doc["isStarter"]),
  };
}

async function issueSession(jid: string) {
  const token = await new SignJWT({ sub: jid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());

  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSession() {
  deleteCookie(COOKIE, { path: "/" });
}

function sessionWasRevoked(payloadIat: unknown, revokedAt: unknown): boolean {
  const issuedAtMs = Number(payloadIat) * 1000;
  const revokedAtMs = new Date(String(revokedAt ?? "")).getTime();
  return Number.isFinite(issuedAtMs) && Number.isFinite(revokedAtMs) && issuedAtMs <= revokedAtMs;
}

export async function currentUserId(): Promise<string | null> {
  const token = getCookie(COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string") return null;
    const user = await findUserById(payload.sub);
    if (!user || sessionWasRevoked(payload.iat, user.websiteSessionRevokedAt)) {
      deleteCookie(COOKIE, { path: "/" });
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

export async function findUserById(id: string): Promise<UserDoc | null> {
  const col = await users();
  const numericId = Number(id);
  return col.findOne({
    registered: true,
    websiteBanned: { $ne: true },
    $or: [{ _id: id }, ...(Number.isSafeInteger(numericId) ? [{ _id: numericId }] : [])],
  } as never);
}

export async function requireUser(): Promise<UserDoc & { _id: string }> {
  const id = await currentUserId();
  if (!id) throw new Error("Not signed in.");
  const user = await findUserById(id);
  if (!user) throw new Error("Session expired. Sign in again with your phone number.");
  return user as UserDoc & { _id: string };
}

export async function toPublicUser(doc: UserDoc): Promise<PublicUser> {
  const jid = String(doc._id);
  const withoutDevice = jid.replace(/:\d+(?=@)/, "");
  const parts = withoutDevice.split("@");
  const bare = parts[0] ?? withoutDevice;
  const domain = parts[1] || "s.whatsapp.net";
  const storedIdentityFields = doc as UserDoc & Record<string, unknown>;

  const trainerJids = [
    ...new Set(
      [
        jid,
        withoutDevice,
        bare,
        `${bare}@${domain}`,
        `${bare}@s.whatsapp.net`,
        `${bare}@c.us`,
        `${bare}:0@s.whatsapp.net`,
        `${bare}:0@c.us`,
        storedIdentityFields["phoneNumber"],
        storedIdentityFields["whatsappNumber"],
        storedIdentityFields["jid"],
      ].filter(Boolean),
    ),
  ];
  const db = await getDb();
  const [guild, pokemonDocs, trainer] = await Promise.all([
    (await guilds()).findOne({ members: { $in: trainerJids } } as never),
    db
      .collection("pokemon_owned")
      .find({ ownerJid: { $in: trainerJids } })
      .sort({ inParty: -1, isStarter: -1, level: -1 })
      .limit(36)
      .toArray(),
    db.collection("pokemon_trainers").findOne({ jid: { $in: trainerJids } }),
  ]);
  const publicPokemon = pokemonDocs.map((pokemon) =>
    pokemonToPublic(pokemon as Record<string, unknown>),
  );
  const pokemonById = new Map(publicPokemon.map((pokemon) => [pokemon.id, pokemon]));
  const partyIds = Array.isArray(trainer?.["party"])
    ? (trainer["party"] as unknown[]).map(String)
    : [];
  const pcIds = Array.isArray(trainer?.["pc"]) ? (trainer["pc"] as unknown[]).map(String) : [];
  const partyPokemon = partyIds.map((id) => pokemonById.get(id)).filter(Boolean) as OwnedPokemon[];
  const pcPokemon = pcIds.map((id) => pokemonById.get(id)).filter(Boolean) as OwnedPokemon[];
  const guildId = guild?._id ? String(guild._id) : null;
  const title = doc.job || (doc.isPremium ? "Premium Player" : "Player");
  const imageFields = doc as UserDoc & Record<string, unknown>;

  return {
    id: jid,
    name: doc.name ?? doc.username ?? doc.pushName ?? doc.notifyName ?? "Player",
    bio: doc.bio ?? "",
    title,
    avatar: "default",
    avatarUrl:
      [
        doc.profilePictureUrl,
        imageFields["profileImage"],
        imageFields["avatarUrl"],
        imageFields["profilePic"],
        imageFields["pfp"],
        imageFields["imageUrl"],
        imageFields["image"],
      ].find((value): value is string => typeof value === "string" && value.trim().length > 0) ??
      null,
    avatarVideoUrl: String(doc["avatarVideo"] ?? "").trim() || null,
    age: Number(doc["age"] ?? 0) || 0,
    birthday: String(doc["birthday"] ?? "").trim() || null,
    banner: "aurora",
    profileBackground: typeof doc.profileBackground === "string" ? doc.profileBackground : null,
    coins: Number(doc.money) || 0,
    bank: Number(doc.bank) || 0,
    xp: Number(doc.xp) || 0,
    inventory: inventoryEntries(doc.inventory),
    trainerInventory: inventoryEntries(trainer?.["inventory"]),
    trainerCoins: Number(trainer?.["coins"]) || 0,
    trainerLevel: Number(trainer?.["level"]) || 1,
    trainerXp: Number(trainer?.["xp"]) || 0,
    partyPokemon,
    pcPokemon,
    leadPokemonId: trainer?.["leadPokemonId"] ? String(trainer["leadPokemonId"]) : null,
    pokemon: publicPokemon,
    guildId,
    guildName: guild?.name ?? null,
    starter: partyPokemon.find((pokemon) => pokemon.isStarter)?.id ?? null,
    starterChosen: partyPokemon.some((pokemon) => pokemon.isStarter),
    dailyClaimedAt: doc.lastDaily ? new Date(Number(doc.lastDaily)).toISOString() : null,
    streak: Number(doc.streak) || 0,
    onboarding: [],
  };
}

export type PhoneLoginResult =
  | { status: "verified"; user: PublicUser }
  | {
      status: "verification_required";
      phoneNumber: string;
      maskedPhone: string;
      expiresAt: string;
    };

function maskPhone(phoneNumber: string): string {
  return phoneNumber.length <= 4
    ? phoneNumber
    : `${"•".repeat(Math.max(0, phoneNumber.length - 4))}${phoneNumber.slice(-4)}`;
}

async function ensureWebsiteId(user: UserDoc): Promise<string> {
  if (user.websiteId) return String(user.websiteId);
  const col = await users();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const websiteId = `AID-${randomBytes(5).toString("hex").toUpperCase()}`;
    try {
      const updated = await col.findOneAndUpdate(
        {
          _id: user._id,
          registered: true,
          $or: [{ websiteId: { $exists: false } }, { websiteId: null }, { websiteId: "" }],
        } as never,
        { $set: { websiteId, websiteIdCreatedAt: new Date() } } as never,
        { returnDocument: "after" },
      );
      if (updated?.websiteId) return String(updated.websiteId);
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000) throw error;
    }
  }
  const retry = await col.findOne({ _id: user._id } as never);
  if (retry?.websiteId) return String(retry.websiteId);
  throw new Error("Could not create your AIDORU profile ID. Please try again.");
}

async function findUserByPhoneNumber(phoneNumber: string): Promise<UserDoc | null> {
  const col = await users();
  return col.findOne({
    registered: true,
    websiteBanned: { $ne: true },
    $or: phoneLookupClauses(phoneNumber),
  } as never);
}

function createVerificationCode(): string {
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

export async function beginPhoneLogin(input: {
  countryCode: string;
  phoneNumber: string;
  password: string;
}): Promise<PhoneLoginResult> {
  const phoneNumber = normalisePhoneNumber(input.countryCode, input.phoneNumber);
  validateWebsitePassword(input.password);
  const user = await findUserByPhoneNumber(phoneNumber);
  if (!user)
    throw new Error(
      "No registered WhatsApp profile was found for this number. Run .register in the bot first.",
    );

  if (user.websitePasswordHash && user.websiteVerifiedAt) {
    if (!(await verifyWebsitePassword(input.password, user.websitePasswordHash))) {
      throw new Error("Incorrect password for this WhatsApp number.");
    }
    await issueSession(String(user._id));
    return { status: "verified", user: await toPublicUser(user) };
  }

  const code = createVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
  const pendingPasswordHash = await hashWebsitePassword(input.password);
  await (
    await users()
  ).updateOne(
    { _id: user._id, registered: true } as never,
    {
      $set: {
        websitePendingPasswordHash: pendingPasswordHash,
        websiteVerificationCode: code,
        websiteVerificationExpiresAt: expiresAt,
        websiteVerificationRequestedAt: new Date(),
      },
      $unset: { websiteVerifiedAt: "" },
    } as never,
  );
  return {
    status: "verification_required",
    phoneNumber,
    maskedPhone: maskPhone(phoneNumber),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function beginPasswordReset(input: {
  countryCode: string;
  phoneNumber: string;
  password: string;
}): Promise<{ phoneNumber: string; maskedPhone: string; expiresAt: string }> {
  const phoneNumber = normalisePhoneNumber(input.countryCode, input.phoneNumber);
  validateWebsitePassword(input.password);
  const user = await findUserByPhoneNumber(phoneNumber);
  if (!user) throw new Error("No registered WhatsApp profile was found for this number.");

  const code = createVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
  const pendingPasswordHash = await hashWebsitePassword(input.password);
  await (
    await users()
  ).updateOne(
    { _id: user._id, registered: true } as never,
    {
      $set: {
        websiteResetPendingPasswordHash: pendingPasswordHash,
        websiteResetCode: code,
        websiteResetExpiresAt: expiresAt,
        websiteResetRequestedAt: new Date(),
      },
    } as never,
  );
  return { phoneNumber, maskedPhone: maskPhone(phoneNumber), expiresAt: expiresAt.toISOString() };
}

export async function completePasswordReset(input: {
  countryCode: string;
  phoneNumber: string;
  code: string;
}): Promise<PublicUser> {
  const phoneNumber = normalisePhoneNumber(input.countryCode, input.phoneNumber);
  const code = String(input.code ?? "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(code))
    throw new Error("Enter the six-digit reset code from the WhatsApp bot.");
  const user = await findUserByPhoneNumber(phoneNumber);
  if (!user || user.websiteResetCode !== code) throw new Error("That reset code is incorrect.");
  const expiry = new Date(String(user.websiteResetExpiresAt ?? "")).getTime();
  if (!Number.isFinite(expiry) || expiry < Date.now())
    throw new Error("That reset code has expired. Start again.");
  if (!user.websiteResetPendingPasswordHash)
    throw new Error("No pending new password was found. Start again.");

  const result = await (
    await users()
  ).findOneAndUpdate(
    { _id: user._id, registered: true, websiteResetCode: code } as never,
    {
      $set: {
        websitePasswordHash: user.websiteResetPendingPasswordHash,
        websitePasswordUpdatedAt: new Date(),
        websiteVerifiedAt: user.websiteVerifiedAt ?? new Date(),
      },
      $unset: {
        websiteResetPendingPasswordHash: "",
        websiteResetCode: "",
        websiteResetExpiresAt: "",
        websiteResetRequestedAt: "",
      },
    } as never,
    { returnDocument: "after" },
  );
  if (!result) throw new Error("Reset expired or was already completed. Start again.");
  await issueSession(String(result._id));
  return toPublicUser(result as UserDoc);
}

export async function completePhoneVerification(input: {
  countryCode: string;
  phoneNumber: string;
  code: string;
}): Promise<PublicUser> {
  const phoneNumber = normalisePhoneNumber(input.countryCode, input.phoneNumber);
  const code = String(input.code ?? "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(code)) throw new Error("Enter the six-digit code from the WhatsApp bot.");
  const user = await findUserByPhoneNumber(phoneNumber);
  if (!user || user.websiteVerificationCode !== code)
    throw new Error("That verification code is incorrect.");
  const expiry = new Date(String(user.websiteVerificationExpiresAt ?? "")).getTime();
  if (!Number.isFinite(expiry) || expiry < Date.now())
    throw new Error("That verification code has expired. Start again from the login page.");
  if (!user.websitePendingPasswordHash)
    throw new Error("No pending password was found. Start again from the login page.");

  const result = await (
    await users()
  ).findOneAndUpdate(
    { _id: user._id, registered: true, websiteVerificationCode: code } as never,
    {
      $set: {
        websitePasswordHash: user.websitePendingPasswordHash,
        websitePasswordUpdatedAt: new Date(),
        websiteVerifiedAt: new Date(),
      },
      $unset: {
        websitePendingPasswordHash: "",
        websiteVerificationCode: "",
        websiteVerificationExpiresAt: "",
        websiteVerificationRequestedAt: "",
      },
    } as never,
    { returnDocument: "after" },
  );
  if (!result)
    throw new Error(
      "Verification expired or was already completed. Start again from the login page.",
    );
  await issueSession(String(result._id));
  return toPublicUser(result as UserDoc);
}

function validateWebsiteId(value: unknown): string {
  const websiteId = normaliseWebsiteId(value);
  if (!WEBSITE_ID_PATTERN.test(websiteId))
    throw new Error("Enter a valid AIDORU ID, for example AID-XXXXXXXXXX.");
  return websiteId;
}

async function findUserByWebsiteId(websiteId: string): Promise<UserDoc | null> {
  return (await users()).findOne({ registered: true, websiteBanned: { $ne: true }, websiteId } as never);
}

function createOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashOtp(websiteId: string, otp: string, saltHex: string): string {
  return createHash("sha256").update(`${saltHex}:${websiteId}:${otp}`, "utf8").digest("hex");
}

function hashResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function setCustomPassword(input: {
  websiteId: string;
  newPassword: string;
}): Promise<PublicUser> {
  const websiteId = validateWebsiteId(input.websiteId);
  validateWebsitePassword(input.newPassword);
  const user = await findUserByWebsiteId(websiteId);
  if (!user) throw new Error("No registered WhatsApp profile was found for that AIDORU ID.");
  if (user.websitePasswordHash) {
    throw new Error(
      "A website password already exists. Use Forgot password if you need to replace it.",
    );
  }

  const websitePasswordHash = await hashWebsitePassword(input.newPassword);
  const result = await (
    await users()
  ).findOneAndUpdate(
    {
      _id: user._id,
      registered: true,
      websiteId,
      $or: [
        { websitePasswordHash: { $exists: false } },
        { websitePasswordHash: null },
        { websitePasswordHash: "" },
      ],
    } as never,
    {
      $set: {
        websitePasswordHash,
        websitePasswordUpdatedAt: new Date(),
        websiteVerifiedAt: new Date(),
      },
    } as never,
    { returnDocument: "after" },
  );
  if (!result) throw new Error("A website password was set already. Try signing in instead.");
  await issueSession(String(result._id));
  return toPublicUser(result as UserDoc);
}

export async function requestOtp(
  websiteIdInput: string,
): Promise<{ websiteId: string; expiresAt: string }> {
  const websiteId = validateWebsiteId(websiteIdInput);
  const user = await findUserByWebsiteId(websiteId);
  if (!user) throw new Error("No registered WhatsApp profile was found for that AIDORU ID.");

  const otp = createOtp();
  const saltHex = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await (
    await users()
  ).updateOne(
    { _id: user._id, registered: true, websiteId } as never,
    {
      $set: {
        websiteOtpHash: hashOtp(websiteId, otp, saltHex),
        websiteOtpSalt: saltHex,
        websiteOtpExpiresAt: expiresAt,
        websiteOtpRequestedAt: new Date(),
      },
      $unset: { websiteResetTokenHash: "", websiteResetTokenExpiresAt: "" },
    } as never,
  );
  return { websiteId, expiresAt: expiresAt.toISOString() };
}

export async function verifyOtpForReset(input: {
  websiteId: string;
  otp: string;
}): Promise<{ resetToken: string; expiresAt: string }> {
  const websiteId = validateWebsiteId(input.websiteId);
  const otp = String(input.otp ?? "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(otp)) throw new Error("Enter the six-digit code sent by the WhatsApp bot.");

  const user = await findUserByWebsiteId(websiteId);
  if (!user || typeof user.websiteOtpHash !== "string" || typeof user.websiteOtpSalt !== "string") {
    throw new Error(
      "No active reset code was found. Press Forgot password again, then use .otp in your WhatsApp DM.",
    );
  }
  const expiry = new Date(String(user.websiteOtpExpiresAt ?? "")).getTime();
  if (!Number.isFinite(expiry) || expiry < Date.now())
    throw new Error("That reset code has expired. Start again.");

  const expected = Buffer.from(user.websiteOtpHash, "hex");
  const actual = Buffer.from(hashOtp(websiteId, otp, user.websiteOtpSalt), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(actual, expected)) {
    throw new Error("That reset code is incorrect.");
  }

  const resetToken = randomBytes(32).toString("base64url");
  const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  const result = await (
    await users()
  ).findOneAndUpdate(
    { _id: user._id, registered: true, websiteId, websiteOtpHash: user.websiteOtpHash } as never,
    {
      $set: {
        websiteResetTokenHash: hashResetToken(resetToken),
        websiteResetTokenExpiresAt: resetTokenExpiresAt,
      },
      $unset: {
        websiteOtpHash: "",
        websiteOtpSalt: "",
        websiteOtpExpiresAt: "",
        websiteOtpRequestedAt: "",
      },
    } as never,
    { returnDocument: "after" },
  );
  if (!result) throw new Error("That reset code was already used. Start again.");
  return { resetToken, expiresAt: resetTokenExpiresAt.toISOString() };
}

export async function resetPasswordWithOtp(input: {
  websiteId: string;
  resetToken: string;
  newPassword: string;
}): Promise<PublicUser> {
  const websiteId = validateWebsiteId(input.websiteId);
  validateWebsitePassword(input.newPassword);
  const resetToken = String(input.resetToken ?? "");
  if (resetToken.length < 32 || resetToken.length > 128)
    throw new Error("Your reset session is invalid. Start again.");

  const websitePasswordHash = await hashWebsitePassword(input.newPassword);
  const result = await (
    await users()
  ).findOneAndUpdate(
    {
      registered: true,
      websiteId,
      websiteResetTokenHash: hashResetToken(resetToken),
      websiteResetTokenExpiresAt: { $gt: new Date() },
    } as never,
    {
      $set: {
        websitePasswordHash,
        websitePasswordUpdatedAt: new Date(),
        websiteVerifiedAt: new Date(),
      },
      $unset: { websiteResetTokenHash: "", websiteResetTokenExpiresAt: "" },
    } as never,
    { returnDocument: "after" },
  );
  if (!result) throw new Error("Your reset session has expired. Start again with Forgot password.");
  await issueSession(String(result._id));
  return toPublicUser(result as UserDoc);
}

export async function loginUser(input: {
  websiteId: string;
  password: string;
}): Promise<PublicUser> {
  const websiteId = validateWebsiteId(input.websiteId);
  const password = input.password;
  validateWebsitePassword(password);

  const user = await findUserByWebsiteId(websiteId);
  if (!user) throw new Error("Invalid AIDORU ID or password.");
  if (!user.websitePasswordHash)
    throw new Error("No website password is set yet. Choose Set up password first.");
  if (!(await verifyWebsitePassword(password, user.websitePasswordHash))) {
    throw new Error("Invalid AIDORU ID or password.");
  }

  await issueSession(String(user._id));
  return toPublicUser(user);
}

export type DiscordLinkStatus = {
  linked: boolean;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
};

function whatsappIdentityVariants(value: string): string[] {
  const raw = String(value ?? "").trim();
  const withoutDevice = raw.replace(/:\d+(?=@)/, "");
  const digits = withoutDevice.replace(/\D/g, "");
  return [...new Set([
    raw,
    withoutDevice,
    digits,
    digits ? `${digits}@s.whatsapp.net` : "",
    digits ? `${digits}:0@s.whatsapp.net` : "",
  ].filter(Boolean))];
}

function discordConfiguration(flow: "link" | "login" = "link") {
  const clientId = process.env["DISCORD_CLIENT_ID"]?.trim();
  const clientSecret = process.env["DISCORD_CLIENT_SECRET"]?.trim();
  const redirectUri =
    flow === "login"
      ? process.env["DISCORD_LOGIN_REDIRECT_URI"]?.trim() ||
        process.env["DISCORD_REDIRECT_URI"]?.trim() ||
        "https://aidoru.zone.id/profile?discord=callback"
      : process.env["DISCORD_REDIRECT_URI"]?.trim() ||
        "https://aidoru.zone.id/profile?discord=callback";
  if (!clientId || !clientSecret) {
    throw new Error(
      "Discord sign-in is not configured yet. Add DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.",
    );
  }
  return { clientId, clientSecret, redirectUri };
}

async function activeDiscordLink(whatsappId: string) {
  const db = await getDb();
  return db.collection("account_links").findOne({
    whatsappId: { $in: whatsappIdentityVariants(whatsappId) },
    status: "active",
  } as never);
}

async function findUserByWhatsAppIdentity(identity: string): Promise<UserDoc | null> {
  const variants = whatsappIdentityVariants(identity);
  if (variants.length === 0) return null;
  return (await users()).findOne({
    registered: true,
    websiteBanned: { $ne: true },
    $or: [
      { _id: { $in: variants } },
      { phoneNumber: { $in: variants } },
      { whatsappNumber: { $in: variants } },
      { jid: { $in: variants } },
      { userId: { $in: variants } },
    ],
  } as never);
}

type DiscordIdentity = {
  id: string;
  username: string;
  avatar: string | null;
};

async function exchangeDiscordCode(
  code: string,
  configuration: ReturnType<typeof discordConfiguration>,
): Promise<DiscordIdentity> {
  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: configuration.clientId,
      client_secret: configuration.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: configuration.redirectUri,
    }),
  });
  if (!tokenResponse.ok) throw new Error("Discord could not authorize this request. Start again.");
  const tokenPayload = (await tokenResponse.json()) as { access_token?: unknown };
  const accessToken = String(tokenPayload.access_token ?? "");
  if (!accessToken) throw new Error("Discord did not return an authorization token.");

  const userResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!userResponse.ok) throw new Error("Discord profile lookup failed. Start again.");
  const discordUser = (await userResponse.json()) as {
    id?: unknown;
    username?: unknown;
    global_name?: unknown;
    avatar?: unknown;
  };
  const id = String(discordUser.id ?? "").trim();
  if (!/^\d{10,25}$/.test(id)) throw new Error("Discord returned an invalid account.");

  return {
    id,
    username: String(discordUser.global_name || discordUser.username || id),
    avatar: discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${id}/${String(discordUser.avatar)}.png?size=128`
      : null,
  };
}

export async function getDiscordLinkStatus(): Promise<DiscordLinkStatus> {
  const user = await requireUser();
  const link = await activeDiscordLink(String(user._id));
  return {
    linked: Boolean(link?.["discordId"]),
    discordId: link?.["discordId"] ? String(link["discordId"]) : null,
    discordUsername: link?.["discordUsername"] ? String(link["discordUsername"]) : null,
    discordAvatar: link?.["discordAvatar"] ? String(link["discordAvatar"]) : null,
  };
}

export async function startDiscordLink(): Promise<{ authorizationUrl: string }> {
  await requireUser();
  const { clientId, redirectUri } = discordConfiguration();
  const state = randomBytes(32).toString("base64url");
  setCookie(DISCORD_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: DISCORD_STATE_TTL_SECONDS,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state,
  });
  return { authorizationUrl: `https://discord.com/oauth2/authorize?${params.toString()}` };
}

export async function startDiscordLogin(): Promise<{ authorizationUrl: string }> {
  const { clientId, redirectUri } = discordConfiguration("login");
  const state = randomBytes(32).toString("base64url");
  setCookie(DISCORD_LOGIN_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: DISCORD_STATE_TTL_SECONDS,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state,
  });
  return { authorizationUrl: `https://discord.com/oauth2/authorize?${params.toString()}` };
}

export async function completeDiscordLogin(input: {
  code: string;
  state: string;
}): Promise<PublicUser> {
  const expectedState = getCookie(DISCORD_LOGIN_STATE_COOKIE);
  deleteCookie(DISCORD_LOGIN_STATE_COOKIE, { path: "/" });
  if (!expectedState || expectedState !== input.state) {
    throw new Error("That Discord sign-in session expired. Start again.");
  }

  const discordUser = await exchangeDiscordCode(input.code, discordConfiguration("login"));
  const db = await getDb();
  const link = await db.collection("account_links").findOne({
    discordId: discordUser.id,
    status: "active",
  } as never);
  if (!link?.["whatsappId"]) {
    throw new Error(
      "This Discord account is not linked yet. In a WhatsApp group, send .discord, then use .connect CODE here.",
    );
  }

  const user = await findUserByWhatsAppIdentity(String(link["whatsappId"]));
  if (!user) {
    throw new Error(
      "The linked WhatsApp trainer could not be found. Generate a new link from WhatsApp.",
    );
  }
  await issueSession(String(user._id));
  return toPublicUser(user);
}

export async function completeDiscordCallback(
  input: { code: string; state: string },
): Promise<
  | { kind: "login"; user: PublicUser }
  | { kind: "link"; status: DiscordLinkStatus }
> {
  // The existing Discord application is registered with the profile callback.
  // Use the state cookie to distinguish a website sign-in from an account link
  // without requiring a second redirect URI in the Discord developer portal.
  const loginState = getCookie(DISCORD_LOGIN_STATE_COOKIE);
  if (loginState && loginState === input.state) {
    return { kind: "login", user: await completeDiscordLogin(input) };
  }
  return { kind: "link", status: await completeDiscordLink(input) };
}

export async function completeDiscordLink(input: {
  code: string;
  state: string;
}): Promise<DiscordLinkStatus> {
  const user = await requireUser();
  const expectedState = getCookie(DISCORD_STATE_COOKIE);
  deleteCookie(DISCORD_STATE_COOKIE, { path: "/" });
  if (!expectedState || expectedState !== input.state) {
    throw new Error("That Discord link session expired. Start the link again.");
  }

  const configuration = discordConfiguration();
  const discordUser = await exchangeDiscordCode(input.code, configuration);
  const discordId = discordUser.id;

  const db = await getDb();
  const links = db.collection("account_links");
  const now = Date.now();
  const whatsappIds = whatsappIdentityVariants(String(user._id));
  await links.updateMany(
    { whatsappId: { $in: whatsappIds }, status: "active" } as never,
    { $set: { status: "revoked", revokedAt: now, revokedBy: "website-oauth" } } as never,
  );
  await links.updateMany(
    { discordId, status: "active" } as never,
    { $set: { status: "revoked", revokedAt: now, revokedBy: "website-oauth" } } as never,
  );
  await links.insertOne({
    whatsappId: String(user._id),
    discordId,
    discordUsername: discordUser.username,
    discordAvatar: discordUser.avatar,
    status: "active",
    source: "website-oauth",
    createdAt: now,
    linkedAt: now,
  });

  return {
    linked: true,
    discordId,
    discordUsername: discordUser.username,
    discordAvatar: discordUser.avatar,
  };
}

export async function unlinkDiscordAccount(): Promise<DiscordLinkStatus> {
  const user = await requireUser();
  const db = await getDb();
  await db
    .collection("account_links")
    .updateMany(
      {
        whatsappId: { $in: whatsappIdentityVariants(String(user._id)) },
        status: "active",
      } as never,
      { $set: { status: "revoked", revokedAt: Date.now(), revokedBy: "website" } } as never,
    );
  return {
    linked: false,
    discordId: null,
    discordUsername: null,
    discordAvatar: null,
  };
}
