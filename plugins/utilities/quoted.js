/**
 * Recover the content embedded in a quoted WhatsApp message.
 * This mirrors SUKUNA's .quoted behavior without adding a separate message
 * vault to KELIN MD.
 */
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
    const quoted = ctx?.quotedMessage;

    if (!quoted) {
      return send(sock, jid, msg, "❌ Reply to the message you want me to recover, then use .quoted.");
    }

    const text =
      quoted.conversation ||
      quoted.extendedTextMessage?.text ||
      quoted.imageMessage?.caption ||
      quoted.videoMessage?.caption ||
      quoted.documentMessage?.caption ||
      null;

    if (text) {
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    const media = getMedia(quoted);
    if (!media) {
      return send(sock, jid, msg, "❌ I could not recover readable content from that message.");
    }

    try {
      const buffer = await sock.downloadMediaMessage({
        key: {
          remoteJid: jid,
          id: ctx.stanzaId,
          participant: ctx.participant,
        },
        message: quoted,
      });

      if (!buffer?.length) throw new Error("empty media");
      if (media.type === "image") {
        return sock.sendMessage(jid, { image: buffer, caption: media.message.caption || "" }, { quoted: msg });
      }
      if (media.type === "video") {
        return sock.sendMessage(jid, { video: buffer, caption: media.message.caption || "" }, { quoted: msg });
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
          caption: media.message.caption || "",
        }, { quoted: msg });
      }
      return sock.sendMessage(jid, { sticker: buffer }, { quoted: msg });
    } catch (err) {
      console.error("[quoted] media recovery failed:", err.message);
      return send(sock, jid, msg, "❌ The quoted media is no longer available.");
    }
  },
};

function getContext(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.documentMessage?.contextInfo ||
    msg.message?.audioMessage?.contextInfo ||
    msg.message?.stickerMessage?.contextInfo ||
    null
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
