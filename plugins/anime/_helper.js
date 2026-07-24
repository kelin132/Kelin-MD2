/**
 * Anime reaction helper — plugins/anime/_helper.js
 *
 * Source: waifu.pics API (https://api.waifu.pics/sfw/<category>)
 * Returns static images (not GIFs), resized to ~400 px wide via
 * images.weserv.nl so they are never sent at full/HD resolution.
 */

const WAIFU_BASE  = "https://api.waifu.pics/sfw";
const RESIZE_BASE = "https://images.weserv.nl";

// waifu.pics SFW categories that exist on the API
const VALID_CATEGORIES = new Set([
  "waifu", "neko", "shinobu", "megumin", "bully", "cuddle", "cry",
  "hug", "awoo", "kiss", "lick", "pat", "smug", "bonk", "yeet",
  "blush", "smile", "wave", "highfive", "handhold", "nom", "bite",
  "glomp", "slap", "kill", "kick", "happy", "wink", "poke", "dance",
  "cringe",
]);

// Map bot command types → waifu.pics category names
const ENDPOINT_MAP = {
  // ── Direct matches ─────────────────────────────────────────────────────────
  bite:      "bite",
  blush:     "blush",
  bonk:      "bonk",
  cry:       "cry",
  cuddle:    "cuddle",
  dance:     "dance",
  handhold:  "handhold",
  highfive:  "highfive",
  hug:       "hug",
  kiss:      "kiss",
  lick:      "lick",
  pat:       "pat",
  poke:      "poke",
  slap:      "slap",
  smile:     "smile",
  smug:      "smug",
  tickle:    "nom",      // no tickle → nom (closest playful touch)
  wave:      "wave",
  wink:      "wink",
  yeet:      "yeet",
  // ── Remaps ─────────────────────────────────────────────────────────────────
  punch:     "slap",     // closest aggressive physical
  smack:     "slap",
  kill:      "kill",
  feed:      "nom",
  meow:      "neko",
  neko:      "neko",
  woof:      "happy",
  fox_girl:  "neko",
  kitsune:   "neko",
  waifu:     "waifu",
  wallpaper: "waifu",
  ngif:      "neko",
};

// ── HTTP helper ────────────────────────────────────────────────────────────────
async function timedFetch(url, timeoutMs = 15_000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KelinMD/1.0)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Fetch a reaction image from waifu.pics, resize it to 400 px wide at
 * 65 % JPEG quality via images.weserv.nl, and return the result as a Buffer.
 *
 * @param {string} type — bot reaction type (e.g. "hug", "slap")
 * @returns {Promise<Buffer>}
 */
export async function getAnimeGif(type) {
  // Resolve category
  const category = ENDPOINT_MAP[type] ?? (VALID_CATEGORIES.has(type) ? type : "hug");

  // 1. Ask waifu.pics for an image URL
  const apiRes  = await timedFetch(`${WAIFU_BASE}/${category}`);
  const json    = await apiRes.json();
  const imgUrl  = json?.url;
  if (!imgUrl) throw new Error(`waifu.pics returned no URL for category "${category}"`);

  // 2. Fetch through images.weserv.nl — resize to 400 px wide, JPEG 65 % quality
  //    This ensures the image is never sent at HD resolution.
  const resizeUrl =
    `${RESIZE_BASE}/?url=${encodeURIComponent(imgUrl)}&w=400&output=jpg&q=65`;

  const imgRes   = await timedFetch(resizeUrl);
  const arrayBuf = await imgRes.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/**
 * Send an anime reaction image to a WhatsApp chat.
 *
 * Automatically picks the caption based on whether someone is @mentioned.
 * Images are sent as regular photos (not GIFs/videos).
 *
 * @param {object}        o
 * @param {object}        o.sock         Baileys socket
 * @param {object}        o.msg          raw WA message object
 * @param {string}        o.sender       sender JID
 * @param {string}        o.type         reaction type (e.g. "hug", "slap")
 * @param {string}        o.soloCaption  caption when no one is mentioned
 * @param {Function|null} o.duoCaption   (fromTag, toTag) => string
 * @param {string}        o.errorText    fallback message if the fetch fails
 */
export async function sendReaction({
  sock, msg, sender, type,
  soloCaption, duoCaption, errorText,
}) {
  const chatId = msg.key.remoteJid;

  // Resolve mentioned user — check contextInfo across all common message types
  const ctx =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.stickerMessage?.contextInfo ||
    null;

  const mentioned = ctx?.mentionedJid?.[0] ?? null;

  const senderTag = `@${(sender ?? "").split("@")[0].split(":")[0]}`;
  const targetTag = mentioned ? `@${mentioned.split("@")[0].split(":")[0]}` : null;
  const mentions  = mentioned ? [sender, mentioned] : [sender];

  const caption = (mentioned && duoCaption)
    ? duoCaption(senderTag, targetTag)
    : soloCaption;

  try {
    const buffer = await getAnimeGif(type);

    // Send as a regular image (not a GIF/video)
    await sock.sendMessage(chatId, {
      image:   buffer,
      caption,
      mentions,
    }, { quoted: msg });

  } catch (err) {
    console.error(`[anime/${type}] ${err.message}`);
    try {
      await sock.sendMessage(chatId, { text: errorText }, { quoted: msg });
    } catch { /* ignore secondary errors */ }
  }
}
