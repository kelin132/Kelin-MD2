/**
 * .epicai <prompt>
 * Generate a hyper-realistic AI image using the EpicRealism model via David Cyril API.
 * https://apis.davidcyril.name.ng/endpoints/imagegen/#epicrealism
 */

const BASE = "https://apis.davidcyril.name.ng";

export default {
  name: "epicai",
  aliases: ["epic", "epicrealism", "epicimage", "realai"],
  description: "Generate a hyper-realistic AI image using EpicRealism",
  category: "image",
  usage: ".epicai <prompt>",
  cooldown: 15,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return sock.sendMessage(jid, {
        text:
          "🖼️ *EpicRealism Image Generator*\n\n" +
          "Usage: *.epicai <your prompt>*\n\n" +
          "Best for realistic & photographic styles:\n" +
          "• `.epicai a young woman with blue eyes in a rainy street`\n" +
          "• `.epicai a wolf howling at a full moon, ultra realistic`\n" +
          "• `.epicai cinematic photo of an abandoned mansion at dusk`",
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
    await sock.sendPresenceUpdate("composing", jid);

    try {
      const url = `${BASE}/imagegen/epicrealism?prompt=${encodeURIComponent(text)}`;
      const res  = await fetch(url, { signal: AbortSignal.timeout(60_000) });

      if (!res.ok) throw new Error(`API returned HTTP ${res.status}`);

      const contentType = res.headers.get("content-type") || "";

      let imageBuffer;
      if (contentType.includes("application/json")) {
        const data = await res.json();
        const imgUrl = data?.url || data?.image_url || data?.data?.url;
        if (imgUrl) {
          const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(30_000) });
          if (!imgRes.ok) throw new Error("Failed to download generated image");
          imageBuffer = Buffer.from(await imgRes.arrayBuffer());
        } else if (data?.image && typeof data.image === "string") {
          imageBuffer = Buffer.from(data.image.replace(/^data:image\/\w+;base64,/, ""), "base64");
        } else {
          throw new Error("Unexpected API response format");
        }
      } else {
        imageBuffer = Buffer.from(await res.arrayBuffer());
      }

      await sock.sendMessage(jid, {
        image:   imageBuffer,
        caption: `🖼️ *EpicRealism AI*\n\n> _${text}_`,
      }, { quoted: msg });

      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("[epicai]", err?.message);
      await sock.sendMessage(jid, {
        text: `❌ EpicRealism image generation failed: ${err.message}\n\nTry again or use a different prompt.`,
      }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
    } finally {
      await sock.sendPresenceUpdate("paused", jid);
    }
  },
};
