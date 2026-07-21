/**
 * KELIN MD — .pinterest command
 * Downloads images/videos from Pinterest via GiftedTech API.
 */

import { get } from "../../lib/gifted.js";

function pickMedia(result) {
  if (!result) return null;

  return (
    result.video ||
    result.video_url ||
    result.download_url ||
    result.url ||
    result.image ||
    result.image_url ||
    result.media ||
    null
  );
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
      return await sock.sendMessage(
        jid,
        {
          text:
            "📌 *Pinterest Downloader*\n\n" +
            "Usage:\n" +
            "*.pinterest <Pinterest URL>*",
        },
        { quoted: msg }
      );
    }

    if (!/pinterest\.com|pin\.it/i.test(text)) {
      return await sock.sendMessage(
        jid,
        {
          text: "❌ Please provide a valid Pinterest link.",
        },
        { quoted: msg }
      );
    }

    try {
      await sock.sendMessage(
        jid,
        {
          text: "📥 Downloading from Pinterest...",
        },
        { quoted: msg }
      );

      // Gifted API
      const data = await get("/download/pinterest", {
        url: text,
      });

      const result = data?.result || {};
      const media = pickMedia(result);

      if (!media) throw new Error("No downloadable media found.");

      const isVideo =
        media.endsWith(".mp4") ||
        result.video ||
        result.video_url;

      if (isVideo) {
        await sock.sendMessage(
          jid,
          {
            video: { url: media },
            caption: "✅ Downloaded from Pinterest",
          },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(
          jid,
          {
            image: { url: media },
            caption: "✅ Downloaded from Pinterest",
          },
          { quoted: msg }
        );
      }
    } catch (err) {
      console.error("[pinterest]", err);

      await sock.sendMessage(
        jid,
        {
          text:
            "❌ Failed to download Pinterest media.\nMake sure the link is public and valid.",
        },
        { quoted: msg }
      );
    }
  },
};