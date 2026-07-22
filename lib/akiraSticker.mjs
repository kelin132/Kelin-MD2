/**
 * KELIN MD — Akira reaction sticker
 *
 * After Akira sends her text reply, this picks one of her own custom
 * character images (media/akira/*.jpg) matching her mood and converts
 * it into a WhatsApp sticker. Fully local — no external API calls, so
 * it can't fail from a dead endpoint or rate limit.
 *
 * Never blocks or breaks the text reply — if anything here fails
 * (missing file, bad image, etc.), it just logs a warning and skips
 * the sticker silently.
 */

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Sticker, StickerTypes } from "wa-sticker-formatter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.join(__dirname, "..", "media", "akira");

// Mood buckets → one of Akira's own images.
// Matches the SWEET / RUDE-SAVAGE / CHAOTIC / neutral modes from her persona.
const MOOD_IMAGES = {
  savage:  ["smug_chest.jpg", "smirk_sly.jpg", "disgusted.jpg"],
  sweet:   ["laughing_happy.jpg"],
  chaotic: ["crying_flustered.jpg", "brushing_shock.jpg"],
  neutral: ["tea_deadpan.jpg", "stretch_deadpan.jpg", "blank_stare.jpg"],
};

const SAVAGE_HINTS  = /\bbaka\b|roast|embarrass|dumb|stupid|nani the actual|💀|dame da/i;
const SWEET_HINTS   = /dummy|here for you|take care|it'?s okay|don'?t worry|🌸|💕|senpai~/i;
const CHAOTIC_HINTS = /!!|sugoi|chaotic|ramen|hyped|no cap|slay/i;

function pickMood(replyText) {
  if (SAVAGE_HINTS.test(replyText))  return "savage";
  if (SWEET_HINTS.test(replyText))   return "sweet";
  if (CHAOTIC_HINTS.test(replyText)) return "chaotic";
  return "neutral";
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Send a sticker of Akira matching the mood of her reply.
 * Fails silently — a broken sticker should never surface as an error
 * to the user, since the real reply already went through.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {object} msg       – original quoted message
 * @param {string} replyText – Akira's just-sent reply, used to pick a mood
 */
export async function sendAkiraSticker(sock, jid, msg, replyText) {
  try {
    const mood     = pickMood(replyText);
    const filename = pick(MOOD_IMAGES[mood]);
    const filePath = path.join(MEDIA_DIR, filename);

    const buffer  = await readFile(filePath);
    const sticker = new Sticker(buffer, {
      pack:    "Akira",
      author:  "KELIN MD",
      type:    StickerTypes.FULL,
      quality: 70,
    });

    const stickerBuffer = await sticker.toBuffer();
    await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg });
  } catch (err) {
    console.warn(`[akiraSticker] skipped: ${err.message}`);
  }
}
