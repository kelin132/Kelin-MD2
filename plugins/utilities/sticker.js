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
const STICKER_PACK_NAME = "𝐀𝐈𝐃𝐎𝐑𝐔";

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
function buildExif(pack = STICKER_PACK_NAME, author = STICKER_PACK_NAME) {
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
    Buffer.byteLength(json, "utf8"), 0x00, 0x00, 0x00, // count (length of value)
    0x1a, 0x00, 0x00, 0x00,             // offset to value (26)
    0x00, 0x00, 0x00, 0x00,             // next IFD offset = 0 (end)
  ]);
  const jsonBuf = Buffer.from(json, "utf8");
  return Buffer.concat([exifHeader, jsonBuf]);
}

/**
 * Add EXIF sticker metadata to the WebP RIFF container produced by ffmpeg.
 * WhatsApp reads the pack name and publisher from this EXIF chunk.
 */
function addExifToWebp(webpBuffer, exifBuffer) {
  if (
    webpBuffer.subarray(0, 4).toString() !== "RIFF" ||
    webpBuffer.subarray(8, 12).toString() !== "WEBP"
  ) {
    throw new Error("ffmpeg returned an invalid WebP file");
  }

  const webp = Buffer.from(webpBuffer);
  let offset = 12;
  let hasVp8x = false;
  while (offset + 8 <= webp.length) {
    const chunkType = webp.subarray(offset, offset + 4).toString();
    const chunkSize = webp.readUInt32LE(offset + 4);

    // The VP8X feature flags are at the start of the chunk payload.
    // Bit 2 advertises that the file contains EXIF metadata.
    if (chunkType === "VP8X" && chunkSize >= 1) {
      webp[offset + 8] |= 0x04;
      hasVp8x = true;
      break;
    }

    offset += 8 + chunkSize + (chunkSize % 2);
  }

  const vp8xChunk = Buffer.alloc(18);
  vp8xChunk.write("VP8X", 0, 4, "ascii");
  vp8xChunk.writeUInt32LE(10, 4);
  vp8xChunk[8] = 0x04; // EXIF metadata is present.
  vp8xChunk.writeUIntLE(511, 12, 3); // 512px canvas width - 1.
  vp8xChunk.writeUIntLE(511, 15, 3); // 512px canvas height - 1.

  const exifChunk = Buffer.alloc(8 + exifBuffer.length + (exifBuffer.length % 2));
  exifChunk.write("EXIF", 0, 4, "ascii");
  exifChunk.writeUInt32LE(exifBuffer.length, 4);
  exifBuffer.copy(exifChunk, 8);

  const output = Buffer.concat([
    hasVp8x ? webp : Buffer.concat([webp.subarray(0, 12), vp8xChunk, webp.subarray(12)]),
    exifChunk,
  ]);
  output.writeUInt32LE(output.length - 8, 4);
  return output;
}

/**
 * Convert a media buffer to a WhatsApp-compatible animated or static WebP sticker.
 */
async function toStickerBuffer(inputBuffer, isVideo, memberName) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kelin-sticker-"));
  const ext = isVideo ? "mp4" : "png";
  const inputPath = path.join(tempDir, `input.${ext}`);
  const outputPath = path.join(tempDir, "sticker.webp");

  try {
    await fs.writeFile(inputPath, inputBuffer);

    if (isVideo) {
      // Animated sticker: max 3 seconds, 512x512, looping WebP
      await execFileAsync(FFMPEG, [
        "-hide_banner", "-loglevel", "error", "-y",
        "-i", inputPath,
        "-t", "3",
        "-vf", "fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba",
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
        "-vf", "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba",
        "-quality", "80",
        outputPath,
      ], { maxBuffer: 20 * 1024 * 1024 });
    }

    const webpBuffer = await fs.readFile(outputPath);
    const publisher = memberName
      ? `(${memberName}) | ${STICKER_PACK_NAME}`
      : STICKER_PACK_NAME;

    return addExifToWebp(
      webpBuffer,
      buildExif(STICKER_PACK_NAME, publisher),
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export default {
  name: "sticker",
  description: "Convert a replied image/video to a WhatsApp sticker",
  category: "utilities",
  usage: ".sticker [your name] (reply to an image or video)",
  aliases: ["s", "stiker", "toSticker"],
  cooldown: 5,

  async run({ sock, msg, args }) {
    const jid  = msg.key.remoteJid;
    const ctx  = getContext(msg);
    const quoted = unwrapMessage(ctx?.quotedMessage);

    if (!quoted) {
      return sock.sendMessage(jid, {
        text: `🖼️ *STICKER MAKER*\n\nReply to an *image* or *video* with *.sticker*`,
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

      // The pack name is fixed. Members can optionally provide the publisher
      // name, which is shown beside it in the requested format.
      const memberName = args
        .join(" ")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 60);

      const stickerBuffer = await toStickerBuffer(buffer, !!vidMsg, memberName);

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
