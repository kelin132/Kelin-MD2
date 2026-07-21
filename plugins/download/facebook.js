/**
 * KELIN MD — .facebook command
 * Downloads Facebook. videos using David Cyril API.
 */

import { get } from "../../lib/gifted.js";

function pickVideo(result) {
  if (!result) return null;

  return (
    result.hd ||
    result.sd ||
    result.hd_url ||
    result.sd_url ||
    result.download_url ||
    result.url ||
    result.video ||
    null
  );
}

export default {
  name: "facebook",
  description: "Download Facebook videos",
  category: "download",
  usage: ".facebook <facebook url>",
  aliases: ["fb", "fbdl"],
  cooldown: 10,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return await sock.sendMessage(
        jid,
        {
          text:
`📥 *Facebook Downloader*

Usage:
*.facebook <facebook video url>*`
        },
        { quoted: msg }
      );
    }

    if (!/facebook\.com|fb\.watch/i.test(text)) {
      return await sock.sendMessage(
        jid,
        {
          text: "❌ Please provide a valid Facebook video URL."
        },
        { quoted: msg }
      );
    }

    try {
      await sock.sendMessage(
        jid,
        {
          text: "⏳ Downloading Facebook video..."
        },
        { quoted: msg }
      );

      const data = await GET("/download/facebook", {
        url: text
      });

      const result = data?.result || data;
      const video = pickVideo(result);

      if (!video) throw new Error("No download link found.");

      await sock.sendMessage(
        jid,
        {
          video: { url: video },
          mimetype: "video/mp4",
          fileName: `${result.title || "facebook-video"}.mp4`,
          caption: `🎬 ${result.title || "Facebook Video"}`
        },
        { quoted: msg }
      );

    } catch (err) {
      console.error("[facebook]", err);

      await sock.sendMessage(
        jid,
        {
          text: "❌ Failed to download the Facebook video."
        },
        { quoted: msg }
      );
    }
  },
};