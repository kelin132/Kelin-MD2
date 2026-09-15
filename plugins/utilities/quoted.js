/**
 * Recover the content embedded in a quoted WhatsApp message.
 * Supports text, viewOnce media, and standard attachments using Baileys.
 */
import { downloadMediaMessage, downloadContentFromMessage } from "@whiskeysockets/baileys";

export default {
  name: "quoted",
  aliases: ["q", "recover"],
  description: "Recover the message you replied to",
  category: "utilities",
  usage: ".quoted (reply to a message)",
  isAdmin: true,
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const ctx = getContext(msg);
    let quoted = ctx?.quotedMessage;

    if (!quoted) {
      return send(sock, jid, msg, "❌ Reply to the message you want me to recover, then use .quoted.");
    }

    // Unwrap ephemeral or viewOnce layers
    quoted = quoted.ephemeralMessage?.message ||
             quoted.viewOnceMessage?.message ||
             quoted.viewOnceMessageV2?.message ||
             quoted.viewOnceMessageV2Extension?.message ||
             quoted;

    const text =
      quoted.conversation ||
      quoted.extendedTextMessage?.text ||
      quoted.imageMessage?.caption ||
      quoted.videoMessage?.caption ||
      quoted.documentMessage?.caption ||
      null;

    if (text && !hasMedia(quoted)) {
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    const media = getMedia(quoted);
    if (!media) {
      if (text) return sock.sendMessage(jid, { text }, { quoted: msg });
      return send(sock, jid, msg, "❌ I could not recover readable content from that message.");
    }

    try {
      // Build fake message structure required by Baileys downloadMediaMessage
      const fakeMsg = {
        key: {
          remoteJid: jid,
          id: ctx.stanzaId,
          participant: ctx.participant,
        },
        message: quoted,
      };

      let buffer;
      try {
        buffer = await downloadMediaMessage(fakeMsg, "buffer", {});
      } catch {
        // Fallback to stream extraction if downloadMediaMessage fails
        const stream = await downloadContentFromMessage(
          media.message,
          media.type === "sticker" ? "sticker" : media.type
        );
        let chunks = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        buffer = Buffer.concat(chunks);
      }

      if (!buffer?.length) throw new Error("empty media buffer");

      const caption = media.message.caption || text || "";

      if (media.type === "image") {
        return sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
      }
      if (media.type === "video") {
        return sock.sendMessage(jid, { video: buffer, caption }, { quoted: msg });
      }
      if (media.type === "audio") {
        return sock.sendMessage(jid, {
          audio: buffer,
          mimetype: media.message.mimetype || "audio/ogg; codecs=opus",
          ptt: !!media.message.ptt,
        }, { quoted: msg });
      }
      if (media.type === "document") {
        return sock.sendMessage(jid, {
          document: buffer,
          mimetype: media.message.mimetype || "application/octet-stream",
          fileName: media.message.fileName || "recovered_file",
          caption,
        }, { quoted: msg });
      }
      return sock.sendMessage(jid, { sticker: buffer }, { quoted: msg });
    } catch (err) {
      console.error("[quoted] media recovery failed:", err.message);
      return send(sock, jid, msg, "❌ The quoted media is no longer available or could not be decrypted.");
    }
  },
};

function getContext(msg) {
  const root = msg.message?.ephemeralMessage?.message || msg.message;
  return (
    root?.extendedTextMessage?.contextInfo ||
    root?.imageMessage?.contextInfo ||
    root?.videoMessage?.contextInfo ||
    root?.documentMessage?.contextInfo ||
    root?.audioMessage?.contextInfo ||
    root?.stickerMessage?.contextInfo ||
    null
  );
}

function hasMedia(message) {
  return !!(
    message.imageMessage ||
    message.videoMessage ||
    message.audioMessage ||
    message.documentMessage ||
    message.stickerMessage
  );
}

function getMedia(message) {
  if (message.imageMessage) return { type: "image", message: message.imageMessage };
  if (message.videoMessage) return { type: "video", message: message.videoMessage };
  if (message.audioMessage) return { type: "audio", message: message.audioMessage };
  if (message.documentMessage) return { type: "document", message: message.documentMessage };
  if (message.stickerMessage) return { type: "sticker", message: message.stickerMessage };
  return null;
}

function send(sock, jid, msg, text) {
  return sock.sendMessage(jid, { text }, { quoted: msg });
}
