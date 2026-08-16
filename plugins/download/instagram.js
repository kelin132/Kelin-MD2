/**
 * KELIN MD — .instagram command
 * Downloads Instagram posts, reels, and videos through OmegaTech.
 */
import { omegaDownload } from "../../lib/omegaDownload.js";

const processedMessages = new Set();

function isVideoUrl(mediaUrl, sourceUrl) {
  return /\.(mp4|mov|webm)(?:\?|$)/i.test(mediaUrl)
    || /video|reel|tv/i.test(mediaUrl)
    || /reel|tv/i.test(sourceUrl);
}

async function fetchImage(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: "https://www.instagram.com/",
    },
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Image fetch failed: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > 50 * 1024 * 1024) throw new Error("Invalid image response");
  return buffer;
}

export default {
  name: "instagram",
  description: "Download Instagram posts, reels, and videos",
  category: "download",
  usage: ".instagram <Instagram URL>",
  aliases: ["ig", "igdl", "reels", "insta", "reel"],
  cooldown: 30,

  async run({ sock, msg, args, text }) {
    const jid = msg.key.remoteJid;

    if (processedMessages.has(msg.key.id)) return;
    processedMessages.add(msg.key.id);
    setTimeout(() => processedMessages.delete(msg.key.id), 5 * 60 * 1000);

    const raw = text || args.join(" ");
    const match = raw.match(/https?:\/\/\S+/);
    const url = match?.[0]?.replace(/[<>]/g, "");

    if (!url || !/instagram\.com/i.test(url)) {
      return sock.sendMessage(jid, {
        text:
          "📸 *Instagram Downloader*\n\n" +
          "Usage: *.instagram <URL>*\n\n" +
          "Supported: posts, reels, TV videos, and public media.",
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
      await sock.sendMessage(jid, { text: "⏳ Downloading Instagram media…" }, { quoted: msg });

      const media = await omegaDownload("all", { url: url.trim() });
      const title = media.title || "Instagram Media";
      const caption = `📥 *${title.slice(0, 200)}*`;

      if (isVideoUrl(media.url, url)) {
        await sock.sendMessage(jid, {
          video: { url: media.url },
          mimetype: "video/mp4",
          caption,
        }, { quoted: msg });
      } else {
        const image = await fetchImage(media.url);
        await sock.sendMessage(jid, { image, caption }, { quoted: msg });
      }

      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("[instagram]", err.message);
      await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
      await sock.sendMessage(jid, {
        text: `❌ *Instagram download failed.*\n\n_${err.message.slice(0, 300)}_\n\n💡 Make sure the post is public and the URL is correct.`,
      }, { quoted: msg });
    }
  },
};
