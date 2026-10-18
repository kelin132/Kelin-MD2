/**
 * KELIN MD — Anti-Link Handler (with warn & kick support)
 * Actions: "delete" | "kick" | "warn"
 */
import { groupSettings } from "../../lib/groupSettings.js";
import { participantMatchesIdentity } from "../../lib/identity.mjs";
import { getDb } from "../../lib/mongo.mjs";

const linkRegex =
  /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|t\.me\/|discord\.gg\/|discord\.com\/invite\/)[^\s]+/i;

/**
 * Normalize JIDs by stripping device suffixes while keeping WhatsApp LIDs intact.
 */
function normalizeJid(jid = "") {
  if (typeof jid !== "string") return "";
  const raw = jid.trim();
  if (!raw) return "";

  const [localWithDevice = "", server = "s.whatsapp.net"] = raw.split("@");
  const local = String(localWithDevice).split(":")[0];
  const normalizedServer = String(server).toLowerCase();
  const safeServer = normalizedServer === "c.us" ? "s.whatsapp.net" : normalizedServer || "s.whatsapp.net";
  return `${local}@${safeServer}`;
}

/**
 * Normalizes phone numbers for comparison (removes @... suffix)
 */
function toNum(jid = "") {
  return normalizeJid(jid).split("@")[0];
}

async function getLinkWarns(groupJid, userJid) {
  const db = getDb();
  const cleanUser = normalizeJid(userJid);
  const doc = await db.collection("antilinkWarns").findOne({ _id: `${groupJid}:${cleanUser}` });
  return doc || { count: 0 };
}

async function addLinkWarn(groupJid, userJid) {
  const db = getDb();
  const cleanUser = normalizeJid(userJid);
  const key = `${groupJid}:${cleanUser}`;

  const doc = (await db.collection("antilinkWarns").findOne({ _id: key })) || { count: 0 };
  const newCount = (doc.count || 0) + 1;

  await db.collection("antilinkWarns").updateOne(
    { _id: key },
    { $set: { count: newCount, lastWarn: new Date().toISOString() } },
    { upsert: true }
  );

  return newCount;
}

async function resetLinkWarns(groupJid, userJid) {
  const db = getDb();
  const cleanUser = normalizeJid(userJid);
  await db.collection("antilinkWarns").deleteOne({ _id: `${groupJid}:${cleanUser}` });
}

export async function antiLinkHandler({ sock, msg, sender: canonicalSender = "" }) {
  const jid = msg.key.remoteJid;

  if (!jid?.endsWith("@g.us")) return;

  const settings = groupSettings.get(jid);
  if (!settings?.antilink) return;

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  if (!linkRegex.test(text)) return;

  const rawSender = msg.key.participant || msg.key.remoteJid;
  if (!rawSender) return;

  const sender = normalizeJid(canonicalSender || rawSender);
  const senderNum = toNum(sender);

  const botId = sock.user?.id || sock.user?.jid || "";
  const botNum = toNum(botId);
  const botNorm = normalizeJid(botId);

  if (senderNum === botNum) return;

  let botIsAdmin = false;
  let senderIsAdmin = false;
  let participantJidForKick = rawSender;

  try {
    const meta = await sock.groupMetadata(jid);
    const participants = meta.participants || [];

    const senderParticipant = participants.find((p) =>
      participantMatchesIdentity(p, [rawSender, sender]) ||
      toNum(p?.id || "") === senderNum,
    );

    if (senderParticipant) {
      participantJidForKick = senderParticipant.id;
      senderIsAdmin = !!senderParticipant.admin;
    }

    const botParticipant = participants.find((p) =>
      participantMatchesIdentity(p, [botId, botNorm]) ||
      toNum(p?.id || "") === botNum,
    );

    botIsAdmin = !!botParticipant?.admin;
  } catch (err) {
    console.error("[AntiLink] Metadata fetch failed:", err.message);
  }

  if (senderIsAdmin) return;

  try {
    await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});

    const action = settings.antilinkAction || "delete";
    const maxWarns = settings.antilinkMaxWarns || 3;

    if (action === "kick") {
      if (!botIsAdmin) {
        return sock.sendMessage(
          jid,
          {
            text: `⚠️ Anti-Link triggered, but I cannot kick @${senderNum} because I am not an admin!`,
            mentions: [sender],
          },
          { quoted: msg }
        );
      }

      try {
        await sock.groupParticipantsUpdate(jid, [participantJidForKick], "remove");

        await sock.sendMessage(jid, {
          text: `🚫 @${senderNum} was removed for sending a link.`,
          mentions: [sender],
        });
      } catch (kickErr) {
        console.error("[AntiLink] Kick failed:", kickErr.message);
        await sock.sendMessage(jid, {
          text: `⚠️ Failed to remove @${senderNum}. Error: ${kickErr.message}`,
          mentions: [sender],
        });
      }
    } else if (action === "warn") {
      const count = await addLinkWarn(jid, sender);

      if (count >= maxWarns) {
        await resetLinkWarns(jid, sender);

        if (botIsAdmin && participantJidForKick) {
          try {
            await sock.groupParticipantsUpdate(jid, [participantJidForKick], "remove");

            await sock.sendMessage(jid, {
              text: [
                `🚫 *@${senderNum} has been removed from the group!*`,
                "",
                `Reason: Reached *${maxWarns}/${maxWarns}* anti-link warnings.`,
              ].join("\n"),
              mentions: [sender],
            });
          } catch (kickErr) {
            console.error("[AntiLink] Warn-limit kick failed:", kickErr.message);

            await sock.sendMessage(jid, {
              text: [
                `⚠️ *@${senderNum} reached the warn limit*`,
                "",
                `Reason: *${maxWarns}/${maxWarns}* anti-link warnings`,
                "",
                `❌ Removal failed: ${kickErr.message}`,
              ].join("\n"),
              mentions: [sender],
            });
          }
        } else {
          await sock.sendMessage(jid, {
            text: [
              `⚠️ *@${senderNum} reached the warn limit*`,
              "",
              `Reason: *${maxWarns}/${maxWarns}* anti-link warnings`,
              "",
              "❌ I cannot remove them because I'm not an admin!",
            ].join("\n"),
            mentions: [sender],
          });
        }
      } else {
        const remaining = maxWarns - count;

        await sock.sendMessage(jid, {
          text: [
            "⚠️ *ANTI-LINK WARNING*",
            "",
            `👤 User    : @${senderNum}`,
            `🔢 Warnings: *${count}/${maxWarns}*`,
            "",
            remaining === 1
              ? "❗ *One more warning and you will be removed!*"
              : `⚠️ ${remaining} more warning(s) before removal.`,
          ].join("\n"),
          mentions: [sender],
        });
      }
    } else {
      await sock.sendMessage(jid, {
        text: `⚠️ @${senderNum}, links are not allowed in this group!`,
        mentions: [sender],
      });
    }
  } catch (err) {
    console.error("[AntiLink] Execution error:", err);
  }
}

export { resetLinkWarns };
