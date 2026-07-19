/**
 * Anime reaction helper — used by all plugins/anime/*.js
 *
 * Primary:  nekos.best  (https://nekos.best/api/v2/{endpoint})
 * Fallback: waifu.pics  (https://api.waifu.pics/sfw/{type})
 *
 * Both are free, no-key anime GIF APIs. Using two gives redundancy.
 */

// Some of our command names differ from the nekos.best endpoint name
const NEKOS_NAMES = {
  lick:     "nom",      // nekos.best has "nom" not "lick"
  smile:    "smile",
  happy:    "smile",
  kill:     "kill",
  handhold: "handhold",
};

// Types that waifu.pics has but nekos.best doesn't — skip nekos for these
const WAIFU_ONLY = new Set(["waifu", "neko", "bonk", "lick"]);

async function timedFetch(url, ms = 10_000) {
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

async function fromNekosBest(type) {
  const ep  = NEKOS_NAMES[type] ?? type;
  const res = await timedFetch(`https://nekos.best/api/v2/${ep}`);
  const j   = await res.json();
  const url = j?.results?.[0]?.url;
  if (!url) throw new Error("no url in nekos.best response");
  return url;
}

async function fromWaifuPics(type) {
  const res = await timedFetch(`https://api.waifu.pics/sfw/${type}`);
  const j   = await res.json();
  if (!j?.url) throw new Error("no url in waifu.pics response");
  return j.url;
}

/** Returns a GIF URL — tries nekos.best first, then waifu.pics */
export async function getAnimeGif(type) {
  if (!WAIFU_ONLY.has(type)) {
    try {
      return await fromNekosBest(type);
    } catch {
      // fall through to waifu.pics
    }
  }
  return fromWaifuPics(type);
}

/**
 * Send an anime reaction image. Never throws — all errors are caught internally.
 *
 * @param {object}   o
 * @param {object}   o.sock         – Baileys socket
 * @param {object}   o.msg          – raw WA message
 * @param {string}   o.sender       – sender JID
 * @param {string}   o.type         – reaction name (e.g. "hug")
 * @param {string}   o.soloCaption  – caption when used alone
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
    const url = await getAnimeGif(type);
    await sock.sendMessage(chatId, { image: { url }, caption, mentions }, { quoted: msg });
  } catch (err) {
    // Log to console so the owner can see what API failed
    console.error(`[anime/${type}] ${err.message}`);
    // Send error text — wrap in its own try so it never crashes the plugin
    try {
      await sock.sendMessage(chatId, { text: errorText }, { quoted: msg });
    } catch { /* socket error — nothing more we can do */ }
  }
}
