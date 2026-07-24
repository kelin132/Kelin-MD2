/**
 * Anime reaction / image helper  —  plugins/anime/_helper.js
 *
 * Source: nekos.best API v2  (https://nekos.best/api/v2/<endpoint>)
 *
 * Reaction endpoints return animated .gif files and are sent via Baileys as
 * gifPlayback videos so they animate in WhatsApp.
 *
 * Image endpoints (neko, waifu, kitsune) return static .png and are sent
 * as regular images.
 *
 * Endpoints missing from nekos.best are silently remapped to the closest
 * available one so all existing plugins continue to work.
 */

const BASE_URL = "https://nekos.best/api/v2";

// ── Endpoint sets ──────────────────────────────────────────────────────────────
// These are the confirmed working v2 endpoints that return animated GIFs.
const GIF_ENDPOINTS = new Set([
  "bite", "blush", "bonk", "cuddle", "cry", "dance",
  "feed", "handhold", "highfive", "hug", "kiss", "pat",
  "poke", "punch", "slap", "smile", "smug", "tickle",
  "wave", "wink", "yeet",
]);

// Confirmed working v2 endpoints that return static PNG images.
const IMAGE_ENDPOINTS = new Set(["neko", "waifu", "kitsune"]);

// ── Name map: bot type  →  nekos.best endpoint ─────────────────────────────────
// Covers direct matches, renamed types, and fallbacks for missing endpoints.
const ENDPOINT_MAP = {
  // ── Direct GIF reactions ───────────────────────────────────────────────────
  bite:     "bite",
  blush:    "blush",
  bonk:     "bonk",
  cuddle:   "cuddle",
  cry:      "cry",
  dance:    "dance",
  feed:     "feed",
  handhold: "handhold",
  highfive: "highfive",
  hug:      "hug",
  kiss:     "kiss",
  pat:      "pat",
  poke:     "poke",
  punch:    "punch",
  slap:     "slap",
  smile:    "smile",
  smug:     "smug",
  tickle:   "tickle",
  wave:     "wave",
  wink:     "wink",
  yeet:     "yeet",
  // ── Static image types ─────────────────────────────────────────────────────
  neko:     "neko",
  waifu:    "waifu",
  kitsune:  "kitsune",
  // ── Remaps (not available on nekos.best) ──────────────────────────────────
  fox_girl: "kitsune",  // foxgirl command → kitsune (same concept)
  lick:     "bite",     // closest physical reaction
  meow:     "bite",     // cat-themed, bite is the nearest
  kill:     "slap",     // most aggressive available
  smack:    "slap",     // synonym
  woof:     "poke",     // playful / animal reaction
  ngif:     "neko",     // neko image (no dedicated neko GIF endpoint)
  wallpaper: "waifu",   // fallback to waifu image
};

// ── Helpers ────────────────────────────────────────────────────────────────────
async function timedFetch(url, timeoutMs = 12_000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Fetch a reaction or image URL from nekos.best v2.
 *
 * @param {string} type  — bot reaction type (e.g. "hug", "waifu", "fox_girl")
 * @returns {{ url: string, isGif: boolean }}
 *   isGif=true  → send as { video: { url }, gifPlayback: true, mimetype: "image/gif" }
 *   isGif=false → send as { image: { url } }
 */
export async function getAnimeGif(type) {
  const endpoint = ENDPOINT_MAP[type] ?? type;

  const res = await timedFetch(`${BASE_URL}/${endpoint}`);
  const json = await res.json();
  const url = json?.results?.[0]?.url;

  if (!url) throw new Error(`nekos.best returned no URL for endpoint "${endpoint}"`);

  const isGif = GIF_ENDPOINTS.has(endpoint);
  return { url, isGif };
}

/**
 * Send an anime reaction GIF or image to a WhatsApp chat.
 *
 * Automatically picks the caption based on whether someone is @mentioned.
 * GIF reactions are sent as gifPlayback videos so they animate in WhatsApp.
 * Image types are sent as regular images.
 *
 * @param {object}        o
 * @param {object}        o.sock         Baileys socket
 * @param {object}        o.msg          raw WA message object
 * @param {string}        o.sender       sender JID
 * @param {string}        o.type         reaction type (e.g. "hug", "slap")
 * @param {string}        o.soloCaption  caption when no one is mentioned
 * @param {Function|null} o.duoCaption   (fromTag, toTag) => string — caption when @mentioning
 * @param {string}        o.errorText    fallback message if the fetch fails
 */
export async function sendReaction({
  sock, msg, sender, type,
  soloCaption, duoCaption, errorText,
}) {
  const chatId = msg.key.remoteJid;

  // Resolve mentioned user (support both @mention and reply-to)
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const mentioned = ctx?.mentionedJid?.[0] ?? null;

  const senderTag = `@${(sender ?? "").split("@")[0].split(":")[0]}`;
  const targetTag  = mentioned ? `@${mentioned.split("@")[0].split(":")[0]}` : null;
  const mentions   = mentioned ? [sender, mentioned] : [sender];

  const caption = (mentioned && duoCaption)
    ? duoCaption(senderTag, targetTag)
    : soloCaption;

  try {
    const { url, isGif } = await getAnimeGif(type);

    if (isGif) {
      // Send animated GIF via gifPlayback so it plays in WhatsApp
      await sock.sendMessage(chatId, {
        video:       { url },
        caption,
        gifPlayback: true,
        mimetype:    "image/gif",
        mentions,
      }, { quoted: msg });
    } else {
      // Static PNG image
      await sock.sendMessage(chatId, {
        image: { url },
        caption,
        mentions,
      }, { quoted: msg });
    }
  } catch (err) {
    console.error(`[anime/${type}] ${err.message}`);
    try {
      await sock.sendMessage(chatId, { text: errorText }, { quoted: msg });
    } catch { /* ignore secondary socket errors */ }
  }
}
