import { princeImage, PRINCE_ENDPOINTS } from "../../lib/princeTech.mjs";
import { downloadMediaBuffer } from "../../lib/omegaDownload.js";

export default {
  name: "glossysilver",
  aliases: ["glossy", "silver", "silvertext", "ephoto"],
  description: "Create a glossy silver text image",
  category: "image",
  usage: ".glossysilver <text>",
  cooldown: 15,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text?.trim()) {
      return sock.sendMessage(jid, {
        text: "🪞 *Glossy Silver*\n\nUsage: *.glossysilver <text>*\nExample: *.glossysilver Prince Tech*",
      }, { quoted: msg });
    }

    try {
      const result = await princeImage(PRINCE_ENDPOINTS.glossySilver, text.trim(), { timeoutMs: 60_000 });
      const image = result.buffer
        ? { buffer: result.buffer, mimetype: result.mimetype || "image/jpeg" }
        : await downloadMediaBuffer(result.url, { timeoutMs: 60_000, maxBytes: 25 * 1024 * 1024 });
      await sock.sendMessage(jid, {
        image: image.buffer,
        caption: `🪞 *Glossy Silver*\n\n> ${text.trim()}`,
      }, { quoted: msg });
    } catch (error) {
      console.error("[glossysilver]", error.message);
      await sock.sendMessage(jid, {
        text: `❌ Glossy Silver image failed.\n\n_${error.message}_`,
      }, { quoted: msg });
    }
  },
};
