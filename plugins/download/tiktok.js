/**
 * KELIN MD — .tiktok command
 * Downloads TikTok videos without watermark via the GiftedTech API.
 * Based on dara-studio-bot reference implementation.
 */
import { get } from "../../lib/gifted.js";

// Deduplicate rapid re-triggers
const processed = new Set();

export default {
  name: "tiktok",
  description: "Download TikTok video without watermark",
  category: "download",
  usage: ".tiktok <TikTok URL>",
  aliases: ["tt", "tikdl", "tiktokdl"],
  cooldown: 20,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    // De-dupe
    if (processed.has(msg.key.id)) return;
    processed.add(msg.key.id);
    setTimeout(() => processed.delete(msg.key.id), 5 * 60 * 1000);

    const url = args[0];

    if (!url || !url.includes("tiktok")) {
      return sock.sendMessage(jid, {
        text: "🎵 Usage: *.tiktok <TikTok URL>*\n\nExample: .tiktok https://vm.tiktok.com/xxxxx"
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { text: "⏳ Downloading TikTok video…" }, { quoted: msg });

      const data = await get("/download/tiktok", { url });
      const r    = data?.result || {};

      const dl    = r.download_url || r.video || r.url || r.nowm;
      const title = r.title || r.desc || "TikTok Video";

      if (!dl) throw new Error("No download URL returned from API");

      await sock.sendMessage(jid, {
        video:    { url: dl },
        mimetype: "video/mp4",
        caption:  `🎵 *${title}*\n\n✨ *KELIN MD*`,
      }, { quoted: msg });

    } catch (err) {
      console.error("[tiktok]", err.message);
      await sock.sendMessage(jid, {
        text: "❌ TikTok download failed. Make sure the URL is valid and public."
      }, { quoted: msg });
    }
  },
};
