/**
 * .flux <prompt>
 * Generate an AI image using the Flux v2 model via David Cyril API.
 * https://apis.davidcyril.name.ng/endpoints/imagegen/#flux-v2
 */

const BASE = "https://apis.davidcyril.name.ng";

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
      const url = `${BASE}/imagegen/flux-v2?prompt=${encodeURIComponent(text)}`;
      const res  = await fetch(url, { signal: AbortSignal.timeout(60_000) });

      if (!res.ok) throw new Error(`API returned HTTP ${res.status}`);

      const contentType = res.headers.get("content-type") || "";

      let imageBuffer;
      if (contentType.includes("application/json")) {
        // Some endpoints return { url: "..." } or { image: "base64..." }
        const data = await res.json();
        const imgUrl = data?.url || data?.image_url || data?.data?.url;
        if (imgUrl) {
          const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(30_000) });
          if (!imgRes.ok) throw new Error("Failed to download generated image");
          imageBuffer = Buffer.from(await imgRes.arrayBuffer());
        } else if (data?.image && typeof data.image === "string") {
          // base64 encoded
          imageBuffer = Buffer.from(data.image.replace(/^data:image\/\w+;base64,/, ""), "base64");
        } else {
          throw new Error("Unexpected API response format");
        }
      } else {
        imageBuffer = Buffer.from(await res.arrayBuffer());
      }

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
