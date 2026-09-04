import { getDb } from "./mongo.mjs";

const COLLECTION = "lottery_settings";

function settingsId(guildId) {
  return `guild:${String(guildId)}`;
}

export async function getLotteryAnnouncementChannel(guildId) {
  if (!guildId) return null;
  const settings = await getDb().collection(COLLECTION).findOne(
    { _id: settingsId(guildId) },
    { projection: { announcementChannelId: 1 } },
  );
  return settings?.announcementChannelId ? String(settings.announcementChannelId) : null;
}

export async function setLotteryAnnouncementChannel(guildId, channelId) {
  if (!guildId || !channelId) throw new Error("A guild and channel are required.");
  await getDb().collection(COLLECTION).updateOne(
    { _id: settingsId(guildId) },
    {
      $set: {
        guildId: String(guildId),
        announcementChannelId: String(channelId),
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
  return String(channelId);
}