import { getDb } from "./mongo.mjs";

export const TICKET_TTL_MS = 30 * 60 * 1000;
const COLLECTION = "discordTickets";
const timers = new Map();
let discordClient = null;

function clearTicketTimer(channelId) {
  const timer = timers.get(String(channelId));
  if (timer) clearTimeout(timer);
  timers.delete(String(channelId));
}

export async function closeTicketChannel(channelId, reason = "Ticket closed") {
  clearTicketTimer(channelId);
  const db = getDb();
  await db.collection(COLLECTION).deleteOne({ _id: String(channelId) });

  const channel = discordClient
    ? await discordClient.channels.fetch(String(channelId)).catch(() => null)
    : null;
  if (!channel) return false;
  await channel.delete(reason).catch((error) => {
    console.error("[discord ticket] channel close failed:", error.message);
  });
  return true;
}

function scheduleTicket(document) {
  if (!discordClient) return;
  clearTicketTimer(document.channelId);
  const delay = Math.max(0, new Date(document.closeAt).getTime() - Date.now());
  const timer = setTimeout(() => {
    closeTicketChannel(document.channelId, "Ticket automatically closed after 30 minutes")
      .catch((error) => console.error("[discord ticket] auto-close failed:", error.message));
  }, delay);
  timer.unref?.();
  timers.set(String(document.channelId), timer);
}

export async function registerTicket({ guildId, channelId, creatorId }) {
  const document = {
    _id: String(channelId),
    guildId: String(guildId),
    channelId: String(channelId),
    creatorId: String(creatorId),
    createdAt: new Date(),
    closeAt: new Date(Date.now() + TICKET_TTL_MS),
  };
  await getDb().collection(COLLECTION).replaceOne(
    { _id: document._id },
    document,
    { upsert: true },
  );
  scheduleTicket(document);
  return document.closeAt;
}

export async function startDiscordTicketScheduler(client) {
  discordClient = client;
  try {
    const documents = await getDb().collection(COLLECTION).find({}).toArray();
    for (const document of documents) scheduleTicket(document);
  } catch (error) {
    console.error("[discord ticket] scheduler startup failed:", error.message);
  }
}