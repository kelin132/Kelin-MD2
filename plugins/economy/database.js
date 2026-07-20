/**
 * KELIN MD — Economy database (MongoDB-backed)
 * All economy / staff plugins import from here.
 */
import { getDb } from "../../lib/mongo.mjs";

export const DEFAULTS = {
  name:          "User",
  money:         0,
  bank:          0,
  vault:         0,
  orbs:          0,           // premium currency earned from dig/fish/events
  level:         1,
  xp:            0,
  bio:           "",
  age:           null,
  inventory:     [],
  history:       [],          // last 10 transactions [{type,amount,desc,ts}]
  lastDaily:     0,
  lastWeekly:    0,
  lastMonthly:   0,
  lastWork:      0,
  lastCrime:     0,
  lastRob:       0,
  lastDig:       0,
  lastFish:      0,
  lastGamble:    0,
  jail:          false,
  jailed:        false,
  jailUntil:     null,
  shame:         0,           // times shamed by others
  shameBy:       null,        // last person who shamed you
  loan:          null,        // { amount, due, active, interest }
  afk:           null,        // { active, message, since }
  staffLevel:    0,           // 0=user 1=mod 2=staff 3=admin
  isPremium:     false,
  staffImmunity: false,
  registered:    false,
  registeredAt:  null,
};

// ─── Core CRUD ────────────────────────────────────────────────────────────────

export async function getUser(id) {
  const db   = await getDb();
  const user = await db.collection("users").findOne({ _id: id });
  if (!user) return { ...DEFAULTS };
  const { _id, ...rest } = user;
  return { ...DEFAULTS, ...rest };
}

export async function saveUser(id, data) {
  const db = await getDb();
  const { _id, ...safeData } = data;
  await db.collection("users").updateOne(
    { _id: id },
    { $set: safeData },
    { upsert: true }
  );
}

export async function getAllUsers() {
  const db = await getDb();
  return db.collection("users").find({ registered: true }).toArray();
}

// ─── Registration ─────────────────────────────────────────────────────────────

export async function isRegistered(id) {
  const db   = await getDb();
  const user = await db.collection("users").findOne({ _id: id }, { projection: { registered: 1 } });
  return !!(user?.registered);
}

export async function registerUser(id, name) {
  const db = await getDb();
  const { name: _n, registered: _r, registeredAt: _ra, ...insertDefaults } = DEFAULTS;
  await db.collection("users").updateOne(
    { _id: id },
    {
      $setOnInsert: { ...insertDefaults, money: 1000 },
      $set: { name: name || "User", registered: true, registeredAt: new Date().toISOString() },
    },
    { upsert: true }
  );
}

/** Convenience: send a "you need to register" message and return false */
export async function requireRegistration(sock, msg, sender) {
  const ok = await isRegistered(sender);
  if (!ok) {
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: "❌ You need to register first!\n\nUse *.register <your_name>* to create your account." },
      { quoted: msg }
    );
  }
  return ok;
}

// ─── Transaction history ──────────────────────────────────────────────────────

/**
 * Append a transaction to the user's history (capped at 10).
 * @param {string} id      – sender JID
 * @param {string} type    – e.g. "daily", "work", "rob", "deposit", ...
 * @param {number} amount  – positive = earned, negative = lost
 * @param {string} desc    – short human-readable description
 */
export async function addHistory(id, type, amount, desc) {
  const db = await getDb();
  const entry = { type, amount, desc, ts: Date.now() };
  await db.collection("users").updateOne(
    { _id: id },
    {
      $push: {
        history: {
          $each:  [entry],
          $slice: -10,      // keep last 10
        },
      },
    }
  );
}

// ─── Staff / Mod ──────────────────────────────────────────────────────────────

/**
 * Set a user's staff level.
 * 0 = user, 1 = mod, 2 = staff, 3 = admin
 */
export async function setStaffLevel(id, level) {
  const db = await getDb();
  await db.collection("users").updateOne(
    { _id: id },
    { $set: { staffLevel: level } },
    { upsert: true }
  );
}

export async function removeStaffLevel(id) {
  return setStaffLevel(id, 0);
}

export async function getStaffMembers() {
  const db = await getDb();
  return db.collection("users").find(
    { staffLevel: { $gte: 1 } },
    { projection: { _id: 1, name: 1, staffLevel: 1 } }
  ).toArray();
}

// ─── Premium ──────────────────────────────────────────────────────────────────

export async function setPremium(id, value) {
  const db = await getDb();
  await db.collection("users").updateOne(
    { _id: id },
    { $set: { isPremium: value } },
    { upsert: true }
  );
}

// ─── Jail ─────────────────────────────────────────────────────────────────────

/**
 * @param {string} id
 * @param {number} durationMs  0 = indefinite
 */
export async function jailUser(id, durationMs = 0) {
  const db       = await getDb();
  const jailUntil = durationMs > 0 ? Date.now() + durationMs : null;
  await db.collection("users").updateOne(
    { _id: id },
    { $set: { jailed: true, jailUntil } },
    { upsert: true }
  );
}

export async function unjailUser(id) {
  const db = await getDb();
  await db.collection("users").updateOne(
    { _id: id },
    { $set: { jailed: false, jailUntil: null } }
  );
}

// ─── Staff Immunity ───────────────────────────────────────────────────────────

export async function setStaffImmunity(id, value) {
  const db = await getDb();
  await db.collection("users").updateOne(
    { _id: id },
    { $set: { staffImmunity: value } },
    { upsert: true }
  );
}

// ─── Admin helpers ────────────────────────────────────────────────────────────

export async function deletePlayer(id) {
  const db = await getDb();
  await db.collection("users").deleteOne({ _id: id });
}

export async function resetPlayer(id) {
  const db   = await getDb();
  const user = await getUser(id);
  const { name, registered, registeredAt, staffLevel, isPremium, staffImmunity } = user;
  // Preserve identity fields, wipe economy
  await db.collection("users").updateOne(
    { _id: id },
    {
      $set: {
        ...DEFAULTS,
        name, registered, registeredAt, staffLevel, isPremium, staffImmunity,
        money: 0, bank: 0, vault: 0, xp: 0, level: 1, inventory: [], history: [],
      },
    }
  );
}

/**
 * Set individual player stat fields.
 * @param {string} id
 * @param {object} fields – e.g. { money: 5000, level: 10 }
 */
export async function setPlayerFields(id, fields) {
  const db = await getDb();
  await db.collection("users").updateOne(
    { _id: id },
    { $set: fields },
    { upsert: true }
  );
}
