/** Download and send still images from Pinterest links using KnightBot only. */
import { downloadMediaBuffer } from "../../lib/omegaDownload.js";
import { knightbotGet, pickKnightImageCandidates, pickKnightTitle } from "../../lib/knightbotApi.mjs";

const PIN_URL_PATTERN = /https?:\/\/(?:www\.)?(?:pin\.it|pinterest\.com)\/[^\s<>()]*/i;

function isImageFile(file) {
  const buffer = Buffer.isBuffer(file?.buffer) ? file.buffer : Buffer.from(file?.buffer || []);
  const mime = String(file?.mimetype || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    || ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString())
    || (buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP")
    || ["ftypavif", "ftypavis"].includes(buffer.subarray(4, 12).toString());
}

export default {
  name: "pinterest",
  description: "Download Pinterest images from a link",
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
      const candidates = pickKnightImageCandidates(data, pinUrl);
      if (!candidates.length) throw new Error("KnightBot returned no image for this Pin.");

      let imageFile = null;
      for (const candidate of candidates.slice(0, 5)) {
        try {
          const downloaded = await downloadMediaBuffer(candidate);
          if (isImageFile(downloaded)) { imageFile = downloaded; break; }
        } catch (error) {
          console.warn(`[pinterest] image candidate failed: ${String(error?.message || error).slice(0, 120)}`);
        }
      }
      if (!imageFile) throw new Error("No downloadable image was returned. Video-only Pins are not supported.");

      const title = pickKnightTitle(data, "Pinterest");
      await sock.sendMessage(jid, { image: imageFile.buffer, caption: `📌 *${title}*` }, { quoted: msg });
    } catch (error) {
      const message = String(error?.message || error || "Unknown error").slice(0, 180);
      await sock.sendMessage(jid, { text: `❌ Pinterest image download failed: ${message}` }, { quoted: msg });
    }
  },
};