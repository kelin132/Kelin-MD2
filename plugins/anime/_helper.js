/**
 * Anime reaction helper — plugins/anime/_helper.js
 *
 * Tries four sources in order until one succeeds:
 *   1. waifu.pics  — https://api.waifu.pics/sfw/<type>
 *   2. nekos.best  — https://nekos.best/api/v2/<type>
 *   3. otakugifs   — https://api.otakugifs.xyz/gif?reaction=<type>
 *   4. GiftedTech  — https://api.giftedtech.co.ke/api/anime/<type> (has API key)
 *
 * GIFs are sent as gifPlayback videos so they animate in WhatsApp.
 * Static images (.png/.jpg) are sent as regular image messages.
 */

import axios from "axios";
import { KEY as GIFTED_KEY, ANIME_BASE as GIFTED_ANIME_BASE } from "../../lib/gifted.js";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; KelinMD/1.0)" };

// ── Source 1: waifu.pics ──────────────────────────────────────────────────────
// https://api.waifu.pics/sfw/<type>  →  { url }

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
  feed: "nom", meow: "neko", kitsune: "neko", foxgirl: "neko",
  fox_girl: "neko", woof: "awoo", ngif: "neko", wallpaper: "waifu",
  wink: "smile",  // waifu.pics has no wink; handled by nekos.best
  poke: "nom",
};

async function fetchWaifu(type) {
  const ep = WAIFU_MAP[type] ?? "hug";
  const { data } = await axios.get(`https://api.waifu.pics/sfw/${ep}`,
    { timeout: 10_000, headers: UA });
  const url = data?.url;
  if (!url) throw new Error("waifu.pics: no url");
  return url;
}

// ── Source 2: nekos.best ──────────────────────────────────────────────────────
// https://nekos.best/api/v2/<type>  →  { results: [{ url }] }

const NEKOS_MAP = {
  bite: "bite", blush: "blush", baka: "baka", bonk: "bonk",
  bully: "bully", cry: "cry", cuddle: "cuddle", dance: "dance",
  feed: "feed", glomp: "glomp", handhold: "handhold",
  happy: "happy", highfive: "highfive", hug: "hug", kick: "kick",
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
  const { data } = await axios.get(`https://nekos.best/api/v2/${ep}`,
    { timeout: 10_000, headers: UA });
  const url = data?.results?.[0]?.url;
  if (!url) throw new Error("nekos.best: no url");
  return url;
}

// ── Source 3: otakugifs ───────────────────────────────────────────────────────
// https://api.otakugifs.xyz/gif?reaction=<type>  →  { url }

const OTAKU_MAP = {
  bite: "bite", blush: "blush", cry: "cry", cuddle: "cuddle",
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
  cuddle2: "cuddle", bully: "mad", kick: "run", glomp: "hug",
  handhold2: "handhold",
};

async function fetchOtaku(type) {
  const reaction = OTAKU_MAP[type] ?? "hug";
  const { data } = await axios.get(
    `https://api.otakugifs.xyz/gif?reaction=${reaction}`,
    { timeout: 10_000, headers: UA });
  const url = data?.url;
  if (!url) throw new Error("otakugifs: no url");
  return url;
}

// ── Source 4: GiftedTech (has API key — most reliable) ───────────────────────
// https://api.gifted.co.ke/api/anime/<type>?apikey=<key>

const GIFTED_MAP = {
  hug: "hug", kiss: "kiss", slap: "slap", pat: "pat",
  punch: "punch", cry: "cry", cuddle: "cuddle", blush: "blush",
  smile: "smile", wave: "wave", dance: "dance", wink: "wink",
  bite: "bite", nom: "nom", poke: "poke", bonk: "bonk",
  smug: "smug", yeet: "yeet", lick: "lick", highfive: "highfive",
  handhold: "handhold", neko: "neko", waifu: "waifu",
};

async function fetchGifted(type) {
  const ep = GIFTED_MAP[type] ?? "hug";
  const url = `${GIFTED_ANIME_BASE}/${ep}?apikey=${GIFTED_KEY}`;
  const { data } = await axios.get(url, { timeout: 10_000, headers: UA });
  // GiftedTech returns { success, result: { url } } or { url }
  const mediaUrl = data?.result?.url ?? data?.url ?? data?.data?.url;
  if (!mediaUrl) throw new Error("gifted: no url");
  return mediaUrl;
}

// ── Download buffer ───────────────────────────────────────────────────────────

async function downloadBuffer(url) {
  const { data } = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 25_000,
    headers: UA,
  });
  return Buffer.from(data);
}

// ── Public: getAnimeGif ───────────────────────────────────────────────────────

/**
 * Try all four sources in order until one returns a valid media URL.
 * Downloads and returns the buffer plus whether it's a GIF.
 *
 * @param {string} type — bot command name (e.g. "hug", "kiss", "wink")
 * @returns {Promise<{ buffer: Buffer, isGif: boolean }>}
 */
export async function getAnimeGif(type) {
  const lower = type.toLowerCase();
  const errors = [];

  const sources = [
    ["waifu.pics",  () => fetchWaifu(lower)],
    ["nekos.best",  () => fetchNekos(lower)],
    ["otakugifs",   () => fetchOtaku(lower)],
    ["gifted",      () => fetchGifted(lower)],
  ];

  for (const [name, fn] of sources) {
    try {
      const mediaUrl = await fn();
      const buffer   = await downloadBuffer(mediaUrl);
      const isGif    = /\.gif($|\?)/i.test(mediaUrl) ||
                       mediaUrl.includes("gif");
      return { buffer, isGif };
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
    }
  }

  throw new Error(`All sources failed for "${type}":\n${errors.join("\n")}`);
}

// ── Public: sendReaction ──────────────────────────────────────────────────────

/**
 * Send an anime reaction to a WhatsApp chat.
 *
 * @param {object}        o
 * @param {object}        o.sock         Baileys socket
 * @param {object}        o.msg          raw WA message object
 * @param {string}        o.sender       sender JID
 * @param {string}        o.type         reaction type (e.g. "hug", "slap")
 * @param {string}        o.soloCaption  caption when no one is @mentioned
 * @param {Function|null} o.duoCaption   (fromTag, toTag) => caption string
 * @param {string}        o.errorText    fallback text if ALL sources fail
 */
export async function sendReaction({
  sock, msg, sender, type,
  soloCaption, duoCaption, errorText,
}) {
  const chatId = msg.key.remoteJid;

  // Resolve @mentioned user across all message types
  const ctx =
    msg.message?.extendedTextMessage?.contextInfo  ||
    msg.message?.imageMessage?.contextInfo         ||
    msg.message?.videoMessage?.contextInfo         ||
    msg.message?.stickerMessage?.contextInfo       ||
    null;

  const mentioned = ctx?.mentionedJid?.[0] ?? null;

  const senderTag = `@${(sender ?? "").split("@")[0].split(":")[0]}`;
  const targetTag = mentioned ? `@${mentioned.split("@")[0].split(":")[0]}` : null;
  const mentions  = mentioned ? [sender, mentioned] : [sender];

  const caption = (mentioned && duoCaption)
    ? duoCaption(senderTag, targetTag)
    : soloCaption;

  try {
    const { buffer, isGif } = await getAnimeGif(type);

    if (isGif) {
      await sock.sendMessage(chatId, {
        video:       buffer,
        caption,
        gifPlayback: true,
        mimetype:    "image/gif",
        mentions,
      }, { quoted: msg });
    } else {
      await sock.sendMessage(chatId, {
        image:   buffer,
        caption,
        mentions,
      }, { quoted: msg });
    }

  } catch (err) {
    console.error(`[anime/${type}] ${err.message}`);
    try {
      await sock.sendMessage(chatId, { text: errorText }, { quoted: msg });
    } catch { /* ignore */ }
  }
}
