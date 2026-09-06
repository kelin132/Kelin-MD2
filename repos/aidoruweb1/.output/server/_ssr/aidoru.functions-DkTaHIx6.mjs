import { a as TSS_SERVER_FUNCTION, c as getCookie, i as createServerFn, l as setCookie, s as deleteCookie } from "./server-B39CcLPg.mjs";
import { a as guildTaxRateForLevel, o as guildUpgradeRequirementsForLevel, s as petImageForSpecies, t as GUILD_CREATION_COST } from "./game-qTZOZDmK.mjs";
import { a as objectType, i as numberType, n as enumType, o as stringType, r as literalType, t as discriminatedUnionType } from "../_libs/zod.mjs";
import { n as jwtVerify, t as SignJWT } from "../_libs/jose.mjs";
import { t as require_lib } from "../_libs/mongodb.mjs";
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/aidoru.functions-DkTaHIx6.js
var import_lib = require_lib();
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var MONGO_ENV_KEYS = [
	"MONGO_URI",
	"MONGODB_URI",
	"MONGO_URL",
	"MONGODB_URL",
	"MONGO_CONNECTION_STRING",
	"MONGODB_CONNECTION_STRING"
];
var MONGO_CONFIGURATION_MESSAGE = "Database connection is not configured. Add MONGO_URI (or MONGODB_URI) to every deployment instance, then restart the service.";
function getMongoUri() {
	for (const key of MONGO_ENV_KEYS) {
		const value = process.env[key]?.trim();
		if (value) return value;
	}
	throw new Error(MONGO_CONFIGURATION_MESSAGE);
}
var globalCache = globalThis;
var cache = globalCache.__aidoruMongo ??= {
	client: null,
	promise: null,
	healthPromise: null,
	lastHealthCheckAt: 0
};
var HEALTH_CHECK_INTERVAL_MS = 15e3;
var CONNECT_RETRY_DELAYS_MS = [250, 750];
function wait(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
function clearConnectionCache() {
	const client = cache.client;
	cache.client = null;
	cache.promise = null;
	cache.healthPromise = null;
	cache.lastHealthCheckAt = 0;
	client?.close().catch(() => void 0);
}
async function connect() {
	const uri = getMongoUri();
	let lastError;
	for (let attempt = 0; attempt < CONNECT_RETRY_DELAYS_MS.length + 1; attempt += 1) {
		const client = new import_lib.MongoClient(uri, {
			serverSelectionTimeoutMS: 5e3,
			connectTimeoutMS: 5e3,
			waitQueueTimeoutMS: 5e3,
			maxPoolSize: 10
		});
		try {
			await client.connect();
			const db = client.db("kelin_md");
			await db.command({ ping: 1 });
			cache.client = client;
			cache.lastHealthCheckAt = Date.now();
			return db;
		} catch (error) {
			lastError = error;
			await client.close().catch(() => void 0);
			const delay = CONNECT_RETRY_DELAYS_MS[attempt];
			if (delay !== void 0) await wait(delay);
		}
	}
	throw lastError instanceof Error ? lastError : /* @__PURE__ */ new Error("MongoDB connection failed.");
}
async function ensureHealthy(db) {
	if (Date.now() - cache.lastHealthCheckAt < HEALTH_CHECK_INTERVAL_MS) return;
	cache.healthPromise ??= db.command({ ping: 1 }).then(() => {
		cache.lastHealthCheckAt = Date.now();
	}).catch((error) => {
		clearConnectionCache();
		throw error;
	}).finally(() => {
		cache.healthPromise = null;
	});
	await cache.healthPromise;
}
async function getDb() {
	cache.promise ??= connect().catch((error) => {
		cache.promise = null;
		throw error;
	});
	const db = await cache.promise;
	await ensureHealthy(db);
	return db;
}
async function collection(name) {
	return (await getDb()).collection(name);
}
var users = () => collection("users");
var guilds = () => collection("guilds");
var cardUsers = () => collection("mn_users");
var cardMarket = () => collection("mn_card_market");
var pets = () => collection("pets");
var battleRooms = () => collection("web_battle_rooms");
function deriveScrypt(password, salt, keyLength, options) {
	return new Promise((resolve, reject) => {
		scrypt(password, salt, keyLength, options, (error, derivedKey) => {
			if (error) reject(error);
			else resolve(Buffer.from(derivedKey));
		});
	});
}
var COOKIE = "aidoru_session";
var MAX_AGE = 2592e3;
var SCRYPT_N = 16384;
var SCRYPT_R = 8;
var SCRYPT_P = 1;
var SCRYPT_MAXMEM = 33554432;
var VERIFICATION_TTL_MS = 6e5;
var DISCORD_STATE_COOKIE = "aidoru_discord_oauth_state";
var DISCORD_LOGIN_STATE_COOKIE = "aidoru_discord_login_oauth_state";
var DISCORD_STATE_TTL_SECONDS = 600;
function secret() {
	const value = process.env["SESSION_SECRET"];
	if (!value) throw new Error("SESSION_SECRET is not configured.");
	return new TextEncoder().encode(value);
}
function normalisePhoneNumber(countryCode, localNumber) {
	const country = String(countryCode ?? "").replace(/\D/g, "");
	const local = String(localNumber ?? "").replace(/\D/g, "").replace(/^0+/, "");
	if (country.length < 1 || country.length > 4 || local.length < 5 || local.length > 14) throw new Error("Enter a valid WhatsApp phone number.");
	return local.startsWith(country) && local.length >= country.length + 7 ? local : `${country}${local}`;
}
function phoneLookupIds(phoneNumber) {
	const digits = phoneNumber.replace(/\D/g, "");
	const numeric = Number(digits);
	return [.../* @__PURE__ */ new Set([
		digits,
		`+${digits}`,
		`${digits}@s.whatsapp.net`,
		`${digits}@c.us`,
		`${digits}:0@s.whatsapp.net`,
		`${digits}:0@c.us`,
		...Number.isSafeInteger(numeric) ? [numeric] : []
	])];
}
function phoneLookupClauses(phoneNumber) {
	const digits = phoneNumber.replace(/\D/g, "");
	const jidPattern = new RegExp(`^${digits}(?::\\d+)?@(s\\.whatsapp\\.net|c\\.us)$`, "i");
	return [
		"_id",
		"phoneNumber",
		"whatsappNumber",
		"jid",
		"userId"
	].flatMap((field) => [{ [field]: { $in: phoneLookupIds(phoneNumber) } }, { [field]: { $regex: jidPattern } }]);
}
async function hashWebsitePassword(password) {
	const salt = randomBytes(16);
	const derivedKey = await deriveScrypt(password, salt, 64, {
		N: SCRYPT_N,
		r: SCRYPT_R,
		p: SCRYPT_P,
		maxmem: SCRYPT_MAXMEM
	});
	return [
		"scrypt",
		SCRYPT_N,
		SCRYPT_R,
		SCRYPT_P,
		salt.toString("hex"),
		derivedKey.toString("hex")
	].join("$");
}
function validateWebsitePassword(password) {
	if (typeof password !== "string" || password.length < 8 || password.length > 128) throw new Error("Your password must be between 8 and 128 characters.");
	if (/[\r\n\t]/.test(password)) throw new Error("Your password cannot contain line breaks or tabs.");
}
async function verifyWebsitePassword(password, encodedHash) {
	if (typeof encodedHash !== "string") return false;
	const [algorithm, nText, rText, pText, saltHex, keyHex] = encodedHash.split("$");
	if (algorithm !== "scrypt" || !saltHex || !keyHex) return false;
	const N = Number(nText);
	const r = Number(rText);
	const p = Number(pText);
	if (!Number.isSafeInteger(N) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p)) return false;
	try {
		const salt = Buffer.from(saltHex, "hex");
		const expected = Buffer.from(keyHex, "hex");
		const actual = await deriveScrypt(password, salt, expected.length, {
			N,
			r,
			p,
			maxmem: SCRYPT_MAXMEM
		});
		return actual.length === expected.length && timingSafeEqual(actual, expected);
	} catch {
		return false;
	}
}
function inventoryEntries(value) {
	if (!Array.isArray(value)) {
		if (value && typeof value === "object") return Object.entries(value).map(([itemId, qty]) => ({
			itemId,
			qty: Number(qty) || 1
		}));
		return [];
	}
	return value.map((entry) => {
		if (typeof entry === "string") return {
			itemId: entry,
			qty: 1
		};
		if (!entry || typeof entry !== "object") return {
			itemId: "unknown",
			qty: 1
		};
		const item = entry;
		return {
			itemId: String(item["itemId"] ?? item["id"] ?? item["name"] ?? item["label"] ?? "unknown"),
			qty: Number(item["qty"] ?? item["quantity"] ?? item["count"] ?? item["amount"] ?? 1) || 1
		};
	});
}
function pokemonToPublic(doc) {
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
		imageUrl: String(doc["imageUrl"] ?? (pokedexId > 0 ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokedexId}.png` : "")),
		shiny: Boolean(doc["shiny"]),
		inParty: Boolean(doc["inParty"]),
		isStarter: Boolean(doc["isStarter"])
	};
}
async function issueSession(jid) {
	const token = await new SignJWT({ sub: jid }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(secret());
	setCookie(COOKIE, token, {
		httpOnly: true,
		sameSite: "lax",
		secure: true,
		path: "/",
		maxAge: MAX_AGE
	});
}
function clearSession() {
	deleteCookie(COOKIE, { path: "/" });
}
function sessionWasRevoked(payloadIat, revokedAt) {
	const issuedAtMs = Number(payloadIat) * 1e3;
	const revokedAtMs = new Date(String(revokedAt ?? "")).getTime();
	return Number.isFinite(issuedAtMs) && Number.isFinite(revokedAtMs) && issuedAtMs <= revokedAtMs;
}
async function currentUserId() {
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
async function findUserById(id) {
	const col = await users();
	const numericId = Number(id);
	return col.findOne({
		registered: true,
		websiteBanned: { $ne: true },
		$or: [{ _id: id }, ...Number.isSafeInteger(numericId) ? [{ _id: numericId }] : []]
	});
}
async function requireUser() {
	const id = await currentUserId();
	if (!id) throw new Error("Not signed in.");
	const user = await findUserById(id);
	if (!user) throw new Error("Session expired. Sign in again with your phone number.");
	return user;
}
async function toPublicUser(doc) {
	const jid = String(doc._id);
	const withoutDevice = jid.replace(/:\d+(?=@)/, "");
	const parts = withoutDevice.split("@");
	const bare = parts[0] ?? withoutDevice;
	const domain = parts[1] || "s.whatsapp.net";
	const storedIdentityFields = doc;
	const trainerJids = [...new Set([
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
		storedIdentityFields["jid"]
	].filter(Boolean))];
	const db = await getDb();
	const [guild, pokemonDocs, trainer] = await Promise.all([
		(await guilds()).findOne({ members: { $in: trainerJids } }),
		db.collection("pokemon_owned").find({ ownerJid: { $in: trainerJids } }).sort({
			inParty: -1,
			isStarter: -1,
			level: -1
		}).limit(36).toArray(),
		db.collection("pokemon_trainers").findOne({ jid: { $in: trainerJids } })
	]);
	const publicPokemon = pokemonDocs.map((pokemon) => pokemonToPublic(pokemon));
	const pokemonById = new Map(publicPokemon.map((pokemon) => [pokemon.id, pokemon]));
	const partyIds = Array.isArray(trainer?.["party"]) ? trainer["party"].map(String) : [];
	const pcIds = Array.isArray(trainer?.["pc"]) ? trainer["pc"].map(String) : [];
	const partyPokemon = partyIds.map((id) => pokemonById.get(id)).filter(Boolean);
	const pcPokemon = pcIds.map((id) => pokemonById.get(id)).filter(Boolean);
	const guildId = guild?._id ? String(guild._id) : null;
	const title = doc.job || (doc.isPremium ? "Premium Player" : "Player");
	const imageFields = doc;
	return {
		id: jid,
		name: doc.name ?? doc.username ?? doc.pushName ?? doc.notifyName ?? "Player",
		bio: doc.bio ?? "",
		title,
		avatar: "default",
		avatarUrl: [
			doc.profilePictureUrl,
			imageFields["profileImage"],
			imageFields["avatarUrl"],
			imageFields["profilePic"],
			imageFields["pfp"],
			imageFields["imageUrl"],
			imageFields["image"]
		].find((value) => typeof value === "string" && value.trim().length > 0) ?? null,
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
		onboarding: []
	};
}
function maskPhone(phoneNumber) {
	return phoneNumber.length <= 4 ? phoneNumber : `${"•".repeat(Math.max(0, phoneNumber.length - 4))}${phoneNumber.slice(-4)}`;
}
async function findUserByPhoneNumber(phoneNumber) {
	return (await users()).findOne({
		registered: true,
		websiteBanned: { $ne: true },
		$or: phoneLookupClauses(phoneNumber)
	});
}
function createVerificationCode() {
	return String(randomBytes(4).readUInt32BE(0) % 1e6).padStart(6, "0");
}
async function beginPhoneLogin(input) {
	const phoneNumber = normalisePhoneNumber(input.countryCode, input.phoneNumber);
	validateWebsitePassword(input.password);
	const user = await findUserByPhoneNumber(phoneNumber);
	if (!user) throw new Error("No registered WhatsApp profile was found for this number. Run .register in the bot first.");
	if (user.websitePasswordHash && user.websiteVerifiedAt) {
		if (!await verifyWebsitePassword(input.password, user.websitePasswordHash)) throw new Error("Incorrect password for this WhatsApp number.");
		await issueSession(String(user._id));
		return {
			status: "verified",
			user: await toPublicUser(user)
		};
	}
	const code = createVerificationCode();
	const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
	const pendingPasswordHash = await hashWebsitePassword(input.password);
	await (await users()).updateOne({
		_id: user._id,
		registered: true
	}, {
		$set: {
			websitePendingPasswordHash: pendingPasswordHash,
			websiteVerificationCode: code,
			websiteVerificationExpiresAt: expiresAt,
			websiteVerificationRequestedAt: /* @__PURE__ */ new Date()
		},
		$unset: { websiteVerifiedAt: "" }
	});
	return {
		status: "verification_required",
		phoneNumber,
		maskedPhone: maskPhone(phoneNumber),
		expiresAt: expiresAt.toISOString()
	};
}
async function beginPasswordReset(input) {
	const phoneNumber = normalisePhoneNumber(input.countryCode, input.phoneNumber);
	validateWebsitePassword(input.password);
	const user = await findUserByPhoneNumber(phoneNumber);
	if (!user) throw new Error("No registered WhatsApp profile was found for this number.");
	const code = createVerificationCode();
	const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
	const pendingPasswordHash = await hashWebsitePassword(input.password);
	await (await users()).updateOne({
		_id: user._id,
		registered: true
	}, { $set: {
		websiteResetPendingPasswordHash: pendingPasswordHash,
		websiteResetCode: code,
		websiteResetExpiresAt: expiresAt,
		websiteResetRequestedAt: /* @__PURE__ */ new Date()
	} });
	return {
		phoneNumber,
		maskedPhone: maskPhone(phoneNumber),
		expiresAt: expiresAt.toISOString()
	};
}
async function completePasswordReset(input) {
	const phoneNumber = normalisePhoneNumber(input.countryCode, input.phoneNumber);
	const code = String(input.code ?? "").replace(/\D/g, "");
	if (!/^\d{6}$/.test(code)) throw new Error("Enter the six-digit reset code from the WhatsApp bot.");
	const user = await findUserByPhoneNumber(phoneNumber);
	if (!user || user.websiteResetCode !== code) throw new Error("That reset code is incorrect.");
	const expiry = new Date(String(user.websiteResetExpiresAt ?? "")).getTime();
	if (!Number.isFinite(expiry) || expiry < Date.now()) throw new Error("That reset code has expired. Start again.");
	if (!user.websiteResetPendingPasswordHash) throw new Error("No pending new password was found. Start again.");
	const result = await (await users()).findOneAndUpdate({
		_id: user._id,
		registered: true,
		websiteResetCode: code
	}, {
		$set: {
			websitePasswordHash: user.websiteResetPendingPasswordHash,
			websitePasswordUpdatedAt: /* @__PURE__ */ new Date(),
			websiteVerifiedAt: user.websiteVerifiedAt ?? /* @__PURE__ */ new Date()
		},
		$unset: {
			websiteResetPendingPasswordHash: "",
			websiteResetCode: "",
			websiteResetExpiresAt: "",
			websiteResetRequestedAt: ""
		}
	}, { returnDocument: "after" });
	if (!result) throw new Error("Reset expired or was already completed. Start again.");
	await issueSession(String(result._id));
	return toPublicUser(result);
}
async function completePhoneVerification(input) {
	const phoneNumber = normalisePhoneNumber(input.countryCode, input.phoneNumber);
	const code = String(input.code ?? "").replace(/\D/g, "");
	if (!/^\d{6}$/.test(code)) throw new Error("Enter the six-digit code from the WhatsApp bot.");
	const user = await findUserByPhoneNumber(phoneNumber);
	if (!user || user.websiteVerificationCode !== code) throw new Error("That verification code is incorrect.");
	const expiry = new Date(String(user.websiteVerificationExpiresAt ?? "")).getTime();
	if (!Number.isFinite(expiry) || expiry < Date.now()) throw new Error("That verification code has expired. Start again from the login page.");
	if (!user.websitePendingPasswordHash) throw new Error("No pending password was found. Start again from the login page.");
	const result = await (await users()).findOneAndUpdate({
		_id: user._id,
		registered: true,
		websiteVerificationCode: code
	}, {
		$set: {
			websitePasswordHash: user.websitePendingPasswordHash,
			websitePasswordUpdatedAt: /* @__PURE__ */ new Date(),
			websiteVerifiedAt: /* @__PURE__ */ new Date()
		},
		$unset: {
			websitePendingPasswordHash: "",
			websiteVerificationCode: "",
			websiteVerificationExpiresAt: "",
			websiteVerificationRequestedAt: ""
		}
	}, { returnDocument: "after" });
	if (!result) throw new Error("Verification expired or was already completed. Start again from the login page.");
	await issueSession(String(result._id));
	return toPublicUser(result);
}
function whatsappIdentityVariants(value) {
	const raw = String(value ?? "").trim();
	const withoutDevice = raw.replace(/:\d+(?=@)/, "");
	const digits = withoutDevice.replace(/\D/g, "");
	return [...new Set([
		raw,
		withoutDevice,
		digits,
		digits ? `${digits}@s.whatsapp.net` : "",
		digits ? `${digits}:0@s.whatsapp.net` : ""
	].filter(Boolean))];
}
function discordConfiguration(flow = "link") {
	const clientId = process.env["DISCORD_CLIENT_ID"]?.trim();
	const clientSecret = process.env["DISCORD_CLIENT_SECRET"]?.trim();
	const redirectUri = flow === "login" ? process.env["DISCORD_LOGIN_REDIRECT_URI"]?.trim() || process.env["DISCORD_REDIRECT_URI"]?.trim() || "https://aidoru.zone.id/profile?discord=callback" : process.env["DISCORD_REDIRECT_URI"]?.trim() || "https://aidoru.zone.id/profile?discord=callback";
	if (!clientId || !clientSecret) throw new Error("Discord sign-in is not configured yet. Add DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.");
	return {
		clientId,
		clientSecret,
		redirectUri
	};
}
async function activeDiscordLink(whatsappId) {
	return (await getDb()).collection("account_links").findOne({
		whatsappId: { $in: whatsappIdentityVariants(whatsappId) },
		status: "active"
	});
}
async function findUserByWhatsAppIdentity(identity) {
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
			{ userId: { $in: variants } }
		]
	});
}
async function exchangeDiscordCode(code, configuration) {
	const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: configuration.clientId,
			client_secret: configuration.clientSecret,
			grant_type: "authorization_code",
			code,
			redirect_uri: configuration.redirectUri
		})
	});
	if (!tokenResponse.ok) throw new Error("Discord could not authorize this request. Start again.");
	const tokenPayload = await tokenResponse.json();
	const accessToken = String(tokenPayload.access_token ?? "");
	if (!accessToken) throw new Error("Discord did not return an authorization token.");
	const userResponse = await fetch("https://discord.com/api/users/@me", { headers: { authorization: `Bearer ${accessToken}` } });
	if (!userResponse.ok) throw new Error("Discord profile lookup failed. Start again.");
	const discordUser = await userResponse.json();
	const id = String(discordUser.id ?? "").trim();
	if (!/^\d{10,25}$/.test(id)) throw new Error("Discord returned an invalid account.");
	return {
		id,
		username: String(discordUser.global_name || discordUser.username || id),
		avatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${id}/${String(discordUser.avatar)}.png?size=128` : null
	};
}
async function getDiscordLinkStatus() {
	const user = await requireUser();
	const link = await activeDiscordLink(String(user._id));
	return {
		linked: Boolean(link?.["discordId"]),
		discordId: link?.["discordId"] ? String(link["discordId"]) : null,
		discordUsername: link?.["discordUsername"] ? String(link["discordUsername"]) : null,
		discordAvatar: link?.["discordAvatar"] ? String(link["discordAvatar"]) : null
	};
}
async function startDiscordLink() {
	await requireUser();
	const { clientId, redirectUri } = discordConfiguration();
	const state = randomBytes(32).toString("base64url");
	setCookie(DISCORD_STATE_COOKIE, state, {
		httpOnly: true,
		sameSite: "lax",
		secure: true,
		path: "/",
		maxAge: DISCORD_STATE_TTL_SECONDS
	});
	return { authorizationUrl: `https://discord.com/oauth2/authorize?${new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: "identify",
		state
	}).toString()}` };
}
async function startDiscordLogin() {
	const { clientId, redirectUri } = discordConfiguration("login");
	const state = randomBytes(32).toString("base64url");
	setCookie(DISCORD_LOGIN_STATE_COOKIE, state, {
		httpOnly: true,
		sameSite: "lax",
		secure: true,
		path: "/",
		maxAge: DISCORD_STATE_TTL_SECONDS
	});
	return { authorizationUrl: `https://discord.com/oauth2/authorize?${new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: "identify",
		state
	}).toString()}` };
}
async function completeDiscordLogin(input) {
	const expectedState = getCookie(DISCORD_LOGIN_STATE_COOKIE);
	deleteCookie(DISCORD_LOGIN_STATE_COOKIE, { path: "/" });
	if (!expectedState || expectedState !== input.state) throw new Error("That Discord sign-in session expired. Start again.");
	const discordUser = await exchangeDiscordCode(input.code, discordConfiguration("login"));
	const link = await (await getDb()).collection("account_links").findOne({
		discordId: discordUser.id,
		status: "active"
	});
	if (!link?.["whatsappId"]) throw new Error("This Discord account is not linked yet. In a WhatsApp group, send .discord, then use .connect CODE here.");
	const user = await findUserByWhatsAppIdentity(String(link["whatsappId"]));
	if (!user) throw new Error("The linked WhatsApp trainer could not be found. Generate a new link from WhatsApp.");
	await issueSession(String(user._id));
	return toPublicUser(user);
}
async function completeDiscordCallback(input) {
	const loginState = getCookie(DISCORD_LOGIN_STATE_COOKIE);
	if (loginState && loginState === input.state) return {
		kind: "login",
		user: await completeDiscordLogin(input)
	};
	return {
		kind: "link",
		status: await completeDiscordLink(input)
	};
}
async function completeDiscordLink(input) {
	const user = await requireUser();
	const expectedState = getCookie(DISCORD_STATE_COOKIE);
	deleteCookie(DISCORD_STATE_COOKIE, { path: "/" });
	if (!expectedState || expectedState !== input.state) throw new Error("That Discord link session expired. Start the link again.");
	const configuration = discordConfiguration();
	const discordUser = await exchangeDiscordCode(input.code, configuration);
	const discordId = discordUser.id;
	const links = (await getDb()).collection("account_links");
	const now = Date.now();
	const whatsappIds = whatsappIdentityVariants(String(user._id));
	await links.updateMany({
		whatsappId: { $in: whatsappIds },
		status: "active"
	}, { $set: {
		status: "revoked",
		revokedAt: now,
		revokedBy: "website-oauth"
	} });
	await links.updateMany({
		discordId,
		status: "active"
	}, { $set: {
		status: "revoked",
		revokedAt: now,
		revokedBy: "website-oauth"
	} });
	await links.insertOne({
		whatsappId: String(user._id),
		discordId,
		discordUsername: discordUser.username,
		discordAvatar: discordUser.avatar,
		status: "active",
		source: "website-oauth",
		createdAt: now,
		linkedAt: now
	});
	return {
		linked: true,
		discordId,
		discordUsername: discordUser.username,
		discordAvatar: discordUser.avatar
	};
}
async function unlinkDiscordAccount() {
	const user = await requireUser();
	await (await getDb()).collection("account_links").updateMany({
		whatsappId: { $in: whatsappIdentityVariants(String(user._id)) },
		status: "active"
	}, { $set: {
		status: "revoked",
		revokedAt: Date.now(),
		revokedBy: "website"
	} });
	return {
		linked: false,
		discordId: null,
		discordUsername: null,
		discordAvatar: null
	};
}
var BOT_MART_ITEMS = [
	{
		id: "pokeball",
		slug: "poke-ball",
		name: "Poke Ball",
		description: "See .mart page 1 for details.",
		emoji: "⚪",
		category: "ball",
		page: 1,
		price: 200,
		index: 1,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
	},
	{
		id: "greatball",
		slug: "great-ball",
		name: "Great Ball",
		description: "See .mart page 1 for details.",
		emoji: "🔵",
		category: "ball",
		page: 1,
		price: 600,
		index: 2,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png"
	},
	{
		id: "ultraball",
		slug: "ultra-ball",
		name: "Ultra Ball",
		description: "See .mart page 1 for details.",
		emoji: "⚫",
		category: "ball",
		page: 1,
		price: 1200,
		index: 3,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png"
	},
	{
		id: "masterball",
		slug: "master-ball",
		name: "Master Ball",
		description: "See .mart page 1 for details.",
		emoji: "🟣",
		category: "ball",
		page: 1,
		price: 3500,
		index: 4,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png"
	},
	{
		id: "premierball",
		slug: "premier-ball",
		name: "Premier Ball",
		description: "See .mart page 1 for details.",
		emoji: "⚪",
		category: "ball",
		page: 1,
		price: 200,
		index: 5,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/premier-ball.png"
	},
	{
		id: "healball",
		slug: "heal-ball",
		name: "Heal Ball",
		description: "See .mart page 1 for details.",
		emoji: "🩷",
		category: "ball",
		page: 1,
		price: 300,
		index: 6,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/heal-ball.png"
	},
	{
		id: "duskball",
		slug: "dusk-ball",
		name: "Dusk Ball",
		description: "See .mart page 1 for details.",
		emoji: "🌑",
		category: "ball",
		page: 1,
		price: 1e3,
		index: 7,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dusk-ball.png"
	},
	{
		id: "netball",
		slug: "net-ball",
		name: "Net Ball",
		description: "See .mart page 1 for details.",
		emoji: "🟩",
		category: "ball",
		page: 1,
		price: 1e3,
		index: 8,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/net-ball.png"
	},
	{
		id: "luxuryball",
		slug: "luxury-ball",
		name: "Luxury Ball",
		description: "See .mart page 1 for details.",
		emoji: "🟠",
		category: "ball",
		page: 1,
		price: 1e3,
		index: 9,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/luxury-ball.png"
	},
	{
		id: "quickball",
		slug: "quick-ball",
		name: "Quick Ball",
		description: "See .mart page 1 for details.",
		emoji: "🟡",
		category: "ball",
		page: 1,
		price: 1e3,
		index: 10,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/quick-ball.png"
	},
	{
		id: "beastball",
		slug: "beast-ball",
		name: "Beast Ball",
		description: "See .mart page 1 for details.",
		emoji: "🔶",
		category: "ball",
		page: 1,
		price: 12e3,
		index: 11,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/beast-ball.png"
	},
	{
		id: "potion",
		slug: "potion",
		name: "Potion",
		description: "See .mart page 2 for details.",
		emoji: "🩹",
		category: "heal",
		page: 2,
		price: 300,
		index: 12,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png"
	},
	{
		id: "superpotion",
		slug: "super-potion",
		name: "Super Potion",
		description: "See .mart page 2 for details.",
		emoji: "💊",
		category: "heal",
		page: 2,
		price: 700,
		index: 13,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/super-potion.png"
	},
	{
		id: "hyperpotion",
		slug: "hyper-potion",
		name: "Hyper Potion",
		description: "See .mart page 2 for details.",
		emoji: "💉",
		category: "heal",
		page: 2,
		price: 1500,
		index: 14,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/hyper-potion.png"
	},
	{
		id: "fullrestore",
		slug: "full-restore",
		name: "Full Restore",
		description: "See .mart page 2 for details.",
		emoji: "✨",
		category: "heal",
		page: 2,
		price: 3e3,
		index: 15,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/full-restore.png"
	},
	{
		id: "revive",
		slug: "revive",
		name: "Revive",
		description: "See .mart page 2 for details.",
		emoji: "💫",
		category: "heal",
		page: 2,
		price: 1500,
		index: 16,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/revive.png"
	},
	{
		id: "maxrevive",
		slug: "max-revive",
		name: "Max Revive",
		description: "See .mart page 2 for details.",
		emoji: "⭐",
		category: "heal",
		page: 2,
		price: 4e3,
		index: 17,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-revive.png"
	},
	{
		id: "freshwater",
		slug: "fresh-water",
		name: "Fresh Water",
		description: "See .mart page 2 for details.",
		emoji: "💧",
		category: "heal",
		page: 2,
		price: 200,
		index: 18,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/fresh-water.png"
	},
	{
		id: "sodapop",
		slug: "soda-pop",
		name: "Soda Pop",
		description: "See .mart page 2 for details.",
		emoji: "🥤",
		category: "heal",
		page: 2,
		price: 300,
		index: 19,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/soda-pop.png"
	},
	{
		id: "lemonade",
		slug: "lemonade",
		name: "Lemonade",
		description: "See .mart page 2 for details.",
		emoji: "🍋",
		category: "heal",
		page: 2,
		price: 350,
		index: 20,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lemonade.png"
	},
	{
		id: "moomoomilk",
		slug: "moomoo-milk",
		name: "Moomoo Milk",
		description: "See .mart page 2 for details.",
		emoji: "🥛",
		category: "heal",
		page: 2,
		price: 500,
		index: 21,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/moomoo-milk.png"
	},
	{
		id: "energypowder",
		slug: "energy-powder",
		name: "Energy Powder",
		description: "See .mart page 2 for details.",
		emoji: "🌿",
		category: "heal",
		page: 2,
		price: 400,
		index: 22,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/energy-powder.png"
	},
	{
		id: "energyroot",
		slug: "energy-root",
		name: "Energy Root",
		description: "See .mart page 2 for details.",
		emoji: "🌱",
		category: "heal",
		page: 2,
		price: 800,
		index: 23,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/energy-root.png"
	},
	{
		id: "xattack",
		slug: "x-attack",
		name: "X Attack",
		description: "See .mart page 3 for details.",
		emoji: "⚔️",
		category: "battle",
		page: 3,
		price: 500,
		index: 24,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/x-attack.png"
	},
	{
		id: "xdefense",
		slug: "x-defense",
		name: "X Defense",
		description: "See .mart page 3 for details.",
		emoji: "🛡️",
		category: "battle",
		page: 3,
		price: 550,
		index: 25,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/x-defense.png"
	},
	{
		id: "xspeed",
		slug: "x-speed",
		name: "X Speed",
		description: "See .mart page 3 for details.",
		emoji: "💨",
		category: "battle",
		page: 3,
		price: 350,
		index: 26,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/x-speed.png"
	},
	{
		id: "xspatk",
		slug: "x-sp-atk",
		name: "X Sp Atk",
		description: "See .mart page 3 for details.",
		emoji: "🔮",
		category: "battle",
		page: 3,
		price: 500,
		index: 27,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/x-sp-atk.png"
	},
	{
		id: "xspdef",
		slug: "x-sp-def",
		name: "X Sp Def",
		description: "See .mart page 3 for details.",
		emoji: "🔵",
		category: "battle",
		page: 3,
		price: 550,
		index: 28,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/x-sp-def.png"
	},
	{
		id: "xaccuracy",
		slug: "x-accuracy",
		name: "X Accuracy",
		description: "See .mart page 3 for details.",
		emoji: "🎯",
		category: "battle",
		page: 3,
		price: 400,
		index: 29,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/x-accuracy.png"
	},
	{
		id: "guardspec",
		slug: "guard-spec",
		name: "Guard Spec",
		description: "See .mart page 3 for details.",
		emoji: "🔒",
		category: "battle",
		page: 3,
		price: 700,
		index: 30,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/guard-spec.png"
	},
	{
		id: "direhit",
		slug: "dire-hit",
		name: "Dire Hit",
		description: "See .mart page 3 for details.",
		emoji: "💥",
		category: "battle",
		page: 3,
		price: 650,
		index: 31,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dire-hit.png"
	},
	{
		id: "firestone",
		slug: "fire-stone",
		name: "Fire Stone",
		description: "See .mart page 4 for details.",
		emoji: "🔥",
		category: "stone",
		page: 4,
		price: 3e3,
		index: 32,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/fire-stone.png"
	},
	{
		id: "waterstone",
		slug: "water-stone",
		name: "Water Stone",
		description: "See .mart page 4 for details.",
		emoji: "💧",
		category: "stone",
		page: 4,
		price: 3e3,
		index: 33,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/water-stone.png"
	},
	{
		id: "thunderstone",
		slug: "thunder-stone",
		name: "Thunder Stone",
		description: "See .mart page 4 for details.",
		emoji: "⚡",
		category: "stone",
		page: 4,
		price: 3e3,
		index: 34,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/thunder-stone.png"
	},
	{
		id: "leafstone",
		slug: "leaf-stone",
		name: "Leaf Stone",
		description: "See .mart page 4 for details.",
		emoji: "🍃",
		category: "stone",
		page: 4,
		price: 3e3,
		index: 35,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/leaf-stone.png"
	},
	{
		id: "moonstone",
		slug: "moon-stone",
		name: "Moon Stone",
		description: "See .mart page 4 for details.",
		emoji: "🌙",
		category: "stone",
		page: 4,
		price: 3e3,
		index: 36,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/moon-stone.png"
	},
	{
		id: "sunstone",
		slug: "sun-stone",
		name: "Sun Stone",
		description: "See .mart page 4 for details.",
		emoji: "☀️",
		category: "stone",
		page: 4,
		price: 3e3,
		index: 37,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/sun-stone.png"
	},
	{
		id: "icestone",
		slug: "ice-stone",
		name: "Ice Stone",
		description: "See .mart page 4 for details.",
		emoji: "🧊",
		category: "stone",
		page: 4,
		price: 3e3,
		index: 38,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ice-stone.png"
	},
	{
		id: "shinystone",
		slug: "shiny-stone",
		name: "Shiny Stone",
		description: "See .mart page 4 for details.",
		emoji: "✨",
		category: "stone",
		page: 4,
		price: 4e3,
		index: 39,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/shiny-stone.png"
	},
	{
		id: "dawnstone",
		slug: "dawn-stone",
		name: "Dawn Stone",
		description: "See .mart page 4 for details.",
		emoji: "🌅",
		category: "stone",
		page: 4,
		price: 4e3,
		index: 40,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dawn-stone.png"
	},
	{
		id: "duskstone",
		slug: "dusk-stone",
		name: "Dusk Stone",
		description: "See .mart page 4 for details.",
		emoji: "🌆",
		category: "stone",
		page: 4,
		price: 4e3,
		index: 41,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dusk-stone.png"
	},
	{
		id: "antidote",
		slug: "antidote",
		name: "Antidote",
		description: "See .mart page 5 for details.",
		emoji: "🟢",
		category: "cure",
		page: 5,
		price: 100,
		index: 42,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/antidote.png"
	},
	{
		id: "paralyzeheal",
		slug: "paralyze-heal",
		name: "Paralyze Heal",
		description: "See .mart page 5 for details.",
		emoji: "⚡",
		category: "cure",
		page: 5,
		price: 200,
		index: 43,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/paralyze-heal.png"
	},
	{
		id: "awakening",
		slug: "awakening",
		name: "Awakening",
		description: "See .mart page 5 for details.",
		emoji: "☀️",
		category: "cure",
		page: 5,
		price: 250,
		index: 44,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/awakening.png"
	},
	{
		id: "burnheal",
		slug: "burn-heal",
		name: "Burn Heal",
		description: "See .mart page 5 for details.",
		emoji: "🔥",
		category: "cure",
		page: 5,
		price: 250,
		index: 45,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/burn-heal.png"
	},
	{
		id: "iceheal",
		slug: "ice-heal",
		name: "Ice Heal",
		description: "See .mart page 5 for details.",
		emoji: "🧊",
		category: "cure",
		page: 5,
		price: 250,
		index: 46,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ice-heal.png"
	},
	{
		id: "fullheal",
		slug: "full-heal",
		name: "Full Heal",
		description: "See .mart page 5 for details.",
		emoji: "💚",
		category: "cure",
		page: 5,
		price: 600,
		index: 47,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/full-heal.png"
	},
	{
		id: "berryjuice",
		slug: "berry-juice",
		name: "Berry Juice",
		description: "See .mart page 5 for details.",
		emoji: "🍒",
		category: "cure",
		page: 5,
		price: 100,
		index: 48,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/berry-juice.png"
	},
	{
		id: "ragecandybar",
		slug: "rage-candy-bar",
		name: "Rage Candy Bar",
		description: "See .mart page 5 for details.",
		emoji: "🍫",
		category: "cure",
		page: 5,
		price: 350,
		index: 49,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rage-candy-bar.png"
	},
	{
		id: "hpup",
		slug: "hp-up",
		name: "Hp Up",
		description: "See .mart page 6 for details.",
		emoji: "❤️",
		category: "vitamin",
		page: 6,
		price: 5e3,
		index: 50,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/hp-up.png"
	},
	{
		id: "protein",
		slug: "protein",
		name: "Protein",
		description: "See .mart page 6 for details.",
		emoji: "💪",
		category: "vitamin",
		page: 6,
		price: 5e3,
		index: 51,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/protein.png"
	},
	{
		id: "iron",
		slug: "iron",
		name: "Iron",
		description: "See .mart page 6 for details.",
		emoji: "🛡️",
		category: "vitamin",
		page: 6,
		price: 5e3,
		index: 52,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/iron.png"
	},
	{
		id: "calcium",
		slug: "calcium",
		name: "Calcium",
		description: "See .mart page 6 for details.",
		emoji: "🔮",
		category: "vitamin",
		page: 6,
		price: 5e3,
		index: 53,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/calcium.png"
	},
	{
		id: "zinc",
		slug: "zinc",
		name: "Zinc",
		description: "See .mart page 6 for details.",
		emoji: "🔵",
		category: "vitamin",
		page: 6,
		price: 5e3,
		index: 54,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/zinc.png"
	},
	{
		id: "carbos",
		slug: "carbos",
		name: "Carbos",
		description: "See .mart page 6 for details.",
		emoji: "💨",
		category: "vitamin",
		page: 6,
		price: 5e3,
		index: 55,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/carbos.png"
	},
	{
		id: "ppup",
		slug: "pp-up",
		name: "Pp Up",
		description: "See .mart page 6 for details.",
		emoji: "🔋",
		category: "vitamin",
		page: 6,
		price: 3e3,
		index: 56,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pp-up.png"
	},
	{
		id: "ppmax",
		slug: "pp-max",
		name: "Pp Max",
		description: "See .mart page 6 for details.",
		emoji: "⚡",
		category: "vitamin",
		page: 6,
		price: 9800,
		index: 57,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pp-max.png"
	},
	{
		id: "keystone",
		slug: "key-stone",
		name: "Key Stone",
		description: "See .mart page 7 for details.",
		emoji: "💎",
		category: "key",
		page: 7,
		price: 15e3,
		index: 58,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/key-stone.png"
	},
	{
		id: "luckyegg",
		slug: "lucky-egg",
		name: "Lucky Egg",
		description: "See .mart page 7 for details.",
		emoji: "🥚",
		category: "key",
		page: 7,
		price: 2500,
		index: 59,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lucky-egg.png"
	},
	{
		id: "amuletcoin",
		slug: "amulet-coin",
		name: "Amulet Coin",
		description: "See .mart page 7 for details.",
		emoji: "🪙",
		category: "key",
		page: 7,
		price: 3e3,
		index: 60,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/amulet-coin.png"
	},
	{
		id: "smokeball",
		slug: "smoke-ball",
		name: "Smoke Ball",
		description: "See .mart page 7 for details.",
		emoji: "💨",
		category: "key",
		page: 7,
		price: 1200,
		index: 61,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/smoke-ball.png"
	},
	{
		id: "escaperope",
		slug: "escape-rope",
		name: "Escape Rope",
		description: "See .mart page 7 for details.",
		emoji: "🪢",
		category: "key",
		page: 7,
		price: 550,
		index: 62,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/escape-rope.png"
	},
	{
		id: "rarecandy",
		slug: "rare-candy",
		name: "Rare Candy",
		description: "See .mart page 7 for details.",
		emoji: "🍬",
		category: "key",
		page: 7,
		price: 4800,
		index: 63,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png"
	},
	{
		id: "abomasite",
		slug: "abomasite",
		name: "Abomasite",
		description: "Mega Evolves Abomasnow → Mega Abomasnow. Requires an equipped Key Stone.",
		emoji: "❄️",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 64,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/abomasite.png"
	},
	{
		id: "absolite",
		slug: "absolite",
		name: "Absolite",
		description: "Mega Evolves Absol → Mega Absol. Requires an equipped Key Stone.",
		emoji: "🌑",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 65,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/absolite.png"
	},
	{
		id: "aerodactylite",
		slug: "aerodactylite",
		name: "Aerodactylite",
		description: "Mega Evolves Aerodactyl → Mega Aerodactyl. Requires an equipped Key Stone.",
		emoji: "🦖",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 66,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/aerodactylite.png"
	},
	{
		id: "aggronite",
		slug: "aggronite",
		name: "Aggronite",
		description: "Mega Evolves Aggron → Mega Aggron. Requires an equipped Key Stone.",
		emoji: "⚙️",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 67,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/aggronite.png"
	},
	{
		id: "alakazite",
		slug: "alakazite",
		name: "Alakazite",
		description: "Mega Evolves Alakazam → Mega Alakazam. Requires an equipped Key Stone.",
		emoji: "🥄",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 68,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/alakazite.png"
	},
	{
		id: "altarianite",
		slug: "altarianite",
		name: "Altarianite",
		description: "Mega Evolves Altaria → Mega Altaria. Requires an equipped Key Stone.",
		emoji: "☁️",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 69,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/altarianite.png"
	},
	{
		id: "ampharosite",
		slug: "ampharosite",
		name: "Ampharosite",
		description: "Mega Evolves Ampharos → Mega Ampharos. Requires an equipped Key Stone.",
		emoji: "⚡",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 70,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ampharosite.png"
	},
	{
		id: "audinite",
		slug: "audinite",
		name: "Audinite",
		description: "Mega Evolves Audino → Mega Audino. Requires an equipped Key Stone.",
		emoji: "💗",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 71,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/audinite.png"
	},
	{
		id: "banettite",
		slug: "banettite",
		name: "Banettite",
		description: "Mega Evolves Banette → Mega Banette. Requires an equipped Key Stone.",
		emoji: "👻",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 72,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/banettite.png"
	},
	{
		id: "beedrillite",
		slug: "beedrillite",
		name: "Beedrillite",
		description: "Mega Evolves Beedrill → Mega Beedrill. Requires an equipped Key Stone.",
		emoji: "🐝",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 73,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/beedrillite.png"
	},
	{
		id: "blastoisinite",
		slug: "blastoisinite",
		name: "Blastoisinite",
		description: "Mega Evolves Blastoise → Mega Blastoise. Requires an equipped Key Stone.",
		emoji: "💧",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 74,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/blastoisinite.png"
	},
	{
		id: "blazikenite",
		slug: "blazikenite",
		name: "Blazikenite",
		description: "Mega Evolves Blaziken → Mega Blaziken. Requires an equipped Key Stone.",
		emoji: "🔥",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 75,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/blazikenite.png"
	},
	{
		id: "cameruptite",
		slug: "cameruptite",
		name: "Cameruptite",
		description: "Mega Evolves Camerupt → Mega Camerupt. Requires an equipped Key Stone.",
		emoji: "🌋",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 76,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/cameruptite.png"
	},
	{
		id: "charizarditex",
		slug: "charizardite-x",
		name: "Charizardite X",
		description: "Mega Evolves Charizard → Mega Charizard X. Requires an equipped Key Stone.",
		emoji: "🐉",
		category: "mega",
		page: 8,
		price: 35e3,
		index: 77,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/charizardite-x.png"
	},
	{
		id: "charizarditey",
		slug: "charizardite-y",
		name: "Charizardite Y",
		description: "Mega Evolves Charizard → Mega Charizard Y. Requires an equipped Key Stone.",
		emoji: "☀️",
		category: "mega",
		page: 8,
		price: 35e3,
		index: 78,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/charizardite-y.png"
	},
	{
		id: "diancite",
		slug: "diancite",
		name: "Diancite",
		description: "Mega Evolves Diancie → Mega Diancie. Requires an equipped Key Stone.",
		emoji: "💎",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 79,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/diancite.png"
	},
	{
		id: "galladite",
		slug: "galladite",
		name: "Galladite",
		description: "Mega Evolves Gallade → Mega Gallade. Requires an equipped Key Stone.",
		emoji: "🗡️",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 80,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/galladite.png"
	},
	{
		id: "garchompite",
		slug: "garchompite",
		name: "Garchompite",
		description: "Mega Evolves Garchomp → Mega Garchomp. Requires an equipped Key Stone.",
		emoji: "🦈",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 81,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/garchompite.png"
	},
	{
		id: "gardevoirite",
		slug: "gardevoirite",
		name: "Gardevoirite",
		description: "Mega Evolves Gardevoir → Mega Gardevoir. Requires an equipped Key Stone.",
		emoji: "🌸",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 82,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/gardevoirite.png"
	},
	{
		id: "gengarite",
		slug: "gengarite",
		name: "Gengarite",
		description: "Mega Evolves Gengar → Mega Gengar. Requires an equipped Key Stone.",
		emoji: "👻",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 83,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/gengarite.png"
	},
	{
		id: "glalitite",
		slug: "glalitite",
		name: "Glalitite",
		description: "Mega Evolves Glalie → Mega Glalie. Requires an equipped Key Stone.",
		emoji: "🧊",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 84,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/glalitite.png"
	},
	{
		id: "gyaradosite",
		slug: "gyaradosite",
		name: "Gyaradosite",
		description: "Mega Evolves Gyarados → Mega Gyarados. Requires an equipped Key Stone.",
		emoji: "🌊",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 85,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/gyaradosite.png"
	},
	{
		id: "heracronite",
		slug: "heracronite",
		name: "Heracronite",
		description: "Mega Evolves Heracross → Mega Heracross. Requires an equipped Key Stone.",
		emoji: "🪲",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 86,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/heracronite.png"
	},
	{
		id: "houndoominite",
		slug: "houndoominite",
		name: "Houndoominite",
		description: "Mega Evolves Houndoom → Mega Houndoom. Requires an equipped Key Stone.",
		emoji: "🐺",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 87,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/houndoominite.png"
	},
	{
		id: "kangaskhanite",
		slug: "kangaskhanite",
		name: "Kangaskhanite",
		description: "Mega Evolves Kangaskhan → Mega Kangaskhan. Requires an equipped Key Stone.",
		emoji: "🦘",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 88,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/kangaskhanite.png"
	},
	{
		id: "latiasite",
		slug: "latiasite",
		name: "Latiasite",
		description: "Mega Evolves Latias → Mega Latias. Requires an equipped Key Stone.",
		emoji: "🪽",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 89,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/latiasite.png"
	},
	{
		id: "latiosite",
		slug: "latiosite",
		name: "Latiosite",
		description: "Mega Evolves Latios → Mega Latios. Requires an equipped Key Stone.",
		emoji: "🪽",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 90,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/latiosite.png"
	},
	{
		id: "lopunnite",
		slug: "lopunnite",
		name: "Lopunnite",
		description: "Mega Evolves Lopunny → Mega Lopunny. Requires an equipped Key Stone.",
		emoji: "🐰",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 91,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lopunnite.png"
	},
	{
		id: "lucarionite",
		slug: "lucarionite",
		name: "Lucarionite",
		description: "Mega Evolves Lucario → Mega Lucario. Requires an equipped Key Stone.",
		emoji: "🥊",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 92,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lucarionite.png"
	},
	{
		id: "manectite",
		slug: "manectite",
		name: "Manectite",
		description: "Mega Evolves Manectric → Mega Manectric. Requires an equipped Key Stone.",
		emoji: "⚡",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 93,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/manectite.png"
	},
	{
		id: "mawilite",
		slug: "mawilite",
		name: "Mawilite",
		description: "Mega Evolves Mawile → Mega Mawile. Requires an equipped Key Stone.",
		emoji: "🦷",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 94,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/mawilite.png"
	},
	{
		id: "medichamite",
		slug: "medichamite",
		name: "Medichamite",
		description: "Mega Evolves Medicham → Mega Medicham. Requires an equipped Key Stone.",
		emoji: "🧘",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 95,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/medichamite.png"
	},
	{
		id: "metagrossite",
		slug: "metagrossite",
		name: "Metagrossite",
		description: "Mega Evolves Metagross → Mega Metagross. Requires an equipped Key Stone.",
		emoji: "🤖",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 96,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/metagrossite.png"
	},
	{
		id: "mewtwonitex",
		slug: "mewtwonite-x",
		name: "Mewtwonite X",
		description: "Mega Evolves Mewtwo → Mega Mewtwo X. Requires an equipped Key Stone.",
		emoji: "🧬",
		category: "mega",
		page: 8,
		price: 35e3,
		index: 97,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/mewtwonite-x.png"
	},
	{
		id: "mewtwonitey",
		slug: "mewtwonite-y",
		name: "Mewtwonite Y",
		description: "Mega Evolves Mewtwo → Mega Mewtwo Y. Requires an equipped Key Stone.",
		emoji: "🧬",
		category: "mega",
		page: 8,
		price: 35e3,
		index: 98,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/mewtwonite-y.png"
	},
	{
		id: "pidgeotite",
		slug: "pidgeotite",
		name: "Pidgeotite",
		description: "Mega Evolves Pidgeot → Mega Pidgeot. Requires an equipped Key Stone.",
		emoji: "🦅",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 99,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pidgeotite.png"
	},
	{
		id: "pinsirite",
		slug: "pinsirite",
		name: "Pinsirite",
		description: "Mega Evolves Pinsir → Mega Pinsir. Requires an equipped Key Stone.",
		emoji: "🪲",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 100,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pinsirite.png"
	},
	{
		id: "sablenite",
		slug: "sablenite",
		name: "Sablenite",
		description: "Mega Evolves Sableye → Mega Sableye. Requires an equipped Key Stone.",
		emoji: "💎",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 101,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/sablenite.png"
	},
	{
		id: "salamencite",
		slug: "salamencite",
		name: "Salamencite",
		description: "Mega Evolves Salamence → Mega Salamence. Requires an equipped Key Stone.",
		emoji: "🐲",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 102,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/salamencite.png"
	},
	{
		id: "sceptilite",
		slug: "sceptilite",
		name: "Sceptilite",
		description: "Mega Evolves Sceptile → Mega Sceptile. Requires an equipped Key Stone.",
		emoji: "🌿",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 103,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/sceptilite.png"
	},
	{
		id: "scizorite",
		slug: "scizorite",
		name: "Scizorite",
		description: "Mega Evolves Scizor → Mega Scizor. Requires an equipped Key Stone.",
		emoji: "✂️",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 104,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/scizorite.png"
	},
	{
		id: "sharpedonite",
		slug: "sharpedonite",
		name: "Sharpedonite",
		description: "Mega Evolves Sharpedo → Mega Sharpedo. Requires an equipped Key Stone.",
		emoji: "🦈",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 105,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/sharpedonite.png"
	},
	{
		id: "slowbronite",
		slug: "slowbronite",
		name: "Slowbronite",
		description: "Mega Evolves Slowbro → Mega Slowbro. Requires an equipped Key Stone.",
		emoji: "🐚",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 106,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/slowbronite.png"
	},
	{
		id: "steelixite",
		slug: "steelixite",
		name: "Steelixite",
		description: "Mega Evolves Steelix → Mega Steelix. Requires an equipped Key Stone.",
		emoji: "🐍",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 107,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/steelixite.png"
	},
	{
		id: "swampertite",
		slug: "swampertite",
		name: "Swampertite",
		description: "Mega Evolves Swampert → Mega Swampert. Requires an equipped Key Stone.",
		emoji: "💧",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 108,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/swampertite.png"
	},
	{
		id: "tyranitarite",
		slug: "tyranitarite",
		name: "Tyranitarite",
		description: "Mega Evolves Tyranitar → Mega Tyranitar. Requires an equipped Key Stone.",
		emoji: "🦖",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 109,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tyranitarite.png"
	},
	{
		id: "venusaurite",
		slug: "venusaurite",
		name: "Venusaurite",
		description: "Mega Evolves Venusaur → Mega Venusaur. Requires an equipped Key Stone.",
		emoji: "🌺",
		category: "mega",
		page: 8,
		price: 25e3,
		index: 110,
		imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/venusaurite.png"
	}
];
var animated = (id, side = "front") => side === "back" ? `https://raw.githubusercontent.com/kelin132/animated-pokemon-gifs/master/back/${id}.gif` : `https://raw.githubusercontent.com/kelin132/animated-pokemon-gifs/master/${id}.gif`;
var move = (name, type, power) => ({
	name,
	type,
	power,
	accuracy: 100,
	pp: 20
});
var GYM_DEFINITIONS = [
	{
		id: "tide",
		name: "Tide Gym",
		type: "Water",
		leader: "Mira",
		badge: "Tide Badge",
		description: "A rain-soaked arena where timing beats raw power.",
		theme: "tide",
		accent: "#50d7ff",
		background: "/battle-gym/stadium.webp",
		music: "/battle-music/tide.mp3",
		rewardCoins: 25e3,
		rewardXp: 1200,
		team: [
			{
				name: "Swampert",
				pokedexId: 260,
				level: 28,
				types: ["water", "ground"],
				maxHp: 180,
				attack: 92,
				defense: 88,
				speed: 65,
				moves: [move("Water Pulse", "water", 60), move("Mud Shot", "ground", 55)]
			},
			{
				name: "Gyarados",
				pokedexId: 130,
				level: 30,
				types: ["water", "flying"],
				maxHp: 195,
				attack: 105,
				defense: 82,
				speed: 81,
				moves: [move("Aqua Tail", "water", 90), move("Bite", "dark", 60)]
			},
			{
				name: "Lapras",
				pokedexId: 131,
				level: 31,
				types: ["water", "ice"],
				maxHp: 210,
				attack: 96,
				defense: 90,
				speed: 60,
				moves: [move("Ice Beam", "ice", 90), move("Water Pulse", "water", 60)]
			},
			{
				name: "Kingdra",
				pokedexId: 230,
				level: 32,
				types: ["water", "dragon"],
				maxHp: 205,
				attack: 110,
				defense: 98,
				speed: 85,
				moves: [move("Dragon Pulse", "dragon", 85), move("Brine", "water", 65)]
			},
			{
				name: "Milotic",
				pokedexId: 350,
				level: 33,
				types: ["water"],
				maxHp: 225,
				attack: 102,
				defense: 105,
				speed: 86,
				moves: [move("Surf", "water", 90), move("Ice Beam", "ice", 90)]
			},
			{
				name: "Greninja",
				pokedexId: 658,
				level: 35,
				types: ["water", "dark"],
				maxHp: 215,
				attack: 120,
				defense: 86,
				speed: 122,
				moves: [move("Water Shuriken", "water", 75), move("Night Slash", "dark", 70)]
			}
		]
	},
	{
		id: "ember",
		name: "Ember Gym",
		type: "Fire",
		leader: "Kaida",
		badge: "Ember Badge",
		description: "A volcanic ring where every turn burns brighter.",
		theme: "ember",
		accent: "#ff886c",
		background: "/battle-gym/stadium.webp",
		music: "/battle-music/ember.mp3",
		rewardCoins: 35e3,
		rewardXp: 1800,
		unlockAfter: "tide",
		team: [
			{
				name: "Arcanine",
				pokedexId: 59,
				level: 34,
				types: ["fire"],
				maxHp: 205,
				attack: 112,
				defense: 85,
				speed: 95,
				moves: [move("Flame Wheel", "fire", 75), move("Bite", "dark", 60)]
			},
			{
				name: "Charizard",
				pokedexId: 6,
				level: 36,
				types: ["fire", "flying"],
				maxHp: 220,
				attack: 118,
				defense: 90,
				speed: 105,
				moves: [move("Flamethrower", "fire", 90), move("Dragon Claw", "dragon", 80)]
			},
			{
				name: "Ninetales",
				pokedexId: 38,
				level: 35,
				types: ["fire"],
				maxHp: 190,
				attack: 104,
				defense: 86,
				speed: 100,
				moves: [move("Fire Blast", "fire", 100), move("Confuse Ray", "ghost", 0)]
			},
			{
				name: "Volcarona",
				pokedexId: 637,
				level: 37,
				types: ["bug", "fire"],
				maxHp: 215,
				attack: 122,
				defense: 84,
				speed: 100,
				moves: [move("Bug Buzz", "bug", 90), move("Flamethrower", "fire", 90)]
			},
			{
				name: "Talonflame",
				pokedexId: 663,
				level: 38,
				types: ["fire", "flying"],
				maxHp: 200,
				attack: 126,
				defense: 78,
				speed: 126,
				moves: [move("Brave Bird", "flying", 100), move("Flame Charge", "fire", 50)]
			},
			{
				name: "Blaziken",
				pokedexId: 257,
				level: 40,
				types: ["fire", "fighting"],
				maxHp: 230,
				attack: 135,
				defense: 92,
				speed: 95,
				moves: [move("Blaze Kick", "fire", 85), move("Brick Break", "fighting", 75)]
			}
		]
	},
	{
		id: "voltage",
		name: "Voltage Gym",
		type: "Electric",
		leader: "Volt",
		badge: "Voltage Badge",
		description: "Neon rails, charged platforms, and lightning-fast turns.",
		theme: "voltage",
		accent: "#ffe66d",
		background: "/battle-gym/stadium.webp",
		music: "/battle-music/voltage.mp3",
		rewardCoins: 5e4,
		rewardXp: 2400,
		unlockAfter: "ember",
		team: [
			{
				name: "Luxray",
				pokedexId: 405,
				level: 40,
				types: ["electric"],
				maxHp: 230,
				attack: 125,
				defense: 95,
				speed: 88,
				moves: [move("Spark", "electric", 65), move("Crunch", "dark", 80)]
			},
			{
				name: "Zeraora",
				pokedexId: 807,
				level: 42,
				types: ["electric"],
				maxHp: 245,
				attack: 135,
				defense: 92,
				speed: 125,
				moves: [move("Thunder Punch", "electric", 75), move("Slash", "normal", 70)]
			},
			{
				name: "Ampharos",
				pokedexId: 181,
				level: 41,
				types: ["electric"],
				maxHp: 240,
				attack: 118,
				defense: 100,
				speed: 72,
				moves: [move("Thunderbolt", "electric", 90), move("Dragon Pulse", "dragon", 85)]
			},
			{
				name: "Magnezone",
				pokedexId: 462,
				level: 42,
				types: ["electric", "steel"],
				maxHp: 250,
				attack: 125,
				defense: 128,
				speed: 60,
				moves: [move("Flash Cannon", "steel", 80), move("Thunderbolt", "electric", 90)]
			},
			{
				name: "Rotom",
				pokedexId: 479,
				level: 43,
				types: ["electric", "ghost"],
				maxHp: 220,
				attack: 118,
				defense: 100,
				speed: 110,
				moves: [move("Shock Wave", "electric", 60), move("Shadow Ball", "ghost", 80)]
			},
			{
				name: "Electivire",
				pokedexId: 466,
				level: 44,
				types: ["electric"],
				maxHp: 255,
				attack: 140,
				defense: 94,
				speed: 100,
				moves: [move("Thunder Punch", "electric", 75), move("Brick Break", "fighting", 75)]
			}
		]
	},
	{
		id: "shadow",
		name: "Shadow Gym",
		type: "Ghost",
		leader: "Noctis",
		badge: "Shadow Badge",
		description: "A moonlit ruin filled with illusions and spectral wind.",
		theme: "shadow",
		accent: "#c59bff",
		background: "/battle-gym/stadium.webp",
		music: "/battle-music/shadow.mp3",
		rewardCoins: 75e3,
		rewardXp: 3200,
		unlockAfter: "voltage",
		team: [
			{
				name: "Gengar",
				pokedexId: 94,
				level: 46,
				types: ["ghost", "poison"],
				maxHp: 235,
				attack: 120,
				defense: 85,
				speed: 118,
				moves: [move("Shadow Ball", "ghost", 80), move("Sludge Bomb", "poison", 90)]
			},
			{
				name: "Dragapult",
				pokedexId: 887,
				level: 48,
				types: ["dragon", "ghost"],
				maxHp: 250,
				attack: 140,
				defense: 92,
				speed: 142,
				moves: [move("Dragon Darts", "dragon", 90), move("Phantom Force", "ghost", 100)]
			},
			{
				name: "Mimikyu",
				pokedexId: 778,
				level: 47,
				types: ["ghost", "fairy"],
				maxHp: 220,
				attack: 126,
				defense: 98,
				speed: 105,
				moves: [move("Shadow Claw", "ghost", 70), move("Play Rough", "fairy", 90)]
			},
			{
				name: "Chandelure",
				pokedexId: 609,
				level: 48,
				types: ["ghost", "fire"],
				maxHp: 235,
				attack: 135,
				defense: 92,
				speed: 100,
				moves: [move("Shadow Ball", "ghost", 80), move("Flamethrower", "fire", 90)]
			},
			{
				name: "Aegislash",
				pokedexId: 681,
				level: 49,
				types: ["steel", "ghost"],
				maxHp: 255,
				attack: 145,
				defense: 135,
				speed: 60,
				moves: [move("Iron Head", "steel", 80), move("Shadow Sneak", "ghost", 40)]
			},
			{
				name: "Giratina",
				pokedexId: 487,
				level: 52,
				types: ["ghost", "dragon"],
				maxHp: 290,
				attack: 152,
				defense: 140,
				speed: 90,
				moves: [move("Shadow Force", "ghost", 100), move("Dragon Claw", "dragon", 80)]
			}
		]
	},
	{
		id: "frost",
		name: "Frost Gym",
		type: "Ice",
		leader: "Haku",
		badge: "Frost Badge",
		description: "A crystalline stadium where every mistake becomes a blizzard.",
		theme: "frost",
		accent: "#b8f1ff",
		background: "/battle-gym/stadium.webp",
		music: "/battle-music/frost.mp3",
		rewardCoins: 11e4,
		rewardXp: 4800,
		unlockAfter: "shadow",
		team: [
			{
				name: "Mamoswine",
				pokedexId: 473,
				level: 56,
				types: ["ice", "ground"],
				maxHp: 310,
				attack: 168,
				defense: 125,
				speed: 80,
				moves: [move("Icicle Crash", "ice", 95), move("Earthquake", "ground", 100)]
			},
			{
				name: "Froslass",
				pokedexId: 478,
				level: 57,
				types: ["ice", "ghost"],
				maxHp: 245,
				attack: 150,
				defense: 105,
				speed: 125,
				moves: [move("Ice Beam", "ice", 90), move("Shadow Ball", "ghost", 80)]
			},
			{
				name: "Weavile",
				pokedexId: 461,
				level: 58,
				types: ["dark", "ice"],
				maxHp: 255,
				attack: 178,
				defense: 102,
				speed: 140,
				moves: [move("Ice Punch", "ice", 75), move("Night Slash", "dark", 70)]
			},
			{
				name: "Baxcalibur",
				pokedexId: 998,
				level: 60,
				types: ["dragon", "ice"],
				maxHp: 330,
				attack: 185,
				defense: 140,
				speed: 98,
				moves: [move("Icicle Spear", "ice", 85), move("Dragon Claw", "dragon", 80)]
			},
			{
				name: "Alolan Ninetales",
				pokedexId: 38,
				level: 59,
				types: ["ice", "fairy"],
				maxHp: 270,
				attack: 158,
				defense: 118,
				speed: 120,
				moves: [move("Dazzling Gleam", "fairy", 80), move("Blizzard", "ice", 110)]
			},
			{
				name: "Kyurem",
				pokedexId: 646,
				level: 62,
				types: ["dragon", "ice"],
				maxHp: 360,
				attack: 205,
				defense: 158,
				speed: 105,
				moves: [move("Glaciate", "ice", 95), move("Dragon Pulse", "dragon", 85)]
			}
		]
	},
	{
		id: "dragon",
		name: "Dragon Gym",
		type: "Dragon",
		leader: "Dray",
		badge: "Dragon Badge",
		description: "The final gate before the championship, built for elite trainers only.",
		theme: "dragon",
		accent: "#cf9bff",
		background: "/battle-gym/stadium.webp",
		music: "/battle-music/dragon.mp3",
		rewardCoins: 175e3,
		rewardXp: 7200,
		unlockAfter: "frost",
		team: [
			{
				name: "Dragonite",
				pokedexId: 149,
				level: 64,
				types: ["dragon", "flying"],
				maxHp: 370,
				attack: 205,
				defense: 155,
				speed: 100,
				moves: [move("Dragon Claw", "dragon", 80), move("Hurricane", "flying", 95)]
			},
			{
				name: "Salamence",
				pokedexId: 373,
				level: 65,
				types: ["dragon", "flying"],
				maxHp: 360,
				attack: 215,
				defense: 145,
				speed: 125,
				moves: [move("Dragon Rush", "dragon", 100), move("Fly", "flying", 90)]
			},
			{
				name: "Goodra",
				pokedexId: 706,
				level: 65,
				types: ["dragon"],
				maxHp: 390,
				attack: 190,
				defense: 165,
				speed: 92,
				moves: [move("Muddy Water", "water", 90), move("Dragon Pulse", "dragon", 85)]
			},
			{
				name: "Dragapult",
				pokedexId: 887,
				level: 67,
				types: ["dragon", "ghost"],
				maxHp: 350,
				attack: 225,
				defense: 140,
				speed: 160,
				moves: [move("Dragon Darts", "dragon", 90), move("Phantom Force", "ghost", 100)]
			},
			{
				name: "Garchomp",
				pokedexId: 445,
				level: 68,
				types: ["dragon", "ground"],
				maxHp: 380,
				attack: 230,
				defense: 165,
				speed: 125,
				moves: [move("Earthquake", "ground", 100), move("Dragon Claw", "dragon", 80)]
			},
			{
				name: "Rayquaza",
				pokedexId: 384,
				level: 72,
				types: ["dragon", "flying"],
				maxHp: 450,
				attack: 260,
				defense: 190,
				speed: 145,
				moves: [move("Dragon Ascent", "flying", 120), move("Outrage", "dragon", 120)]
			}
		]
	},
	{
		id: "psychic",
		name: "Psychic Gym",
		type: "Psychic",
		leader: "Selene",
		badge: "Mind Badge",
		description: "A gravity-bending arena where prediction matters more than speed.",
		theme: "psychic",
		accent: "#f08ad8",
		background: "/battle-gym/stadium.webp",
		music: "/battle-music/psychic.mp3",
		rewardCoins: 24e4,
		rewardXp: 9800,
		unlockAfter: "dragon",
		team: [
			{
				name: "Metagross",
				pokedexId: 376,
				level: 76,
				types: ["steel", "psychic"],
				maxHp: 470,
				attack: 270,
				defense: 250,
				speed: 95,
				moves: [move("Meteor Mash", "steel", 100), move("Zen Headbutt", "psychic", 80)]
			},
			{
				name: "Alakazam",
				pokedexId: 65,
				level: 77,
				types: ["psychic"],
				maxHp: 330,
				attack: 285,
				defense: 115,
				speed: 180,
				moves: [move("Psychic", "psychic", 90), move("Focus Blast", "fighting", 120)]
			},
			{
				name: "Gardevoir",
				pokedexId: 282,
				level: 78,
				types: ["psychic", "fairy"],
				maxHp: 390,
				attack: 260,
				defense: 155,
				speed: 125,
				moves: [move("Moonblast", "fairy", 95), move("Psychic", "psychic", 90)]
			},
			{
				name: "Malamar",
				pokedexId: 687,
				level: 78,
				types: ["dark", "psychic"],
				maxHp: 410,
				attack: 245,
				defense: 180,
				speed: 100,
				moves: [move("Psycho Cut", "psychic", 70), move("Night Slash", "dark", 70)]
			},
			{
				name: "Slowbro",
				pokedexId: 80,
				level: 79,
				types: ["water", "psychic"],
				maxHp: 520,
				attack: 220,
				defense: 270,
				speed: 45,
				moves: [move("Psychic", "psychic", 90), move("Scald", "water", 80)]
			},
			{
				name: "Mewtwo",
				pokedexId: 150,
				level: 82,
				types: ["psychic"],
				maxHp: 560,
				attack: 325,
				defense: 210,
				speed: 190,
				moves: [move("Psystrike", "psychic", 110), move("Aura Sphere", "fighting", 90)]
			}
		]
	},
	{
		id: "steel",
		name: "Steel Gym",
		type: "Steel",
		leader: "Forge",
		badge: "Alloy Badge",
		description: "An ironclad trial built to break unprepared teams.",
		theme: "steel",
		accent: "#a9c4d8",
		background: "/battle-gym/stadium.webp",
		music: "/battle-music/steel.mp3",
		rewardCoins: 32e4,
		rewardXp: 12500,
		unlockAfter: "psychic",
		team: [
			{
				name: "Skarmory",
				pokedexId: 227,
				level: 83,
				types: ["steel", "flying"],
				maxHp: 430,
				attack: 235,
				defense: 300,
				speed: 110,
				moves: [move("Iron Head", "steel", 80), move("Brave Bird", "flying", 100)]
			},
			{
				name: "Excadrill",
				pokedexId: 530,
				level: 84,
				types: ["ground", "steel"],
				maxHp: 455,
				attack: 305,
				defense: 185,
				speed: 145,
				moves: [move("Iron Head", "steel", 80), move("Earthquake", "ground", 100)]
			},
			{
				name: "Scizor",
				pokedexId: 212,
				level: 85,
				types: ["bug", "steel"],
				maxHp: 440,
				attack: 300,
				defense: 230,
				speed: 115,
				moves: [move("Bullet Punch", "steel", 70), move("X-Scissor", "bug", 80)]
			},
			{
				name: "Aegislash",
				pokedexId: 681,
				level: 86,
				types: ["steel", "ghost"],
				maxHp: 470,
				attack: 310,
				defense: 290,
				speed: 80,
				moves: [move("Iron Head", "steel", 80), move("Shadow Sneak", "ghost", 60)]
			},
			{
				name: "Corviknight",
				pokedexId: 823,
				level: 87,
				types: ["flying", "steel"],
				maxHp: 500,
				attack: 260,
				defense: 285,
				speed: 90,
				moves: [move("Iron Head", "steel", 80), move("Drill Peck", "flying", 80)]
			},
			{
				name: "Melmetal",
				pokedexId: 809,
				level: 90,
				types: ["steel"],
				maxHp: 650,
				attack: 360,
				defense: 320,
				speed: 55,
				moves: [move("Double Iron Bash", "steel", 100), move("Rock Slide", "rock", 75)]
			}
		]
	},
	{
		id: "apex",
		name: "Apex Gym",
		type: "Champion",
		leader: "Orion",
		badge: "Apex Badge",
		description: "The final gym trial: a mixed team designed for championship contenders.",
		theme: "apex",
		accent: "#ffd36a",
		background: "/battle-gym/stadium.webp",
		music: "/battle-music/apex.mp3",
		rewardCoins: 5e5,
		rewardXp: 2e4,
		unlockAfter: "steel",
		team: [
			{
				name: "Tyranitar",
				pokedexId: 248,
				level: 92,
				types: ["rock", "dark"],
				maxHp: 610,
				attack: 350,
				defense: 300,
				speed: 95,
				moves: [move("Stone Edge", "rock", 100), move("Crunch", "dark", 80)]
			},
			{
				name: "Volcarona",
				pokedexId: 637,
				level: 93,
				types: ["bug", "fire"],
				maxHp: 500,
				attack: 320,
				defense: 210,
				speed: 150,
				moves: [move("Fiery Dance", "fire", 80), move("Bug Buzz", "bug", 90)]
			},
			{
				name: "Garchomp",
				pokedexId: 445,
				level: 94,
				types: ["dragon", "ground"],
				maxHp: 590,
				attack: 355,
				defense: 270,
				speed: 165,
				moves: [move("Earthquake", "ground", 100), move("Dragon Claw", "dragon", 80)]
			},
			{
				name: "Zacian",
				pokedexId: 888,
				level: 95,
				types: ["fairy", "steel"],
				maxHp: 570,
				attack: 380,
				defense: 250,
				speed: 190,
				moves: [move("Behemoth Blade", "steel", 100), move("Play Rough", "fairy", 90)]
			},
			{
				name: "Miraidon",
				pokedexId: 1008,
				level: 96,
				types: ["electric", "dragon"],
				maxHp: 600,
				attack: 370,
				defense: 260,
				speed: 180,
				moves: [move("Electro Drift", "electric", 100), move("Dragon Pulse", "dragon", 85)]
			},
			{
				name: "Arceus",
				pokedexId: 493,
				level: 100,
				types: ["normal"],
				maxHp: 720,
				attack: 420,
				defense: 360,
				speed: 200,
				moves: [move("Judgment", "normal", 120), move("Recover", "normal", 0)]
			}
		]
	},
	{
		id: "terra",
		name: "Terra Gym",
		type: "Ground",
		leader: "Gaia",
		badge: "Terra Badge",
		description: "A shifting canyon arena where sturdy teams outlast every storm.",
		theme: "terra",
		accent: "#d7a66a",
		background: "/battle-gym/grassy.webp",
		music: "/battle-music/mus_vs_gym_leader.mp3",
		rewardCoins: 6e5,
		rewardXp: 24e3,
		unlockAfter: "apex",
		team: [
			{
				name: "Hippowdon",
				pokedexId: 450,
				level: 96,
				types: ["ground"],
				maxHp: 620,
				attack: 360,
				defense: 150,
				speed: 70,
				moves: [move("Earthquake", "ground", 100), move("Stone Edge", "rock", 100)]
			},
			{
				name: "Gliscor",
				pokedexId: 472,
				level: 97,
				types: ["ground", "flying"],
				maxHp: 500,
				attack: 330,
				defense: 210,
				speed: 125,
				moves: [move("Earthquake", "ground", 100), move("Stone Edge", "rock", 100)]
			},
			{
				name: "Mamoswine",
				pokedexId: 473,
				level: 98,
				types: ["ice", "ground"],
				maxHp: 650,
				attack: 340,
				defense: 240,
				speed: 95,
				moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)]
			},
			{
				name: "Excadrill",
				pokedexId: 530,
				level: 99,
				types: ["ground", "steel"],
				maxHp: 610,
				attack: 370,
				defense: 220,
				speed: 150,
				moves: [move("Earthquake", "ground", 100), move("Stone Edge", "rock", 100)]
			},
			{
				name: "Groudon",
				pokedexId: 383,
				level: 100,
				types: ["ground"],
				maxHp: 820,
				attack: 430,
				defense: 300,
				speed: 120,
				moves: [move("Earthquake", "ground", 100), move("Stone Edge", "rock", 100)]
			},
			{
				name: "Landorus",
				pokedexId: 645,
				level: 102,
				types: ["ground", "flying"],
				maxHp: 760,
				attack: 420,
				defense: 330,
				speed: 145,
				moves: [move("Earthquake", "ground", 100), move("Stone Edge", "rock", 100)]
			}
		]
	},
	{
		id: "toxic",
		name: "Toxic Gym",
		type: "Poison",
		leader: "Vesper",
		badge: "Venom Badge",
		description: "A neon laboratory where status effects and patience decide the match.",
		theme: "toxic",
		accent: "#b5f36c",
		background: "/battle-gym/grassy.webp",
		music: "/battle-music/mus_vs_gym_leader.mp3",
		rewardCoins: 72e4,
		rewardXp: 29e3,
		unlockAfter: "terra",
		team: [
			{
				name: "Crobat",
				pokedexId: 169,
				level: 104,
				types: ["poison", "flying"],
				maxHp: 540,
				attack: 260,
				defense: 180,
				speed: 180,
				moves: [move("Sludge Bomb", "poison", 90), move("Toxic", "poison", 0)]
			},
			{
				name: "Toxtricity",
				pokedexId: 849,
				level: 105,
				types: ["electric", "poison"],
				maxHp: 590,
				attack: 320,
				defense: 210,
				speed: 135,
				moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)]
			},
			{
				name: "Nidoqueen",
				pokedexId: 31,
				level: 106,
				types: ["poison", "ground"],
				maxHp: 640,
				attack: 350,
				defense: 250,
				speed: 105,
				moves: [move("Sludge Bomb", "poison", 90), move("Toxic", "poison", 0)]
			},
			{
				name: "Salazzle",
				pokedexId: 758,
				level: 107,
				types: ["poison", "fire"],
				maxHp: 520,
				attack: 300,
				defense: 180,
				speed: 160,
				moves: [move("Sludge Bomb", "poison", 90), move("Toxic", "poison", 0)]
			},
			{
				name: "Overqwil",
				pokedexId: 904,
				level: 108,
				types: ["dark", "poison"],
				maxHp: 610,
				attack: 330,
				defense: 260,
				speed: 125,
				moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)]
			},
			{
				name: "Eternatus",
				pokedexId: 890,
				level: 110,
				types: ["poison", "dragon"],
				maxHp: 900,
				attack: 460,
				defense: 390,
				speed: 160,
				moves: [move("Sludge Bomb", "poison", 90), move("Toxic", "poison", 0)]
			}
		]
	},
	{
		id: "fairy",
		name: "Fairy Gym",
		type: "Fairy",
		leader: "Lumi",
		badge: "Radiant Badge",
		description: "A starlit hall where clever charms punish reckless attacks.",
		theme: "fairy",
		accent: "#ff9edb",
		background: "/battle-gym/grassy.webp",
		music: "/battle-music/mus_vs_gym_leader.mp3",
		rewardCoins: 85e4,
		rewardXp: 34e3,
		unlockAfter: "toxic",
		team: [
			{
				name: "Mimikyu",
				pokedexId: 778,
				level: 112,
				types: ["ghost", "fairy"],
				maxHp: 520,
				attack: 300,
				defense: 250,
				speed: 120,
				moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)]
			},
			{
				name: "Togekiss",
				pokedexId: 468,
				level: 113,
				types: ["fairy", "flying"],
				maxHp: 620,
				attack: 320,
				defense: 280,
				speed: 115,
				moves: [move("Moonblast", "fairy", 95), move("Play Rough", "fairy", 90)]
			},
			{
				name: "Grimmsnarl",
				pokedexId: 861,
				level: 114,
				types: ["dark", "fairy"],
				maxHp: 680,
				attack: 380,
				defense: 300,
				speed: 95,
				moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)]
			},
			{
				name: "Azumarill",
				pokedexId: 184,
				level: 115,
				types: ["water", "fairy"],
				maxHp: 700,
				attack: 350,
				defense: 330,
				speed: 80,
				moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)]
			},
			{
				name: "Sylveon",
				pokedexId: 700,
				level: 116,
				types: ["fairy"],
				maxHp: 650,
				attack: 340,
				defense: 300,
				speed: 120,
				moves: [move("Moonblast", "fairy", 95), move("Play Rough", "fairy", 90)]
			},
			{
				name: "Xerneas",
				pokedexId: 716,
				level: 118,
				types: ["fairy"],
				maxHp: 900,
				attack: 460,
				defense: 380,
				speed: 150,
				moves: [move("Moonblast", "fairy", 95), move("Play Rough", "fairy", 90)]
			}
		]
	},
	{
		id: "storm",
		name: "Storm Gym",
		type: "Flying",
		leader: "Aeris",
		badge: "Tempest Badge",
		description: "A sky-platform championship test built for the fastest trainers.",
		theme: "storm",
		accent: "#8fd7ff",
		background: "/battle-gym/grassy.webp",
		music: "/battle-music/mus_vs_gym_leader.mp3",
		rewardCoins: 1e6,
		rewardXp: 4e4,
		unlockAfter: "fairy",
		team: [
			{
				name: "Staraptor",
				pokedexId: 398,
				level: 120,
				types: ["normal", "flying"],
				maxHp: 560,
				attack: 300,
				defense: 240,
				speed: 150,
				moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)]
			},
			{
				name: "Noivern",
				pokedexId: 715,
				level: 121,
				types: ["flying", "dragon"],
				maxHp: 580,
				attack: 320,
				defense: 220,
				speed: 175,
				moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)]
			},
			{
				name: "Corviknight",
				pokedexId: 823,
				level: 122,
				types: ["flying", "steel"],
				maxHp: 700,
				attack: 360,
				defense: 400,
				speed: 100,
				moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)]
			},
			{
				name: "Pelipper",
				pokedexId: 279,
				level: 123,
				types: ["water", "flying"],
				maxHp: 620,
				attack: 350,
				defense: 260,
				speed: 110,
				moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)]
			},
			{
				name: "Talonflame",
				pokedexId: 663,
				level: 124,
				types: ["fire", "flying"],
				maxHp: 650,
				attack: 330,
				defense: 250,
				speed: 185,
				moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)]
			},
			{
				name: "Lugia",
				pokedexId: 249,
				level: 126,
				types: ["psychic", "flying"],
				maxHp: 980,
				attack: 500,
				defense: 480,
				speed: 170,
				moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)]
			}
		]
	}
];
function gymById(id) {
	return GYM_DEFINITIONS.find((gym) => gym.id === id) ?? null;
}
function gymSpriteUrls(pokemon) {
	return {
		imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokedexId}.png`,
		frontSpriteUrl: animated(pokemon.pokedexId, "front"),
		backSpriteUrl: animated(pokemon.pokedexId, "back")
	};
}
function gymBadgeIds(badges) {
	return Array.isArray(badges) ? badges.map(String).map((badge) => badge.trim().toLowerCase().replace(/[-_ ]badge$/i, "")).filter(Boolean) : [];
}
var gymBadgeId = (gymId) => `${gymId}-badge`;
var SLOT_POOL = [
	...Array(6).fill("🍒"),
	...Array(5).fill("🍋"),
	...Array(5).fill("🍊"),
	...Array(4).fill("🍇"),
	...Array(3).fill("🔔"),
	...Array(2).fill("💎"),
	"7️⃣",
	...Array(2).fill("🃏")
];
var SLOT_PAYOUTS = {
	"7️⃣": 10,
	"💎": 7,
	"🔔": 5,
	"🍇": 4,
	"🍊": 3,
	"🍋": 2.5,
	"🍒": 2,
	"🃏": 1.5
};
function rarityForPrice(price) {
	if (price >= 1e4) return "legend";
	if (price >= 2500) return "epic";
	if (price >= 800) return "rare";
	return "common";
}
function userKey(user) {
	return String(user._id);
}
function identityVariants$1(value) {
	const raw = String(value ?? "").trim();
	if (!raw) return [];
	const withoutDevice = raw.replace(/:\d+(?=@)/, "");
	const parts = withoutDevice.split("@");
	const bare = parts[0] ?? withoutDevice;
	const domain = parts[1] || "s.whatsapp.net";
	const variants = [
		raw,
		withoutDevice,
		bare,
		`${bare}@${domain}`
	];
	if (domain === "s.whatsapp.net") variants.push(`${bare}:0@s.whatsapp.net`);
	return [...new Set(variants.filter(Boolean))];
}
function identityLookup(ids) {
	const variants = [...new Set(ids.flatMap(identityVariants$1))];
	if (variants.length === 0) return { _id: "__none__" };
	const objectIds = variants.filter((id) => typeof id === "string" && id.length === 24 && import_lib.ObjectId.isValid(id)).map((id) => new import_lib.ObjectId(id));
	return { $or: [
		{ _id: { $in: variants } },
		{ userId: { $in: variants } },
		{ whatsappNumber: { $in: variants } },
		{ jid: { $in: variants } },
		{ owner: { $in: variants } },
		{ websiteId: { $in: variants } },
		{ _id: { $in: objectIds } }
	] };
}
function randomChoice(items) {
	return items[Math.floor(Math.random() * items.length)];
}
function validWager(value, minimum, maximum) {
	const amount = Math.floor(Number(value));
	if (!Number.isFinite(amount) || amount < minimum || amount > maximum) throw new Error(`Wager must be between $${minimum.toLocaleString()} and $${maximum.toLocaleString()}.`);
	return amount;
}
async function publicCurrentUser() {
	return toPublicUser(await requireUser());
}
async function appendHistory(jid, type, amount, desc) {
	await (await getDb()).collection("users").updateOne({ _id: jid }, { $push: { history: {
		$each: [{
			type,
			amount,
			desc,
			ts: Date.now()
		}],
		$slice: -10
	} } });
}
async function claimCooldown(jid, field, cooldownMs) {
	const now = Date.now();
	if ((await (await users()).updateOne({
		_id: jid,
		$or: [{ [field]: { $exists: false } }, { [field]: { $lte: now - cooldownMs } }]
	}, { $set: { [field]: now } })).modifiedCount === 1) return {
		ok: true,
		remainingMs: 0
	};
	const current = await (await users()).findOne({ _id: jid });
	const last = Number(current?.[field] ?? now);
	return {
		ok: false,
		remainingMs: Math.max(0, cooldownMs - (now - last))
	};
}
async function refundWallet(jid, amount) {
	if (amount <= 0) return;
	await (await users()).updateOne({ _id: jid }, { $inc: { money: amount } });
}
async function listShopItems() {
	return BOT_MART_ITEMS.map((item) => ({
		id: item.id,
		name: item.name,
		slug: item.slug,
		category: item.category,
		price: item.price,
		rarity: rarityForPrice(item.price),
		description: item.description,
		sprite: item.slug,
		emoji: item.emoji,
		page: item.page,
		index: item.index,
		imageUrl: item.imageUrl
	}));
}
function recordString(record, fields) {
	const value = fields.map((field) => record[field]).find((candidate) => typeof candidate === "string" && candidate.trim().length > 0);
	return value ? value.trim() : null;
}
function recordAvatar(record) {
	return recordString(record, [
		"profilePictureUrl",
		"profileImage",
		"avatarUrl",
		"profilePic",
		"pfp",
		"imageUrl",
		"image"
	]);
}
async function guildMembersToPublic(doc, preloaded) {
	const memberIds = (Array.isArray(doc.members) ? doc.members : []).map(String);
	if (!memberIds.length) return [];
	let byAlias = preloaded;
	if (!byAlias) {
		const lookup = identityLookup(memberIds);
		const [websiteDocs, botDocs] = await Promise.all([(await users()).find(lookup).toArray(), (await cardUsers()).find(lookup).toArray()]);
		byAlias = /* @__PURE__ */ new Map();
		for (const source of [...websiteDocs, ...botDocs]) {
			const record = source;
			for (const field of [
				"_id",
				"userId",
				"whatsappNumber",
				"jid",
				"owner",
				"websiteId"
			]) for (const alias of identityVariants$1(record[field])) if (!byAlias.get(alias)) byAlias.set(alias, record);
		}
	}
	const ownerAliases = new Set(identityVariants$1(doc.owner));
	return memberIds.map((memberId) => {
		const record = identityVariants$1(memberId).map((alias) => byAlias.get(alias)).find(Boolean) ?? {};
		const memberLocal = memberId.split("@")[0] ?? memberId;
		return {
			id: memberId,
			name: recordString(record, [
				"name",
				"username",
				"pushName",
				"notifyName",
				"ownerName"
			]) ?? `Trainer ${(memberLocal.split(":")[0] ?? memberLocal).slice(-4)}`,
			avatarUrl: recordAvatar(record),
			avatarVideoUrl: recordString(record, [
				"profileVideoUrl",
				"videoUrl",
				"profileVideo"
			]) || null,
			isOwner: identityVariants$1(memberId).some((alias) => ownerAliases.has(alias))
		};
	});
}
async function guildToPublic(doc, userId, preloadedMembers) {
	const record = doc;
	const id = String(doc._id ?? "");
	const members = Array.isArray(doc.members) ? doc.members.map(String) : [];
	const level = Math.max(1, Number(doc.level) || 1);
	const requirements = guildUpgradeRequirementsForLevel(level);
	const userAliases = new Set(identityVariants$1(userId));
	new Set(identityVariants$1(doc.owner));
	return {
		id,
		name: doc.name ?? "Unnamed guild",
		tag: String(doc.tag ?? doc.name ?? "GUILD").slice(0, 5).toUpperCase(),
		description: doc.description ?? "",
		iconUrl: typeof doc.icon === "string" && doc.icon.trim() ? doc.icon : null,
		leaderId: doc.owner ?? record["leaderId"] ?? "",
		memberCount: members.length,
		memberCapacity: requirements.memberCapacity,
		level,
		guildXp: Number(record["guildXp"]) || 0,
		guildXpRequired: requirements.guildXp,
		bank: Number(doc.treasury) || 0,
		upgradeTreasuryRequired: requirements.treasury,
		upgradeMembersRequired: requirements.members,
		taxRate: Number(record["taxRate"]) || guildTaxRateForLevel(level),
		isMember: members.some((member) => identityVariants$1(member).some((alias) => userAliases.has(alias))),
		isOwner: identityVariants$1(doc.owner).some((alias) => userAliases.has(alias)),
		members: await guildMembersToPublic(doc, preloadedMembers)
	};
}
async function listGuilds() {
	const userId = await currentUserId();
	const docs = await (await guilds()).find({}).sort({
		level: -1,
		guildXp: -1,
		treasury: -1
	}).limit(100).toArray();
	if (!docs.length) {
		console.log("[guilds] No guilds found in collection.");
		return [];
	}
	const lookup = identityLookup([...new Set(docs.flatMap((g) => Array.isArray(g.members) ? g.members : []).map(String))]);
	let websiteDocs = [];
	let botDocs = [];
	try {
		[websiteDocs, botDocs] = await Promise.all([(await users()).find(lookup).toArray(), (await cardUsers()).find(lookup).toArray()]);
	} catch (err) {
		console.error("[guilds] Member lookup failed:", err);
	}
	const byAlias = /* @__PURE__ */ new Map();
	for (const source of [...websiteDocs, ...botDocs]) {
		const record = source;
		for (const field of [
			"_id",
			"userId",
			"whatsappNumber",
			"jid",
			"owner",
			"websiteId"
		]) if (record[field]) {
			for (const alias of identityVariants$1(record[field])) if (!byAlias.has(alias)) byAlias.set(alias, record);
		}
	}
	const filtered = (await Promise.all(docs.map(async (guild) => {
		try {
			return await guildToPublic(guild, userId || "", byAlias);
		} catch (err) {
			console.error(`[guilds] Failed to process guild ${guild._id}:`, err);
			return null;
		}
	}))).filter((g) => g !== null);
	console.log(`[guilds] Returning ${filtered.length} guilds.`);
	return filtered;
}
function trainerTotalXp(level, currentXp) {
	const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
	const safeXp = Math.max(0, Math.floor(Number(currentXp) || 0));
	return (safeLevel - 1) * safeLevel * 100 / 2 + safeXp;
}
function rowFromUser(doc, metric, score, counts) {
	const title = String(doc["job"] ?? (doc["isPremium"] ? "Premium Player" : "Player"));
	const avatar = [
		"profilePictureUrl",
		"profileImage",
		"avatarUrl",
		"profilePic",
		"pfp",
		"imageUrl",
		"image"
	].find((key) => typeof doc[key] === "string" && String(doc[key]).trim());
	const name = [
		doc["name"],
		doc["username"],
		doc["pushName"],
		doc["notifyName"]
	].find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? "Player";
	return {
		id: String(doc["_id"] ?? doc["jid"] ?? doc["userId"] ?? ""),
		name,
		title,
		score,
		scoreLabel: metric === "xp" ? "XP" : metric === "coins" ? "COINS" : metric === "cards" ? "CARDS" : metric === "pokemon" ? "POKÉMON" : "BADGES",
		xp: Number(doc["xp"]) || 0,
		trainerXp: Number(doc["trainerXp"] ?? doc["xp"]) || 0,
		trainerLevel: Number(doc["trainerLevel"] ?? 1) || 1,
		coins: (Number(doc["money"]) || 0) + (Number(doc["bank"]) || 0),
		avatarUrl: avatar ? String(doc[avatar]) : null,
		avatarVideoUrl: recordString(doc, [
			"avatarVideo",
			"avatarVideoUrl",
			"profileVideoUrl",
			"videoUrl",
			"profileVideo"
		]) || null,
		pokemonCount: counts?.pokemonCount ?? 0,
		cardCount: counts?.cardCount ?? 0
	};
}
async function leaderboard(metric = "xp") {
	const db = await getDb();
	const userCollection = await users();
	if (metric === "xp") return (await userCollection.find({ $or: [{ level: { $exists: true } }, { xp: { $exists: true } }] }).limit(500).toArray()).map((doc) => {
		const record = doc;
		const level = Number(record["level"] ?? record["trainerLevel"]) || 1;
		const trainerXp = Number(record["xp"] ?? record["trainerXp"]) || 0;
		return {
			record: {
				...record,
				trainerXp,
				trainerLevel: level
			},
			level,
			trainerXp,
			totalXp: trainerTotalXp(level, trainerXp)
		};
	}).sort((a, b) => b.totalXp - a.totalXp || b.trainerXp - a.trainerXp || String(a.record["_id"] ?? "").localeCompare(String(b.record["_id"] ?? ""))).slice(0, 10).map(({ record, totalXp }) => rowFromUser(record, metric, totalXp));
	if (metric === "cards") {
		const ranked = (await (await cardUsers()).find({}).limit(1e3).toArray()).map((doc) => {
			const record = doc;
			const count = (Array.isArray(record["cards"]) ? record["cards"] : []).length || Number(record["totalCards"]) || 0;
			const userId = String(record["userId"] ?? record["_id"] ?? "").trim();
			const jid = String(record["whatsappNumber"] ?? record["jid"] ?? record["owner"] ?? userId).trim();
			const username = [
				record["username"],
				record["name"],
				record["ownerName"]
			].find((value) => typeof value === "string" && value.trim().length > 0);
			return {
				userId,
				jid,
				username: typeof username === "string" ? username.trim() : "",
				score: count,
				count,
				cardRecord: record
			};
		}).filter((entry) => entry.jid && entry.score > 0).sort((a, b) => b.score - a.score || a.jid.localeCompare(b.jid)).slice(0, 10);
		const docs = await userCollection.find(identityLookup(ranked.map((entry) => entry.jid))).toArray();
		const byId = /* @__PURE__ */ new Map();
		for (const doc of docs) {
			const record = doc;
			for (const field of [
				"_id",
				"userId",
				"whatsappNumber",
				"jid",
				"owner"
			]) for (const alias of identityVariants$1(record[field])) byId.set(alias, record);
		}
		return ranked.map((entry) => {
			const doc = identityVariants$1(entry.jid).map((alias) => byId.get(alias)).find(Boolean);
			const fallbackName = entry.username || String(entry.cardRecord["name"] ?? "").trim() || `User_${entry.userId.slice(-4) || entry.jid.slice(-4)}`;
			return rowFromUser({
				...entry.cardRecord ?? {},
				...doc ?? {},
				_id: doc?.["_id"] ?? entry.jid,
				name: [
					doc?.["name"],
					entry.username,
					doc?.["pushName"],
					fallbackName
				].find((value) => typeof value === "string" && value.trim().length > 0),
				username: [
					doc?.["username"],
					entry.username,
					doc?.["name"],
					fallbackName
				].find((value) => typeof value === "string" && value.trim().length > 0),
				registered: doc?.["registered"] || entry.cardRecord?.["registered"] || false
			}, metric, entry.score, { cardCount: entry.count });
		});
	}
	if (metric === "gyms") {
		const knownGymIds = new Set(GYM_DEFINITIONS.map((gym) => gym.id));
		const ranked = (await db.collection("pokemon_trainers").find({}).limit(1e3).toArray()).map((doc) => {
			const record = doc;
			const jid = String(record["jid"] ?? record["userId"] ?? record["_id"] ?? "").trim();
			const badgeCount = gymBadgeIds(record["badges"]).filter((badge) => knownGymIds.has(badge)).length;
			const rewards = record["gymRewards"];
			const rewardCount = rewards && typeof rewards === "object" ? Object.keys(rewards).filter((gymId) => knownGymIds.has(gymId) && rewards[gymId] === true).length : 0;
			return {
				jid,
				score: Math.max(badgeCount, rewardCount),
				trainer: record
			};
		}).filter((entry) => entry.jid && entry.score > 0).sort((a, b) => b.score - a.score || a.jid.localeCompare(b.jid)).slice(0, 10);
		const docs = await userCollection.find(identityLookup(ranked.map((entry) => entry.jid))).toArray();
		const byId = /* @__PURE__ */ new Map();
		for (const doc of docs) {
			const record = doc;
			for (const field of [
				"_id",
				"userId",
				"whatsappNumber",
				"jid",
				"owner"
			]) for (const alias of identityVariants$1(record[field])) byId.set(alias, record);
		}
		return ranked.map((entry) => {
			const userDoc = identityVariants$1(entry.jid).map((alias) => byId.get(alias)).find(Boolean);
			const trainerName = typeof entry.trainer["username"] === "string" ? String(entry.trainer["username"]) : "";
			return rowFromUser({
				...userDoc ?? {},
				_id: userDoc?.["_id"] ?? entry.jid,
				name: userDoc?.["name"] ?? userDoc?.["username"] ?? trainerName ?? `Trainer_${(entry.jid.split("@")[0] ?? entry.jid).slice(-4)}`,
				username: userDoc?.["username"] ?? trainerName
			}, metric, entry.score);
		});
	}
	if (metric === "pokemon") {
		const ranked = await db.collection("pokemon_owned").aggregate([
			{ $group: {
				_id: "$ownerJid",
				score: { $sum: 1 }
			} },
			{ $sort: { score: -1 } },
			{ $limit: 10 }
		]).toArray();
		const ids = ranked.map((entry) => String(entry["_id"]));
		const docs = await userCollection.find(identityLookup(ids)).toArray();
		const trainerDocs = await db.collection("pokemon_trainers").find({ jid: { $in: ids } }, { projection: {
			jid: 1,
			username: 1
		} }).toArray();
		const byId = /* @__PURE__ */ new Map();
		for (const doc of docs) {
			const record = doc;
			for (const field of [
				"_id",
				"userId",
				"whatsappNumber",
				"jid",
				"owner"
			]) for (const alias of identityVariants$1(record[field])) byId.set(alias, record);
		}
		const trainerNames = /* @__PURE__ */ new Map();
		for (const trainer of trainerDocs) {
			const record = trainer;
			const name = typeof record["username"] === "string" ? String(record["username"]) : "";
			if (name) for (const alias of identityVariants$1(record["jid"])) trainerNames.set(alias, name);
		}
		return ranked.flatMap((entry) => {
			const jid = String(entry["_id"]);
			const doc = identityVariants$1(jid).map((alias) => byId.get(alias)).find(Boolean);
			const score = Number(entry["score"]) || 0;
			const fallbackName = identityVariants$1(jid).map((alias) => trainerNames.get(alias)).find(Boolean);
			const shortJid = (jid.split("@")[0] ?? jid).slice(-4);
			return [rowFromUser(doc ?? {
				_id: jid,
				username: fallbackName ?? `Trainer_${shortJid}`
			}, metric, score, { pokemonCount: score })];
		});
	}
	return (await userCollection.find({}, { projection: {
		name: 1,
		username: 1,
		pushName: 1,
		notifyName: 1,
		websiteId: 1,
		xp: 1,
		money: 1,
		bank: 1,
		job: 1,
		isPremium: 1,
		profilePictureUrl: 1,
		profileImage: 1,
		avatarUrl: 1,
		profilePic: 1,
		pfp: 1,
		imageUrl: 1,
		image: 1
	} }).limit(500).toArray()).map((doc) => {
		const record = doc;
		return {
			record,
			score: metric === "coins" ? (Number(record["money"]) || 0) + (Number(record["bank"]) || 0) : Number(record["xp"]) || 0
		};
	}).sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		const xpA = Number(a.record["xp"]) || 0;
		const xpB = Number(b.record["xp"]) || 0;
		if (xpA !== xpB) return xpB - xpA;
		return String(a.record["name"] ?? a.record["username"] ?? "").localeCompare(String(b.record["name"] ?? b.record["username"] ?? ""));
	}).slice(0, 10).map(({ record, score }) => rowFromUser(record, metric, score));
}
function ownerKeys(user) {
	return identityVariants$1(userKey(user));
}
function normalizeCard(card, index) {
	return {
		cardId: String(card["cardId"] ?? card["id"] ?? `card-${index}`),
		name: String(card["name"] ?? "Unnamed card"),
		tier: String(card["tier"] ?? card["rarity"] ?? "common"),
		tierNum: Number(card["tierNum"] ?? 0) || 0,
		index: Number.isInteger(Number(card["index"])) ? Number(card["index"]) : index,
		spawnId: card["spawnId"] ? String(card["spawnId"]) : null,
		price: Number(card["price"] ?? 0) || 0,
		series: String(card["series"] ?? "AIDORU"),
		media: typeof card["media"] === "string" ? card["media"] : "",
		mediaType: String(card["mediaType"] ?? "image"),
		obtainedAt: card["obtainedAt"] ? String(card["obtainedAt"]) : null,
		ownerName: card["ownerName"] ? String(card["ownerName"]) : null,
		ownerId: card["ownerId"] ? String(card["ownerId"]) : null
	};
}
async function listCards(scope = "mine") {
	const user = await requireUser();
	if (scope === "mine") {
		const keys = ownerKeys(user);
		const doc = await (await cardUsers()).findOne({ $or: [
			{ userId: { $in: keys } },
			{ whatsappNumber: { $in: keys } },
			{ jid: { $in: keys } },
			{ owner: { $in: keys } }
		] });
		return (Array.isArray(doc?.cards) ? doc.cards : []).map((card, index) => normalizeCard(card, index));
	}
	return (await (await cardUsers()).find({ cards: {
		$exists: true,
		$type: "array",
		$ne: []
	} }, { projection: {
		_id: 1,
		userId: 1,
		whatsappNumber: 1,
		jid: 1,
		owner: 1,
		username: 1,
		name: 1,
		ownerName: 1,
		profilePictureUrl: 1,
		profileImage: 1,
		avatarUrl: 1,
		cards: 1
	} }).limit(500).toArray()).flatMap((doc, ownerIndex) => {
		const record = doc;
		const cards = Array.isArray(record["cards"]) ? record["cards"] : [];
		const ownerId = String(record["userId"] ?? record["jid"] ?? record["_id"] ?? ownerIndex);
		const ownerName = String(record["username"] ?? record["name"] ?? record["ownerName"] ?? "Trainer");
		return cards.map((card, cardIndex) => ({
			...card,
			cardId: `${ownerId}:${String(card["cardId"] ?? cardIndex)}`,
			ownerId,
			ownerName
		}));
	}).map((card, index) => normalizeCard(card, index)).sort((left, right) => right.tierNum - left.tierNum || right.price - left.price).slice(0, 1e3);
}
async function listMyCards() {
	return listCards("mine");
}
function marketplaceListingFilter(listingId) {
	const raw = String(listingId ?? "").trim();
	return import_lib.ObjectId.isValid(raw) ? { $or: [{ _id: new import_lib.ObjectId(raw) }, { _id: raw }] } : { _id: raw };
}
function marketListingFromDoc(doc, sellerName) {
	const listedAt = doc["listedAt"] instanceof Date ? doc["listedAt"] : new Date(String(doc["listedAt"] ?? Date.now()));
	return {
		id: String(doc["_id"] ?? ""),
		sellerId: String(doc["sellerId"] ?? ""),
		sellerName,
		cardId: String(doc["cardId"] ?? ""),
		name: String(doc["cardName"] ?? doc["name"] ?? "Unnamed card"),
		tier: String(doc["cardRarity"] ?? doc["tier"] ?? "common"),
		price: Math.max(0, Number(doc["price"] ?? 0) || 0),
		media: String(doc["cardImage"] ?? doc["media"] ?? ""),
		listedAt: listedAt.toISOString()
	};
}
function sellerNameFromDoc(doc) {
	const value = [
		"sellerName",
		"username",
		"name",
		"ownerName",
		"pushName",
		"notifyName"
	].map((key) => doc[key]).find((candidate) => typeof candidate === "string" && candidate.trim().length > 0);
	return value ? String(value).trim() : null;
}
async function listCardMarket() {
	await requireUser();
	const listings = await (await cardMarket()).find({ price: { $gt: 0 } }).sort({ listedAt: -1 }).limit(250).toArray();
	if (!listings.length) return [];
	const sellerIds = [...new Set(listings.map((listing) => String(listing.sellerId)))];
	const [sellerDocs, cardSellerDocs] = await Promise.all([(await users()).find(identityLookup(sellerIds), { projection: {
		_id: 1,
		userId: 1,
		whatsappNumber: 1,
		jid: 1,
		owner: 1,
		username: 1,
		name: 1,
		pushName: 1,
		notifyName: 1
	} }).toArray(), (await cardUsers()).find(identityLookup(sellerIds), { projection: {
		_id: 1,
		userId: 1,
		whatsappNumber: 1,
		jid: 1,
		owner: 1,
		username: 1,
		name: 1,
		ownerName: 1,
		pushName: 1,
		notifyName: 1
	} }).toArray()]);
	const sellerNames = /* @__PURE__ */ new Map();
	for (const seller of [...sellerDocs, ...cardSellerDocs]) {
		const record = seller;
		const name = sellerNameFromDoc(record);
		if (!name) continue;
		for (const field of [
			"_id",
			"userId",
			"whatsappNumber",
			"jid",
			"owner"
		]) for (const key of identityVariants$1(record[field])) sellerNames.set(key, name);
	}
	return listings.map((listing) => {
		const record = listing;
		const sellerId = String(record["sellerId"] ?? "");
		const storedName = sellerNameFromDoc(record);
		const shortSellerId = sellerId.split("@")[0]?.slice(-4);
		return marketListingFromDoc(record, storedName ?? sellerNames.get(sellerId) ?? sellerNames.get(identityVariants$1(sellerId)[0] ?? "") ?? (shortSellerId ? `Trainer · ${shortSellerId}` : "Unknown seller"));
	});
}
async function purchaseCardListing(listingId) {
	const buyer = await requireUser();
	const buyerId = userKey(buyer);
	const market = await cardMarket();
	const listingDoc = await market.findOneAndDelete(marketplaceListingFilter(listingId));
	if (!listingDoc) throw new Error("This card listing is no longer available.");
	const price = Math.max(0, Number(listingDoc["price"] ?? 0) || 0);
	const sellerId = String(listingDoc["sellerId"] ?? "");
	const sellerName = String(listingDoc["sellerName"] ?? "Trainer");
	const restoreListing = async () => {
		await market.insertOne(listingDoc).catch(() => void 0);
	};
	if (!price || identityVariants$1(sellerId).some((key) => identityVariants$1(buyerId).includes(key))) {
		await restoreListing();
		throw new Error(!price ? "This listing has an invalid price." : "You cannot buy your own card listing.");
	}
	const buyerUsers = await users();
	const sellerUser = await buyerUsers.findOne(identityLookup([sellerId]));
	if (!sellerUser) {
		await restoreListing();
		throw new Error("The seller account could not be found.");
	}
	if (!(await buyerUsers.updateOne({
		_id: buyerId,
		money: { $gte: price }
	}, { $inc: { money: -price } })).modifiedCount) {
		await restoreListing();
		throw new Error("You do not have enough coins for this card.");
	}
	let buyerCardAdded = false;
	let sellerCredited = false;
	try {
		const sellerCards = await cardUsers();
		const sellerFilter = {
			...identityLookup([sellerId]),
			cards: { $elemMatch: { cardId: String(listingDoc["cardId"] ?? "") } }
		};
		if (await sellerCards.findOne(sellerFilter)) {
			await sellerCards.updateOne(sellerFilter, { $unset: { "cards.$": "" } });
			await sellerCards.updateOne(identityLookup([sellerId]), { $pull: { cards: null } });
		}
		const buyerCardDoc = await sellerCards.findOne(identityLookup([buyerId]));
		const purchasedCard = {
			cardId: String(listingDoc["cardId"] ?? ""),
			name: String(listingDoc["cardName"] ?? listingDoc["name"] ?? "Unnamed card"),
			tier: String(listingDoc["cardRarity"] ?? listingDoc["tier"] ?? "common"),
			price,
			media: String(listingDoc["cardImage"] ?? listingDoc["media"] ?? ""),
			obtainedAt: (/* @__PURE__ */ new Date()).toISOString(),
			ownerId: buyerId,
			ownerName: String(buyer.name ?? "Trainer")
		};
		if (buyerCardDoc?._id !== void 0) {
			if ((await sellerCards.updateOne({ _id: buyerCardDoc._id }, { $push: { cards: purchasedCard } })).modifiedCount !== 1) throw new Error("The buyer collection could not be updated.");
		} else await sellerCards.insertOne({
			userId: buyerId,
			username: String(buyer.name ?? "Trainer"),
			cards: [purchasedCard]
		});
		buyerCardAdded = true;
		if ((await buyerUsers.updateOne({ _id: sellerUser._id }, { $inc: { money: price } })).modifiedCount !== 1) throw new Error("The seller wallet could not be credited.");
		sellerCredited = true;
		const updatedBuyer = await buyerUsers.findOne({ _id: buyerId });
		return {
			ok: true,
			listing: marketListingFromDoc(listingDoc, sellerName),
			balance: Number(updatedBuyer?.money ?? 0) || 0
		};
	} catch (error) {
		if (sellerCredited) await buyerUsers.updateOne({ _id: sellerUser._id }, { $inc: { money: -price } }).catch(() => void 0);
		if (buyerCardAdded) await (await cardUsers()).updateOne(identityLookup([buyerId]), { $pull: { cards: { cardId: String(listingDoc["cardId"] ?? "") } } }).catch(() => void 0);
		await buyerUsers.updateOne({ _id: buyerId }, { $inc: { money: price } }).catch(() => void 0);
		await restoreListing();
		throw error;
	}
}
function normalizePet(doc) {
	const record = doc;
	const directImage = [
		"imageUrl",
		"image",
		"avatarUrl",
		"sprite",
		"img"
	].map((key) => record[key]).find((value) => typeof value === "string" && value.trim().length > 0);
	return {
		petId: String(doc.petId ?? ""),
		name: String(doc.name ?? doc.species ?? "Companion"),
		species: String(doc.species ?? "companion"),
		rarity: String(doc.rarity ?? "common"),
		level: Number(doc.level) || 1,
		exp: Number(doc.exp) || 0,
		expNeeded: Number(doc.expNeeded) || 100,
		hp: Number(doc.hp) || 0,
		maxHp: Number(doc.maxHp) || 0,
		attack: Number(doc.attack) || 0,
		defense: Number(doc.defense) || 0,
		speed: Number(doc.speed) || 0,
		hunger: Math.max(0, Math.min(100, Number(doc.hunger ?? 100))),
		happiness: Math.max(0, Math.min(100, Number(doc.happiness ?? 100))),
		imageUrl: (directImage?.includes("image.pollinations.ai") ? directImage : null) ?? petImageForSpecies(doc.species, doc.name) ?? directImage ?? "https://api.dicebear.com/9.x/fun-emoji/svg?seed=aidoru-companion",
		skill: String(doc.skill ?? "Companion skill"),
		isActive: doc.isActive === true,
		lastFed: doc.lastFed ? new Date(doc.lastFed).toISOString() : null,
		lastPlayed: doc.lastPlayed ? new Date(doc.lastPlayed).toISOString() : null
	};
}
async function listMyPets() {
	const user = await requireUser();
	return (await (await pets()).find({ owner: { $in: ownerKeys(user) } }).sort({
		isActive: -1,
		level: -1,
		createdAt: 1
	}).toArray()).map((doc) => normalizePet(doc));
}
async function findMyPet(petId) {
	const user = await requireUser();
	const keys = ownerKeys(user);
	const doc = await (await pets()).findOne({
		owner: { $in: keys },
		...petId ? { petId: String(petId) } : { isActive: true }
	});
	if (!doc) throw new Error(petId ? "That companion was not found in your stable." : "You do not have an active companion yet.");
	return {
		user,
		doc,
		keys
	};
}
var PET_HATCH_POOL = [
	{
		species: "cat",
		name: "Cat",
		rarity: "common",
		skill: "Scratch",
		weight: 40
	},
	{
		species: "dog",
		name: "Dog",
		rarity: "common",
		skill: "Bite",
		weight: 40
	},
	{
		species: "bunny",
		name: "Bunny",
		rarity: "common",
		skill: "Quick Step",
		weight: 28
	},
	{
		species: "fox",
		name: "Fox",
		rarity: "uncommon",
		skill: "Fox Fire",
		weight: 28
	},
	{
		species: "wolf",
		name: "Wolf",
		rarity: "uncommon",
		skill: "Shadow Fang",
		weight: 28
	},
	{
		species: "panda",
		name: "Panda",
		rarity: "uncommon",
		skill: "Bamboo Strike",
		weight: 28
	},
	{
		species: "tiger",
		name: "Tiger",
		rarity: "rare",
		skill: "Tiger Pounce",
		weight: 18
	},
	{
		species: "falcon",
		name: "Falcon",
		rarity: "rare",
		skill: "Dive Bomb",
		weight: 18
	},
	{
		species: "spirit_wolf",
		name: "Spirit Wolf",
		rarity: "rare",
		skill: "Soul Howl",
		weight: 18
	},
	{
		species: "kitsune",
		name: "Kitsune",
		rarity: "epic",
		skill: "Nine Lives",
		weight: 9
	},
	{
		species: "phoenix_chick",
		name: "Phoenix Chick",
		rarity: "epic",
		skill: "Ember Rebirth",
		weight: 9
	},
	{
		species: "baby_dragon",
		name: "Baby Dragon",
		rarity: "legendary",
		skill: "Dragon Breath",
		weight: 4
	},
	{
		species: "shadow_dragon",
		name: "Shadow Dragon",
		rarity: "mythic",
		skill: "Void Roar",
		weight: 1
	}
];
function hatchSpecies() {
	const total = PET_HATCH_POOL.reduce((sum, item) => sum + item.weight, 0);
	let roll = Math.random() * total;
	for (const item of PET_HATCH_POOL) {
		roll -= item.weight;
		if (roll <= 0) return item;
	}
	return PET_HATCH_POOL[0];
}
async function feedPet(petId) {
	const { doc, keys } = await findMyPet(petId);
	const lastFed = doc.lastFed ? new Date(doc.lastFed).getTime() : 0;
	const remainingMs = 72e5 - (Date.now() - lastFed);
	if (remainingMs > 0) throw new Error(`This companion can be fed again in ${Math.ceil(remainingMs / 6e4)} minute(s).`);
	await (await pets()).updateOne({
		owner: { $in: keys },
		petId: String(doc.petId ?? "")
	}, { $set: {
		hunger: Math.min(100, Number(doc.hunger ?? 100) + 30),
		happiness: Math.min(100, Number(doc.happiness ?? 100) + 5),
		lastFed: (/* @__PURE__ */ new Date()).toISOString()
	} });
	return listMyPets();
}
async function playPet(petId) {
	const { doc, keys } = await findMyPet(petId);
	const lastPlayed = doc.lastPlayed ? new Date(doc.lastPlayed).getTime() : 0;
	const remainingMs = 36e5 - (Date.now() - lastPlayed);
	if (remainingMs > 0) throw new Error(`This companion is resting for ${Math.ceil(remainingMs / 6e4)} minute(s).`);
	await (await pets()).updateOne({
		owner: { $in: keys },
		petId: String(doc.petId ?? "")
	}, { $set: {
		hunger: Math.max(0, Number(doc.hunger ?? 100) - 5),
		happiness: Math.min(100, Number(doc.happiness ?? 100) + 20),
		lastPlayed: (/* @__PURE__ */ new Date()).toISOString()
	} });
	return listMyPets();
}
async function selectPet(petId) {
	const { keys } = await findMyPet(petId);
	const collection = await pets();
	await collection.updateMany({
		owner: { $in: keys },
		isActive: true
	}, { $set: { isActive: false } });
	await collection.updateOne({
		owner: { $in: keys },
		petId
	}, { $set: { isActive: true } });
	return listMyPets();
}
async function releasePet(petId) {
	const { doc, keys } = await findMyPet(petId);
	const collection = await pets();
	await collection.deleteOne({
		owner: { $in: keys },
		petId: String(doc.petId ?? "")
	});
	if (doc.isActive) {
		const next = await collection.findOne({ owner: { $in: keys } }, { sort: {
			level: -1,
			createdAt: 1
		} });
		if (next) await collection.updateOne({ _id: next._id }, { $set: { isActive: true } });
	}
	return listMyPets();
}
async function hatchPet() {
	const user = await requireUser();
	const keys = ownerKeys(user);
	const collection = await pets();
	const total = await collection.countDocuments({ owner: { $in: keys } });
	if (total >= 5) throw new Error("Your stable is full. Release a companion before hatching another egg.");
	const species = hatchSpecies();
	const petId = String(Math.floor(1e4 + Math.random() * 9e4));
	const level = 1;
	const base = species.rarity === "mythic" ? 180 : species.rarity === "legendary" ? 150 : species.rarity === "epic" ? 125 : species.rarity === "rare" ? 110 : 90;
	const doc = {
		petId,
		owner: userKey(user),
		name: species.name,
		species: species.species,
		rarity: species.rarity,
		level,
		exp: 0,
		expNeeded: 100,
		hp: base,
		maxHp: base,
		attack: Math.round(base * .2),
		defense: Math.round(base * .16),
		speed: Math.round(base * .14),
		hunger: 100,
		happiness: 100,
		imageUrl: petImageForSpecies(species.species, species.name) ?? `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(species.name)}`,
		skill: species.skill,
		isActive: total === 0,
		createdAt: (/* @__PURE__ */ new Date()).toISOString(),
		lastFed: null,
		lastPlayed: null
	};
	if (doc.isActive) await collection.updateMany({
		owner: { $in: keys },
		isActive: true
	}, { $set: { isActive: false } });
	await collection.insertOne(doc);
	return listMyPets();
}
var PET_SHOP = {
	kibble: {
		name: "Kibble",
		price: 200,
		effect: "hunger"
	},
	meal: {
		name: "Premium Meal",
		price: 500,
		effect: "meal"
	},
	toy: {
		name: "Toy",
		price: 300,
		effect: "happiness"
	},
	exppotion: {
		name: "EXP Potion",
		price: 800,
		effect: "exp"
	},
	revival: {
		name: "Revival Tonic",
		price: 600,
		effect: "revival"
	},
	berry: {
		name: "Sweet Berry",
		price: 150,
		effect: "berry"
	},
	energy: {
		name: "Energy Drink",
		price: 700,
		effect: "energy"
	},
	deluxemeal: {
		name: "Deluxe Bento",
		price: 1200,
		effect: "deluxe"
	},
	grooming: {
		name: "Grooming Kit",
		price: 1e3,
		effect: "grooming"
	},
	friendship: {
		name: "Friendship Ribbon",
		price: 2500,
		effect: "friendship"
	},
	superxp: {
		name: "Super EXP Potion",
		price: 2500,
		effect: "superxp"
	},
	goldenmeal: {
		name: "Golden Meal",
		price: 4e3,
		effect: "golden"
	}
};
async function buyPetCare(itemKey, petId) {
	const item = PET_SHOP[itemKey];
	if (!item) throw new Error("Choose a valid pet-care item.");
	const { user, doc, keys } = await findMyPet(petId);
	const jid = userKey(user);
	if ((await (await users()).updateOne({
		_id: jid,
		money: { $gte: item.price }
	}, { $inc: { money: -item.price } })).modifiedCount !== 1) throw new Error("You do not have enough wallet coins for that pet-care item.");
	try {
		const changes = {};
		if (item.effect === "hunger") changes["hunger"] = Math.min(100, Number(doc["hunger"] ?? 100) + 40);
		if (item.effect === "berry") {
			changes["hunger"] = Math.min(100, Number(doc["hunger"] ?? 100) + 20);
			changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 20);
		}
		if (item.effect === "energy") changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 50);
		if (item.effect === "deluxe") {
			changes["hunger"] = 100;
			changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 25);
		}
		if (item.effect === "grooming") changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 70);
		if (item.effect === "friendship") changes["happiness"] = 100;
		if (item.effect === "golden") {
			changes["hunger"] = 100;
			changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 50);
		}
		if (item.effect === "meal") {
			changes["hunger"] = 100;
			changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 10);
		}
		if (item.effect === "happiness") changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 35);
		if (item.effect === "revival") {
			changes["hunger"] = Math.min(100, Number(doc["hunger"] ?? 100) + 60);
			changes["happiness"] = Math.min(100, Number(doc["happiness"] ?? 100) + 40);
		}
		if (item.effect === "exp" || item.effect === "superxp") {
			let level = Number(doc.level) || 1;
			let exp = (Number(doc.exp) || 0) + (item.effect === "superxp" ? 500 : 150);
			let expNeeded = Number(doc.expNeeded) || Math.floor(100 * Math.pow(level, 1.3));
			while (exp >= expNeeded) {
				exp -= expNeeded;
				level += 1;
				expNeeded = Math.floor(100 * Math.pow(level, 1.3));
			}
			const scale = 1 + (level - 1) * .08;
			changes["exp"] = exp;
			changes["level"] = level;
			changes["expNeeded"] = expNeeded;
			changes["maxHp"] = Math.floor((Number(doc["maxHp"] ?? 100) || 100) * scale / (1 + (Number(doc["level"] ?? 1) - 1) * .08));
			changes["hp"] = changes["maxHp"];
			changes["attack"] = Math.floor((Number(doc["attack"] ?? 10) || 10) * scale / (1 + (Number(doc["level"] ?? 1) - 1) * .08));
			changes["defense"] = Math.floor((Number(doc["defense"] ?? 10) || 10) * scale / (1 + (Number(doc["level"] ?? 1) - 1) * .08));
			changes["speed"] = Math.floor((Number(doc["speed"] ?? 10) || 10) * scale / (1 + (Number(doc["level"] ?? 1) - 1) * .08));
		}
		await (await pets()).updateOne({
			owner: { $in: keys },
			petId: String(doc.petId ?? "")
		}, { $set: changes });
	} catch (error) {
		await refundWallet(jid, item.price);
		throw error;
	}
	return {
		pets: await listMyPets(),
		spent: item.price,
		itemName: item.name
	};
}
async function updateProfile(input) {
	const user = await requireUser();
	const profileImage = String(input?.avatarImage ?? user.profilePictureUrl ?? "").trim().slice(0, 15e5) || null;
	const profileVideo = String(input?.avatarVideo ?? user.avatarVideo ?? "").trim().slice(0, 5e6) || null;
	const profileBackground = String(input?.background ?? user.profileBackground ?? "").trim().slice(0, 15e5) || null;
	const updates = {
		name: String(input?.name ?? user.name ?? "Player").trim().slice(0, 32) || "Player",
		bio: String(input?.bio ?? user.bio ?? "").trim().slice(0, 240),
		job: String(input?.title ?? user.job ?? "Player").trim().slice(0, 40) || "Player",
		avatar: String(input?.avatar ?? "default").slice(0, 24),
		banner: String(input?.banner ?? "aurora").slice(0, 24),
		profilePictureUrl: profileImage,
		avatarVideo: profileVideo,
		profileBackground
	};
	await (await users()).updateOne({ _id: userKey(user) }, { $set: updates });
	try {
		const rawUser = user;
		const identityFields = [
			userKey(user),
			rawUser["userId"],
			rawUser["whatsappNumber"],
			rawUser["jid"]
		];
		const botProfiles = await cardUsers();
		const botProfile = await botProfiles.findOne(identityLookup(identityFields));
		const botUserId = String(rawUser["userId"] ?? rawUser["whatsappNumber"] ?? userKey(user)).replace(/:\d+(?=@)/, "").split("@")[0];
		const botFields = {
			profilePictureUrl: profileImage,
			avatarVideo: profileVideo,
			profileBackground,
			name: updates.name,
			username: updates.name
		};
		if (botProfile?._id) await botProfiles.updateOne({ _id: botProfile._id }, { $set: botFields });
		else if (botUserId) await botProfiles.updateOne({ userId: botUserId }, { $set: {
			userId: botUserId,
			...botFields
		} }, { upsert: true });
	} catch (syncError) {
		console.warn("[profile] Could not mirror website profile to Kelin-MD2:", syncError);
	}
	return publicCurrentUser();
}
async function chooseStarter(_starterId) {
	throw new Error("Start your Pokémon trainer with .startjourney in WhatsApp, then return here to manage the live party.");
}
async function claimDaily() {
	const user = await requireUser();
	const jid = userKey(user);
	const cooldown = await claimCooldown(jid, "lastDaily", 864e5);
	if (!cooldown.ok) throw new Error(`Daily reward is cooling down for ${Math.ceil(cooldown.remainingMs / 36e5)} more hour(s).`);
	const previousStreak = Number(user.streak) || 0;
	const streak = Math.min(previousStreak + 1, 14);
	const reward = 5e4 + Math.floor(Math.random() * 5e4);
	await (await users()).updateOne({ _id: jid }, {
		$inc: {
			money: reward,
			xp: 200
		},
		$set: { streak }
	});
	await appendHistory(jid, "daily", reward, `Daily reward: day ${streak}`);
	return {
		user: await publicCurrentUser(),
		reward,
		streak
	};
}
async function buyItem(input) {
	const user = await requireUser();
	const item = BOT_MART_ITEMS.find((entry) => entry.id === input?.itemId);
	if (!item) throw new Error("That Mart item is no longer available.");
	const qty = Math.max(1, Math.min(99, Math.floor(Number(input?.qty) || 1)));
	const trainerCollection = (await getDb()).collection("pokemon_trainers");
	const trainer = await trainerCollection.findOne({ jid: userKey(user) });
	if (!trainer) throw new Error("Start your Pokémon journey with .startjourney in WhatsApp first.");
	const existingQty = Number(trainer["inventory"]?.[item.id]) || 0;
	if (item.id === "keystone" && existingQty > 0) throw new Error("Your trainer can only own one Keystone.");
	const spent = item.price * qty;
	if ((await (await users()).updateOne({
		_id: userKey(user),
		registered: true,
		money: { $gte: spent }
	}, { $inc: {
		money: -spent,
		xp: 3
	} })).modifiedCount !== 1) throw new Error("You do not have enough wallet coins for that purchase.");
	try {
		if ((await trainerCollection.updateOne({ jid: userKey(user) }, { $inc: { [`inventory.${item.id}`]: qty } })).modifiedCount !== 1) throw new Error("Trainer inventory could not be updated.");
	} catch (error) {
		await refundWallet(userKey(user), spent);
		throw error;
	}
	await appendHistory(userKey(user), "mart", -spent, `Bought ${qty} ${item.name}`);
	return {
		user: await publicCurrentUser(),
		itemName: item.name,
		spent
	};
}
async function joinGuild(guildId) {
	const jid = userKey(await requireUser());
	const guild = await (await guilds()).findOne({ _id: String(guildId ?? "") });
	if (!guild) throw new Error("Guild not found.");
	const current = await (await guilds()).findOne({ members: jid });
	if (current && String(current._id) !== String(guild._id)) throw new Error("Leave your current guild before joining another.");
	const currentMembers = Array.isArray(guild.members) ? guild.members.length : 0;
	const requirements = guildUpgradeRequirementsForLevel(Number(guild.level) || 1);
	if (!current && currentMembers >= requirements.memberCapacity) throw new Error(`This guild is full at ${requirements.memberCapacity} members. Upgrade the guild before adding more trainers.`);
	await (await guilds()).updateOne({ _id: guild._id }, { $addToSet: { members: jid } });
	return publicCurrentUser();
}
async function leaveGuild() {
	const user = await requireUser();
	await (await guilds()).updateOne({ members: userKey(user) }, { $pull: { members: userKey(user) } });
	return publicCurrentUser();
}
async function createGuild(input) {
	const user = await requireUser();
	const name = String(input?.name ?? "").trim().slice(0, 32);
	const tag = String(input?.tag ?? "").trim().slice(0, 5).toUpperCase();
	if (name.length < 3 || tag.length < 2) throw new Error("Enter a guild name and a 2–5 character tag.");
	if (await (await guilds()).findOne({ members: userKey(user) })) throw new Error("Leave your current guild before creating one.");
	if ((await (await users()).updateOne({
		_id: userKey(user),
		money: { $gte: 5e3 }
	}, { $inc: { money: -5e3 } })).modifiedCount !== 1) throw new Error(`Creating a guild costs ${GUILD_CREATION_COST.toLocaleString()} coins.`);
	try {
		await (await guilds()).insertOne({
			_id: `guild-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			name,
			owner: userKey(user),
			members: [userKey(user)],
			level: 1,
			guildXp: 0,
			treasury: 0,
			taxRate: guildTaxRateForLevel(1),
			tag,
			description: String(input?.description ?? "").trim().slice(0, 200),
			icon: null,
			bannerUrl: null
		});
	} catch (error) {
		await refundWallet(userKey(user), GUILD_CREATION_COST);
		throw error;
	}
	return publicCurrentUser();
}
async function upgradeGuild() {
	const jid = userKey(await requireUser());
	const guild = await (await guilds()).findOne({ owner: jid });
	if (!guild) throw new Error("Only the guild owner can upgrade the guild.");
	const currentLevel = Number(guild.level) || 1;
	if (currentLevel >= 20) throw new Error("Guild has already reached the maximum level.");
	const requirements = guildUpgradeRequirementsForLevel(currentLevel);
	const guildXp = Number(guild.guildXp ?? 0);
	const treasury = Number(guild.treasury ?? 0);
	const memberCount = guild.members?.length ?? 0;
	if (guildXp < requirements.guildXp) throw new Error(`Guild needs ${requirements.guildXp.toLocaleString()} XP to upgrade (Current: ${guildXp.toLocaleString()}).`);
	if (treasury < requirements.treasury) throw new Error(`Guild treasury needs ${requirements.treasury.toLocaleString()} coins to upgrade (Current: ${treasury.toLocaleString()}).`);
	if (memberCount < requirements.members) throw new Error(`Guild needs at least ${requirements.members} members to upgrade.`);
	await (await guilds()).updateOne({ _id: guild._id }, {
		$inc: {
			level: 1,
			treasury: -requirements.treasury,
			guildXp: -requirements.guildXp
		},
		$set: { taxRate: guildTaxRateForLevel(currentLevel + 1) }
	});
	return publicCurrentUser();
}
async function updateGuildInfo(data) {
	const jid = userKey(await requireUser());
	const guild = await (await guilds()).findOne({ owner: jid });
	if (!guild) throw new Error("Only the guild owner can update guild settings.");
	const update = {};
	if (typeof data.description === "string") update.description = data.description.trim().slice(0, 200);
	if (data.iconUrl) update.icon = data.iconUrl;
	if (data.bannerUrl) update.bannerUrl = data.bannerUrl;
	if (Object.keys(update).length > 0) await (await guilds()).updateOne({ _id: guild._id }, { $set: update });
	return publicCurrentUser();
}
async function playCoinFlip(input) {
	const user = await requireUser();
	const wager = validWager(input?.wager, 10, 1e9);
	if (input?.pick !== "heads" && input?.pick !== "tails") throw new Error("Choose heads or tails.");
	const cooldown = await claimCooldown(userKey(user), "lastCoinflip", 8e3);
	if (!cooldown.ok) throw new Error(`Coinflip cooldown: wait ${Math.ceil(cooldown.remainingMs / 1e3)}s.`);
	if (Number(user.money) < wager) throw new Error("You do not have enough wallet coins for that wager.");
	const won = Math.random() < .55;
	const result = won ? input.pick : input.pick === "heads" ? "tails" : "heads";
	const delta = won ? wager : -wager;
	await (await users()).updateOne({ _id: userKey(user) }, { $inc: {
		money: delta,
		xp: won ? 8 : 0
	} });
	await appendHistory(userKey(user), "coinflip", delta, `Coinflip ${won ? "win" : "loss"}: ${input.pick}`);
	return {
		user: await publicCurrentUser(),
		result,
		won,
		delta
	};
}
async function playBet(input) {
	const user = await requireUser();
	const wager = validWager(input?.wager, 10, 1e9);
	const cooldown = await claimCooldown(userKey(user), "lastBet", 3e4);
	if (!cooldown.ok) throw new Error(`Bet cooldown: wait ${Math.ceil(cooldown.remainingMs / 1e3)}s.`);
	if (Number(user.money) < wager) throw new Error("You do not have enough wallet coins for that wager.");
	const won = Math.random() < .53;
	const delta = won ? wager : -wager;
	await (await users()).updateOne({ _id: userKey(user) }, { $inc: {
		money: delta,
		xp: won ? 15 : 0
	} });
	await appendHistory(userKey(user), "bet", delta, `Website bet ${won ? "win" : "loss"}`);
	return {
		user: await publicCurrentUser(),
		won,
		delta
	};
}
async function playSlots(input) {
	const user = await requireUser();
	const wager = validWager(input?.wager, 50, 5e4);
	const cooldown = await claimCooldown(userKey(user), "lastSlots", 15e3);
	if (!cooldown.ok) throw new Error(`Slots cooldown: wait ${Math.ceil(cooldown.remainingMs / 1e3)}s.`);
	if (Number(user.money) < wager) throw new Error("You do not have enough wallet coins for that wager.");
	const reels = [
		randomChoice(SLOT_POOL),
		randomChoice(SLOT_POOL),
		randomChoice(SLOT_POOL)
	];
	let multiplier = 0;
	if (reels[0] === reels[1] && reels[1] === reels[2]) multiplier = SLOT_PAYOUTS[reels[0]] || 2;
	else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) multiplier = .5;
	const delta = Math.floor(wager * multiplier) - wager;
	await (await users()).updateOne({ _id: userKey(user) }, { $inc: {
		money: delta,
		xp: 5
	} });
	await appendHistory(userKey(user), "slots", delta, `Website slots: bet $${wager}`);
	return {
		user: await publicCurrentUser(),
		reels,
		delta,
		multiplier
	};
}
async function playDice(input) {
	const user = await requireUser();
	const wager = validWager(input?.wager, 50, 5e8);
	const guess = Math.floor(Number(input?.guess));
	if (isNaN(guess) || guess < 1 || guess > 6) throw new Error("Guess a number between 1 and 6.");
	const cooldown = await claimCooldown(userKey(user), "lastDice", 5e3);
	if (!cooldown.ok) throw new Error(`Dice cooldown: wait ${Math.ceil(cooldown.remainingMs / 1e3)}s.`);
	if (Number(user.money) < wager) throw new Error("You do not have enough wallet coins for that wager.");
	const roll = Math.floor(Math.random() * 6) + 1;
	const won = roll === guess;
	const delta = won ? wager * 5 : -wager;
	await (await users()).updateOne({ _id: userKey(user) }, { $inc: {
		money: delta,
		xp: won ? 20 : 2
	} });
	await appendHistory(userKey(user), "dice", delta, `Website dice: roll ${roll}, guess ${guess}`);
	return {
		user: await publicCurrentUser(),
		roll,
		won,
		delta
	};
}
async function playRoulette(input) {
	const user = await requireUser();
	const wager = validWager(input?.wager, 100, 1e9);
	if (![
		"red",
		"black",
		"green"
	].includes(input?.color || "")) throw new Error("Pick red, black, or green.");
	const cooldown = await claimCooldown(userKey(user), "lastRoulette", 1e4);
	if (!cooldown.ok) throw new Error(`Roulette cooldown: wait ${Math.ceil(cooldown.remainingMs / 1e3)}s.`);
	if (Number(user.money) < wager) throw new Error("You do not have enough wallet coins for that wager.");
	const roll = Math.floor(Math.random() * 37);
	let rollColor = "";
	if (roll === 0) rollColor = "green";
	else if ([
		1,
		3,
		5,
		7,
		9,
		12,
		14,
		16,
		18,
		19,
		21,
		23,
		25,
		27,
		30,
		32,
		34,
		36
	].includes(roll)) rollColor = "red";
	else rollColor = "black";
	const won = input?.color === rollColor;
	let multiplier = 0;
	if (won) multiplier = rollColor === "green" ? 35 : 1;
	const delta = won ? wager * multiplier : -wager;
	await (await users()).updateOne({ _id: userKey(user) }, { $inc: {
		money: delta,
		xp: won ? 25 : 5
	} });
	await appendHistory(userKey(user), "roulette", delta, `Website roulette: roll ${roll} (${rollColor})`);
	return {
		user: await publicCurrentUser(),
		roll,
		rollColor,
		won,
		delta
	};
}
async function setLeadPokemon(pokemonId) {
	const jid = userKey(await requireUser());
	const db = await getDb();
	const trainer = await db.collection("pokemon_trainers").findOne({ jid });
	if (!trainer) throw new Error("Start your Pokémon journey in WhatsApp first.");
	const id = String(pokemonId ?? "");
	if (!Array.isArray(trainer["party"]) || !trainer["party"].map(String).includes(id)) throw new Error("That Pokémon is not in your party.");
	const pokemon = await db.collection("pokemon_owned").findOne({ _id: id });
	if (pokemon && Number(pokemon["hp"] ?? 0) <= 0) throw new Error("A fainted Pokémon cannot be your lead.");
	await db.collection("pokemon_trainers").updateOne({ jid }, { $set: { leadPokemonId: id } });
	return publicCurrentUser();
}
async function swapParty(input) {
	const jid = userKey(await requireUser());
	const first = Math.floor(Number(input?.first));
	const second = Math.floor(Number(input?.second));
	if (![first, second].every((slot) => slot >= 1 && slot <= 6) || first === second) throw new Error("Choose two different party slots from 1 to 6.");
	const db = await getDb();
	const trainer = await db.collection("pokemon_trainers").findOne({ jid });
	if (!trainer || !Array.isArray(trainer["party"])) throw new Error("Start your Pokémon journey in WhatsApp first.");
	const party = [...trainer["party"]];
	if (!party[first - 1] || !party[second - 1]) throw new Error("Both selected party slots must contain a Pokémon.");
	[party[first - 1], party[second - 1]] = [party[second - 1], party[first - 1]];
	await db.collection("pokemon_trainers").updateOne({ jid }, { $set: {
		party,
		...first === 1 || second === 1 ? { leadPokemonId: party[0] } : {}
	} });
	return publicCurrentUser();
}
async function movePokemon(input) {
	const jid = userKey(await requireUser());
	const id = String(input?.pokemonId ?? "");
	const destination = input?.destination;
	if (!id || destination !== "party" && destination !== "pc") throw new Error("Choose a Pokémon and destination.");
	const db = await getDb();
	const trainers = db.collection("pokemon_trainers");
	const pokemonCollection = db.collection("pokemon_owned");
	const trainer = await trainers.findOne({ jid });
	if (!trainer) throw new Error("Start your Pokémon journey in WhatsApp first.");
	const party = Array.isArray(trainer["party"]) ? trainer["party"].map(String) : [];
	const pc = Array.isArray(trainer["pc"]) ? trainer["pc"].map(String) : [];
	if (destination === "party") {
		if (party.length >= 6) throw new Error("Your party is full. Move one Pokémon to the PC first.");
		if (!pc.includes(id)) throw new Error("That Pokémon is not in your PC.");
		await trainers.updateOne({ jid }, {
			$pull: { pc: id },
			$addToSet: { party: id }
		});
		await pokemonCollection.updateOne({
			_id: id,
			ownerJid: jid
		}, { $set: { inParty: true } });
	} else {
		if (!party.includes(id)) throw new Error("That Pokémon is not in your party.");
		if (party.length <= 1) throw new Error("Keep at least one Pokémon in your party.");
		const nextParty = party.filter((entry) => entry !== id);
		await trainers.updateOne({ jid }, {
			$pull: { party: id },
			$addToSet: { pc: id },
			$set: {
				party: nextParty,
				leadPokemonId: nextParty[0]
			}
		});
		await pokemonCollection.updateOne({
			_id: id,
			ownerJid: jid
		}, { $set: { inParty: false } });
	}
	return publicCurrentUser();
}
var ROOM_TTL_MS = 12e4;
var INACTIVITY_TTL_MS = 12e4;
var GYM_PROGRESS_COOLDOWN_MS = 36e6;
var FINISHED_TTL_MS = 3e4;
var TRAINER_SPRITES = [
	"/battle-trainers/leaf.png",
	"/battle-trainers/red.png",
	"/battle-trainers/brendan.png",
	"/battle-trainers/may.png"
];
var TYPE_CHART = {
	normal: {
		rock: .5,
		ghost: 0,
		steel: .5
	},
	fire: {
		fire: .5,
		water: .5,
		rock: .5,
		dragon: .5,
		grass: 2,
		ice: 2,
		bug: 2,
		steel: 2
	},
	water: {
		water: .5,
		grass: .5,
		dragon: .5,
		fire: 2,
		ground: 2,
		rock: 2
	},
	electric: {
		electric: .5,
		grass: .5,
		dragon: .5,
		ground: 0,
		flying: 2,
		water: 2
	},
	grass: {
		fire: .5,
		grass: .5,
		poison: .5,
		flying: .5,
		bug: .5,
		dragon: .5,
		steel: .5,
		water: 2,
		ground: 2,
		rock: 2
	},
	ice: {
		water: .5,
		ice: .5,
		steel: .5,
		fire: .5,
		grass: 2,
		ground: 2,
		flying: 2,
		dragon: 2
	},
	fighting: {
		poison: .5,
		flying: .5,
		psychic: .5,
		bug: .5,
		fairy: .5,
		ghost: 0,
		normal: 2,
		ice: 2,
		rock: 2,
		dark: 2,
		steel: 2
	},
	poison: {
		poison: .5,
		ground: .5,
		rock: .5,
		ghost: .5,
		steel: 0,
		grass: 2,
		fairy: 2
	},
	ground: {
		grass: .5,
		bug: .5,
		flying: 0,
		electric: 2,
		fire: 2,
		poison: 2,
		rock: 2,
		steel: 2
	},
	flying: {
		electric: .5,
		rock: .5,
		steel: .5,
		ground: 0,
		grass: 2,
		fighting: 2,
		bug: 2
	},
	psychic: {
		psychic: .5,
		steel: .5,
		dark: 0,
		fighting: 2,
		poison: 2
	},
	bug: {
		fire: .5,
		fighting: .5,
		flying: .5,
		ghost: .5,
		steel: .5,
		fairy: .5,
		grass: 2,
		psychic: 2,
		dark: 2
	},
	rock: {
		fighting: .5,
		ground: .5,
		steel: .5,
		normal: 2,
		fire: 2,
		flying: 2,
		ice: 2,
		bug: 2
	},
	ghost: {
		normal: 0,
		dark: .5,
		psychic: 2,
		ghost: 2
	},
	dragon: {
		steel: .5,
		fairy: 0,
		dragon: 2
	},
	dark: {
		fighting: .5,
		dark: .5,
		fairy: .5,
		psychic: 2,
		ghost: 2
	},
	steel: {
		fire: .5,
		water: .5,
		electric: .5,
		steel: .5,
		ice: 2,
		rock: 2,
		fairy: 2
	},
	fairy: {
		fire: .5,
		poison: .5,
		steel: .5,
		fighting: 2,
		dragon: 2,
		dark: 2
	}
};
Number.MAX_SAFE_INTEGER;
function value(value, fallback = "") {
	return value === null || value === void 0 ? fallback : String(value);
}
function numberValue(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}
function userName(user) {
	return value(user["name"] ?? user["username"] ?? user["pushName"] ?? user["notifyName"], "Trainer");
}
function userAvatar(user) {
	const candidate = user["avatarUrl"] ?? user["profilePicUrl"] ?? user["profilePictureUrl"] ?? null;
	return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}
function fallbackTrainerSprite(id) {
	let hash = 0;
	for (const character of id) hash = hash * 31 + character.charCodeAt(0) | 0;
	return TRAINER_SPRITES[Math.abs(hash) % TRAINER_SPRITES.length] ?? TRAINER_SPRITES[0] ?? null;
}
function publicTrainer(trainer) {
	return {
		...trainer,
		trainerSpriteUrl: trainer.trainerSpriteUrl ?? fallbackTrainerSprite(trainer.id)
	};
}
function mongoId(id) {
	return import_lib.ObjectId.isValid(id) ? new import_lib.ObjectId(id) : id;
}
function fallbackRoomCode(id) {
	return id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
}
function makeRoomCode() {
	return fallbackRoomCode(randomUUID());
}
function canonicalIdentity(value) {
	const raw = String(value ?? "").trim().replace(/:\d+(?=@)/, "");
	return (raw.split("@")[0] || raw).toLowerCase();
}
function soloPairKey(jid) {
	return `solo:${canonicalIdentity(jid)}`;
}
function deterministicRoomId(key) {
	return `battle-${createHash("sha256").update(key).digest("hex").slice(0, 24)}`;
}
function identityVariants(value) {
	const raw = value === null || value === void 0 ? "" : String(value).trim();
	if (!raw) return [];
	const withoutDevice = raw.replace(/:\d+(?=@)/, "");
	const bare = withoutDevice.split("@")[0] ?? withoutDevice;
	return Array.from(new Set([
		raw,
		withoutDevice,
		bare,
		`${bare}@s.whatsapp.net`
	].filter((item) => Boolean(item))));
}
function userIdentityAliases(user) {
	return Array.from(new Set([
		"_id",
		"id",
		"jid",
		"userId",
		"phone",
		"number",
		"whatsappNumber",
		"remoteJid"
	].flatMap((key) => identityVariants(user[key]))));
}
function identityMatches(value, aliases) {
	return identityVariants(value).some((candidate) => aliases.includes(candidate));
}
async function resolveBattleJid(user) {
	const aliases = userIdentityAliases(user);
	const db = await getDb();
	const trainer = aliases.length ? await db.collection("pokemon_trainers").findOne({ $or: aliases.map((jid) => ({ jid })) }) : null;
	return trainer?.["jid"] ? String(trainer["jid"]) : String(user["_id"] ?? "");
}
function publicMove(move) {
	const desc = typeof move["desc"] === "string" ? move["desc"] : null;
	return {
		name: value(move["name"], "Unknown move"),
		type: value(move["type"], "normal").toLowerCase(),
		power: numberValue(move["power"], 0),
		accuracy: numberValue(move["accuracy"], 100),
		pp: numberValue(move["pp"], 0),
		priority: numberValue(move["priority"], 0),
		...desc ? { desc } : {}
	};
}
function publicPokemon(doc) {
	const id = value(doc["_id"] ?? doc["id"]);
	const pokedexId = numberValue(doc["pokedexId"], 0);
	const imageUrl = value(doc["imageUrl"], "");
	return {
		id,
		pokedexId,
		name: value(doc["name"], "Unknown"),
		displayName: value(doc["displayName"] ?? doc["nickname"] ?? doc["name"], "Unknown"),
		level: numberValue(doc["level"], 1),
		hp: Math.max(0, numberValue(doc["hp"], 0)),
		maxHp: Math.max(1, numberValue(doc["maxHp"], 1)),
		attack: Math.max(1, numberValue(doc["attack"], 10)),
		defense: Math.max(1, numberValue(doc["defense"], 10)),
		speed: Math.max(1, numberValue(doc["speed"], 10)),
		types: Array.isArray(doc["types"]) ? doc["types"].map((item) => value(item).toLowerCase()) : [value(doc["primaryType"], "normal").toLowerCase()],
		imageUrl,
		frontSpriteUrl: value(doc["frontSpriteUrl"], imageUrl),
		backSpriteUrl: value(doc["backSpriteUrl"] ?? doc["backImageUrl"], imageUrl),
		shiny: Boolean(doc["shiny"]),
		fainted: numberValue(doc["hp"], 0) <= 0,
		moves: Array.isArray(doc["moves"]) ? doc["moves"].filter((item) => Boolean(item && typeof item === "object")).map(publicMove) : []
	};
}
async function loadTrainerSnapshot(jid, fallbackName, fallbackAvatar) {
	const db = await getDb();
	const aliases = identityVariants(jid);
	const userFilter = aliases.length ? { $or: aliases.flatMap((alias) => [
		{ _id: alias },
		{ jid: alias },
		{ userId: alias },
		{ whatsappNumber: alias }
	]) } : { _id: jid };
	const [user, trainer, allPokemon] = await Promise.all([
		(await db.collection("users")).findOne(userFilter),
		db.collection("pokemon_trainers").findOne({ $or: aliases.map((alias) => ({ jid: alias })) }),
		db.collection("pokemon_owned").find({ ownerJid: { $in: aliases } }).toArray()
	]);
	if (!trainer) throw new Error("Start your Pokémon journey in WhatsApp first.");
	const docs = allPokemon;
	const byId = new Map(docs.map((doc) => [value(doc["_id"] ?? doc["id"]), doc]));
	const ordered = (Array.isArray(trainer["party"]) ? trainer["party"].map(String) : []).map((id) => byId.get(id)).filter(Boolean);
	for (const doc of docs) {
		const id = value(doc["_id"] ?? doc["id"]);
		if (!ordered.some((item) => value(item["_id"] ?? item["id"]) === id)) ordered.push(doc);
	}
	const userRecord = user ?? {};
	return {
		id: jid,
		name: user ? userName(userRecord) : fallbackName ?? jid.split("@")[0] ?? "Trainer",
		avatarUrl: user ? userAvatar(userRecord) : fallbackAvatar ?? null,
		trainerSpriteUrl: null,
		ready: false,
		party: ordered.slice(0, 6).map(publicPokemon),
		activeIndex: 0,
		inventory: Object.fromEntries(Object.entries(trainer["inventory"] ?? {}).map(([key, qty]) => [key, numberValue(qty)]))
	};
}
function cloneTrainer(trainer) {
	return {
		...trainer,
		inventory: { ...trainer.inventory },
		party: trainer.party.map((pokemon) => ({
			...pokemon,
			types: [...pokemon.types],
			moves: pokemon.moves.map((move) => ({ ...move }))
		}))
	};
}
function cloneRoom(room) {
	return {
		...room,
		challenger: cloneTrainer(room.challenger),
		opponent: room.opponent ? cloneTrainer(room.opponent) : null,
		spectatorIds: [...room.spectatorIds],
		combatLog: [...room.combatLog]
	};
}
function opposite(role) {
	return role === "challenger" ? "opponent" : "challenger";
}
function trainerFor(room, role) {
	return role === "challenger" ? room.challenger : room.opponent;
}
function activePokemon(room, role) {
	const trainer = trainerFor(room, role);
	return trainer?.party[trainer.activeIndex] ?? null;
}
function healthyPokemon(trainer) {
	return trainer?.party.some((pokemon) => pokemon.hp > 0) ?? false;
}
function roomRole(room, aliases) {
	if (identityMatches(room.challenger.id, aliases)) return "challenger";
	if (room.opponent && identityMatches(room.opponent.id, aliases)) return "opponent";
	return "spectator";
}
function addLog(room, message) {
	room.combatLog = [...room.combatLog.slice(-11), message];
}
function effectiveness(moveType, defenderTypes) {
	const chart = TYPE_CHART[moveType] ?? {};
	return defenderTypes.reduce((multiplier, type) => multiplier * (chart[type] ?? 1), 1);
}
function calcDamage(attacker, defender, move) {
	if (!move.power) return 0;
	const base = (2 * (attacker.level || 5) / 5 + 2) * move.power * attacker.attack / Math.max(1, defender.defense) / 50 + 2;
	const roll = .85 + Math.random() * .15;
	const stab = attacker.types.includes(move.type) ? 1.5 : 1;
	const multiplier = effectiveness(move.type, defender.types);
	return Math.max(1, Math.floor(base * roll * stab * multiplier));
}
async function clearExpired() {
	const now = /* @__PURE__ */ new Date();
	const staleAt = /* @__PURE__ */ new Date(now.getTime() - INACTIVITY_TTL_MS);
	return (await battleRooms()).deleteMany({ $or: [{
		status: { $in: ["waiting", "active"] },
		$or: [
			{ expiresAt: { $lte: now } },
			{ lastActionAt: { $lte: staleAt } },
			{
				lastActionAt: { $exists: false },
				createdAt: { $lte: staleAt }
			}
		]
	}, {
		status: "finished",
		expiresAt: { $lte: now }
	}] });
}
async function loadRoomByReference(roomId) {
	const rooms = await battleRooms();
	const normalizedRoomId = roomId.trim();
	let room = await rooms.findOne({ _id: normalizedRoomId });
	if (!room && /^[a-z0-9]{6}$/i.test(normalizedRoomId)) {
		const code = normalizedRoomId.toUpperCase();
		room = await rooms.findOne({ $or: [{ code }, { _id: {
			$regex: `${code}$`,
			$options: "i"
		} }] });
	}
	return room;
}
function summary(room) {
	return {
		id: room._id,
		code: room.code || fallbackRoomCode(room._id),
		status: room.status,
		challenger: {
			id: room.challenger.id,
			name: room.challenger.name,
			avatarUrl: room.challenger.avatarUrl,
			ready: room.challenger.ready
		},
		opponent: room.opponent ? {
			id: room.opponent.id,
			name: room.opponent.name,
			avatarUrl: room.opponent.avatarUrl,
			ready: room.opponent.ready
		} : null,
		spectators: room.spectatorIds.length,
		createdAt: room.createdAt.toISOString(),
		lastActionAt: room.lastActionAt.toISOString(),
		gym: room.gym ?? null
	};
}
function serializeRoom(room, joinedAs) {
	return {
		...summary(room),
		turn: room.turn,
		forcedSwitch: room.forcedSwitch,
		round: room.round,
		winnerId: room.winnerId,
		challenger: publicTrainer(room.challenger),
		opponent: room.opponent ? publicTrainer(room.opponent) : null,
		combatLog: room.combatLog,
		expiresAt: room.expiresAt?.toISOString() ?? null,
		joinedAs,
		gym: room.gym ?? null
	};
}
async function persistHealth(room) {
	const pokemonCollection = (await getDb()).collection("pokemon_owned");
	const trainers = [room.challenger, room.opponent].filter(Boolean);
	await Promise.all(trainers.flatMap((trainer) => trainer.party.map((pokemon) => pokemonCollection.updateOne({
		_id: mongoId(pokemon.id),
		ownerJid: trainer.id
	}, { $set: { hp: pokemon.hp } }))));
}
async function finishRoom(room, winnerId, message) {
	const finishedAt = /* @__PURE__ */ new Date();
	room.status = "finished";
	room.winnerId = winnerId;
	room.turn = null;
	room.forcedSwitch = null;
	room.finishedAt = finishedAt;
	room.expiresAt = new Date(finishedAt.getTime() + FINISHED_TTL_MS);
	addLog(room, message);
	await persistHealth(room);
}
async function saveRoom(room) {
	room.version += 1;
	room.lastActionAt = /* @__PURE__ */ new Date();
	if (room.status === "finished") {
		const finishedAt = room.finishedAt ?? /* @__PURE__ */ new Date();
		room.finishedAt = finishedAt;
		room.expiresAt = new Date(finishedAt.getTime() + FINISHED_TTL_MS);
	} else {
		room.finishedAt = null;
		room.expiresAt = new Date(Date.now() + ROOM_TTL_MS);
	}
	await (await battleRooms()).replaceOne({ _id: room._id }, room, { upsert: false });
}
function scheduleFinishedRoomCleanup(roomId) {
	setTimeout(() => {
		battleRooms().then((collection) => collection.deleteOne({
			_id: roomId,
			status: "finished"
		})).catch(() => void 0);
	}, FINISHED_TTL_MS);
}
async function listBattleRooms() {
	await clearExpired();
	const rooms = await battleRooms();
	const docs = await rooms.find({ status: { $in: ["waiting", "active"] } }).sort({ createdAt: 1 }).limit(100).toArray();
	const seen = /* @__PURE__ */ new Map();
	const duplicates = [];
	for (const room of docs) {
		const key = room.pairKey || `solo:${canonicalIdentity(room.challenger.id)}`;
		if (seen.has(key)) duplicates.push(room._id);
		else seen.set(key, room);
	}
	if (duplicates.length) await rooms.deleteMany({ _id: { $in: duplicates } });
	return [...seen.values()].sort((a, b) => b.lastActionAt.getTime() - a.lastActionAt.getTime()).slice(0, 40).map(summary);
}
function gymOpponentSnapshot(gymId) {
	const gym = gymById(gymId);
	if (!gym) throw new Error("That gym does not exist.");
	const party = gym.team.map((pokemon, index) => {
		const sprites = gymSpriteUrls(pokemon);
		return publicPokemon({
			_id: `gym-${gym.id}-${index}`,
			id: `gym-${gym.id}-${index}`,
			pokedexId: pokemon.pokedexId,
			name: pokemon.name,
			displayName: pokemon.name,
			level: pokemon.level,
			hp: pokemon.maxHp,
			maxHp: pokemon.maxHp,
			attack: pokemon.attack,
			defense: pokemon.defense,
			speed: pokemon.speed,
			types: pokemon.types,
			imageUrl: sprites.imageUrl,
			frontSpriteUrl: sprites.frontSpriteUrl,
			backSpriteUrl: sprites.backSpriteUrl,
			moves: pokemon.moves
		});
	});
	return {
		id: `gym:${gym.id}`,
		name: `${gym.leader} · ${gym.name}`,
		avatarUrl: null,
		trainerSpriteUrl: "/battle-trainers/red.png",
		ready: true,
		party,
		activeIndex: 0,
		inventory: {}
	};
}
async function ensureGymOpponentTeam(room) {
	if (!room.gym || !room.opponent) return false;
	const gym = gymById(room.gym.id);
	if (!gym || room.opponent.party.length >= gym.team.length) return false;
	const previousReady = room.opponent.ready;
	room.opponent = gymOpponentSnapshot(gym.id);
	room.opponent.ready = previousReady;
	addLog(room, `${gym.leader} has entered the full six-Pokémon ${gym.name} roster.`);
	return true;
}
async function listGyms() {
	const aliases = userIdentityAliases(await requireUser());
	const trainer = await (await getDb()).collection("pokemon_trainers").findOne({ $or: aliases.map((jid) => ({ jid })) });
	const badges = new Set(gymBadgeIds(trainer?.["badges"]));
	return (await Promise.resolve(GYM_DEFINITIONS.map((gym) => gymById(gym.id)).filter(Boolean))).map((gym) => ({
		...gym,
		unlocked: !gym.unlockAfter || badges.has(gym.unlockAfter.toLowerCase()),
		earned: badges.has(gym.id)
	}));
}
async function createGymBattleRoom(gymId) {
	await clearExpired();
	const user = await requireUser();
	const gym = gymById(gymId);
	if (!gym) throw new Error("That gym does not exist.");
	const jid = await resolveBattleJid(user);
	const trainerDoc = await (await getDb()).collection("pokemon_trainers").findOne({ $or: identityVariants(jid).map((value) => ({ jid: value })) });
	const badges = new Set(gymBadgeIds(trainerDoc?.["badges"]));
	const cooldownUntil = trainerDoc?.["gymCooldownUntil"] ? new Date(String(trainerDoc["gymCooldownUntil"])).getTime() : 0;
	if (Number.isFinite(cooldownUntil) && cooldownUntil > Date.now()) {
		const remainingHours = Math.ceil((cooldownUntil - Date.now()) / 36e5);
		throw new Error(`Gym cooldown active. You can challenge the next gym in about ${remainingHours} hour${remainingHours === 1 ? "" : "s"}.`);
	}
	if (gym.unlockAfter && !badges.has(gym.unlockAfter.toLowerCase())) throw new Error(`Earn the ${gymById(gym.unlockAfter)?.badge ?? "previous badge"} first.`);
	const challenger = await loadTrainerSnapshot(jid);
	if (!challenger.party.some((pokemon) => pokemon.hp > 0)) throw new Error("You need one healthy Pokémon to challenge a gym.");
	const rooms = await battleRooms();
	const roomId = deterministicRoomId(`gym:${gym.id}:${canonicalIdentity(jid)}`);
	const existing = await rooms.findOne({ _id: roomId });
	if (existing && existing.status !== "finished") return serializeRoom(existing, "challenger");
	const now = /* @__PURE__ */ new Date();
	const room = {
		_id: roomId,
		code: "",
		status: "active",
		gym: {
			id: gym.id,
			name: gym.name,
			type: gym.type,
			leader: gym.leader,
			badge: gym.badge,
			theme: gym.theme,
			accent: gym.accent,
			background: gym.background,
			music: gym.music,
			rewardCoins: gym.rewardCoins,
			rewardXp: gym.rewardXp
		},
		rewardGrantedAt: null,
		pairKey: `gym:${gym.id}:${canonicalIdentity(jid)}`,
		challenger: {
			...challenger,
			ready: true
		},
		opponent: gymOpponentSnapshot(gym.id),
		spectatorIds: [],
		turn: "challenger",
		forcedSwitch: null,
		round: 1,
		winnerId: null,
		combatLog: [`${gym.leader} welcomes you to ${gym.name}. Defeat the gym team to earn the ${gym.badge}.`],
		version: 1,
		createdAt: now,
		lastActionAt: now,
		expiresAt: new Date(now.getTime() + ROOM_TTL_MS)
	};
	let code = makeRoomCode();
	while (await rooms.findOne({ code })) code = makeRoomCode();
	room.code = code;
	await rooms.replaceOne({ _id: room._id }, room, { upsert: true });
	return serializeRoom(room, "challenger");
}
async function grantGymReward(room) {
	if (!room.gym || room.rewardGrantedAt) return;
	const db = await getDb();
	const aliases = identityVariants(room.challenger.id);
	const now = /* @__PURE__ */ new Date();
	const trainerFilter = { $or: aliases.map((jid) => ({ jid })) };
	if ((await db.collection("pokemon_trainers").updateOne({
		...trainerFilter,
		[`gymRewards.${room.gym.id}`]: { $ne: true }
	}, {
		$set: {
			[`gymRewards.${room.gym.id}`]: true,
			gymCooldownUntil: new Date(now.getTime() + GYM_PROGRESS_COOLDOWN_MS)
		},
		$addToSet: { badges: gymBadgeId(room.gym.id) },
		$inc: {
			coins: room.gym.rewardCoins,
			xp: room.gym.rewardXp
		}
	})).modifiedCount > 0) {
		await db.collection("users").updateOne({ $or: aliases.flatMap((jid) => [
			{ _id: jid },
			{ whatsappNumber: jid },
			{ jid }
		]) }, { $inc: {
			money: room.gym.rewardCoins,
			xp: room.gym.rewardXp
		} });
		room.rewardGrantedAt = now;
	}
}
async function createBattleRoom() {
	await clearExpired();
	const jid = await resolveBattleJid(await requireUser());
	const rooms = await battleRooms();
	const identityIds = identityVariants(jid);
	const activeRooms = await rooms.find({
		"challenger.id": { $in: identityIds },
		status: { $in: ["waiting", "active"] }
	}).sort({ createdAt: 1 }).toArray();
	const existing = activeRooms[0] ?? null;
	if (activeRooms.length > 1) await rooms.deleteMany({ _id: { $in: activeRooms.slice(1).map((room) => room._id) } });
	if (existing) return serializeRoom(existing, "challenger");
	const invitedRoom = await rooms.findOne({
		invitedOpponentId: { $in: identityIds },
		status: { $in: ["waiting", "active"] }
	});
	if (invitedRoom) return serializeRoom(invitedRoom, roomRole(invitedRoom, identityIds));
	const challenger = await loadTrainerSnapshot(jid);
	if (!challenger.party.some((pokemon) => pokemon.hp > 0)) throw new Error("You need one healthy Pokémon to open a room.");
	const now = /* @__PURE__ */ new Date();
	const room = {
		_id: deterministicRoomId(soloPairKey(jid)),
		pairKey: soloPairKey(jid),
		status: "waiting",
		code: "",
		challenger,
		opponent: null,
		spectatorIds: [],
		turn: null,
		forcedSwitch: null,
		round: 0,
		winnerId: null,
		combatLog: ["Room opened. Waiting for an opponent to join."],
		version: 1,
		createdAt: now,
		lastActionAt: now,
		expiresAt: new Date(now.getTime() + ROOM_TTL_MS)
	};
	let code = makeRoomCode();
	while (await rooms.findOne({ code })) code = makeRoomCode();
	room.code = code;
	try {
		await rooms.insertOne(room);
	} catch (error) {
		if (error?.code === 11e3) {
			const concurrent = await rooms.findOne({ _id: room._id });
			if (concurrent) return serializeRoom(concurrent, "challenger");
		}
		throw error;
	}
	return serializeRoom(room, "challenger");
}
async function getBattleRoom(roomId) {
	await clearExpired();
	const user = await requireUser();
	let room = await loadRoomByReference(roomId);
	if (!room) throw new Error("That battle room has expired or does not exist.");
	if (room.gym && await ensureGymOpponentTeam(room)) await saveRoom(room);
	const aliases = userIdentityAliases(user);
	const battleJid = await resolveBattleJid(user);
	const roleAliases = Array.from(/* @__PURE__ */ new Set([...aliases, ...identityVariants(battleJid)]));
	let role = roomRole(room, roleAliases);
	if (room.status === "waiting" && room.autoStart && room.opponent && role !== "spectator") {
		const next = cloneRoom(room);
		const opponent = next.opponent;
		if (!opponent) throw new Error("The challenged trainer is missing from this room.");
		next.challenger.ready = true;
		opponent.ready = true;
		next.status = "active";
		next.turn = "challenger";
		next.round = 1;
		addLog(next, "Both challenged trainers are loaded. The web battle has started.");
		await saveRoom(next);
		room = next;
	}
	if (role === "spectator") {
		const next = cloneRoom(room);
		const isChallenger = identityMatches(next.challenger.id, roleAliases);
		const invited = !next.invitedOpponentId || identityMatches(next.invitedOpponentId, roleAliases);
		if (!next.opponent && !isChallenger && invited) {
			next.opponent = await loadTrainerSnapshot(battleJid);
			role = "opponent";
			if (next.autoStart) {
				next.challenger.ready = true;
				next.opponent.ready = true;
				next.status = "active";
				next.turn = "challenger";
				next.round = 1;
				addLog(next, `${next.opponent.name} joined the room. The web battle has started.`);
			} else addLog(next, `${next.opponent.name} joined the room. Both trainers must ready up.`);
		} else {
			if (!next.spectatorIds.includes(battleJid)) next.spectatorIds.push(battleJid);
			role = "spectator";
		}
		await saveRoom(next);
		room = next;
	}
	if (room.gym && await ensureGymOpponentTeam(room)) await saveRoom(room);
	if (room.opponent && room.autoStart && room.status === "waiting") {
		const next = cloneRoom(room);
		const opponent = next.opponent;
		if (!opponent) throw new Error("The challenged trainer is missing from this room.");
		next.challenger.ready = true;
		opponent.ready = true;
		next.status = "active";
		next.turn = "challenger";
		next.round = Math.max(1, next.round);
		addLog(next, "Both trainers are loaded. The arena is live.");
		await saveRoom(next);
		room = next;
	}
	return serializeRoom(room, role);
}
async function performBattleAction(roomId, action) {
	const user = await requireUser();
	const aliases = userIdentityAliases(user);
	const battleJid = await resolveBattleJid(user);
	const roleAliases = Array.from(/* @__PURE__ */ new Set([...aliases, ...identityVariants(battleJid)]));
	const current = await loadRoomByReference(roomId);
	if (!current) throw new Error("That battle room has expired or does not exist.");
	const room = cloneRoom(current);
	const role = roomRole(room, roleAliases);
	if (role === "spectator") throw new Error("Spectators can watch this room but cannot control a trainer.");
	const trainer = trainerFor(room, role);
	if (!trainer) throw new Error("This trainer is no longer in the room.");
	if (action.type === "ready") {
		trainer.ready = true;
		if (room.opponent?.ready && room.challenger.ready) {
			room.status = "active";
			room.turn = "challenger";
			room.round = 1;
			addLog(room, "Both trainers are ready. The challenger moves first.");
		} else addLog(room, `${trainer.name} is ready.`);
		await saveRoom(room);
		return serializeRoom(room, role);
	}
	if (room.status !== "active") throw new Error("The battle is not active yet.");
	if (room.gym) {
		if (await ensureGymOpponentTeam(room)) await saveRoom(room);
		if (role !== "challenger") throw new Error("Only the trainer can control a gym battle.");
		const trainer = room.challenger;
		const gymOpponent = room.opponent;
		if (!gymOpponent) throw new Error("The gym leader is missing from this room.");
		if (room.forcedSwitch === "challenger") {
			if (action.type !== "switch") throw new Error("Choose a healthy replacement Pokémon first.");
			const replacement = trainer.party[action.pokemonIndex];
			if (!replacement || replacement.hp <= 0) throw new Error("Choose a healthy Pokémon.");
			trainer.activeIndex = action.pokemonIndex;
			room.forcedSwitch = null;
			room.turn = "challenger";
			addLog(room, `${trainer.name} sent out ${replacement.displayName}.`);
			await saveRoom(room);
			return serializeRoom(room, role);
		}
		if (action.type === "forfeit") {
			await finishRoom(room, gymOpponent.id, `${trainer.name} forfeited the gym challenge.`);
			await saveRoom(room);
			scheduleFinishedRoomCleanup(room._id);
			return serializeRoom(room, role);
		}
		if (action.type === "switch") {
			const replacement = trainer.party[action.pokemonIndex];
			if (!replacement || replacement.hp <= 0) throw new Error("Choose a healthy Pokémon.");
			trainer.activeIndex = action.pokemonIndex;
			addLog(room, `${trainer.name} switched to ${replacement.displayName}.`);
		} else if (action.type === "item") throw new Error("Healing items are disabled during gym battles.");
		else {
			if (action.type !== "move") throw new Error("Choose a move, switch, item, or forfeit.");
			const attacker = activePokemon(room, role);
			const defender = activePokemon(room, "opponent");
			if (!attacker || !defender) throw new Error("Both sides need an active Pokémon.");
			const move = attacker.moves[action.moveIndex];
			if (!move) throw new Error("Choose one of the visible moves.");
			const damage = Math.random() * 100 > (move.accuracy || 100) ? 0 : calcDamage(attacker, defender, move);
			defender.hp = Math.max(0, defender.hp - damage);
			addLog(room, `${attacker.displayName} used ${move.name}${damage ? ` for ${damage} damage.` : " It missed."}`);
		}
		const defender = activePokemon(room, "opponent");
		if (!defender || defender.hp <= 0) {
			const nextIndex = gymOpponent.party.findIndex((p, idx) => idx !== gymOpponent.activeIndex && p.hp > 0);
			if (nextIndex < 0) {
				await finishRoom(room, trainer.id, `${trainer.name} defeated ${room.gym.leader} and won the ${room.gym.badge}!`);
				await grantGymReward(room);
				await saveRoom(room);
				scheduleFinishedRoomCleanup(room._id);
				return serializeRoom(room, role);
			}
			const fainted = gymOpponent.party[gymOpponent.activeIndex];
			addLog(room, `${fainted?.displayName || "The opponent's Pokémon"} fainted!`);
			gymOpponent.activeIndex = nextIndex;
			const nextPoke = gymOpponent.party[nextIndex];
			if (!nextPoke) {
				await saveRoom(room);
				return serializeRoom(room, role);
			}
			addLog(room, `${room.gym.leader} sent out ${nextPoke.displayName}.`);
			await saveRoom(room);
			return serializeRoom(room, role);
		}
		const player = activePokemon(room, role);
		const enemy = activePokemon(room, "opponent");
		if (player && enemy && player.hp > 0 && enemy.hp > 0) {
			const enemyMove = enemy.moves[0];
			const damage = enemyMove ? calcDamage(enemy, player, enemyMove) : Math.max(1, Math.floor(enemy.attack / 10));
			player.hp = Math.max(0, player.hp - damage);
			addLog(room, `${enemy.displayName} counterattacked for ${damage} damage.`);
			if (player.hp <= 0) {
				addLog(room, `${player.displayName} fainted.`);
				if (!healthyPokemon(trainer)) {
					await finishRoom(room, enemy.id, `${room.gym.leader} defeated ${trainer.name}.`);
					await saveRoom(room);
					scheduleFinishedRoomCleanup(room._id);
					return serializeRoom(room, role);
				}
				room.forcedSwitch = "challenger";
				room.turn = null;
				await saveRoom(room);
				return serializeRoom(room, role);
			}
		}
		room.turn = "challenger";
		room.round += 1;
		await saveRoom(room);
		return serializeRoom(room, role);
	}
	if (room.forcedSwitch && room.forcedSwitch !== role) throw new Error("Your opponent must choose a replacement Pokémon first.");
	if (action.type === "switch") {
		const index = action.pokemonIndex;
		if (!Number.isInteger(index) || index < 0 || index >= trainer.party.length) throw new Error("Choose a valid party slot.");
		if (index === trainer.activeIndex) throw new Error("That Pokémon is already in battle.");
		const replacement = trainer.party[index];
		if (!replacement || replacement.hp <= 0) throw new Error("A fainted Pokémon cannot be sent out.");
		const wasForced = room.forcedSwitch === role;
		trainer.activeIndex = index;
		room.forcedSwitch = null;
		room.turn = wasForced ? opposite(role) : opposite(role);
		addLog(room, `${trainer.name} sent out ${replacement.displayName}.`);
		await saveRoom(room);
		return serializeRoom(room, role);
	}
	if (room.forcedSwitch) throw new Error("Choose a replacement Pokémon before taking another action.");
	if (room.turn !== role) throw new Error("Wait for your turn.");
	if (action.type === "forfeit") {
		await finishRoom(room, room[opposite(role)]?.id ?? null, `${trainer.name} forfeited the battle.`);
		await saveRoom(room);
		scheduleFinishedRoomCleanup(room._id);
		return serializeRoom(room, role);
	}
	if (action.type === "item") throw new Error("Healing items are disabled during battles.");
	if (action.type !== "move") throw new Error("Choose a move, switch, item, or forfeit.");
	const attacker = activePokemon(room, role);
	const defender = activePokemon(room, opposite(role));
	if (!attacker || !defender) throw new Error("Both trainers need an active Pokémon.");
	const move = attacker.moves[action.moveIndex];
	if (!move) throw new Error("Choose one of the visible moves.");
	const attackName = `${attacker.displayName} used ${move.name}.`;
	if (Math.random() * 100 > (move.accuracy || 100)) {
		addLog(room, `${attackName} It missed.`);
		room.turn = opposite(role);
		room.round += 1;
		await saveRoom(room);
		return serializeRoom(room, role);
	}
	const multiplier = effectiveness(move.type, defender.types);
	const damage = calcDamage(attacker, defender, move);
	defender.hp = Math.max(0, defender.hp - damage);
	addLog(room, `${attackName} ${damage} damage.${multiplier === 0 ? " It had no effect." : multiplier >= 2 ? " Super effective!" : multiplier <= .5 ? " It was not very effective." : ""}`);
	if (defender.hp <= 0) {
		addLog(room, `${defender.displayName} fainted.`);
		if (!healthyPokemon(trainerFor(room, opposite(role)))) {
			await finishRoom(room, trainer.id, `${trainer.name} wins the battle!`);
			await saveRoom(room);
			scheduleFinishedRoomCleanup(room._id);
			return serializeRoom(room, role);
		}
		room.forcedSwitch = opposite(role);
		room.turn = null;
		await saveRoom(room);
		return serializeRoom(room, role);
	}
	room.turn = opposite(role);
	room.round += 1;
	await saveRoom(room);
	return serializeRoom(room, role);
}
var getSession_createServerFn_handler = createServerRpc({
	id: "6836eef4d148aaac1a55f89e238e45dc97e54cc8193ef7e202509924decb4a16",
	name: "getSession",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => getSession.__executeServer(opts));
var getSession = createServerFn({ method: "GET" }).handler(getSession_createServerFn_handler, async () => {
	const id = await currentUserId();
	if (!id) return null;
	try {
		const doc = await findUserById(id);
		return doc ? toPublicUser(doc) : null;
	} catch {
		return null;
	}
});
var phoneLogin_createServerFn_handler = createServerRpc({
	id: "f62609a11f40c9befeba022aa935f8dd53446030a89c8ae2d456f9d269233be7",
	name: "phoneLogin",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => phoneLogin.__executeServer(opts));
var phoneLogin = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	countryCode: stringType().min(1).max(4),
	phoneNumber: stringType().min(5).max(18),
	password: stringType().min(8).max(128)
}).parse(data)).handler(phoneLogin_createServerFn_handler, ({ data }) => beginPhoneLogin(data));
var verifyPhone_createServerFn_handler = createServerRpc({
	id: "622ca3899aa8d5f41c5224b3985b390553dc6b5434214e00f162b62a846b70e7",
	name: "verifyPhone",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => verifyPhone.__executeServer(opts));
var verifyPhone = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	countryCode: stringType().min(1).max(4),
	phoneNumber: stringType().min(5).max(18),
	code: stringType().regex(/^\d{6}$/)
}).parse(data)).handler(verifyPhone_createServerFn_handler, ({ data }) => completePhoneVerification(data));
var requestPasswordReset_createServerFn_handler = createServerRpc({
	id: "4f3472ab04048cd878f638ac96aa26d7461c0e6a1008d6b44f1587db0e5f25e6",
	name: "requestPasswordReset",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => requestPasswordReset.__executeServer(opts));
var requestPasswordReset = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	countryCode: stringType().min(1).max(4),
	phoneNumber: stringType().min(5).max(18),
	password: stringType().min(8).max(128)
}).parse(data)).handler(requestPasswordReset_createServerFn_handler, ({ data }) => beginPasswordReset(data));
var resetPassword_createServerFn_handler = createServerRpc({
	id: "d5e1a27384f5d6f874f9298d9a372aabeffb72dd91e94120db9a00668126295e",
	name: "resetPassword",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => resetPassword.__executeServer(opts));
var resetPassword = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	countryCode: stringType().min(1).max(4),
	phoneNumber: stringType().min(5).max(18),
	code: stringType().regex(/^\d{6}$/)
}).parse(data)).handler(resetPassword_createServerFn_handler, ({ data }) => completePasswordReset(data));
var startDiscordAccountLink_createServerFn_handler = createServerRpc({
	id: "1073ae4766354363c81c7a4ae398ef882004578aae3052c0fcfa265adce5cc2f",
	name: "startDiscordAccountLink",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => startDiscordAccountLink.__executeServer(opts));
var startDiscordAccountLink = createServerFn({ method: "POST" }).handler(startDiscordAccountLink_createServerFn_handler, () => startDiscordLink());
var finishDiscordAccountLink_createServerFn_handler = createServerRpc({
	id: "0bb31ab9933d9b669f9c7485ea7b0ea8948fee25ed54f4c66edcf66ee8546fe6",
	name: "finishDiscordAccountLink",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => finishDiscordAccountLink.__executeServer(opts));
var finishDiscordAccountLink = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	code: stringType().min(1).max(2048),
	state: stringType().min(1).max(256)
}).parse(data)).handler(finishDiscordAccountLink_createServerFn_handler, ({ data }) => completeDiscordLink(data));
var finishDiscordCallback_createServerFn_handler = createServerRpc({
	id: "25aca3dff326305115b01c2bb1f19fb276ab668574cfee6787a863af25ebcbce",
	name: "finishDiscordCallback",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => finishDiscordCallback.__executeServer(opts));
var finishDiscordCallback = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	code: stringType().min(1).max(2048),
	state: stringType().min(1).max(256)
}).parse(data)).handler(finishDiscordCallback_createServerFn_handler, ({ data }) => completeDiscordCallback(data));
var startDiscordWebsiteLogin_createServerFn_handler = createServerRpc({
	id: "39bc358a06b7e402791c700c7a3369343c92ca1b6d0f35f8b8b7bd087a4e09b3",
	name: "startDiscordWebsiteLogin",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => startDiscordWebsiteLogin.__executeServer(opts));
var startDiscordWebsiteLogin = createServerFn({ method: "POST" }).handler(startDiscordWebsiteLogin_createServerFn_handler, () => startDiscordLogin());
var finishDiscordWebsiteLogin_createServerFn_handler = createServerRpc({
	id: "d97fcdf7fbc26bf649e6d0991c60217dfa2d9f37fc5789cea08713f63ddd8494",
	name: "finishDiscordWebsiteLogin",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => finishDiscordWebsiteLogin.__executeServer(opts));
var finishDiscordWebsiteLogin = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	code: stringType().min(1).max(2048),
	state: stringType().min(1).max(256)
}).parse(data)).handler(finishDiscordWebsiteLogin_createServerFn_handler, ({ data }) => completeDiscordLogin(data));
var fetchDiscordLinkStatus_createServerFn_handler = createServerRpc({
	id: "5854fedddf7991a554652f744d803b14fa8d6a725f2052f10dafc29c9b3daf78",
	name: "fetchDiscordLinkStatus",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => fetchDiscordLinkStatus.__executeServer(opts));
var fetchDiscordLinkStatus = createServerFn({ method: "GET" }).handler(fetchDiscordLinkStatus_createServerFn_handler, () => getDiscordLinkStatus());
var removeDiscordAccountLink_createServerFn_handler = createServerRpc({
	id: "e392a307e86ab97aa2c77da4a4cd3619c568ce2c5190b3312d1cd4da234ad621",
	name: "removeDiscordAccountLink",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => removeDiscordAccountLink.__executeServer(opts));
var removeDiscordAccountLink = createServerFn({ method: "POST" }).handler(removeDiscordAccountLink_createServerFn_handler, () => unlinkDiscordAccount());
var logout_createServerFn_handler = createServerRpc({
	id: "f713a3a2cd6883bcbd2fd1593e04505a23b34ee631bfae8c4e5ef8c00cf13e73",
	name: "logout",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => logout.__executeServer(opts));
var logout = createServerFn({ method: "POST" }).handler(logout_createServerFn_handler, async () => {
	clearSession();
	return { ok: true };
});
var fetchShopItems_createServerFn_handler = createServerRpc({
	id: "1aec6568e42c8d81d85d157573d3da10702f7ba068e1d997138a818bf3e11e4c",
	name: "fetchShopItems",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => fetchShopItems.__executeServer(opts));
var fetchShopItems = createServerFn({ method: "GET" }).handler(fetchShopItems_createServerFn_handler, () => listShopItems());
var fetchLeaderboard_createServerFn_handler = createServerRpc({
	id: "5d5d361e3d9a4391944cd0c9b56f76b763e068b2e398bc6781c0684d553d9409",
	name: "fetchLeaderboard",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => fetchLeaderboard.__executeServer(opts));
var fetchLeaderboard = createServerFn({ method: "GET" }).handler(fetchLeaderboard_createServerFn_handler, () => leaderboard("xp"));
var fetchXpLeaderboard_createServerFn_handler = createServerRpc({
	id: "1993df90e8d4a607cd751108d9363c982b3d4ce6022c12bc195f7a44fb2ff244",
	name: "fetchXpLeaderboard",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => fetchXpLeaderboard.__executeServer(opts));
var fetchXpLeaderboard = createServerFn({ method: "GET" }).handler(fetchXpLeaderboard_createServerFn_handler, () => leaderboard("xp"));
var fetchCoinsLeaderboard_createServerFn_handler = createServerRpc({
	id: "f93261eba76e3294c5a5cfcae0b90be467960f8ec0240435ac4e5631252f6cab",
	name: "fetchCoinsLeaderboard",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => fetchCoinsLeaderboard.__executeServer(opts));
var fetchCoinsLeaderboard = createServerFn({ method: "GET" }).handler(fetchCoinsLeaderboard_createServerFn_handler, () => leaderboard("coins"));
var fetchCardsLeaderboard_createServerFn_handler = createServerRpc({
	id: "4cd72bcb0978d20781688246bd247e5aa67a9817cb91b5074b136abd3b49deff",
	name: "fetchCardsLeaderboard",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => fetchCardsLeaderboard.__executeServer(opts));
var fetchCardsLeaderboard = createServerFn({ method: "GET" }).handler(fetchCardsLeaderboard_createServerFn_handler, () => leaderboard("cards"));
var fetchPokemonLeaderboard_createServerFn_handler = createServerRpc({
	id: "db64a5fd4d5353bde81525314d101d15af3841b68e6224ba57a22e6f57f16804",
	name: "fetchPokemonLeaderboard",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => fetchPokemonLeaderboard.__executeServer(opts));
var fetchPokemonLeaderboard = createServerFn({ method: "GET" }).handler(fetchPokemonLeaderboard_createServerFn_handler, () => leaderboard("pokemon"));
var fetchGymsLeaderboard_createServerFn_handler = createServerRpc({
	id: "28c1c7c18c27712b2dd461a6875bc1fb52099d837ba43091f0529d3096045d2d",
	name: "fetchGymsLeaderboard",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => fetchGymsLeaderboard.__executeServer(opts));
var fetchGymsLeaderboard = createServerFn({ method: "GET" }).handler(fetchGymsLeaderboard_createServerFn_handler, () => leaderboard("gyms"));
var fetchMyCards_createServerFn_handler = createServerRpc({
	id: "9787a93b03832dea7441331c48c3cef92dd05e6c3f9b3371af2cd13acbea1ce1",
	name: "fetchMyCards",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => fetchMyCards.__executeServer(opts));
var fetchMyCards = createServerFn({ method: "GET" }).inputValidator((data) => objectType({ scope: enumType(["mine", "global"]).default("mine") }).parse(data ?? {})).handler(fetchMyCards_createServerFn_handler, ({ data }) => data.scope === "global" ? listCards("global") : listMyCards());
var fetchCardMarket_createServerFn_handler = createServerRpc({
	id: "4d30d905ee0efe96081f2cd930a1db00fd644ec7d554fc536fedf72abe605882",
	name: "fetchCardMarket",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => fetchCardMarket.__executeServer(opts));
var fetchCardMarket = createServerFn({ method: "GET" }).handler(fetchCardMarket_createServerFn_handler, () => listCardMarket());
var buyCardListing_createServerFn_handler = createServerRpc({
	id: "ef7b43844a040dee2b16d9b72bd6a5da48d39a7a34a554a4ddaf485e886a1d62",
	name: "buyCardListing",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => buyCardListing.__executeServer(opts));
var buyCardListing = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ listingId: stringType().min(1).max(128) }).parse(data)).handler(buyCardListing_createServerFn_handler, ({ data }) => purchaseCardListing(data.listingId));
var fetchMyPets_createServerFn_handler = createServerRpc({
	id: "b65a90caceb7b2464f8d2f14ba05431c3e12d371c3941ac88306d2501476129c",
	name: "fetchMyPets",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => fetchMyPets.__executeServer(opts));
var fetchMyPets = createServerFn({ method: "GET" }).handler(fetchMyPets_createServerFn_handler, () => listMyPets());
var feedMyPet_createServerFn_handler = createServerRpc({
	id: "610bd6d4e9d941f3c949470342d6d72127647782fd2684647a69d16649e122fb",
	name: "feedMyPet",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => feedMyPet.__executeServer(opts));
var feedMyPet = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ petId: stringType().min(1).max(16) }).parse(data)).handler(feedMyPet_createServerFn_handler, ({ data }) => feedPet(data.petId));
var playWithPet_createServerFn_handler = createServerRpc({
	id: "f8ac1b72407a64567274bd1095780486b6570860f6afecde8f21e28d8a493911",
	name: "playWithPet",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => playWithPet.__executeServer(opts));
var playWithPet = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ petId: stringType().min(1).max(16) }).parse(data)).handler(playWithPet_createServerFn_handler, ({ data }) => playPet(data.petId));
var hatchMyPet_createServerFn_handler = createServerRpc({
	id: "3333ca49f7cb1ebeca41a691cc07cd50e0e516b4c814acf81013d776612dfba5",
	name: "hatchMyPet",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => hatchMyPet.__executeServer(opts));
var hatchMyPet = createServerFn({ method: "POST" }).handler(hatchMyPet_createServerFn_handler, () => hatchPet());
var selectMyPet_createServerFn_handler = createServerRpc({
	id: "5b8d4d8f1a17b390b6b104279567809d8192e471d8186eb3e2f3677f367082b2",
	name: "selectMyPet",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => selectMyPet.__executeServer(opts));
var selectMyPet = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ petId: stringType().min(1).max(16) }).parse(data)).handler(selectMyPet_createServerFn_handler, ({ data }) => selectPet(data.petId));
var releaseMyPet_createServerFn_handler = createServerRpc({
	id: "0f55ff827cdd6c5ff47b25f0b6532928164a40c6a9afb7feef82295e3e8f9133",
	name: "releaseMyPet",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => releaseMyPet.__executeServer(opts));
var releaseMyPet = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ petId: stringType().min(1).max(16) }).parse(data)).handler(releaseMyPet_createServerFn_handler, ({ data }) => releasePet(data.petId));
var buyPetCareItem_createServerFn_handler = createServerRpc({
	id: "4ebc10a1dc1b7018fb7b141b1749a49ded7250c6ea9e9fb4865bf3bf090a819a",
	name: "buyPetCareItem",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => buyPetCareItem.__executeServer(opts));
var buyPetCareItem = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	itemKey: enumType([
		"kibble",
		"meal",
		"toy",
		"exppotion",
		"revival",
		"berry",
		"energy",
		"deluxemeal",
		"grooming",
		"friendship",
		"superxp",
		"goldenmeal"
	]),
	petId: stringType().min(1).max(16)
}).parse(data)).handler(buyPetCareItem_createServerFn_handler, ({ data }) => buyPetCare(data.itemKey, data.petId));
var saveProfile_createServerFn_handler = createServerRpc({
	id: "b5f85ed8a6bf55b24cb2884887d93bfa0a35b639491af1f5c3effa34702c7c1e",
	name: "saveProfile",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => saveProfile.__executeServer(opts));
var saveProfile = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	name: stringType().min(2).max(32),
	bio: stringType().max(240),
	title: stringType().max(40),
	avatar: stringType().max(24),
	banner: stringType().max(24),
	avatarImage: stringType().max(15e5).optional(),
	avatarVideo: stringType().max(5e6).optional(),
	background: stringType().max(15e5).optional()
}).parse(data)).handler(saveProfile_createServerFn_handler, ({ data }) => updateProfile(data));
var pickStarter_createServerFn_handler = createServerRpc({
	id: "5aac3408ca04e549f687a95d0e1d3810bf41c97b8c05f1ca45323f5385f1de97",
	name: "pickStarter",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => pickStarter.__executeServer(opts));
var pickStarter = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ starterId: stringType().max(40) }).parse(data)).handler(pickStarter_createServerFn_handler, ({ data }) => chooseStarter(data.starterId));
var claimDailyReward_createServerFn_handler = createServerRpc({
	id: "a66209e368ce7395b19bf65b257160b634c2414f563f3715ec20e367c78f3280",
	name: "claimDailyReward",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => claimDailyReward.__executeServer(opts));
var claimDailyReward = createServerFn({ method: "POST" }).handler(claimDailyReward_createServerFn_handler, () => claimDaily());
var purchaseItem_createServerFn_handler = createServerRpc({
	id: "daef23f9b57c40f8641d1293c1bdc32dcf6a0ed2d57e9f21003b6d82409b9b04",
	name: "purchaseItem",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => purchaseItem.__executeServer(opts));
var purchaseItem = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	itemId: stringType().max(40),
	qty: numberType().int().min(1).max(99)
}).parse(data)).handler(purchaseItem_createServerFn_handler, ({ data }) => buyItem(data));
var fetchGuilds_createServerFn_handler = createServerRpc({
	id: "51ed73c754504060570b808d30c7130772cc8d025e254bf2cc40b13cdc2af559",
	name: "fetchGuilds",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => fetchGuilds.__executeServer(opts));
var fetchGuilds = createServerFn({ method: "GET" }).handler(fetchGuilds_createServerFn_handler, () => listGuilds());
var requestJoinGuild_createServerFn_handler = createServerRpc({
	id: "74ead4daf4efecca72c1376fdedeb56f201bf49202cdd317f3e1a441d8553e65",
	name: "requestJoinGuild",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => requestJoinGuild.__executeServer(opts));
var requestJoinGuild = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ guildId: stringType().max(40) }).parse(data)).handler(requestJoinGuild_createServerFn_handler, ({ data }) => joinGuild(data.guildId));
var requestLeaveGuild_createServerFn_handler = createServerRpc({
	id: "96b0853847d8af81d03eaa3883275c1922a70d4412285b60aafb71a4d542c8c5",
	name: "requestLeaveGuild",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => requestLeaveGuild.__executeServer(opts));
var requestLeaveGuild = createServerFn({ method: "POST" }).handler(requestLeaveGuild_createServerFn_handler, () => leaveGuild());
var charterGuild_createServerFn_handler = createServerRpc({
	id: "65ff2667aa530c1d545c6897ac7316654b8b6d313f020e5e86822311a94b8d8b",
	name: "charterGuild",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => charterGuild.__executeServer(opts));
var charterGuild = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	name: stringType().min(3).max(32),
	tag: stringType().min(2).max(5),
	description: stringType().max(200)
}).parse(data)).handler(charterGuild_createServerFn_handler, ({ data }) => createGuild(data));
var upgradeMyGuild_createServerFn_handler = createServerRpc({
	id: "5e7a87b75cd54c986bb9b8e97c5a3a58a8b60bba09627292be922b5b5eb050d0",
	name: "upgradeMyGuild",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => upgradeMyGuild.__executeServer(opts));
var upgradeMyGuild = createServerFn({ method: "POST" }).handler(upgradeMyGuild_createServerFn_handler, () => upgradeGuild());
var updateGuildSettings_createServerFn_handler = createServerRpc({
	id: "0a520bd6a3049f8faf5faeeb07df79bb9c97fa39dd8c9a63e50496ea94ec51c5",
	name: "updateGuildSettings",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => updateGuildSettings.__executeServer(opts));
var updateGuildSettings = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	description: stringType().max(200).optional(),
	iconUrl: stringType().url().optional(),
	bannerUrl: stringType().url().optional()
}).parse(data)).handler(updateGuildSettings_createServerFn_handler, ({ data }) => updateGuildInfo({
	description: data.description,
	iconUrl: data.iconUrl,
	bannerUrl: data.bannerUrl
}));
var flipCoin_createServerFn_handler = createServerRpc({
	id: "0daaf786d75c79d19077d87a46a45f376ce7877212ab04be2c3f6956afe1b271",
	name: "flipCoin",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => flipCoin.__executeServer(opts));
var flipCoin = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	wager: numberType().int().min(50).max(1e9),
	pick: enumType(["heads", "tails"])
}).parse(data)).handler(flipCoin_createServerFn_handler, ({ data }) => playCoinFlip(data));
var spinSlots_createServerFn_handler = createServerRpc({
	id: "566baf114ba4bab1140ee56b0d2b9d86aa0cd8670884cce7e7f4d258707a3107",
	name: "spinSlots",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => spinSlots.__executeServer(opts));
var spinSlots = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ wager: numberType().int().min(50).max(1e9) }).parse(data)).handler(spinSlots_createServerFn_handler, ({ data }) => playSlots(data));
var placeBet_createServerFn_handler = createServerRpc({
	id: "184e9333955d8e763429b4f5ea085d31be11f640ebe8c4dd8d33169e8747e6af",
	name: "placeBet",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => placeBet.__executeServer(opts));
var placeBet = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ wager: numberType().int().min(10).max(1e9) }).parse(data)).handler(placeBet_createServerFn_handler, ({ data }) => playBet(data));
var throwDice_createServerFn_handler = createServerRpc({
	id: "86fcf5aaafe62c70b6400b56ade956dc5f85aa6040b9ada599b7e1d01c051476",
	name: "throwDice",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => throwDice.__executeServer(opts));
var throwDice = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	wager: numberType().int().min(50).max(5e8),
	guess: numberType().int().min(1).max(6)
}).parse(data)).handler(throwDice_createServerFn_handler, ({ data }) => playDice(data));
var spinRoulette_createServerFn_handler = createServerRpc({
	id: "2784a1094b5031f4d24dac6d3d1cdc0c403abbad3106f66bd0a09a7a4b3527a5",
	name: "spinRoulette",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => spinRoulette.__executeServer(opts));
var spinRoulette = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	wager: numberType().int().min(100).max(1e9),
	color: enumType([
		"red",
		"black",
		"green"
	])
}).parse(data)).handler(spinRoulette_createServerFn_handler, ({ data }) => playRoulette(data));
var setLead_createServerFn_handler = createServerRpc({
	id: "9bd63b34e7e6939929e7e763603ecd67f79841aa69ca3fe08ac96c3aa4561b23",
	name: "setLead",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => setLead.__executeServer(opts));
var setLead = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ pokemonId: stringType().min(1).max(64) }).parse(data)).handler(setLead_createServerFn_handler, ({ data }) => setLeadPokemon(data.pokemonId));
var reorderParty_createServerFn_handler = createServerRpc({
	id: "be33a69bf39bad39d77dafef25e4305248977d124299563ece0469590b3bd98d",
	name: "reorderParty",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => reorderParty.__executeServer(opts));
var reorderParty = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	first: numberType().int().min(1).max(6),
	second: numberType().int().min(1).max(6)
}).parse(data)).handler(reorderParty_createServerFn_handler, ({ data }) => swapParty(data));
var movePartyPokemon_createServerFn_handler = createServerRpc({
	id: "6f093b4b7084d226c16e8344e79d302e7d309934361f04de7409db4445d01a95",
	name: "movePartyPokemon",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => movePartyPokemon.__executeServer(opts));
var movePartyPokemon = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	pokemonId: stringType().min(1).max(64),
	destination: enumType(["party", "pc"])
}).parse(data)).handler(movePartyPokemon_createServerFn_handler, ({ data }) => movePokemon(data));
var fetchBattleRooms_createServerFn_handler = createServerRpc({
	id: "f816020cf03ec6615216de357af7ddb383be5e7988aec288c3c4fbb5b55d2be5",
	name: "fetchBattleRooms",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => fetchBattleRooms.__executeServer(opts));
var fetchBattleRooms = createServerFn({ method: "GET" }).handler(fetchBattleRooms_createServerFn_handler, () => listBattleRooms());
var openBattleRoom_createServerFn_handler = createServerRpc({
	id: "4332567f9d8e9e8d440d82c26d32a3e9a893e033db196ef120e0fad65f9ccaee",
	name: "openBattleRoom",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => openBattleRoom.__executeServer(opts));
var openBattleRoom = createServerFn({ method: "POST" }).handler(openBattleRoom_createServerFn_handler, () => createBattleRoom());
var fetchGyms_createServerFn_handler = createServerRpc({
	id: "f9a19616b1a2f5f2c3e4895efa2284a3b2689ea414b2771bf0f9e76744e7d170",
	name: "fetchGyms",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => fetchGyms.__executeServer(opts));
var fetchGyms = createServerFn({ method: "GET" }).handler(fetchGyms_createServerFn_handler, () => listGyms());
var openGymRoom_createServerFn_handler = createServerRpc({
	id: "6b2f3daee2225e48474eb179c10c8f0755ea6fbecdf625b7e352624c9ae012b8",
	name: "openGymRoom",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => openGymRoom.__executeServer(opts));
var openGymRoom = createServerFn({ method: "POST" }).inputValidator((data) => objectType({ gymId: stringType().min(1).max(40) }).parse(data)).handler(openGymRoom_createServerFn_handler, ({ data }) => createGymBattleRoom(data.gymId));
var fetchBattleRoom_createServerFn_handler = createServerRpc({
	id: "026830a16afdeec8ea8d9def3ebf4077bfcbb2669a6a83cda81cc7a181bf1b17",
	name: "fetchBattleRoom",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => fetchBattleRoom.__executeServer(opts));
var fetchBattleRoom = createServerFn({ method: "GET" }).inputValidator((data) => objectType({ roomId: stringType().min(1).max(64) }).parse(data)).handler(fetchBattleRoom_createServerFn_handler, ({ data }) => getBattleRoom(data.roomId));
var applyBattleAction_createServerFn_handler = createServerRpc({
	id: "10af32fa82009baab8fd37231f2b8d7edbaaa02d7cb76b3277d6ac5a1ce600bf",
	name: "applyBattleAction",
	filename: "src/lib/aidoru.functions.ts"
}, (opts) => applyBattleAction.__executeServer(opts));
var applyBattleAction = createServerFn({ method: "POST" }).inputValidator((data) => objectType({
	roomId: stringType().min(1).max(64),
	action: discriminatedUnionType("type", [
		objectType({ type: literalType("ready") }),
		objectType({
			type: literalType("move"),
			moveIndex: numberType().int().min(0).max(10)
		}),
		objectType({
			type: literalType("switch"),
			pokemonIndex: numberType().int().min(0).max(5)
		}),
		objectType({
			type: literalType("item"),
			item: enumType([
				"potion",
				"superpotion",
				"hyperpotion",
				"revive",
				"fullrestore"
			])
		}),
		objectType({ type: literalType("forfeit") })
	])
}).parse(data)).handler(applyBattleAction_createServerFn_handler, ({ data }) => performBattleAction(data.roomId, data.action));
//#endregion
export { applyBattleAction_createServerFn_handler, buyCardListing_createServerFn_handler, buyPetCareItem_createServerFn_handler, charterGuild_createServerFn_handler, claimDailyReward_createServerFn_handler, feedMyPet_createServerFn_handler, fetchBattleRoom_createServerFn_handler, fetchBattleRooms_createServerFn_handler, fetchCardMarket_createServerFn_handler, fetchCardsLeaderboard_createServerFn_handler, fetchCoinsLeaderboard_createServerFn_handler, fetchDiscordLinkStatus_createServerFn_handler, fetchGuilds_createServerFn_handler, fetchGymsLeaderboard_createServerFn_handler, fetchGyms_createServerFn_handler, fetchLeaderboard_createServerFn_handler, fetchMyCards_createServerFn_handler, fetchMyPets_createServerFn_handler, fetchPokemonLeaderboard_createServerFn_handler, fetchShopItems_createServerFn_handler, fetchXpLeaderboard_createServerFn_handler, finishDiscordAccountLink_createServerFn_handler, finishDiscordCallback_createServerFn_handler, finishDiscordWebsiteLogin_createServerFn_handler, flipCoin_createServerFn_handler, getSession_createServerFn_handler, hatchMyPet_createServerFn_handler, logout_createServerFn_handler, movePartyPokemon_createServerFn_handler, openBattleRoom_createServerFn_handler, openGymRoom_createServerFn_handler, phoneLogin_createServerFn_handler, pickStarter_createServerFn_handler, placeBet_createServerFn_handler, playWithPet_createServerFn_handler, purchaseItem_createServerFn_handler, releaseMyPet_createServerFn_handler, removeDiscordAccountLink_createServerFn_handler, reorderParty_createServerFn_handler, requestJoinGuild_createServerFn_handler, requestLeaveGuild_createServerFn_handler, requestPasswordReset_createServerFn_handler, resetPassword_createServerFn_handler, saveProfile_createServerFn_handler, selectMyPet_createServerFn_handler, setLead_createServerFn_handler, spinRoulette_createServerFn_handler, spinSlots_createServerFn_handler, startDiscordAccountLink_createServerFn_handler, startDiscordWebsiteLogin_createServerFn_handler, throwDice_createServerFn_handler, updateGuildSettings_createServerFn_handler, upgradeMyGuild_createServerFn_handler, verifyPhone_createServerFn_handler };
