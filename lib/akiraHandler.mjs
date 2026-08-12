/**
 * KELIN MD — Akira auto-trigger handler
 * Fires when someone:
 *   1. @mentions / @tags the bot
 *   2. Replies to any message sent by the bot (groups + DMs)
 *   3. Writes "akira" anywhere in the message
 *
 * Works in both groups AND DMs.
 * Skips commands (prefix-leading messages).
 */
import { callAkira } from "./akiraAI.mjs";

/**
 * Normalise a WhatsApp JID so device suffixes never break comparisons.
 * "123456:0@s.whatsapp.net"  →  "123456@s.whatsapp.net"
 * "123456@s.whatsapp.net"    →  "123456@s.whatsapp.net"  (unchanged)
 * null / undefined           →  null
 */
function normalizeJid(jid) {
  if (!jid) return null;
  return jid.replace(/:.*@/, "@");
}

function getBotJids(sock) {
  return new Set(
    [
      sock.user?.id,
      sock.user?.lid,
      sock.user?.jid,
    ]
      .map(normalizeJid)
      .filter(Boolean)
  );
}

function unwrapMessage(msg) {
  const message = msg.message ?? {};
  return message.ephemeralMessage?.message
    ?? message.viewOnceMessage?.message
    ?? message;
}

/**
 * Extract contextInfo from any message type that can carry a quoted reply.
 * WhatsApp wraps contextInfo differently depending on message type.
 */
function getContextInfo(msg) {
  const m = unwrapMessage(msg);
  return (
    m.extendedTextMessage?.contextInfo        ??
    m.imageMessage?.contextInfo               ??
    m.videoMessage?.contextInfo               ??
    m.audioMessage?.contextInfo               ??
    m.stickerMessage?.contextInfo             ??
    m.documentMessage?.contextInfo            ??
    m.buttonsResponseMessage?.contextInfo     ??
    m.templateButtonReplyMessage?.contextInfo ??
    m.listResponseMessage?.contextInfo        ??
    null
  );
}

/**
 * Extract the plain text body from any message type.
 */
function getBody(msg) {
  const m = unwrapMessage(msg);
  return (
    m.conversation                                     ||
    m.extendedTextMessage?.text                        ||
    m.imageMessage?.caption                            ||
    m.videoMessage?.caption                            ||
    m.documentMessage?.caption                         ||
    m.buttonsResponseMessage?.selectedDisplayText      ||
    m.templateButtonReplyMessage?.selectedDisplayText  ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ""
  );
}

/**
 * Collect all mentioned JIDs from every place WhatsApp might put them.
 * Returns a normalised array (device suffixes stripped).
 */
function getMentionedJids(msg, ctxInfo) {
  const raw = [
    ...(ctxInfo?.mentionedJid ?? []),
    ...(unwrapMessage(msg).extendedTextMessage?.contextInfo?.mentionedJid ?? []),
  ];
  return raw.map(normalizeJid).filter(Boolean);
}

/**
 * @param {object} params
 * @param {object} params.sock    – Baileys socket
 * @param {object} params.msg     – raw WhatsApp message
 * @param {string} params.prefix  – bot command prefix (default ".")
 */
export async function akiraHandler({ sock, msg, prefix = "." }) {
  const jid = msg.key.remoteJid;
  if (!jid) return;

  // ── Never respond to the bot's own messages (prevents infinite loops) ──────
  if (msg.key.fromMe) return;

  // ── Extract text ──────────────────────────────────────────────────────────
  const body = getBody(msg);
  if (!body.trim()) return;

  // ── Skip commands — let routeMessage handle those ─────────────────────────
  if (body.startsWith(prefix)) return;

  // ── Bot identities (phone JID + newer WhatsApp LID, device suffix stripped)
  // WhatsApp can identify the same account differently in group messages.
  const botJids = getBotJids(sock);
  const botJid = normalizeJid(sock.user?.id ?? null);
  const isGroup = jid.endsWith("@g.us");
  const ctxInfo = getContextInfo(msg);

  // ── Trigger 1: bot is @tagged / @mentioned ───────────────────────────────
  const mentionedJids = getMentionedJids(msg, ctxInfo);
  const isMentioned = !!botJid && mentionedJids.includes(botJid);

  // ── Trigger 2: "akira" appears anywhere in the message ───────────────────
  const containsName = body.toLowerCase().includes("akira");

  // ── Trigger 3: user replied to one of the bot's messages ─────────────────
  let isReplyToBot = false;
  if (ctxInfo?.quotedMessage) {
    if (isGroup) {
      const quotedParticipant = normalizeJid(
        ctxInfo.participant ?? ctxInfo.quotedParticipant ?? null
      );
      isReplyToBot = !!quotedParticipant && botJids.has(quotedParticipant);
    } else {
      // In a DM the quoted message is from the bot, so the reply is a trigger.
      isReplyToBot = true;
    }
  }

  if (!isMentioned && !isReplyToBot && !containsName) return;

  // ── Clean text: strip @mention tags before sending to AI ─────────────────
  const cleanText = body
    .replace(/@\d+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  await callAkira(
    sock,
    msg,
    cleanText || "You were just called by name. Greet the user naturally and ask what is up."
  );
}