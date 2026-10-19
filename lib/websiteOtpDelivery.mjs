import { randomUUID } from "node:crypto";
import { getDb } from "./mongo.mjs";
import { resolveAccountIdentity } from "./accountIdentity.mjs";
import { normalizeJid } from "./identity.mjs";
import { getPendingWebsiteCode } from "./websiteAuth.mjs";
import { createOtpPayload } from "../plugins/utilities/otp.js";
import { log } from "./logger.mjs";

const POLL_INTERVAL_MS = 2_500;
const CLAIM_LEASE_MS = 30_000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5_000;
const outboxIndexPromises = new WeakMap();
let activeDelivery = null;

function phoneJid(value) {
  const raw = String(value ?? "").trim();
  if (!raw || /@lid$/i.test(raw)) return null;
  const match = raw.match(/^(\+?[\d\s().-]+?)(?::\d+)?@(s\.whatsapp\.net|c\.us)$/i);
  if (match) {
    const digits = match[1].replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15 ? `${digits}@s.whatsapp.net` : null;
  }
  if (!/^\+?[\d\s().-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? `${digits}@s.whatsapp.net` : null;
}

async function resolvePhoneJid(db, account) {
  for (const value of [
    account?.phoneNumber,
    account?.phone,
    account?.whatsappNumber,
    account?.whatsappId,
    account?.whatsappJid,
    account?.jid,
    account?.userId,
    account?._id,
  ]) {
    const jid = phoneJid(value);
    if (jid) return jid;
  }

  const identity = await resolveAccountIdentity(db, normalizeJid(String(account?._id ?? "")));
  for (const value of identity.ids || []) {
    const jid = phoneJid(value);
    if (jid) return jid;
  }
  throw new Error("No verified WhatsApp phone number is linked to this website account.");
}

async function ensureOutboxIndexes(database, collection) {
  let pending = outboxIndexPromises.get(database);
  if (!pending) {
    pending = (async () => {
      const indexes = await collection.listIndexes().toArray().catch((error) => {
        if (error?.code === 26) return [];
        throw error;
      });
      if (!indexes.some((index) => index.name === "website_otp_outbox_pending")) {
        await collection.createIndex(
          { status: 1, nextAttemptAt: 1, createdAt: 1 },
          { name: "website_otp_outbox_pending" },
        );
      }
      if (!indexes.some((index) => index.name === "website_otp_outbox_expiry")) {
        await collection.createIndex(
          { expiresAt: 1 },
          { name: "website_otp_outbox_expiry", expireAfterSeconds: 86_400 },
        );
      }
    })().catch((error) => {
      outboxIndexPromises.delete(database);
      throw error;
    });
    outboxIndexPromises.set(database, pending);
  }
  await pending;
}

function claimFilter(candidate, now, staleBefore) {
  if (candidate.status === "sending") {
    return {
      _id: candidate._id,
      status: "sending",
      lockedAt: { $lt: staleBefore },
      expiresAt: { $gt: now },
    };
  }
  return {
    _id: candidate._id,
    status: "pending",
    expiresAt: { $gt: now },
    $or: [
      { nextAttemptAt: { $exists: false } },
      { nextAttemptAt: { $lte: now } },
    ],
  };
}

async function restoreHashBackedCodeAfterFailure(db, job) {
  if (job.flow !== "request-otp") return;
  const users = db.collection("users");
  const user = await users.findOne(
    { _id: job.userId },
    { projection: { websiteOtpHash: 1, websiteOtpSalt: 1, websiteOtpExpiresAt: 1 } },
  );
  if (
    !user?.websiteOtpHash ||
    !user?.websiteOtpSalt ||
    new Date(user.websiteOtpExpiresAt ?? "").getTime() <= Date.now()
  ) return;

  await users.updateOne(
    {
      _id: job.userId,
      websiteOtpHash: user.websiteOtpHash,
      websiteOtpSalt: user.websiteOtpSalt,
      websiteOtpExpiresAt: user.websiteOtpExpiresAt,
    },
    {
      $unset: {
        websiteOtpHash: "",
        websiteOtpSalt: "",
        websiteOtpCreatedAt: "",
      },
      $set: { websiteOtpRequestedAt: new Date() },
    },
  );
}

export async function deliverNextWebsiteOtp(sock, {
  database = getDb(),
  now = new Date(),
  logger = log,
} = {}) {
  if (!sock?.sendMessage) return false;
  const outbox = database.collection("website_otp_outbox");
  await ensureOutboxIndexes(database, outbox);

  const staleBefore = new Date(now.getTime() - CLAIM_LEASE_MS);
  const candidate = await outbox.findOne(
    {
      expiresAt: { $gt: now },
      $or: [
        {
          status: "pending",
          $or: [
            { nextAttemptAt: { $exists: false } },
            { nextAttemptAt: { $lte: now } },
          ],
        },
        { status: "sending", lockedAt: { $lt: staleBefore } },
      ],
    },
    { sort: { createdAt: 1 } },
  );
  if (!candidate) return false;

  const claimToken = randomUUID();
  const claimed = await outbox.findOneAndUpdate(
    claimFilter(candidate, now, staleBefore),
    {
      $set: {
        status: "sending",
        claimToken,
        lockedAt: now,
        updatedAt: now,
      },
      $inc: { attempts: 1 },
    },
    { returnDocument: "after" },
  );
  if (!claimed) return false;

  try {
    const account = await database.collection("users").findOne(
      { _id: claimed.userId },
      {
        projection: {
          _id: 1,
          phoneNumber: 1,
          phone: 1,
          whatsappNumber: 1,
          whatsappId: 1,
          whatsappJid: 1,
          jid: 1,
          userId: 1,
        },
      },
    );
    if (!account) throw new Error("The website account for this code request was not found.");
    const destinationJid = await resolvePhoneJid(database, account);
    const pending = await getPendingWebsiteCode(destinationJid, { accountId: claimed.userId });
    await sock.sendMessage(
      destinationJid,
      createOtpPayload({ pending, senderJid: destinationJid }),
    );
    await outbox.updateOne(
      { _id: claimed._id, claimToken },
      {
        $set: { status: "sent", sentAt: new Date() },
        $unset: { claimToken: "", lockedAt: "", nextAttemptAt: "" },
      },
    );
    logger("info", `[websiteOtp] Delivered queued ${pending.kind} code.`);
    return true;
  } catch (error) {
    const attempts = Number(claimed.attempts) || 1;
    const expired = new Date(claimed.expiresAt ?? "").getTime() <= Date.now();
    const failed = attempts >= MAX_ATTEMPTS || expired;
    try {
      if (claimed.flow === "request-otp") {
        await restoreHashBackedCodeAfterFailure(database, claimed);
      }
      await outbox.updateOne(
        { _id: claimed._id, claimToken },
        {
          $set: failed
            ? { status: "failed", failedAt: new Date() }
            : {
                status: "pending",
                nextAttemptAt: new Date(Date.now() + RETRY_DELAY_MS),
              },
          $unset: { claimToken: "", lockedAt: "" },
        },
      );
    } catch (updateError) {
      logger("warn", `[websiteOtp] Could not update failed delivery state (${updateError?.name || "Error"}).`);
    }
    logger("warn", `[websiteOtp] Code delivery failed (${error?.name || "Error"}).`);
    return false;
  }
}

export function startWebsiteOtpDelivery(sock, { logger = log } = {}) {
  if (!sock?.sendMessage) return false;
  if (activeDelivery?.sock === sock) return true;
  stopWebsiteOtpDelivery();

  const state = { sock, busy: false, timer: null };
  activeDelivery = state;
  const poll = async () => {
    if (activeDelivery !== state || state.busy) return;
    state.busy = true;
    try {
      await deliverNextWebsiteOtp(sock, { logger });
    } catch (error) {
      logger("warn", `[websiteOtp] Delivery queue unavailable (${error?.name || "Error"}).`);
    } finally {
      state.busy = false;
    }
  };

  void poll();
  state.timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
  return true;
}

export function stopWebsiteOtpDelivery(sock) {
  const current = activeDelivery;
  if (!current || (sock && current.sock !== sock)) return;
  activeDelivery = null;
  if (current.timer) clearInterval(current.timer);
}
