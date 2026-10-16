/**
 * MongoDB-backed registry for paired bot processes.
 *
 * A bot writes a heartbeat while its WhatsApp connection is open. The
 * `.bots` command treats records without a recent heartbeat as offline, so a
 * process crash cannot leave a bot permanently marked online.
 *
 * Bots with `sessionDeleted: true` are hidden from the public list entirely
 * (their WhatsApp session has been wiped and they can never reconnect without
 * re-pairing — use markBotSessionDeleted() to flag them).
 */
import { getDb } from "./mongo.mjs";

export const BOT_REGISTRY_COLLECTION = "bot_status";
export const BOT_HEARTBEAT_INTERVAL_MS = 20_000;
export const BOT_ONLINE_WINDOW_MS = BOT_HEARTBEAT_INTERVAL_MS * 3 + 10_000;

function collection() {
  return getDb().collection(BOT_REGISTRY_COLLECTION);
}

export function normalizeBotIdentity(value) {
  const raw = String(value || "").trim().replace(/^bot:/, "");
  if (!raw) return "";
  const normalized = raw.includes("@")
    ? `${raw.split("@")[0].split(":")[0]}@${raw.split("@")[1].toLowerCase()}`
    : raw;
  if (normalized.endsWith("@lid")) return normalized;
  return normalized.split(":")[0].replace("@s.whatsapp.net", "").replace(/\D/g, "");
}

export function botRegistryId(value) {
  const identity = normalizeBotIdentity(value);
  return identity ? `bot:${identity}` : null;
}

function normalizeBotJid(botJid) {
  const identity = normalizeBotIdentity(botJid);
  return identity.endsWith("@lid") ? "" : identity;
}

function botId(botJid) {
  return botRegistryId(botJid);
}

export async function markBotOnline({ botJid, phoneJid = botJid, botName, startedAt }) {
  const id = botId(botJid);
  if (!id) return false;

  const now = new Date();
  const bots = collection();
  const phoneId = botId(phoneJid);
  if (phoneId && phoneId !== id) {
    const legacy = await bots.findOne({ _id: phoneId });
    if (legacy) {
      const current = await bots.findOne({ _id: id });
      if (!current) {
        const botLid = normalizeBotIdentity(botJid);
        await bots.insertOne({
          ...legacy,
          _id: id,
          ...(botLid.endsWith("@lid") ? { lid: botLid } : {}),
          ...(normalizeBotJid(phoneJid) ? { number: normalizeBotJid(phoneJid) } : {}),
          migratedFrom: phoneId,
          migratedAt: now,
        }).catch(async (error) => {
          if (error?.code !== 11000) throw error;
          return bots.findOne({ _id: id });
        });
      }
      await bots.updateOne(
        { _id: phoneId },
        { $set: { status: "offline", sessionDeleted: true, migratedTo: id, updatedAt: now } },
      );
    }
  }

  const botLid = normalizeBotIdentity(botJid);
  await bots.updateOne(
    { _id: id },
    {
      $set: {
        botName: botName || "Unknown Bot",
        ...(normalizeBotJid(phoneJid) ? { number: normalizeBotJid(phoneJid) } : {}),
        ...(botLid.endsWith("@lid") ? { lid: botLid } : {}),
        status: "online",
        startedAt: startedAt instanceof Date ? startedAt : now,
        lastSeenAt: now,
        updatedAt: now,
        sessionDeleted: false,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );
  return true;
}

export async function heartbeatBot(botJid) {
  const id = botId(botJid);
  if (!id) return false;

  const now = new Date();
  await collection().updateOne(
    { _id: id },
    {
      $set: {
        status: "online",
        lastSeenAt: now,
        updatedAt: now,
      },
    },
  );
  return true;
}

export async function markBotOffline(botJid) {
  const id = botId(botJid);
  if (!id) return false;

  const now = new Date();
  await collection().updateOne(
    { _id: id },
    {
      $set: {
        status: "offline",
        lastSeenAt: now,
        updatedAt: now,
      },
    },
  );
  return true;
}

/**
 * Mark a bot's session as deleted — it will no longer appear in .bots output.
 * Pass either a full JID or a phone number string.
 */
export async function markBotSessionDeleted(botJidOrNumber) {
  const id = botId(botJidOrNumber);
  if (!id) return false;
  const now = new Date();
  await collection().updateOne(
    { _id: id },
    {
      $set: {
        status: "offline",
        sessionDeleted: true,
        updatedAt: now,
      },
    },
  );
  return true;
}

/** Returns all bots whose sessions have NOT been deleted. */
export async function listRegisteredBots() {
  return collection()
    .find({ sessionDeleted: { $ne: true } })
    .sort({ botName: 1, number: 1 })
    .toArray();
}

export function isBotOnline(bot, now = Date.now()) {
  const lastSeen = bot?.lastSeenAt ? new Date(bot.lastSeenAt).getTime() : 0;
  return bot?.status === "online"
    && Number.isFinite(lastSeen)
    && now - lastSeen <= BOT_ONLINE_WINDOW_MS;
}

export function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(milliseconds) / 1000));
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    days    ? `${days}d`    : "",
    hours   ? `${hours}h`   : "",
    minutes ? `${minutes}m` : "",
    `${seconds}s`,
  ].filter(Boolean).join(" ");
}
