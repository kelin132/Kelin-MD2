/**
 * KELIN MD — .pinterest command
 * Downloads images/videos from Pinterest.
 * Tries multiple API endpoints with automatic fallback.
 */

import { get, davidGet } from "../../lib/gifted.js";

function pickMedia(result) {
  return (
    result?.video        ||
    result?.video_url    ||
    result?.download_url ||
    result?.url          ||
    result?.image        ||
    result?.image_url    ||
    result?.media        ||
    null
  );
}

function isVideoUrl(url, result) {
  return (
    /\.mp4(\?|$)/i.test(url)  ||
    !!result?.video            ||
    !!result?.video_url
  );
}

async function fetchPinterest(url) {
  const attempts = [
    () => get("/download/pinterest",     { url }),
    () => davidGet("/download/pinterest", { url }),
    () => get("/download/pin",           { url }),
  ];

  for (const attempt of attempts) {
    try {
      const data   = await attempt();
      const result = data?.result || data?.data || data;
      const media  = pickMedia(result);
      if (media) return { media, result };
    } catch { /* try next */ }
  }

  throw new Error("All Pinterest download sources failed. Make sure the link is public.");
}

export default {
  name: "pinterest",
  description: "Download Pinterest videos or images",
  category: "download",
  usage: ".pinterest <Pinterest URL>",
  aliases: ["pin", "pindl"],
  cooldown: 10,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return sock.sendMessage(jid, {
        text: "📌 *Pinterest Downloader*\n\nUsage:\n*.pinterest <Pinterest URL>*"
      }, { quoted: msg });
    }

    if (!/pinterest\.com|pin\.it/i.test(text)) {
      return sock.sendMessage(jid, {
        text: "❌ Please provide a valid Pinterest link."
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { text: "📥 Downloading from Pinterest..." }, { quoted: msg });

      const { media, result } = await fetchPinterest(text);

      if (isVideoUrl(media, result)) {
        await sock.sendMessage(jid, {
          video:   { url: media },
          caption: "✅ Downloaded from Pinterest",
        }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, {
          image:   { url: media },
          caption: "✅ Downloaded from Pinterest",
        }, { quoted: msg });
      }

    } catch (err) {
      console.error("[pinterest]", err.message);
      await sock.sendMessage(jid, {
        text: `❌ Failed to download Pinterest media.\n\n_${err.message}_`
      }, { quoted: msg });
    }
  },
};
