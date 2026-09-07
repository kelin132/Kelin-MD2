/**
 * Persistent WhatsApp giveaway lifecycle.
 *
 * Giveaways are stored in MongoDB so a process restart does not lose the
 * message, entrants, or end time. Each bot process only restores giveaways
 * created by that WhatsApp account.
 */
import { randomInt, randomUUID } from "crypto";
import { getDb, ensureDb } from "./mongo.mjs";
import { getUser } from "../plugins/economy/database.js";
import { normalizeJid, resolveLidToJid } from "./identity.mjs";
import { log } from "./logger.mjs";

export const GIVEAWAY_EMOJI = "🎉";

const MAX_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const timers = new Map();
const finalizing = new Set();
let indexesPromise = null;

function collection() {
  return getDb().collection("giveaways");
}

async function ensureIndexes() {
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      collection().createIndex(
        { botJid: 1, chatId: 1, messageId: 1 },
        { unique: true, name: "giveaway_message_lookup" },
      ),
      collection().createIndex(
        { botJid: 1, status: 1, endsAt: 1 },
        { name: "giveaway_due_lookup" },
      ),
    ]).catch((error) => {
      indexesPromise = null;
      throw error;
    });
  }
  return indexesPromise;
}

function unwrapMessage(message) {
  let current = message;
  for (let index = 0; index < 4; index += 1) {
    if (current?.ephemeralMessage?.message) {
      current = current.ephemeralMessage.message;
      continue;
    }
    if (current?.viewOnceMessage?.message) {
      current = current.viewOnceMessage.message;
      continue;
    }
    break;
  }
  return current || {};
}

function getBotJid(sock) {
  return normalizeJid(sock?.user?.id || "");
}

function displayJid(jid) {
  return String(jid || "").split("@")[0].split(":")[0];
}

function schedule(giveaway, sock) {
  const id = String(giveaway._id);
  const existing = timers.get(id);
  if (existing) clearTimeout(existing);

  const remaining = Math.max(0, new Date(giveaway.endsAt).getTime() - Date.now());
  const delay = Math.min(remaining, 2_147_000_000);
  timers.set(id, setTimeout(() => {
    timers.delete(id);
    if (remaining > delay) schedule(giveaway, sock);
    else void finalizeGiveaway(giveaway._id, sock);
  }, delay));
}

function cancelTimer(id) {
  const timer = timers.get(String(id));
  if (timer) clearTimeout(timer);
  timers.delete(String(id));
}

function formatEndsAt(timestamp) {
  return new Date(timestamp).toISOString();
}

export function parseDuration(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return null;

  const matches = [...raw.matchAll(/(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks)/g)];
  const compactNumber = raw.match(/^(\d+)$/);
  if (!matches.length && !compactNumber) return null;

  if (compactNumber) {
    const minutes = Number(compactNumber[1]);
    return minutes > 0 ? minutes * 60 * 1000 : null;
  }

  const consumed = matches.map((match) => match[0]).join("").replace(/\s+/g, "");
  if (consumed !== raw.replace(/\s+/g, "")) return null;

  const multipliers = {
    s: 1000, sec: 1000, secs: 1000, second: 1000, seconds: 1000,
    m: 60_000, min: 60_000, mins: 60_000, minute: 60_000, minutes: 60_000,
    h: 3_600_000, hr: 3_600_000, hrs: 3_600_000, hour: 3_600_000, hours: 3_600_000,
    d: 86_400_000, day: 86_400_000, days: 86_400_000,
    w: 604_800_000, week: 604_800_000, weeks: 604_800_000,
  };
  const total = matches.reduce(
    (sum, match) => sum + Number(match[1]) * multipliers[match[2]],
    0,
  );
  return total > 0 && total <= MAX_DURATION_MS ? total : null;
}

export function formatDuration(durationMs) {
  let remaining = Math.max(0, Number(durationMs));
  const parts = [];
  const units = [
    ["week", 604_800_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
    ["second", 1000],
  ];

  for (const [label, size] of units) {
    const amount = Math.floor(remaining / size);
    if (!amount) continue;
    remaining -= amount * size;
    parts.push(`${amount} ${label}${amount === 1 ? "" : "s"}`);
  }
  return parts.join(" ") || "0 seconds";
}

function giveawayText({ prize, durationMs, emoji = GIVEAWAY_EMOJI }) {
  return [
    "🎁 *GIVEAWAY*",
    "",
    `🎉 *Prize:* ${prize}`,
    `⏳ *Ends in:* ${formatDuration(durationMs)}`,
    `🗳️ React with ${emoji} to enter!`,
    "",
    "_One reaction per person. The winner will be selected automatically when the timer ends._",
  ].join("\n");
}

function winnerText({ prize, winnerJid, winnerName }) {
  const mention = `@${displayJid(winnerJid)}`;
  const shownName = winnerName && winnerName !== "User"
    ? `*${winnerName}* (${mention})`
    : mention;

  return [
    "🎊 *GIVEAWAY ENDED!*",
    "",
    `🎁 *Prize:* ${prize}`,
    `🏆 *Winner:* ${shownName}`,
    "",
    "Congratulations!",
  ].join("\n");
}

export async function createGiveaway({ sock, chatId, creatorJid, prize, durationMs }) {
  if (!chatId?.endsWith("@g.us")) {
    throw new Error("Giveaways can only be created inside a group.");
  }

  await ensureDb();
  await ensureIndexes();

  const endsAt = new Date(Date.now() + durationMs);
  const emoji = GIVEAWAY_EMOJI;
  const sent = await sock.sendMessage(chatId, {
    text: giveawayText({ prize, durationMs, emoji }),
  });

  const giveaway = {
    _id: randomUUID(),
    botJid: getBotJid(sock),
    chatId,
    messageId: sent.key.id,
    prize,
    emoji,
    creatorJid: normalizeJid(creatorJid),
    participants: [],
    status: "active",
    endsAt,
    createdAt: new Date(),
  };

  await collection().insertOne(giveaway);
  schedule(giveaway, sock);

  try {
    await sock.sendMessage(chatId, { react: { text: emoji, key: sent.key } });
  } catch (error) {
    log("warn", `Giveaway reaction could not be added: ${error.message}`);
  }

  return giveaway;
}

export async function handleGiveawayReaction({ sock, msg }) {
  const message = unwrapMessage(msg?.message);
  const reaction = message.reactionMessage;
  if (!reaction?.key?.id) return false;

  const chatId = reaction.key.remoteJid || msg.key.remoteJid;
  const participant = msg.key.participant || msg.key.remoteJid;
  if (!chatId?.endsWith("@g.us") || !participant || msg.key.fromMe) return true;

  try {
    await ensureDb();
    await ensureIndexes();

    const query = {
      botJid: getBotJid(sock),
      chatId,
      messageId: reaction.key.id,
      status: "active",
    };
    const giveaway = await collection().findOne(query);
    if (!giveaway) return true;

    const reactionText = String(reaction.text || "");
    if (reactionText === giveaway.emoji) {
      await collection().updateOne(query, {
        $addToSet: { participants: normalizeJid(participant) },
      });
    } else if (!reactionText) {
      await collection().updateOne(query, {
        $pull: { participants: normalizeJid(participant) },
      });
    }
  } catch (error) {
    log("warn", `Giveaway reaction handler failed: ${error.message}`);
  }
  return true;
}

export async function finalizeGiveaway(giveawayId, sock) {
  const id = String(giveawayId);
  if (finalizing.has(id)) return;
  finalizing.add(id);

  try {
    await ensureDb();
    const claim = await collection().updateOne(
      { _id: id, status: "active" },
      { $set: { status: "drawing", drawnAt: new Date() } },
    );
    if (claim.matchedCount !== 1) return;

    const giveaway = await collection().findOne({ _id: id });
    if (!giveaway) return;

    cancelTimer(id);
    const participants = [...new Set((giveaway.participants || []).map(normalizeJid).filter(Boolean))];
    if (!participants.length) {
      await collection().updateOne(
        { _id: id },
        {
          $set: {
            status: "completed",
            winnerJid: null,
            winnerName: null,
            completedAt: new Date(),
            participantCount: 0,
          },
        },
      );
      await sock.sendMessage(giveaway.chatId, {
        text: [
          "🎊 *GIVEAWAY ENDED!*",
          "",
          `🎁 *Prize:* ${giveaway.prize}`,
          "😔 Nobody entered this giveaway.",
        ].join("\n"),
      });
      return;
    }

    const selectedJid = participants[randomInt(participants.length)];
    const mentionJid = await resolveLidToJid(selectedJid, sock, giveaway.chatId).catch(() => selectedJid);
    const user = await getUser(mentionJid).catch(() => null);
    const winnerName = String(user?.name || "").trim();

    await collection().updateOne(
      { _id: id },
      {
        $set: {
          status: "completed",
          winnerJid: mentionJid,
          winnerName: winnerName || null,
          completedAt: new Date(),
          participantCount: participants.length,
        },
      },
    );

    await sock.sendMessage(giveaway.chatId, {
      text: winnerText({
        prize: giveaway.prize,
        winnerJid: mentionJid,
        winnerName,
      }),
      mentions: [mentionJid],
    });
  } catch (error) {
    log("error", `Giveaway ${id} finalization failed: ${error.message}`);
    await collection().updateOne(
      { _id: id, status: "drawing" },
      { $set: { status: "active" } },
    ).catch(() => {});
  } finally {
    finalizing.delete(id);
  }
}

export async function restoreGiveaways(sock) {
  try {
    await ensureDb();
    await ensureIndexes();

    const botJid = getBotJid(sock);
    if (!botJid) return;

    const due = await collection().find({
      botJid,
      status: "active",
      endsAt: { $lte: new Date() },
    }).toArray();
    for (const giveaway of due) {
      await finalizeGiveaway(giveaway._id, sock);
    }

    const active = await collection().find({
      botJid,
      status: "active",
      endsAt: { $gt: new Date() },
    }).toArray();
    for (const giveaway of active) schedule(giveaway, sock);
  } catch (error) {
    log("warn", `Giveaway restore skipped: ${error.message}`);
  }
}