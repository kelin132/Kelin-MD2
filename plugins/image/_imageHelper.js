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
  const ctx     = msg.message?.extendedTextMessage?.contextInfo;
  const quoted  = ctx?.quotedMessage;
  if (!quoted) throw new Error("NOQUOTE");

  const imgMsg =
    quoted.imageMessage ||
    quoted.viewOnceMessageV2?.message?.imageMessage ||
    quoted.viewOnceMessage?.message?.imageMessage;

  if (!imgMsg) throw new Error("NOIMAGE");

  const buffer = await sock.downloadMediaMessage({
    key: {
      remoteJid:   msg.key.remoteJid,
      id:          ctx.stanzaId,
      participant: ctx.participant,
    },
    message: quoted,
  });

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

/** Return the raw buffer of a quoted image (for local canvas processing). */
export async function getQuotedImageBuffer(sock, msg) {
  const ctx     = msg.message?.extendedTextMessage?.contextInfo;
  const quoted  = ctx?.quotedMessage;
  if (!quoted) throw new Error("NOQUOTE");

  const imgMsg =
    quoted.imageMessage ||
    quoted.viewOnceMessageV2?.message?.imageMessage ||
    quoted.viewOnceMessage?.message?.imageMessage;

  if (!imgMsg) throw new Error("NOIMAGE");

  return sock.downloadMediaMessage({
    key: {
      remoteJid:   msg.key.remoteJid,
      id:          ctx.stanzaId,
      participant: ctx.participant,
    },
    message: quoted,
  });
}

export function noQuoteText() {
  return "❌ Reply to an image first, then use this command.";
}
