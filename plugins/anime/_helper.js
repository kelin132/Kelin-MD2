/**
 * Anime reaction helper — plugins/anime/_helper.js
 *
 * Tries four sources in order until one succeeds:
 *   1. waifu.pics  — https://api.waifu.pics/sfw/<type>
 *   2. nekos.best  — https://nekos.best/api/v2/<type>
 *   3. otakugifs   — https://api.otakugifs.xyz/gif?reaction=<type>
 *   4. GiftedTech  — https://api.gifted.co.ke/api/anime/<type> (has API key)
 *
 * Media is identified from its bytes. GIFs are converted to MP4 so WhatsApp
 * plays them animated; static images are only allowed by image-oriented commands.
 * Target resolution supports @mention AND reply-to-message.
 */

import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { KEY as GIFTED_KEY, ANIME_BASE as GIFTED_ANIME_BASE } from "../../lib/gifted.js";
import { requestJson, requestBuffer } from "../../lib/http.mjs";
import { detectMediaType } from "../../lib/mediaType.mjs";
import { resolveTargetIdentity } from "../../lib/profileIdentity.mjs";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; KelinMD/1.0)" };
const FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";

// Temp directory for FFmpeg conversion
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const TEMP_DIR  = resolve(__dirname, "../../tmp");
if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

// ── Source 1: waifu.pics ──────────────────────────────────────────────────────

const WAIFU_MAP = {
  awoo: "awoo", bite: "bite", blush: "blush", bonk: "bonk",
  bully: "bully", cringe: "cringe", cry: "cry", cuddle: "cuddle",
  dance: "dance", glomp: "glomp", handhold: "handhold",
  highfive: "highfive", hug: "hug", kiss: "kiss", lick: "lick",
  megumin: "megumin", neko: "neko", nom: "nom", pat: "pat",
  shinobu: "shinobu", slap: "slap", smile: "smile", smug: "smug",
  waifu: "waifu", wave: "wave", yeet: "yeet",
  // remaps
  happy: "smile", sad: "cry", kill: "bonk", kick: "yeet",
  angry: "punch", feed: "nom", meow: "neko", kitsune: "neko", foxgirl: "neko",
  fox_girl: "neko", woof: "awoo", ngif: "neko", wallpaper: "waifu",
  wink: "smile", poke: "nom",
};

async function fetchWaifu(type) {
  const ep = WAIFU_MAP[type] ?? "hug";
  const data = await requestJson(`https://api.waifu.pics/sfw/${ep}`,
    { timeoutMs: 10_000, headers: UA });
  const url = data?.url;
  if (!url) throw new Error("waifu.pics: no url");
  return url;
}

// ── Source 2: nekos.best ──────────────────────────────────────────────────────

const NEKOS_MAP = {
  bite: "bite", blush: "blush", baka: "baka", bonk: "bonk",
  bully: "bully", cry: "cry", cuddle: "cuddle", dance: "dance",
  feed: "feed", glomp: "glomp", handhold: "handhold",
  angry: "punch", happy: "happy", highfive: "highfive", hug: "hug", kick: "kick",
  kiss: "kiss", laugh: "laugh", nom: "nom", pat: "pat",
  poke: "poke", run: "run", slap: "slap", sleep: "sleep",
  smile: "smile", smug: "smug", tickle: "tickle", wave: "wave",
  wink: "wink", yeet: "yeet", shrug: "shrug", shoot: "shoot",
  stare: "stare", thumbsup: "thumbsup",
  // remaps
  awoo: "happy", lick: "bite", kill: "slap", sad: "cry",
  cringe: "laugh", meow: "poke", kitsune: "hug", foxgirl: "hug",
  fox_girl: "hug", woof: "run", neko: "hug", wallpaper: "hug",
  ngif: "hug", megumin: "hug", shinobu: "hug",
};

async function fetchNekos(type) {
  const ep = NEKOS_MAP[type] ?? "hug";
  const data = await requestJson(`https://nekos.best/api/v2/${ep}`,
    { timeoutMs: 10_000, headers: UA });
  const url = data?.results?.[0]?.url;
  if (!url) throw new Error("nekos.best: no url");
  return url;
}

// ── Source 3: otakugifs ───────────────────────────────────────────────────────

const OTAKU_MAP = {
  angry: "punch", bite: "bite", blush: "blush", cry: "cry", cuddle: "cuddle",
  dance: "dance", handhold: "handhold", hug: "hug", kiss: "kiss",
  lick: "lick", pat: "pat", poke: "poke", punch: "punch",
  slap: "slap", smack: "smack", smile: "smile", smug: "smug",
  tickle: "tickle", wave: "wave", wink: "wink",
  // remaps
  bonk: "punch", feed: "nom", highfive: "clap", yeet: "run",
  kill: "mad", meow: "nyah", woof: "run", foxgirl: "nyah",
  fox_girl: "nyah", neko: "nyah", kitsune: "nyah",
  waifu: "love", wallpaper: "love", ngif: "nyah",
  awoo: "yay", happy: "happy", sad: "sad", cringe: "cringe",
  bully: "mad", kick: "run", glomp: "hug",
};

async function fetchOtaku(type) {
  const reaction = OTAKU_MAP[type] ?? "hug";
  const data = await requestJson(
    `https://api.otakugifs.xyz/gif?reaction=${reaction}`,
    { timeoutMs: 10_000, headers: UA });
  const url = data?.url;
  if (!url) throw new Error("otakugifs: no url");
  return url;
}

// ── Source 4: GiftedTech ──────────────────────────────────────────────────────

const GIFTED_MAP = {
  hug: "hug", kiss: "kiss", slap: "slap", pat: "pat",
  punch: "punch", cry: "cry", cuddle: "cuddle", blush: "blush",
  smile: "smile", wave: "wave", dance: "dance", wink: "wink",
  bite: "bite", nom: "nom", poke: "poke", bonk: "bonk",
  smug: "smug", yeet: "yeet", lick: "lick", highfive: "highfive",
  handhold: "handhold", neko: "neko", waifu: "waifu",
};

async function fetchGifted(type) {
  const ep  = GIFTED_MAP[type] ?? "hug";
  const url = `${GIFTED_ANIME_BASE}/${ep}?apikey=${GIFTED_KEY}`;
  const data = await requestJson(url, { timeoutMs: 10_000, headers: UA });
  const mediaUrl = data?.result?.url ?? data?.url ?? data?.data?.url;
  if (!mediaUrl) throw new Error("gifted: no url");
  return mediaUrl;
}

// ── Download buffer ───────────────────────────────────────────────────────────

async function downloadBuffer(url) {
  return requestBuffer(url, {
    timeoutMs: 25_000,
    headers: UA,
  });
}

// ── GIF → MP4 conversion via FFmpeg ──────────────────────────────────────────
// WhatsApp requires MP4 for animated gifPlayback; raw GIF buffers don't animate.

export async function convertGifToMp4(gifBuffer, label = "reaction") {
  const safeLabel = String(label).replace(/[^a-z0-9_-]/gi, "_").slice(0, 32) || "reaction";
  const uniqueId = randomUUID();
  const input  = join(TEMP_DIR, `${safeLabel}_${uniqueId}.gif`);
  const output = join(TEMP_DIR, `${safeLabel}_${uniqueId}.mp4`);

  try {
    writeFileSync(input, gifBuffer);

    await new Promise((resolve, reject) => {
      execFile(FFMPEG_BIN, [
        "-y",
        "-i", input,
        "-vf", "fps=15,scale=480:480:flags=lanczos:force_original_aspect_ratio=decrease,pad=480:480:(ow-iw)/2:(oh-ih)/2",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "28",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-an",
        "-t", "12",
        output,
      ], { maxBuffer: 30 * 1024 * 1024, timeout: 25_000 }, (err) => {
        if (err) reject(err); else resolve();
      });
    });

    if (!existsSync(output)) throw new Error("FFmpeg produced no output file");

    const mp4 = readFileSync(output);
    return mp4;
  } finally {
    try { if (existsSync(input))  unlinkSync(input);  } catch {}
    try { if (existsSync(output)) unlinkSync(output); } catch {}
  }
}

// ── Public: getAnimeGif ───────────────────────────────────────────────────────

/**
 * Try all four sources in order until one returns valid media.
 * Downloads the buffer and determines if it's a GIF.
 *
 * @param {string} type  — reaction name (e.g. "hug", "kiss")
 * @returns {Promise<{ buffer: Buffer, isGif: boolean }>}
 */
export async function getAnimeGif(type, { allowStatic = false } = {}) {
  const lower  = type.toLowerCase();
  const errors = [];
  let staticFallback = null;

  const sources = [
    ["waifu.pics", () => fetchWaifu(lower)],
    ["nekos.best", () => fetchNekos(lower)],
    ["otakugifs",  () => fetchOtaku(lower)],
    ["gifted",     () => fetchGifted(lower)],
  ];

  for (const [name, fn] of sources) {
    try {
      const mediaUrl = await fn();
      const buffer   = await downloadBuffer(mediaUrl);
      const mediaType = detectMediaType(buffer);
      if (mediaType === "gif" || mediaType === "mp4") {
        return { buffer, mediaType, isGif: mediaType === "gif", source: name };
      }
      if (["png", "jpeg", "webp"].includes(mediaType)) {
        if (!staticFallback) staticFallback = { buffer, mediaType, isGif: false, source: name };
        errors.push(`${name}: returned a static image`);
        continue;
      }
      errors.push(`${name}: unsupported media format`);
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
    }
  }

  if (allowStatic && staticFallback) return staticFallback;
  throw new Error(`All sources failed for "${type}":\n${errors.join("\n")}`);
}

export async function sendAnimeMedia({
  sock,
  msg,
  type,
  caption,
  allowStatic = false,
  mentions = [],
}) {
  const chatId = msg.key.remoteJid;
  const { buffer, mediaType } = await getAnimeGif(type, { allowStatic });
  if (mediaType === "gif" || mediaType === "mp4") {
    const video = mediaType === "gif"
      ? await convertGifToMp4(buffer, type)
      : buffer;
    return sock.sendMessage(chatId, {
      video,
      mimetype: "video/mp4",
      gifPlayback: true,
      caption,
      mentions,
    }, { quoted: msg });
  }

  return sock.sendMessage(chatId, {
    image: buffer,
    mimetype: `image/${mediaType}`,
    caption,
    mentions,
  }, { quoted: msg });
}

// ── Public: sendReaction ──────────────────────────────────────────────────────

/**
 * Resolve the reaction target: @mention takes priority, then reply-to-message.
 */
function resolveTarget(msg) {
  const ctx =
    msg.message?.extendedTextMessage?.contextInfo  ||
    msg.message?.imageMessage?.contextInfo         ||
    msg.message?.videoMessage?.contextInfo         ||
    msg.message?.stickerMessage?.contextInfo       ||
    null;

  // 1. Direct @mention
  if (ctx?.mentionedJid?.[0]) return ctx.mentionedJid[0];

  // 2. Reply to a message (quoted participant)
  if (ctx?.participant)       return ctx.participant;
  if (ctx?.quotedParticipant) return ctx.quotedParticipant;

  return null;
}

/**
 * Fetch an anime reaction GIF/image and send it to the chat.
 * Supports @mention and reply-to-message for target resolution.
 * GIFs are converted to MP4 for proper animated gifPlayback in WhatsApp.
 *
 * @param {object}        o
 * @param {object}        o.sock         Baileys socket
 * @param {object}        o.msg          raw WA message object
 * @param {string}        o.sender       sender JID
 * @param {string}        o.type         reaction type (e.g. "hug", "slap")
 * @param {string}        o.soloCaption  caption when no one is targeted
 * @param {Function|null} o.duoCaption   (fromTag, toTag) => caption string
 * @param {string}        o.errorText    fallback text if ALL sources fail
 */
export async function sendReaction({
  sock, msg, sender, type,
  soloCaption, duoCaption, errorText,
}) {
  const chatId    = msg.key.remoteJid;
  const rawMentioned = resolveTarget(msg);
  const mentioned = rawMentioned
    ? await resolveTargetIdentity(rawMentioned, { sender, sock, chatId })
    : null;

  const senderTag = `@${(sender ?? "").split("@")[0].split(":")[0]}`;
  const targetTag = mentioned ? `@${mentioned.split("@")[0].split(":")[0]}` : null;
  const mentions  = mentioned ? [sender, mentioned] : [sender];

  const caption = (mentioned && duoCaption)
    ? duoCaption(senderTag, targetTag)
    : soloCaption;

  try {
    await sendAnimeMedia({ sock, msg, type, caption, mentions });

  } catch (err) {
    console.error(`[anime/${type}] ${err.message}`);
    try {
      await sock.sendMessage(chatId, { text: errorText }, { quoted: msg });
    } catch { /* ignore */ }
  }
}
