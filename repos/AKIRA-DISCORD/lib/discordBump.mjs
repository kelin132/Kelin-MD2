import { getDb } from "./mongo.mjs";

export const BUMP_CHANNEL_ID = "1544619838079635527";
export const BUMP_INTERVAL_MS = 2 * 60 * 60 * 1000;
const COLLECTION = "discordBumpReminders";
const timers = new Map();
let discordClient = null;

export async function findBumpiesRole(guild) {
  const cached = guild?.roles?.cache?.find(
    (entry) => entry.name.trim().toLowerCase() === "bumpies",
  );
  if (cached) return cached;
  const roles = await guild?.roles?.fetch?.().catch(() => null);
  return roles?.find(
    (entry) => entry.name.trim().toLowerCase() === "bumpies",
  ) || null;
}

function reminderKey(guildId, channelId) {
  return `${guildId}:${channelId}`;
}

function clearReminderTimer(key) {
  const timer = timers.get(key);
  if (timer) clearTimeout(timer);
  timers.delete(key);
}

async function sendReminder(document) {
  const key = reminderKey(document.guildId, document.channelId);
  clearReminderTimer(key);

  const db = getDb();
  const claimed = await db.collection(COLLECTION).findOneAndUpdate(
    {
      _id: document._id,
      dueAt: document.dueAt,
      remindedAt: { $exists: false },
    },
    { $set: { remindedAt: new Date() } },
    { returnDocument: "before" },
  );
  if (!claimed) return;

  try {
    const guild = await discordClient?.guilds.fetch(document.guildId);
    const channel = await guild?.channels.fetch(document.channelId);
    if (!channel?.isTextBased?.()) return;

    const role = await findBumpiesRole(guild);
    const content = role
      ? `<@&${role.id}> ⏰ It has been 2 hours. Please use \`/bump\` to bump this server!`
      : "⏰ It has been 2 hours. Please use `/bump` to bump this server!";

    await channel.send({
      content,
      allowedMentions: role ? { roles: [role.id] } : { parse: [] },
    });
  } catch (error) {
    console.error("[discord bump] reminder failed:", error.message);
  }
}

function scheduleReminder(document) {
  if (!discordClient || document.remindedAt) return;

  const key = reminderKey(document.guildId, document.channelId);
  clearReminderTimer(key);
  const delay = Math.max(0, new Date(document.dueAt).getTime() - Date.now());
  const timer = setTimeout(() => {
    sendReminder(document).catch((error) => {
      console.error("[discord bump] scheduled reminder failed:", error.message);
    });
  }, delay);
  timer.unref?.();
  timers.set(key, timer);
}

export async function recordBump({ guildId, channelId, userId, userName }) {
  const now = new Date();
  const dueAt = new Date(now.getTime() + BUMP_INTERVAL_MS);
  const document = {
    _id: reminderKey(guildId, channelId),
    guildId: String(guildId),
    channelId: String(channelId),
    lastBumperId: String(userId || ""),
    lastBumperName: String(userName || "A member"),
    bumpedAt: now,
    dueAt,
  };

  const db = getDb();
  await db.collection(COLLECTION).replaceOne(
    { _id: document._id },
    document,
    { upsert: true },
  );
  scheduleReminder(document);
  return dueAt;
}

export async function startDiscordBumpScheduler(client) {
  discordClient = client;
  try {
    const documents = await getDb()
      .collection(COLLECTION)
      .find({ remindedAt: { $exists: false } })
      .toArray();
    for (const document of documents) scheduleReminder(document);
  } catch (error) {
    console.error("[discord bump] scheduler startup failed:", error.message);
  }
}