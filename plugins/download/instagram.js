/**
 * KELIN MD — .instagram command
 * Downloads Instagram posts, reels, and stories via the GiftedTech API.
 * Based on dara-studio-bot reference implementation.
 */
import { get } from "../../lib/gifted.js";

export default {
  name: "instagram",
  description: "Download Instagram posts, reels, or stories",
  category: "download",
  usage: ".instagram <Instagram URL>",
  aliases: ["ig", "igdl", "reels", "insta"],
  cooldown: 20,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const url = args[0];

    if (!url || !url.includes("instagram")) {
      return sock.sendMessage(jid, {
        text: "📸 Usage: *.instagram <Instagram post/reel URL>*\n\nExample: .instagram https://www.instagram.com/p/xxxxx"
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { text: "⏳ Downloading Instagram media…" }, { quoted: msg });

      const data = await get("/download/instagram", { url });
      const r    = data?.result || {};

      const dl = r.download_url || r.url || r.video || r.image;
      if (!dl) throw new Error("No download URL returned from API");

      const isVideo  = r.type === "video" || /\.mp4/i.test(dl);
      const caption  = `📸 *Instagram Media*\n\n✨ *KELIN MD*`;

      if (isVideo) {
        await sock.sendMessage(jid, {
          video:    { url: dl },
          mimetype: "video/mp4",
          caption,
        }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, {
          image:   { url: dl },
          caption,
        }, { quoted: msg });
      }

    } catch (err) {
      console.error("[instagram]", err.message);
      await sock.sendMessage(jid, {
        text: "❌ Instagram download failed. Make sure the URL is valid and the post is public."
      }, { quoted: msg });
    }
  },
};
