/**
 * KELIN MD — .facebook command
 * Downloads Facebook videos using GiftedTech API with David Cyril fallback.
 */

import { get, davidGet } from "../../lib/gifted.js";

function pickVideo(result) {
  if (!result) return null;
  return (
    result.hd          ||
    result.sd          ||
    result.hd_url      ||
    result.sd_url      ||
    result.download_url||
    result.url         ||
    result.video       ||
    null
  );
}

async function fetchFacebook(url) {
  const attempts = [
    () => get("/download/facebook",  { url }),
    () => davidGet("/download/facebook", { url }),
    () => get("/download/fb",        { url }),
  ];

  for (const attempt of attempts) {
    try {
      const data   = await attempt();
      const result = data?.result || data?.data || data;
      const video  = pickVideo(result);
      if (video) return { video, title: result?.title || "Facebook Video" };
    } catch { /* try next */ }
  }

  throw new Error("All Facebook download sources failed. Make sure the video is public.");
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
      return sock.sendMessage(jid, {
        text: "📥 *Facebook Downloader*\n\nUsage:\n*.facebook <facebook video url>*"
      }, { quoted: msg });
    }

    if (!/facebook\.com|fb\.watch/i.test(text)) {
      return sock.sendMessage(jid, {
        text: "❌ Please provide a valid Facebook video URL."
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { text: "⏳ Downloading Facebook video..." }, { quoted: msg });

      const { video, title } = await fetchFacebook(text);

      await sock.sendMessage(jid, {
        video:    { url: video },
        mimetype: "video/mp4",
        fileName: `${title}.mp4`,
        caption:  `🎬 ${title}`,
      }, { quoted: msg });

    } catch (err) {
      console.error("[facebook]", err.message);
      await sock.sendMessage(jid, {
        text: `❌ Failed to download the Facebook video.\n\n_${err.message}_`
      }, { quoted: msg });
    }
  },
};
