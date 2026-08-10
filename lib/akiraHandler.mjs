/**
 * KELIN MD — Akira auto-trigger handler
 * Fires when someone:
 *   1. @mentions / @tags the bot
 *   2. Replies to any message sent by the bot (groups + DMs)
 *   3. Writes "akira" anywhere in the message (25% chance she ignores it)
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

/**
 * Extract contextInfo from any message type that can carry a quoted reply.
 * WhatsApp wraps contextInfo differently depending on message type.
 */
function getContextInfo(msg) {
  const m = msg.message ?? {};
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
  const m = msg.message ?? {};
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
    // Some Baileys versions nest it one level deeper
    ...(msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? []),
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

  // ── Bot JID (normalised — device suffix stripped) ─────────────────────────
  const botJidRaw  = sock.user?.id ?? null;
  const botJid     = normalizeJid(botJidRaw);   // "number@s.whatsapp.net"

  const isGroup = jid.endsWith("@g.us");

  const ctxInfo = getContextInfo(msg);

  // ── Trigger 1: bot is @tagged / @mentioned ───────────────────────────────
  // Normalise all mentioned JIDs before comparing so device suffixes don't
  // cause silent mismatches (e.g. "123:0@s.whatsapp.net" vs "123@s.whatsapp.net")
  const mentionedJids = getMentionedJids(msg, ctxInfo);
  const isMentioned   = !!botJid && mentionedJids.includes(botJid);

  // ── Trigger 2: "akira" appears anywhere in the message ───────────────────
  const containsName = body.toLowerCase().includes("akira");

  // ── Trigger 3: user replied to one of the bot's messages ─────────────────
  // Groups: contextInfo.participant holds the JID of whoever sent the quoted msg.
  // DMs:    participant field is absent — any quoted message in a DM came from
  //         one of two people, and the bot is the only "other side", so we fire.
  let isReplyToBot = false;
  if (ctxInfo?.quotedMessage) {
    if (isGroup) {
      // Normalise before comparing — quoted participant can have device suffix
      const quotedParticipant = normalizeJid(
        ctxInfo.participant ?? ctxInfo.quotedParticipant ?? null
      );
      isReplyToBot = !!botJid && quotedParticipant === botJid;
    } else {
      // DM: any quoted message must have come from the bot
      isReplyToBot = true;
    }
  }

  // ── Nothing matched — bail ────────────────────────────────────────────────
  if (!isMentioned && !isReplyToBot && !containsName) return;

  // ── Random skip: name mention only gets 25% chance of being ignored ───────
  // @tag and reply-to-bot ALWAYS get a response — no random skip
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
