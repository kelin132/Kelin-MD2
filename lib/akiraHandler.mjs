/**
 * KELIN MD — Akira auto-trigger handler
 * Fires when someone:
 *   1. @mentions the bot
 *   2. Writes "akira" anywhere in the message (25% chance she ignores it — keeps her natural)
 *   3. Replies to a message sent by the bot
 *
 * Works in both groups AND DMs (important since .akira command is disabled).
 * Skips commands (prefix-leading messages).
 */
import { callAkira } from "./akiraAI.mjs";

/**
 * @param {object} params
 * @param {object} params.sock    – Baileys socket
 * @param {object} params.msg     – raw WhatsApp message
 * @param {string} params.prefix  – bot command prefix (default ".")
 */
export async function akiraHandler({ sock, msg, prefix = "." }) {
  const jid = msg.key.remoteJid;
  if (!jid) return;

  // ── Extract text ─────────────────────────────────────────────────────────
  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  if (!body.trim()) return;

  // ── Skip commands — let routeMessage handle those ────────────────────────
  if (body.startsWith(prefix)) return;

  // ── Bot JID (normalised) ─────────────────────────────────────────────────
  const botJid = sock.user?.id
    ? sock.user.id.split(":")[0] + "@s.whatsapp.net"
    : null;

  // ── Trigger 1: bot is @mentioned / tagged ────────────────────────────────
  const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
  const isMentioned   = botJid && mentionedJids.some(j => j === botJid);

  // ── Trigger 2: "akira" appears anywhere in the message ───────────────────
  const containsName = body.toLowerCase().includes("akira");

  // ── Trigger 3: user replied to one of the bot's messages ─────────────────
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  const quotedSelfJid     = msg.message?.extendedTextMessage?.contextInfo?.remoteJid;
  const isReplyToBot =
    botJid && (
      quotedParticipant === botJid ||
      quotedSelfJid     === botJid ||
      (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage != null &&
        msg.message?.extendedTextMessage?.contextInfo?.participant === botJid)
    );

  // ── Nothing matched — bail ────────────────────────────────────────────────
  if (!isMentioned && !containsName && !isReplyToBot) return;

  // ── Random skip: name mention only gets ignored ~25% of the time ─────────
  // @tag and reply-to-bot always get a response (feels natural to always
  // respond when directly addressed, sometimes ignore if just name is dropped)
  if (containsName && !isMentioned && !isReplyToBot) {
    if (Math.random() < 0.25) return; // she's busy eating ramen
  }

  // ── Clean text: strip @mention tags before sending to AI ─────────────────
  const cleanText = body
    .replace(/@\d+/g, "")   // remove raw @number mentions
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!cleanText) return;

  await callAkira(sock, msg, cleanText);
}
