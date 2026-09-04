import { downloadContentFromMessage } from "@whiskeysockets/baileys";

/**
 * Image helper — downloads a quoted WhatsApp image and uploads it to
 * tmpfiles.org so external APIs (popcat etc.) can access it by URL.
 * Uses native fetch (Node 18+) — no axios dependency.
 */

/**
 * Download a quoted image and return a public URL via tmpfiles.org.
 * Throws if no quoted image is found.
 */
export async function getQuotedImageUrl(sock, msg) {
  const buffer = await getQuotedImageBuffer(sock, msg);

  // Upload to tmpfiles.org — returns a public URL valid for 60 minutes
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "image/jpeg" }), "img.jpg");

  const res  = await fetch("https://tmpfiles.org/api/v1/upload", {
    method: "POST",
    body:   form,
  });

  if (!res.ok) throw new Error("UPLOAD_FAILED");

  const json = await res.json();
  const url  = json?.data?.url;
  if (!url) throw new Error("UPLOAD_FAILED");

  // tmpfiles returns https://tmpfiles.org/XXXX/file.png
  // The direct download URL adds /dl/ before the path
  return url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
}

function unwrapMessage(message) {
  let current = message;
  for (let i = 0; i < 4 && current; i += 1) {
    const wrapped =
      current.ephemeralMessage ||
      current.viewOnceMessage ||
      current.viewOnceMessageV2 ||
      current.viewOnceMessageV2Extension;
    if (!wrapped?.message) break;
    current = wrapped.message;
  }
  return current;
}

function getContext(msg) {
  const message = unwrapMessage(msg.message || {});
  return (
    message.extendedTextMessage?.contextInfo ||
    message.imageMessage?.contextInfo ||
    message.videoMessage?.contextInfo ||
    message.documentMessage?.contextInfo ||
    message.buttonsResponseMessage?.contextInfo ||
    message.templateButtonReplyMessage?.contextInfo ||
    message.listResponseMessage?.contextInfo ||
    null
  );
}

/** Return the raw buffer of a quoted image (for local canvas processing). */
export async function getQuotedImageBuffer(sock, msg) {
  const ctx = getContext(msg);
  const quoted = unwrapMessage(ctx?.quotedMessage);
  if (!quoted) throw new Error("NOQUOTE");

  const imgMsg = quoted.imageMessage;
  if (!imgMsg) throw new Error("NOIMAGE");

  const stream = await downloadContentFromMessage(imgMsg, "image");
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export function noQuoteText() {
  return "❌ Reply to an image first, then use this command.";
}
