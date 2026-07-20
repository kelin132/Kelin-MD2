import axios from "axios";

/**
 * Download a quoted image and upload it to telegra.ph to get a public URL.
 * Returns the public URL string or throws if no image is found.
 */
export async function getQuotedImageUrl(sock, msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;
  if (!quoted) throw new Error("NOQUOTE");

  const imgMsg =
    quoted.imageMessage ||
    quoted.viewOnceMessageV2?.message?.imageMessage ||
    quoted.viewOnceMessage?.message?.imageMessage;

  if (!imgMsg) throw new Error("NOIMAGE");

  const media = await sock.downloadMediaMessage({
    key: {
      remoteJid: msg.key.remoteJid,
      id: ctx.stanzaId,
      participant: ctx.participant,
    },
    message: quoted,
  });

  const upload = await axios.post("https://telegra.ph/upload", media, {
    headers: { "Content-Type": "image/jpeg" },
  });

  return "https://telegra.ph" + upload.data[0].src;
}

export function noQuoteText() {
  return "❌ Reply to an image first, then use this command.";
}
