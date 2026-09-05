/**
 * KELIN MD — group status
 * Group-only implementation of SUKUNA's group status command.
 */
import {
  downloadContentFromMessage,
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto,
} from "@whiskeysockets/baileys";

const COLORS = {
  green: 0xFF25D366,
  red: 0xFFFF0000,
  blue: 0xFF0000FF,
  yellow: 0xFFFFFF00,
  purple: 0xFF800080,
  black: 0xFF000000,
  white: 0xFFFFFFFF,
  orange: 0xFFFFA500,
};

export default {
  name: "gstatus",
  aliases: ["gcstatus", "groupstatus"],
  description: "Post a text, image, or video status to the current group",
  category: "group",
  usage: ".gstatus <text[,color]> or reply to media",
  cooldown: 5,
  isAdmin: true, 

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!jid?.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "👥 Use .gstatus inside the group where the status should be posted.",
      }, { quoted: msg });
    }

    const ctx =
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo ||
      msg.message?.videoMessage?.contextInfo ||
      msg.message?.audioMessage?.contextInfo ||
      msg.message?.documentMessage?.contextInfo ||
      msg.message?.stickerMessage?.contextInfo ||
      null;
    const quoted = ctx?.quotedMessage || null;
    const media = findMedia(quoted);

    if (!text?.trim() && !media) {
      return sock.sendMessage(jid, {
        text:
`📢 *Group Status*

Text:
.gstatus Good morning!
.gstatus Good morning!,blue

Media:
Reply to an image, video, audio, document, or sticker, then use .gstatus

Colors: ${Object.keys(COLORS).join(", ")}`,
      }, { quoted: msg });
    }

    try {
      if (media) {
        const buffer = await downloadQuoted(media.message, media.type);
        const content = buildMediaContent(media, buffer);
        await relayGroupStatus(sock, jid, content);
      } else {
        const { message, color } = parseTextStatus(text);
        await relayGroupStatus(sock, jid, {
          extendedTextMessage: {
            text: message,
            backgroundArgb: color,
            font: 2,
          },
        });
      }

      return sock.sendMessage(jid, { text: "✅ Group status posted." }, { quoted: msg });
    } catch (err) {
      console.error("[gstatus]", err.message);
      return sock.sendMessage(jid, { text: `❌ Failed to post group status: ${err.message}` }, { quoted: msg });
    }
  },
};

function findMedia(message) {
  if (!message) return null;
  if (message.imageMessage) return { type: "image", message: message.imageMessage };
  if (message.videoMessage) return { type: "video", message: message.videoMessage };
  if (message.audioMessage) return { type: "audio", message: message.audioMessage };
  if (message.documentMessage) return { type: "document", message: message.documentMessage };
  if (message.stickerMessage) return { type: "sticker", message: message.stickerMessage };
  return null;
}

async function downloadQuoted(message, type) {
  const stream = await downloadContentFromMessage(message, type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function buildMediaContent(media, buffer) {
  if (media.type === "image") return { image: buffer, caption: media.message.caption || "" };
  if (media.type === "video") return { video: buffer, caption: media.message.caption || "" };
  if (media.type === "audio") {
    return {
      audio: buffer,
      mimetype: media.message.mimetype || "audio/ogg; codecs=opus",
      ptt: !!media.message.ptt,
    };
  }
  if (media.type === "document") {
    return {
      document: buffer,
      mimetype: media.message.mimetype || "application/octet-stream",
      fileName: media.message.fileName || "group_status_file",
      caption: media.message.caption || "",
    };
  }
  return { sticker: buffer };
}

function parseTextStatus(value) {
  const parts = String(value || "").split(",");
  const possibleColor = parts.at(-1)?.trim().toLowerCase();
  const hasColor = Boolean(COLORS[possibleColor]);
  return {
    message: (hasColor ? parts.slice(0, -1) : parts).join(",").trim(),
    color: hasColor ? COLORS[possibleColor] : randomColor(),
  };
}

function randomColor() {
  return 0xFF000000 + Math.floor(Math.random() * 0xFFFFFF);
}

async function relayGroupStatus(sock, jid, innerMessage) {
  const content = innerMessage.extendedTextMessage
    ? innerMessage
    : await generateWAMessageContent(innerMessage, { upload: sock.waUploadToServer });
  const wrapped = proto.Message.fromObject({
    groupStatusMessageV2: { message: content },
  });
  const message = generateWAMessageFromContent(jid, wrapped, { userJid: sock.user?.id });
  await sock.relayMessage(jid, message.message, { messageId: message.key.id });
}
