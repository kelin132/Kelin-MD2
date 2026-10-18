/**
 * KELIN MD — Akira auto-trigger handler
 * Fires when someone:
 *   1. @mentions / @tags the bot
 *   2. Replies to any message sent by the bot in a group
 *   3. Writes "akira" anywhere in the message
 *
 * Works in groups only. Group admins can disable it with `.akira off`.
 * Skips commands (prefix-leading messages).
 */
import { groupSettings } from "./groupSettings.js";

let akiraModulePromise = import("./akiraAI.mjs");

/**
 * Reload the AI module without restarting the Node.js process.
 * This is used after `.update` and `.rs`, because ESM modules are cached once
 * imported and a socket reconnect alone would keep the old Akira prompt.
 */
export async function reloadAkiraAI() {
  akiraModulePromise = import(`./akiraAI.mjs?reload=${Date.now()}`);
  await akiraModulePromise;
}

/**
 * Normalize a WhatsApp identity without collapsing a privacy LID into a phone JID.
 * "123456:0@s.whatsapp.net" -> "123456@s.whatsapp.net"
 * "123456:0@lid" -> "123456@lid"
 * null / undefined -> null
 */
function normalizeJid(jid) {
  if (typeof jid !== "string") return null;
  const raw = jid.trim();
  if (!raw) return null;

  const [localWithDevice = "", server = "s.whatsapp.net"] = raw.split("@");
  const local = String(localWithDevice).split(":")[0];
  const normalizedServer = String(server).toLowerCase();
  const safeServer = normalizedServer === "c.us" ? "s.whatsapp.net" : normalizedServer || "s.whatsapp.net";
  return `${local}@${safeServer}`;
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
export async function akiraHandler({ sock, msg, sender = "", prefix = "." }) {
  const jid = msg.key.remoteJid;
  if (!jid) return;

  // Never respond to the bot's own messages (prevents infinite loops)
  if (msg.key.fromMe) return;

  // Extract text
  const body = getBody(msg);
  if (!body.trim()) return;

  // Skip commands — let routeMessage handle those
  if (body.startsWith(prefix)) return;

  // Bot identities (phone JID + newer WhatsApp LID, device suffix stripped)
  const botJids = getBotJids(sock);
  const botJid = normalizeJid(sock.user?.id ?? null);
  const isGroup = jid.endsWith("@g.us");
  if (!isGroup) return;

  if (groupSettings.get(jid).akiraEnabled === false) return;

  const ctxInfo = getContextInfo(msg);

  try {
    if (isGroup) {
      const settings = groupSettings.get(jid) || {};
      if (settings.akiraEnabled === false) return;
    }
  } catch (err) {
    console.warn("[akiraHandler] groupSettings check failed:", err?.message || err);
  }

  const mentionedJids = getMentionedJids(msg, ctxInfo);
  const isMentioned = !!botJid && mentionedJids.includes(botJid);

  const containsName = body.toLowerCase().includes("akira");

  let isReplyToBot = false;
  if (ctxInfo?.quotedMessage) {
    const quotedParticipant = normalizeJid(
      ctxInfo.participant ?? ctxInfo.quotedParticipant ?? null
    );
    isReplyToBot = !!quotedParticipant && botJids.has(quotedParticipant);
  }

  if (!isMentioned && !isReplyToBot && !containsName) return;

  const cleanText = body
    .replace(/@\d+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const { callAkira } = await akiraModulePromise;
  await callAkira(
    sock,
    msg,
    cleanText || "You were just called by name. Greet the user naturally and ask what is up.",
    sender,
  );
}
