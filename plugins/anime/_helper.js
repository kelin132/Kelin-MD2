/**
 * Anime reaction helper — used by all plugins/anime/*.js
 *
 * Primary:  nekos.best  (https://nekos.best/api/v2/{endpoint})
 * Fallback: waifu.pics  (https://api.waifu.pics/sfw/{type})
 *
 * nekos.best returns MP4 files — we download them as a buffer and send
 * via `video` + `gifPlayback: true` so WhatsApp auto-plays them as GIFs.
 * waifu.pics returns static image URLs — sent as `image`.
 */

const NEKOS_NAMES = {
  lick:     "nom",
  smile:    "smile",
  happy:    "smile",
  kill:     "kill",
  handhold: "handhold",
};

// Types waifu.pics has but nekos.best doesn't
const WAIFU_ONLY = new Set(["waifu", "neko", "bonk"]);

async function timedFetch(url, ms = 12_000) {
  const ac = new AbortController();
  const t  = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Returns { url, isVideo } — isVideo=true when the URL is an MP4 that
 * should be downloaded and sent as an animated GIF video buffer.
 */
async function fromNekosBest(type) {
  const ep  = NEKOS_NAMES[type] ?? type;
  const res = await timedFetch(`https://nekos.best/api/v2/${ep}`);
  const j   = await res.json();
  const url = j?.results?.[0]?.url;
  if (!url) throw new Error("no url in nekos.best response");
  // nekos.best always returns .mp4
  return { url, isVideo: url.endsWith(".mp4") };
}

async function fromWaifuPics(type) {
  const res = await timedFetch(`https://api.waifu.pics/sfw/${type}`);
  const j   = await res.json();
  if (!j?.url) throw new Error("no url in waifu.pics response");
  return { url: j.url, isVideo: false };
}

/** Downloads an MP4 URL and returns a Buffer */
async function downloadBuffer(url) {
  const res = await timedFetch(url);
  const ab  = await res.arrayBuffer();
  return Buffer.from(ab);
}

/** Returns { url, isVideo } — tries nekos.best first, falls back to waifu.pics */
export async function getAnimeGif(type) {
  if (!WAIFU_ONLY.has(type)) {
    try {
      return await fromNekosBest(type);
    } catch {
      // fall through
    }
  }
  return fromWaifuPics(type);
}

/**
 * Send an anime reaction. Automatically handles MP4 (animated) vs static image.
 *
 * @param {object}   o
 * @param {object}   o.sock         – Baileys socket
 * @param {object}   o.msg          – raw WA message
 * @param {string}   o.sender       – sender JID
 * @param {string}   o.type         – reaction name (e.g. "hug")
 * @param {string}   o.soloCaption  – caption when no one is mentioned
 * @param {Function} o.duoCaption   – (senderTag, targetTag) => string when @mentioning
 * @param {string}   o.errorText    – message shown if image fetch fails
 */
export async function sendReaction({ sock, msg, sender, type, soloCaption, duoCaption, errorText }) {
  const chatId    = msg.key.remoteJid;
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ?? null;

  const senderTag = `@${(sender ?? "").split("@")[0].split(":")[0]}`;
  const targetTag = mentioned ? `@${mentioned.split("@")[0].split(":")[0]}` : null;
  const mentions  = mentioned ? [sender, mentioned] : [sender];

  const caption = (mentioned && duoCaption)
    ? duoCaption(senderTag, targetTag)
    : soloCaption;

  try {
    const { url, isVideo } = await getAnimeGif(type);

    if (isVideo) {
      // Download MP4 buffer so WhatsApp plays it as an animated GIF
      const buffer = await downloadBuffer(url);
      await sock.sendMessage(chatId, {
        video: buffer,
        caption,
        gifPlayback: true,
        mimetype: "video/mp4",
        mentions,
      }, { quoted: msg });
    } else {
      await sock.sendMessage(chatId, { image: { url }, caption, mentions }, { quoted: msg });
    }
  } catch (err) {
    console.error(`[anime/${type}] ${err.message}`);
    try {
      await sock.sendMessage(chatId, { text: errorText }, { quoted: msg });
    } catch { /* socket error */ }
  }
}
