/**
 * KELIN MD — Akira group auto-trigger
 * Fires when someone:
 *   1. @mentions the bot
 *   2. Writes "akira" anywhere in the message
 *   3. Replies to a message sent by the bot
 *
 * Skips commands (prefix-leading messages) and DMs.
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

  // ── Groups only ──────────────────────────────────────────────────────────
  if (!jid?.endsWith("@g.us")) return;

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

  // ── Trigger 1: bot is @mentioned ─────────────────────────────────────────
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
      // fromMe flag on the quoted message means the bot sent it
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage != null &&
        msg.message?.extendedTextMessage?.contextInfo?.participant === botJid
    );

  if (!isMentioned && !containsName && !isReplyToBot) return;

  // ── Clean text: strip @mention tags before sending to AI ─────────────────
  const cleanText = body
    .replace(/@\d+/g, "")   // remove raw @number mentions
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!cleanText) return;

  await callAkira(sock, msg, cleanText);
}
