// plugins/utilities/sticker.js
// .sticker — Convert a replied image or video to a WhatsApp sticker
// Uses ffmpeg directly — no 'wa-sticker-formatter' npm package required.

import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";

const execFileAsync = promisify(execFile);
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

function getContext(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.audioMessage?.contextInfo ||
    msg.message?.buttonsResponseMessage?.contextInfo ||
    null
  );
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

/**
 * Build the minimal EXIF blob WhatsApp needs for pack/author metadata.
 * The data is a JSON string embedded as the UserComment EXIF tag (0x9286).
 */
function buildExif(pack = "Kelin MD", author = "Bot") {
  const json = JSON.stringify({
    "sticker-pack-name": pack,
    "sticker-pack-publisher": author,
  });

  // EXIF header structure (minimal, enough for WhatsApp)
  // Exif marker: 0x45786966 0000
  // TIFF header (little-endian): 49 49 2A 00 08 00 00 00
  // IFD with one entry: UserComment (0x9286) type=UNDEFINED count=json.length offset=26
  const exifHeader = Buffer.from([
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,  // "Exif\0\0"
    0x49, 0x49, 0x2a, 0x00,              // little-endian TIFF magic
    0x08, 0x00, 0x00, 0x00,             // offset to first IFD
    0x01, 0x00,                          // 1 IFD entry
    0x86, 0x92,                          // tag: UserComment (0x9286)
    0x07, 0x00,                          // type: UNDEFINED
    json.length, 0x00, 0x00, 0x00,      // count (length of value)
    0x1a, 0x00, 0x00, 0x00,             // offset to value (26)
    0x00, 0x00, 0x00, 0x00,             // next IFD offset = 0 (end)
  ]);
  const jsonBuf = Buffer.from(json, "utf8");
  return Buffer.concat([exifHeader, jsonBuf]);
}

/**
 * Convert a media buffer to a WhatsApp-compatible animated or static WebP
 * sticker with a branded label beneath the media.
 */
async function toStickerBuffer(inputBuffer, isVideo, labelText) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kelin-sticker-"));
  const ext = isVideo ? "mp4" : "png";
  const inputPath = path.join(tempDir, `input.${ext}`);
  const outputPath = path.join(tempDir, "sticker.webp");
  const labelPath = path.join(tempDir, "label.txt");

  try {
    await fs.writeFile(inputPath, inputBuffer);
    // textfile keeps user input out of the FFmpeg filter expression, so
    // punctuation such as :, ', and | cannot break the filter.
    await fs.writeFile(labelPath, labelText, "utf8");

    const videoFilter = [
      "scale=512:448:force_original_aspect_ratio=decrease",
      "pad=512:512:(ow-iw)/2:0:color=0x00000000",
      `drawtext=textfile=${labelPath}:fontcolor=white:fontsize=32:x=(w-text_w)/2:y=h-text_h-12:borderw=4:bordercolor=black`,
    ].join(",");

    if (isVideo) {
      // Animated sticker: max 3 seconds, 512x512, looping WebP
      await execFileAsync(FFMPEG, [
        "-hide_banner", "-loglevel", "error", "-y",
        "-i", inputPath,
        "-t", "3",
        "-vf", `fps=15,${videoFilter},format=rgba`,
        "-loop", "0",
        "-preset", "default",
        "-an", "-vsync", "0",
        outputPath,
      ], { maxBuffer: 20 * 1024 * 1024 });
    } else {
      // Static sticker: 512x512, transparent background
      await execFileAsync(FFMPEG, [
        "-hide_banner", "-loglevel", "error", "-y",
        "-i", inputPath,
        "-vf", `${videoFilter},format=rgba`,
        "-quality", "80",
        outputPath,
      ], { maxBuffer: 20 * 1024 * 1024 });
    }

    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export default {
  name: "sticker",
  description: "Convert a replied image/video to a WhatsApp sticker",
  category: "utilities",
  usage: ".s [word] (reply to an image or video)",
  aliases: ["s", "stiker", "toSticker"],
  cooldown: 5,

  async run({ sock, msg, args }) {
    const jid  = msg.key.remoteJid;
    const ctx  = getContext(msg);
    const quoted = unwrapMessage(ctx?.quotedMessage);

    if (!quoted) {
      return sock.sendMessage(jid, {
        text: `🖼️ *STICKER MAKER*\n\nReply to an *image* or *video* with *.s [word]*\nExample: *.s hello* → hello | AIDORU`,
      }, { quoted: msg });
    }

    const imgMsg   = quoted.imageMessage;
    const vidMsg   = quoted.videoMessage;
    const mediaMsg = imgMsg || vidMsg;

    if (!mediaMsg) {
      return sock.sendMessage(jid, {
        text: `❌ Only images and videos can be converted to stickers.`,
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

    try {
      const type   = imgMsg ? "image" : "video";
      const stream = await downloadContentFromMessage(mediaMsg, type);
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      // The optional argument is the visible word next to the AIDORU brand.
      // Keep it bounded so an unusually long command cannot cover the image.
      const word = args.join(" ").trim().replace(/\s+/g, " ").slice(0, 42);
      const stickerLabel = word ? `${word} | AIDORU` : "AIDORU";

      const stickerBuffer = await toStickerBuffer(buffer, !!vidMsg, stickerLabel);

      await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("[sticker]", err);
      await sock.sendMessage(jid, {
        text: `❌ Failed to create sticker. Make sure the image isn't too large.`,
      }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
    }
  },
};
