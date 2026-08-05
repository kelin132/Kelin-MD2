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

function normalizeBotJid(botJid) {
  return String(botJid || "")
    .split(":")[0]
    .replace("@s.whatsapp.net", "")
    .replace(/\D/g, "");
}

function botId(botJid) {
  const number = normalizeBotJid(botJid);
  return number ? `bot:${number}` : null;
}

export async function markBotOnline({ botJid, botName, startedAt }) {
  const id = botId(botJid);
  if (!id) return false;

  const now = new Date();
  await collection().updateOne(
    { _id: id },
    {
      $set: {
        botName: botName || "Unknown Bot",
        number: normalizeBotJid(botJid),
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
  // Accept plain numbers like "254712345678" or full JIDs
  const normalized = String(botJidOrNumber || "").replace(/\D/g, "");
  if (!normalized) return false;

  const id = `bot:${normalized}`;
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
