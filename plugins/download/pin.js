/** Download a Pinterest link using only the KnightBot Pinterest endpoint. */
import { downloadMediaBuffer } from "../../lib/omegaDownload.js";
import { knightbotGet, pickKnightMedia, pickKnightTitle } from "../../lib/knightbotApi.mjs";

const PIN_URL_PATTERN = /https?:\/\/(?:www\.)?(?:pin\.it|pinterest\.com)\/[^\s<>()]*/i;

export default {
  name: "pinterest",
  description: "Download Pinterest media from a link",
  category: "download",
  usage: ".pin <Pinterest link>",
  aliases: ["pin", "pinsearch"],
  cooldown: 8,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    const pinUrl = String(text || "").match(PIN_URL_PATTERN)?.[0]?.replace(/[<>\])},.!?]+$/g, "");
    if (!pinUrl) {
      return sock.sendMessage(jid, {
        text: "Send a Pinterest link. Example: *.pin https://pin.it/your-link*",
      }, { quoted: msg });
    }

    try {
      const data = await knightbotGet("download/pinterest", { url: pinUrl }, 30_000, "knight");
      const mediaUrl = pickKnightMedia(data, pinUrl);
      if (!mediaUrl) throw new Error("KnightBot returned no Pinterest media link.");
      const file = await downloadMediaBuffer(mediaUrl);
      const title = pickKnightTitle(data, "Pinterest");
      const mime = String(file.mimetype || "").toLowerCase();
      const caption = `📌 *${title}*`;

      if (mime.startsWith("video/") || /\.(mp4|webm)(?:\?|$)/i.test(mediaUrl)) {
        await sock.sendMessage(jid, {
          video: file.buffer,
          mimetype: mime.startsWith("video/") ? mime : "video/mp4",
          caption,
        }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { image: file.buffer, caption }, { quoted: msg });
      }
    } catch (error) {
      const message = String(error?.message || error || "Unknown error").slice(0, 180);
      await sock.sendMessage(jid, { text: `❌ Pinterest download failed: ${message}` }, { quoted: msg });
    }
  },
};