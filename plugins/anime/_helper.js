/**
 * Anime reaction helper — plugins/anime/_helper.js
 *
 * Primary source : waifu.pics  (https://api.waifu.pics/sfw/<type>)
 * Fallback source: otakugifs   (https://api.otakugifs.xyz/gif?reaction=<type>)
 *
 * waifu.pics response: { url: "https://..." }
 * otakugifs response : { url: "https://..." }
 *
 * GIFs are sent as gifPlayback videos so they animate in WhatsApp.
 * Static images (.png/.jpg) are sent as regular image messages.
 */

import axios from "axios";

// ── Endpoint maps ─────────────────────────────────────────────────────────────

/**
 * Commands that waifu.pics /sfw/<type> supports directly or via remap.
 * Value is the exact waifu.pics endpoint segment.
 */
const WAIFU_MAP = {
  // Direct matches
  awoo:     "awoo",
  bite:     "bite",
  blush:    "blush",
  bonk:     "bonk",
  bully:    "bully",
  cringe:   "cringe",
  cry:      "cry",
  cuddle:   "cuddle",
  dance:    "dance",
  glomp:    "glomp",
  handhold: "handhold",
  highfive: "highfive",
  hug:      "hug",
  kiss:     "kiss",
  lick:     "lick",
  megumin:  "megumin",
  neko:     "neko",
  nom:      "nom",
  pat:      "pat",
  shinobu:  "shinobu",
  slap:     "slap",
  smile:    "smile",
  smug:     "smug",
  waifu:    "waifu",
  wave:     "wave",
  yeet:     "yeet",
  // Remaps to closest waifu.pics type
  happy:    "smile",
  sad:      "cry",
  kill:     "bonk",
  kick:     "yeet",
  feed:     "nom",
  meow:     "neko",
  kitsune:  "neko",
  foxgirl:  "neko",
  fox_girl: "neko",
  woof:     "awoo",
  ngif:     "neko",
  wallpaper:"waifu",
};

/**
 * Commands NOT covered by waifu.pics → fall back to otakugifs.
 * Value is the otakugifs reaction name.
 */
const OTAKU_FALLBACK = {
  wink:    "wink",
  poke:    "poke",
  punch:   "punch",
  smack:   "smack",
  tickle:  "tickle",
};

const WAIFU_BASE = "https://api.waifu.pics/sfw";
const OTAKU_BASE = "https://api.otakugifs.xyz/gif";

const AXIOS_OPTS = {
  timeout: 15_000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; KelinMD/1.0)" },
};

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchFromWaifu(endpoint) {
  const { data } = await axios.get(`${WAIFU_BASE}/${endpoint}`, AXIOS_OPTS);
  const url = data?.url;
  if (!url) throw new Error(`waifu.pics returned no url for "${endpoint}"`);
  return url;
}

async function fetchFromOtaku(reaction) {
  const { data } = await axios.get(`${OTAKU_BASE}?reaction=${reaction}`, AXIOS_OPTS);
  const url = data?.url;
  if (!url) throw new Error(`otakugifs returned no url for "${reaction}"`);
  return url;
}

async function downloadBuffer(url) {
  const { data } = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 20_000,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; KelinMD/1.0)" },
  });
  return Buffer.from(data);
}

// ── Public: getAnimeGif ───────────────────────────────────────────────────────

/**
 * Fetch a reaction GIF/image and return it as a Buffer.
 * Tries waifu.pics first; falls back to otakugifs if the type isn't supported.
 *
 * @param {string} type — bot command name (e.g. "hug", "slap", "wink")
 * @returns {Promise<{ buffer: Buffer, isGif: boolean }>}
 */
export async function getAnimeGif(type) {
  const lower = type.toLowerCase();

  let mediaUrl;

  if (WAIFU_MAP[lower]) {
    // ── Primary: waifu.pics ─────────────────────────────────────────────────
    try {
      mediaUrl = await fetchFromWaifu(WAIFU_MAP[lower]);
    } catch {
      // Silently fall through to otakugifs
    }
  }

  if (!mediaUrl && OTAKU_FALLBACK[lower]) {
    // ── Fallback: otakugifs ─────────────────────────────────────────────────
    mediaUrl = await fetchFromOtaku(OTAKU_FALLBACK[lower]);
  }

  if (!mediaUrl) {
    // Last resort: hug from waifu.pics
    mediaUrl = await fetchFromWaifu("hug");
  }

  const buffer = await downloadBuffer(mediaUrl);
  const isGif  = mediaUrl.toLowerCase().includes(".gif") ||
                 mediaUrl.toLowerCase().includes("gif");

  return { buffer, isGif };
}

// ── Public: sendReaction ──────────────────────────────────────────────────────

/**
 * Send an anime reaction to a WhatsApp chat.
 *
 * GIFs are sent as gifPlayback videos so they animate.
 * Static images (.jpg/.png) are sent as images.
 *
 * @param {object}        o
 * @param {object}        o.sock         Baileys socket
 * @param {object}        o.msg          raw WA message object
 * @param {string}        o.sender       sender JID
 * @param {string}        o.type         reaction type (e.g. "hug", "slap")
 * @param {string}        o.soloCaption  caption when no one is @mentioned
 * @param {Function|null} o.duoCaption   (fromTag, toTag) => caption string
 * @param {string}        o.errorText    fallback text if the fetch fails
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
      // Animated GIF → send as gifPlayback video
      await sock.sendMessage(chatId, {
        video:       buffer,
        caption,
        gifPlayback: true,
        mimetype:    "image/gif",
        mentions,
      }, { quoted: msg });
    } else {
      // Static image → send as image
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
    } catch { /* ignore secondary errors */ }
  }
}
