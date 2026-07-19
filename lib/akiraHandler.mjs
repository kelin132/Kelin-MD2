/**
 * KELIN MD — Akira group auto-trigger
 * Fires when someone tags the bot OR writes "akira" (case-insensitive) in a group.
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

  // ── Trigger 1: bot is @mentioned ─────────────────────────────────────────
  const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
  // Normalise bot JID: "2637xxx:0@s.whatsapp.net" → "2637xxx@s.whatsapp.net"
  const botJid = sock.user?.id
    ? sock.user.id.split(":")[0] + "@s.whatsapp.net"
    : null;
  const isMentioned = botJid && mentionedJids.some(j => j === botJid);

  // ── Trigger 2: "akira" appears anywhere in the message ───────────────────
  const containsName = body.toLowerCase().includes("akira");

  if (!isMentioned && !containsName) return;

  // ── Clean text: strip @mention tags before sending to GPT ────────────────
  const cleanText = body
    .replace(/@\d+/g, "")   // remove raw @number mentions
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!cleanText) return;

  await callAkira(sock, msg, cleanText);
}
