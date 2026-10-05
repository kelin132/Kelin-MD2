/**
 * KELIN MD — Anti-Link Handler (with warn & kick support)
 * Actions: "delete" | "kick" | "warn"
 */
import { groupSettings } from "../../lib/groupSettings.js";
import { getDb } from "../../lib/mongo.mjs";

const linkRegex =
  /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|t\.me\/|discord\.gg\/|discord\.com\/invite\/)[^\s]+/i;

/**
 * Normalizes JIDs by stripping device suffixes (e.g., :42@s.whatsapp.net -> @s.whatsapp.net)
 * Preserves LID domains when present.
 */
function normalizeJid(jid = "") {
  if (!jid) return "";
  const [userAndDevice, domain] = jid.split("@");
  const user = userAndDevice.split(":")[0];
  return domain ? `${user}@${domain}` : `${user}@s.whatsapp.net`;
}

/**
 * Normalizes phone numbers for comparisons (removes @... suffix)
 */
function toNum(jid = "") {
  return jid.split(":")[0].split("@")[0];
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
  const newCount = doc.count + 1;
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

export async function antiLinkHandler({ sock, msg }) {
  const jid = msg.key.remoteJid;

  // Ensure this is running inside a group
  if (!jid?.endsWith("@g.us")) return;

  const settings = groupSettings.get(jid);
  if (!settings?.antilink) return;

  // Parse incoming text content across text, caption, and extended messages
  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  if (!linkRegex.test(text)) return;

  // Identify sender
  const rawSender = msg.key.participant || msg.key.remoteJid;
  if (!rawSender) return;

  const sender = normalizeJid(rawSender);
  const senderNum = toNum(sender);

  // Identify bot
  const botJid = normalizeJid(sock.user?.id ?? sock.user?.jid ?? "");
  const botNum = toNum(botJid);

  // Never execute on the bot itself
  if (senderNum === botNum) return;

  let botIsAdmin = false;
  let senderIsAdmin = false;
  let participantJidForKick = sender;

  try {
    const meta = await sock.groupMetadata(jid);
    const participants = meta.participants || [];

    // Match participant JID strictly from metadata
    const senderParticipant = participants.find(
      p => normalizeJid(p.id) === sender || toNum(p.id) === senderNum
    );

    if (senderParticipant) {
      participantJidForKick = senderParticipant.id; // Use raw participant ID from metadata
      senderIsAdmin = !!senderParticipant.admin;
    }

    // Check if bot is admin
    const botParticipant = participants.find(
      p => normalizeJid(p.id) === botJid || toNum(p.id) === botNum
    );
    botIsAdmin = !!botParticipant?.admin;

  } catch (err) {
    console.error("[AntiLink] Metadata fetch failed:", err.message);
  }

  // Do not penalize group admins
  if (senderIsAdmin) return;

  try {
    // Attempt to delete message immediately
    await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});

    const action = settings.antilinkAction || "delete";
    const maxWarns = settings.antilinkMaxWarns || 3;

    // ── ACTION: KICK ────────────────────────────────────────────────────────
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

      console.log(`[AntiLink] Removing participant: ${participantJidForKick} from group:${jid}`);
      
      const kickResult = await sock.groupParticipantsUpdate(
        jid,
        [participantJidForKick],
        "remove"
      );

      console.log("[AntiLink] Kick Response:", kickResult);

      await sock.sendMessage(jid, {
        text: `🚫 @${senderNum} was removed for sending a link.`,
        mentions: [sender],
      });

    // ── ACTION: WARN ────────────────────────────────────────────────────────
    } else if (action === "warn") {
      const count = await addLinkWarn(jid, sender);

      if (count >= maxWarns) {
        await resetLinkWarns(jid, sender);

        if (botIsAdmin) {
          console.log(`[AntiLink] Warn limit reached. Removing participant: ${participantJidForKick}`);
          await sock.groupParticipantsUpdate(jid, [participantJidForKick], "remove");
        }

        await sock.sendMessage(jid, {
          text: [
            `🚫 *@${senderNum} has been removed from the group!*`,
            ``,
            `Reason: Reached *${maxWarns}/${maxWarns}* anti-link warnings.`,
          ].join("\n"),
          mentions: [sender],
        });
      } else {
        const remaining = maxWarns - count;
        await sock.sendMessage(jid, {
          text: [
            `⚠️ *ANTI-LINK WARNING*`,
            ``,
            `👤 User    : @${senderNum}`,
            `🔢 Warnings: *${count}/${maxWarns}*`,
            ``,
            remaining === 1
              ? `❗ *One more warning and you will be removed!*`
              : `⚠️ ${remaining} more warning(s) before removal.`,
          ].join("\n"),
          mentions: [sender],
        });
      }

    // ── ACTION: DELETE ONLY ────────────────────────────────────────────────
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
