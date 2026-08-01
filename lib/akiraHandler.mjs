/**
 * KELIN MD — Akira auto-trigger handler
 * Fires when someone:
 *   1. @mentions the bot
 *   2. Writes "akira" anywhere in the message (25% chance she ignores it)
 *   3. Replies to / quotes any message sent by the bot (groups + DMs)
 *
 * Works in both groups AND DMs.
 * Skips commands (prefix-leading messages).
 */
import { callAkira } from "./akiraAI.mjs";

/**
 * Extract contextInfo from any message type that can carry a quoted reply.
 * WhatsApp wraps contextInfo differently depending on message type.
 */
function getContextInfo(msg) {
  const m = msg.message ?? {};
  return (
    m.extendedTextMessage?.contextInfo     ??
    m.imageMessage?.contextInfo            ??
    m.videoMessage?.contextInfo            ??
    m.audioMessage?.contextInfo            ??
    m.stickerMessage?.contextInfo          ??
    m.documentMessage?.contextInfo         ??
    m.buttonsResponseMessage?.contextInfo  ??
    m.templateButtonReplyMessage?.contextInfo ??
    null
  );
}

/**
 * Extract the plain text body from any message type.
 */
function getBody(msg) {
  const m = msg.message ?? {};
  return (
    m.conversation                          ||
    m.extendedTextMessage?.text             ||
    m.imageMessage?.caption                 ||
    m.videoMessage?.caption                 ||
    m.documentMessage?.caption              ||
    m.buttonsResponseMessage?.selectedDisplayText ||
    m.templateButtonReplyMessage?.selectedDisplayText ||
    ""
  );
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

  // ── Never respond to the bot's own messages (prevents infinite loops) ─────
  if (msg.key.fromMe) return;

  // ── Extract text ─────────────────────────────────────────────────────────
  const body = getBody(msg);
  if (!body.trim()) return;

  // ── Skip commands — let routeMessage handle those ────────────────────────
  if (body.startsWith(prefix)) return;

  // ── Bot JID (normalised) ─────────────────────────────────────────────────
  const botJid = sock.user?.id
    ? sock.user.id.split(":")[0] + "@s.whatsapp.net"
    : null;

  const isGroup = jid.endsWith("@g.us");

  // ── Trigger 1: bot is @mentioned / tagged ────────────────────────────────
  const ctxInfo      = getContextInfo(msg);
  const mentionedJids =
    ctxInfo?.mentionedJid ??
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ??
    [];
  const isMentioned = botJid && mentionedJids.some(j => j === botJid);

  // ── Trigger 2: "akira" appears anywhere in the message ───────────────────
  const containsName = body.toLowerCase().includes("akira");

  // ── Trigger 3: user replied to one of the bot's messages ─────────────────
  // In groups: contextInfo.participant === bot's JID
  // In DMs:    participant is absent, but any quoted message in a DM must
  //            have come from one of two people; if quotedMessage exists we
  //            assume Akira sent it (the bot only sends its own DM messages).
  let isReplyToBot = false;
  if (ctxInfo?.quotedMessage) {
    const quotedParticipant = ctxInfo.participant ?? ctxInfo.quotedParticipant ?? null;
    if (isGroup) {
      // Group: compare participant JID to bot JID
      isReplyToBot = botJid != null && (
        quotedParticipant === botJid ||
        quotedParticipant === sock.user?.id  // sometimes includes device suffix
      );
    } else {
      // DM: only the bot could have sent the other side's message
      // stanzaId is present whenever a message is quoted, even in DMs
      isReplyToBot = true;
    }
  }

  // ── Nothing matched — bail ────────────────────────────────────────────────
  if (!isMentioned && !containsName && !isReplyToBot) return;

  // ── Random skip: name mention only gets ignored ~25% of the time ─────────
  // @tag and reply-to-bot always get a response
  if (containsName && !isMentioned && !isReplyToBot) {
    if (Math.random() < 0.25) return; // she's busy eating ramen
  }

  // ── Clean text: strip @mention tags before sending to AI ─────────────────
  const cleanText = body
    .replace(/@\d+/g, "")    // remove raw @number mentions
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!cleanText) return;

  await callAkira(sock, msg, cleanText);
}
