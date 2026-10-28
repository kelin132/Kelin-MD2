/** Search Pinterest by keyword or download images from a Pinterest link. */
import { searchGet } from "../../lib/gifted.js";
import { downloadMediaBuffer } from "../../lib/omegaDownload.js";
import { knightbotGet, pickPinterestImageCandidates, pickKnightTitle } from "../../lib/knightbotApi.mjs";

const PIN_URL_PATTERN = /https?:\/\/(?:www\.)?(?:pin\.it|pinterest\.com)\/[^\s<>()]*/i;
const MAX_IMAGES = 10;

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

async function sendImages({ sock, jid, msg, data, sourceUrl = "", caption, limit }) {
  const candidates = pickPinterestImageCandidates(data, sourceUrl);
  const seen = new Set();
  let sent = 0;
  for (const candidate of candidates) {
    if (sent >= limit || seen.has(candidate)) break;
    seen.add(candidate);
    try {
      const file = await downloadMediaBuffer(candidate);
      if (!isImageFile(file)) continue;
      await sock.sendMessage(jid, { image: file.buffer, caption: caption(sent + 1) }, { quoted: msg });
      sent += 1;
    } catch (error) {
      console.warn(`[pinterest] skipped image result: ${String(error?.message || error).slice(0, 120)}`);
    }
  }
  return sent;
}

export default {
  name: "pinterest",
  description: "Search Pinterest images or download a Pin",
  category: "search",
  usage: ".pin <keywords or Pinterest link>",
  aliases: ["pin", "pinsearch"],
  cooldown: 8,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    const input = String(text || "").trim();
    const pinUrl = input.match(PIN_URL_PATTERN)?.[0]?.replace(/[<>\])},.!?]+$/g, "");
    if (!input) {
      return sock.sendMessage(jid, { text: "Use *.pin naruto* to search, or *.pin https://pin.it/your-link* to download a Pin." }, { quoted: msg });
    }

    try {
      if (pinUrl) {
        const data = await knightbotGet("download/pinterest", { url: pinUrl }, 30_000, "knight");
        const title = pickKnightTitle(data, "Pinterest");
        const sent = await sendImages({ sock, jid, msg, data, sourceUrl: pinUrl, limit: 1, caption: () => `📌 *${title}*` });
        if (!sent) throw new Error("This Pin did not return a downloadable image. Video-only Pins are not supported.");
        return;
      }

      await sock.sendMessage(jid, { text: `🔎 Searching Pinterest for *${input}* and sending up to ${MAX_IMAGES} images…` }, { quoted: msg });
      const data = await searchGet("pinterest", { query: input, limit: 30 }, 20_000);
      const sent = await sendImages({
        sock, jid, msg, data, limit: MAX_IMAGES,
        caption: (index) => `📌 *${input}* · ${index}/${MAX_IMAGES}`,
      });
      if (!sent) {
        await sock.sendMessage(jid, { text: `❌ No usable Pinterest images found for *${input}*.` }, { quoted: msg });
      } else if (sent < MAX_IMAGES) {
        await sock.sendMessage(jid, { text: `Sent ${sent} image${sent === 1 ? "" : "s"} for *${input}*.` }, { quoted: msg });
      }
    } catch (error) {
      const message = String(error?.message || error || "Unknown error").slice(0, 180);
      await sock.sendMessage(jid, { text: `❌ Pinterest search/download failed: ${message}` }, { quoted: msg });
    }
  },
};