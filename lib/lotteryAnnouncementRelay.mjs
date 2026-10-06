import { randomUUID } from "node:crypto";
import { getDb } from "./mongo.mjs";

const POLL_MS = 2_000;
const STALE_CLAIM_MS = 45_000;
const MAX_ATTEMPTS = 5;
let timer = null;
let activeSocket = null;
let polling = false;

async function deliverOne(sock) {
  if (!sock || polling) return;
  polling = true;
  try {
    const collection = getDb().collection("lottery_announcements");
    const now = new Date();
    const claimId = randomUUID();
    const event = await collection.findOneAndUpdate(
      {
        sourcePlatform: "discord",
        whatsappGroupId: { $exists: true, $ne: null },
        $or: [
          { $and: [
            { "deliveries.whatsapp.status": "pending" },
            { $or: [
              { "deliveries.whatsapp.nextAttemptAt": { $exists: false } },
              { "deliveries.whatsapp.nextAttemptAt": { $lte: now } },
            ] },
          ] },
          {
            "deliveries.whatsapp.status": "sending",
            "deliveries.whatsapp.claimedAt": { $lt: new Date(now.getTime() - STALE_CLAIM_MS) },
          },
        ],
      },
      {
        $set: {
          "deliveries.whatsapp.status": "sending",
          "deliveries.whatsapp.claimId": claimId,
          "deliveries.whatsapp.claimedAt": now,
        },
        $inc: { "deliveries.whatsapp.attempts": 1 },
      },
      { sort: { createdAt: 1 }, returnDocument: "after", includeResultMetadata: false },
    );
    if (!event) return;
    const attempts = Number(event.deliveries?.whatsapp?.attempts || 1);
    if (attempts > MAX_ATTEMPTS) {
      await collection.updateOne(
        { _id: event._id, "deliveries.whatsapp.claimId": claimId },
        { $set: { "deliveries.whatsapp.status": "failed", "deliveries.whatsapp.lastError": "Retry limit reached." }, $unset: { "deliveries.whatsapp.claimId": "", "deliveries.whatsapp.claimedAt": "" } },
      );
      return;
    }
    try {
      const payload = event.payload || {};
      await sock.sendMessage(event.whatsappGroupId, {
        text: String(payload.text || "🎟️ Lottery results are available."),
        mentions: Array.isArray(payload.mentions) ? payload.mentions : [],
      });
      await collection.updateOne(
        { _id: event._id, "deliveries.whatsapp.claimId": claimId },
        { $set: { "deliveries.whatsapp.status": "sent", "deliveries.whatsapp.sentAt": new Date() }, $unset: { "deliveries.whatsapp.claimId": "", "deliveries.whatsapp.claimedAt": "", "deliveries.whatsapp.nextAttemptAt": "", "deliveries.whatsapp.lastError": "" } },
      );
    } catch (error) {
      const failed = attempts >= MAX_ATTEMPTS;
      await collection.updateOne(
        { _id: event._id, "deliveries.whatsapp.claimId": claimId },
        {
          $set: {
            "deliveries.whatsapp.status": failed ? "failed" : "pending",
            "deliveries.whatsapp.lastError": String(error?.message || error).slice(0, 300),
            ...(!failed ? { "deliveries.whatsapp.nextAttemptAt": new Date(Date.now() + attempts * 5_000) } : {}),
          },
          $unset: { "deliveries.whatsapp.claimId": "", "deliveries.whatsapp.claimedAt": "" },
        },
      );
      console.warn("[lottery] Discord-to-WhatsApp result delivery failed:", error?.message || error);
    }
  } catch (error) {
    console.warn("[lottery] WhatsApp result relay poll failed:", error?.message || error);
  } finally {
    polling = false;
  }
}

export function stopLotteryAnnouncementRelay() {
  if (timer) clearInterval(timer);
  timer = null;
  activeSocket = null;
}

export function startLotteryAnnouncementRelay(sock) {
  stopLotteryAnnouncementRelay();
  activeSocket = sock;
  const poll = () => {
    if (activeSocket) void deliverOne(activeSocket);
  };
  timer = setInterval(poll, POLL_MS);
  timer.unref?.();
  poll();
}
