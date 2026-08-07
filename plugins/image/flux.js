/**
 * .flux <prompt>
 * Generate an AI image using the PrinceTech Flux endpoint.
 */

import { princeApiJson } from "../../lib/princeAPI.mjs";

export default {
  name: "flux",
  aliases: ["fluxai", "fluxv2", "fluximage"],
  description: "Generate an AI image using Flux v2",
  category: "image",
  usage: ".flux <prompt>",
  cooldown: 15,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return sock.sendMessage(jid, {
        text:
          "🎨 *Flux v2 Image Generator*\n\n" +
          "Usage: *.flux <your prompt>*\n\n" +
          "Examples:\n" +
          "• `.flux a cyberpunk city at night`\n" +
          "• `.flux realistic portrait of a warrior princess`\n" +
          "• `.flux a magical forest with glowing mushrooms`",
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
    await sock.sendPresenceUpdate("composing", jid);

    try {
      const data = await princeApiJson("fluximg", { prompt: text }, 60_000);
      const imgUrl = data?.result?.url || data?.result;
      if (typeof imgUrl !== "string" || !imgUrl) {
        throw new Error("Flux returned no image URL");
      }

      const imgRes = await fetch(imgUrl, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!imgRes.ok) throw new Error("Failed to download generated image");
      const imageBuffer = Buffer.from(await imgRes.arrayBuffer());

      await sock.sendMessage(jid, {
        image:   imageBuffer,
        caption: `🎨 *Flux v2*\n\n> _${text}_`,
      }, { quoted: msg });

      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("[flux]", err?.message);
      await sock.sendMessage(jid, {
        text: `❌ Flux image generation failed: ${err.message}\n\nTry again or use a different prompt.`,
      }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
    } finally {
      await sock.sendPresenceUpdate("paused", jid);
    }
  },
};
