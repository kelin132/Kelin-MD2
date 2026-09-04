// .shazam — Identify a song from a replied audio or video clip.
// Uses ACRCloud REST API directly — no 'acrcloud' npm package required.

import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { createHmac, randomBytes } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";
import https from "https";
import yts from "yt-search";

const execFileAsync = promisify(execFile);

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

async function downloadQuotedAudio(sock, msg) {
  const ctx = getContext(msg);
  const quoted = unwrapMessage(ctx?.quotedMessage);
  if (!quoted) return null;

  const audio = quoted.audioMessage;
  const video = quoted.videoMessage;
  const media = audio || video;
  if (!media) return null;

  const type = audio ? "audio" : "video";
  const stream = await downloadContentFromMessage(media, type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return { buffer: Buffer.concat(chunks), mimetype: media.mimetype || "" };
}

async function trimToAudioClip(inputBuffer) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kelin-shazam-"));
  const inputPath = path.join(tempDir, "input.bin");
  const outputPath = path.join(tempDir, "clip.mp3");
  try {
    await fs.writeFile(inputPath, inputBuffer);
    await execFileAsync(
      process.env.FFMPEG_PATH || "ffmpeg",
      [
        "-hide_banner", "-loglevel", "error", "-y",
        "-i", inputPath,
        "-t", "15", "-vn", "-ac", "1", "-ar", "44100", "-f", "mp3",
        outputPath,
      ],
      { maxBuffer: 1024 * 1024 }
    );
    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * Build a multipart/form-data body for the ACRCloud identify endpoint.
 * Returns { body: Buffer, boundary: string }
 */
function buildMultipart(fields, fileField) {
  const boundary = randomBytes(16).toString("hex");
  const parts = [];

  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
    );
  }

  // File field
  parts.push(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`
  );

  const header = Buffer.from(parts.join(""), "utf8");
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const body = Buffer.concat([header, fileField.data, footer]);

  return { body, boundary };
}

/**
 * Call the ACRCloud Identify API directly without the npm package.
 */
async function identifyWithACRCloud(audioBuffer) {
  const host = (process.env.ACRCLOUD_HOST || "identify-eu-west-1.acrcloud.com").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const accessKey = (process.env.ACRCLOUD_ACCESS_KEY || "34607899a109a991065ff346e92c6968").trim();
  const accessSecret = (process.env.ACRCLOUD_ACCESS_SECRET || "9GrZ1DhqoHhYCEfr0cUAAwW1CPi2peLJf3QjH1Ib").trim();

  if (!host || !accessKey || !accessSecret) return null;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const dataType = "audio";
  const signatureVersion = "1";

  const stringToSign = [
    "POST",
    "/v1/identify",
    accessKey,
    dataType,
    signatureVersion,
    timestamp,
  ].join("\n");

  const signature = createHmac("sha1", accessSecret)
    .update(stringToSign)
    .digest("base64");

  const fields = {
    access_key: accessKey,
    sample_bytes: audioBuffer.length.toString(),
    timestamp,
    signature,
    data_type: dataType,
    signature_version: signatureVersion,
  };

  const { body, boundary } = buildMultipart(fields, {
    name: "sample",
    filename: "clip.mp3",
    data: audioBuffer,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: host,
        path: "/v1/identify",
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function formatResult(music, youtubeUrl) {
  const artists = music.artists?.map((a) => a.name).filter(Boolean);
  const genres = music.genres?.map((g) => g.name).filter(Boolean);
  const lines = ["🎶 *Song Identified!*", "", `🎧 *Title:* ${music.title || "Unknown"}`];
  if (artists?.length) lines.push(`👤 *Artist(s):* ${artists.join(", ")}`);
  if (music.album?.name) lines.push(`💿 *Album:* ${music.album.name}`);
  if (genres?.length) lines.push(`🎼 *Genre:* ${genres.join(", ")}`);
  if (music.release_date) lines.push(`📅 *Released:* ${music.release_date}`);
  if (youtubeUrl) lines.push(`🔗 *YouTube:* ${youtubeUrl}`);
  return lines.join("\n");
}

export default {
  name: "shazam",
  description: "Identify a song from a short audio or video clip",
  category: "search",
  usage: ".shazam (reply to audio/video)",
  aliases: ["whatsong", "findsong"],
  cooldown: 15,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    // Credentials fall back to built-in defaults — no panel config needed
    const host = (process.env.ACRCLOUD_HOST || "identify-eu-west-1.acrcloud.com").trim();
    const accessKey = (process.env.ACRCLOUD_ACCESS_KEY || "34607899a109a991065ff346e92c6968").trim();
    const accessSecret = (process.env.ACRCLOUD_ACCESS_SECRET || "9GrZ1DhqoHhYCEfr0cUAAwW1CPi2peLJf3QjH1Ib").trim();

    let media;
    try {
      media = await downloadQuotedAudio(sock, msg);
    } catch (err) {
      console.error("[shazam] media download failed:", err);
      return sock.sendMessage(
        jid,
        { text: "❌ I couldn't download that clip. Try replying to a short audio or video." },
        { quoted: msg }
      );
    }

    if (!media) {
      return sock.sendMessage(
        jid,
        { text: "🎵 Reply to an audio or video clip (up to 15 seconds) with *.shazam*." },
        { quoted: msg }
      );
    }

    await sock.sendMessage(jid, { react: { text: "🔎", key: msg.key } });
    await sock.sendMessage(jid, { text: "🔎 Listening for the song..." }, { quoted: msg });

    try {
      const clip = await trimToAudioClip(media.buffer);
      const identified = await identifyWithACRCloud(clip);

      if (identified?.status?.code !== 0 || !identified?.metadata?.music?.length) {
        return sock.sendMessage(
          jid,
          { text: "❌ I couldn't recognize that song. Try a clearer 10–15 second clip." },
          { quoted: msg }
        );
      }

      const music = identified.metadata.music[0];
      const query = [music.title, music.artists?.[0]?.name].filter(Boolean).join(" ");
      let youtubeUrl = "";
      if (query) {
        try {
          const search = await yts(query);
          youtubeUrl = search?.videos?.[0]?.url || "";
        } catch (e) {
          console.error("[shazam] YouTube lookup failed:", e);
        }
      }

      return sock.sendMessage(
        jid,
        {
          text: formatResult(music, youtubeUrl),
          contextInfo: { forwardingScore: 1, isForwarded: true },
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error("[shazam] recognition failed:", err);
      return sock.sendMessage(
        jid,
        { text: "⚠️ Song recognition failed. Try a clearer or shorter clip." },
        { quoted: msg }
      );
    } finally {
      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } }).catch(() => {});
    }
  },
};
