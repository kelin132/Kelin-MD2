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
      let imageBuffer = null;
      let lastError = null;

      // The API returns a short-lived Pollinations URL. Retry the whole
      // generation once so a transient 5xx from that image host does not
      // make .flux appear permanently broken.
      for (let attempt = 0; attempt < 2 && !imageBuffer; attempt += 1) {
        try {
          const data = await princeApiJson("ai/fluximg", { prompt: text }, 60_000);
          const imgUrl =
            data?.result?.url ||
            data?.result?.image_url ||
            data?.result;

          if (typeof imgUrl !== "string" || !imgUrl.startsWith("http")) {
            throw new Error("Flux returned no image URL");
          }

          const imgRes = await fetch(imgUrl, {
            signal: AbortSignal.timeout(60_000),
          });
          const contentType = imgRes.headers.get("content-type") || "";
          if (!imgRes.ok || !contentType.startsWith("image/")) {
            throw new Error(`Flux image host returned HTTP ${imgRes.status}`);
          }

          const buffer = Buffer.from(await imgRes.arrayBuffer());
          if (!buffer.length) throw new Error("Flux returned an empty image");
          imageBuffer = buffer;
        } catch (err) {
          lastError = err;
        }
      }

      // PrinceTech currently delegates to Pollinations. If its returned URL
      // is a transient 5xx, retry the same provider directly with stable
      // seeds instead of failing the command immediately.
      if (!imageBuffer) {
        for (const seed of [42, 84, 126]) {
          try {
            const directUrl = new URL(
              `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}`,
            );
            directUrl.searchParams.set("width", "1024");
            directUrl.searchParams.set("height", "1024");
            directUrl.searchParams.set("nologo", "true");
            directUrl.searchParams.set("model", "flux");
            directUrl.searchParams.set("seed", String(seed));

            const imgRes = await fetch(directUrl, {
              signal: AbortSignal.timeout(90_000),
            });
            const contentType = imgRes.headers.get("content-type") || "";
            if (!imgRes.ok || !contentType.startsWith("image/")) {
              throw new Error(`Flux fallback returned HTTP ${imgRes.status}`);
            }

            const buffer = Buffer.from(await imgRes.arrayBuffer());
            if (!buffer.length) throw new Error("Flux fallback returned an empty image");
            imageBuffer = buffer;
            break;
          } catch (err) {
            lastError = err;
          }
        }
      }

      if (!imageBuffer) throw lastError || new Error("Flux returned no image");

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
