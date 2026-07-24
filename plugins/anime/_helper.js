/**
 * Anime reaction helper — plugins/anime/_helper.js
 *
 * Source: otakugifs API (https://api.otakugifs.xyz)
 * All reactions return animated .gif files, sent as gifPlayback videos
 * so they animate in WhatsApp.
 *
 * The GIF is downloaded to a buffer before sending so Baileys does not
 * need to make an outbound request itself (avoids silent URL failures).
 */

const BASE_URL = "https://api.otakugifs.xyz/gif";

// All confirmed working reactions from the otakugifs API
const VALID_REACTIONS = new Set([
  "airkiss", "angrystare", "bite", "bleh", "blush", "brofist", "celebrate",
  "cheers", "clap", "confused", "cool", "cry", "cuddle", "dance", "drool",
  "evillaugh", "facepalm", "handhold", "happy", "headbang", "hug", "huh",
  "kiss", "laugh", "lick", "love", "mad", "nervous", "no", "nom", "nosebleed",
  "nuzzle", "nyah", "pat", "peek", "pinch", "poke", "pout", "punch", "roll",
  "run", "sad", "scared", "shout", "shrug", "shy", "sigh", "sing", "sip",
  "slap", "sleep", "slowclap", "smack", "smile", "smug", "sneeze", "sorry",
  "stare", "stop", "surprised", "sweat", "thumbsup", "tickle", "tired",
  "wave", "wink", "woah", "yawn", "yay", "yes",
]);

// Map bot command types → otakugifs reaction names
const ENDPOINT_MAP = {
  // ── Direct matches ─────────────────────────────────────────────────────────
  bite:      "bite",
  blush:     "blush",
  cry:       "cry",
  cuddle:    "cuddle",
  dance:     "dance",
  handhold:  "handhold",
  hug:       "hug",
  kiss:      "kiss",
  lick:      "lick",
  pat:       "pat",
  poke:      "poke",
  punch:     "punch",
  slap:      "slap",
  smack:     "smack",
  smile:     "smile",
  smug:      "smug",
  tickle:    "tickle",
  wave:      "wave",
  wink:      "wink",
  // ── Remaps ─────────────────────────────────────────────────────────────────
  bonk:      "punch",
  feed:      "nom",
  highfive:  "clap",
  yeet:      "run",
  kill:      "mad",
  meow:      "nyah",
  woof:      "run",
  fox_girl:  "nyah",
  neko:      "nyah",
  kitsune:   "nyah",
  waifu:     "love",
  wallpaper: "love",
  ngif:      "nyah",
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
 * Fetch a reaction GIF from the otakugifs API and return it as a Buffer.
 *
 * @param {string} type — bot reaction type (e.g. "hug", "slap")
 * @returns {Promise<Buffer>}
 */
export async function getAnimeGif(type) {
  const reaction = ENDPOINT_MAP[type] ?? (VALID_REACTIONS.has(type) ? type : "hug");

  // 1. Get the GIF URL from the API
  const apiRes = await timedFetch(`${BASE_URL}?reaction=${reaction}`);
  const json   = await apiRes.json();
  const gifUrl = json?.url;
  if (!gifUrl) throw new Error(`otakugifs returned no URL for reaction "${reaction}"`);

  // 2. Download the GIF as a buffer (Baileys sends the buffer, not a URL)
  const gifRes   = await timedFetch(gifUrl);
  const arrayBuf = await gifRes.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/**
 * Send an anime reaction GIF to a WhatsApp chat.
 *
 * Automatically picks the caption based on whether someone is @mentioned.
 * GIFs are sent as gifPlayback videos so they animate in WhatsApp.
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

    // Send as animated GIF via gifPlayback so it plays in WhatsApp
    await sock.sendMessage(chatId, {
      video:       buffer,
      caption,
      gifPlayback: true,
      mimetype:    "image/gif",
      mentions,
    }, { quoted: msg });

  } catch (err) {
    console.error(`[anime/${type}] ${err.message}`);
    try {
      await sock.sendMessage(chatId, { text: errorText }, { quoted: msg });
    } catch { /* ignore secondary errors */ }
  }
}
