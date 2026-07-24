/**
 * Anime reaction helper — used by all plugins/anime/*.js
 *
 * Primary:   otakugifs.xyz  (https://api.otakugifs.xyz/gif?reaction={type})
 *            Returns animated GIFs for a comprehensive set of reactions.
 * Secondary: nekos.best     (https://nekos.best/api/v2/{endpoint})
 *            Returns MP4 files sent as gifPlayback videos.
 * Fallback:  waifu.pics     (https://api.waifu.pics/sfw/{type})
 *            Returns static image URLs.
 */

// Reactions available on otakugifs.xyz (from /gif/allreactions)
const OTAKUGIFS_REACTIONS = new Set([
  "airkiss","angrystare","bite","bleh","blush","brofist","celebrate","cheers",
  "clap","confused","cool","cry","cuddle","dance","drool","evillaugh","facepalm",
  "handhold","happy","headbang","hug","huh","kiss","laugh","lick","love","mad",
  "nervous","no","nom","nosebleed","nuzzle","nyah","pat","peek","pinch","poke",
  "pout","punch","roll","run","sad","scared","shout","shrug","shy","sigh","sing",
  "sip","slap","sleep","slowclap","smack","smile","smug","sneeze","sorry","stare",
  "stop","surprised","sweat","thumbsup","tickle","tired","wave","wink","woah",
  "yawn","yay","yes",
]);

// Map bot reaction names → otakugifs reaction names where they differ
const OTAKUGIFS_MAP = {
  happy:    "happy",
  nom:      "nom",
  bite:     "bite",
  feed:     "nom",     // "feed" → closest is "nom"
  meow:     "nyah",    // "meow" → "nyah" (cat sound)
  lick:     "lick",
  yeet:     null,      // not on otakugifs — fall through to nekos.best
  highfive: null,      // not on otakugifs — fall through to nekos.best
  kill:     null,      // not on otakugifs — fall through to nekos.best
  bonk:     null,      // not on otakugifs — fall through to waifu.pics
};

// Types that only waifu.pics has
const WAIFU_ONLY = new Set(["waifu", "neko", "bonk"]);

// nekos.best name overrides
const NEKOS_NAMES = {
  lick:     "nom",
  smile:    "smile",
  happy:    "smile",
  kill:     "kill",
  handhold: "handhold",
};

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
 * Try otakugifs.xyz first — returns { url, isVideo: false } on success.
 * Throws if the reaction isn't available or the request fails.
 */
async function fromOtakuGifs(type) {
  // Resolve the otakugifs reaction name
  let reaction;
  if (type in OTAKUGIFS_MAP) {
    reaction = OTAKUGIFS_MAP[type]; // may be null — caller handles that
  } else {
    reaction = OTAKUGIFS_REACTIONS.has(type) ? type : null;
  }
  if (!reaction) throw new Error(`${type} not on otakugifs`);

  const res = await timedFetch(`https://api.otakugifs.xyz/gif?reaction=${reaction}`);
  const j   = await res.json();
  if (!j?.url) throw new Error("no url in otakugifs response");
  return { url: j.url, isVideo: false };
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

/**
 * Returns { url, isVideo }.
 * Priority: otakugifs.xyz → nekos.best → waifu.pics
 */
export async function getAnimeGif(type) {
  // 1️⃣ otakugifs.xyz (GIF, wide reaction set)
  if (!WAIFU_ONLY.has(type)) {
    try {
      return await fromOtakuGifs(type);
    } catch {
      // fall through to nekos.best
    }
  }

  // 2️⃣ nekos.best (MP4 animated)
  if (!WAIFU_ONLY.has(type)) {
    try {
      return await fromNekosBest(type);
    } catch {
      // fall through to waifu.pics
    }
  }

  // 3️⃣ waifu.pics (static image, last resort)
  return fromWaifuPics(type);
}

/**
 * Send an anime reaction. Automatically handles GIF vs MP4 vs static image.
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
      // GIF or static image — send directly via URL
      await sock.sendMessage(chatId, { image: { url }, caption, mentions }, { quoted: msg });
    }
  } catch (err) {
    console.error(`[anime/${type}] ${err.message}`);
    try {
      await sock.sendMessage(chatId, { text: errorText }, { quoted: msg });
    } catch { /* socket error */ }
  }
}
