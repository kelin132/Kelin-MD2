// plugins/anime/animegif.js
// Send a verified animated anime clip, converted to WhatsApp-compatible MP4.
import { sendAnimeMedia } from "./_helper.js";

const CATEGORIES = [
  "dance", "hug", "kiss", "punch", "slap", "cry", "blush", "cuddle",
  "pat", "wave", "wink", "smile", "poke", "bonk", "yeet", "bite", "smug",
  "tickle", "highfive", "happy", "sad", "angry", "feed",
];

const DISPLAY_NAMES = {
  happy: "happy", sad: "sad", angry: "angry", feed: "feed",
};

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

    const displayName = DISPLAY_NAMES[category] ?? category;

    try {
      await sendAnimeMedia({
        sock,
        msg,
        type: category,
        caption: `🎬 *${displayName.toUpperCase()} anime gif*\n> Powered by anime media sources`,
      });
    } catch (err) {
      console.error("[animegif]", err.message);
      await sock.sendMessage(jid, {
        text: `❌ Couldn't fetch a ${displayName} gif. Try again!`,
      }, { quoted: msg });
    }
  },
};
