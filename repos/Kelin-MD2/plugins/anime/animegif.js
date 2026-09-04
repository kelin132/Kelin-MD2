// plugins/anime/animegif.js
// Send a random anime GIF from nekos.best v2.
// All categories listed here are confirmed to return animated .gif files.

const CATEGORY_MAP = {
  // Direct nekos.best endpoints
  dance:    "dance",
  hug:      "hug",
  kiss:     "kiss",
  punch:    "punch",
  slap:     "slap",
  cry:      "cry",
  blush:    "blush",
  cuddle:   "cuddle",
  pat:      "pat",
  wave:     "wave",
  wink:     "wink",
  smile:    "smile",
  poke:     "poke",
  bonk:     "bonk",
  yeet:     "yeet",
  bite:     "bite",
  smug:     "smug",
  tickle:   "tickle",
  highfive: "highfive",
  // Remaps (missing on nekos.best → closest equivalent)
  happy:  "smile",
  sad:    "cry",
  angry:  "punch",
  feed:   "feed",
};

const DISPLAY_NAMES = {
  happy: "happy", sad: "sad", angry: "angry", feed: "feed",
};

const CATEGORIES = Object.keys(CATEGORY_MAP);

export default {
  name: "animegif",
  aliases: ["agif", "animatedgif"],
  description: "Send a random anime GIF. Specify a category or get a random one",
  category: "anime",
  usage: `.animegif [${["happy","sad","angry","dance","hug","kiss","punch","slap","cry","blush","cuddle","pat","wave","wink","smile","poke","bonk","yeet","bite","smug","tickle","highfive"].join("|")}]`,
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    const requested = (text || "").toLowerCase().trim();
    const category  = CATEGORIES.includes(requested)
      ? requested
      : CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

    const endpoint    = CATEGORY_MAP[category];
    const displayName = DISPLAY_NAMES[category] ?? category;

    try {
      const res = await fetch(`https://nekos.best/api/v2/${endpoint}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!data.results?.length) throw new Error("No results");

      const { url } = data.results[0];

      await sock.sendMessage(jid, {
        video:       { url },
        caption:     `🎬 *${displayName.toUpperCase()} anime gif*\n> Powered by nekos.best`,
        gifPlayback: true,
        mimetype:    "image/gif",
      }, { quoted: msg });
    } catch (err) {
      console.error("[animegif]", err.message);
      await sock.sendMessage(jid, {
        text: `❌ Couldn't fetch a ${displayName} gif. Try again!`,
      }, { quoted: msg });
    }
  },
};
