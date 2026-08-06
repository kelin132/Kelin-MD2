/**
 * .quotegen <text>  |  reply to a message + .quotegen
 * Convert text into a stylish quote image using the David Cyril Canvas API.
 * https://apis.davidcyril.name.ng/endpoints/canvas/#quote-generator
 */

const BASE = "https://apis.davidcyril.name.ng";

export default {
  name: "quotegen",
  aliases: ["quoteimg", "makeq", "textquote", "imagequote"],
  description: "Turn text into a stylish quote image",
  category: "fun",
  usage: ".quotegen <your quote text>  |  reply to a message + .quotegen",
  cooldown: 5,

  async run({ sock, msg, text, sender }) {
    const jid = msg.key.remoteJid;

    // Allow replying to a message to use its text as the quote
    const quotedText =
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
      "";

    const quoteText = text || quotedText;

    if (!quoteText) {
      return sock.sendMessage(jid, {
        text:
          "💬 *Quote Generator*\n\n" +
          "Usage:\n" +
          "• *.quotegen <your text>*\n" +
          "• Or reply to any message and send *.quotegen*\n\n" +
          "Example: `.quotegen Life is short, eat the cake.`",
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

    try {
      // Use sender's number as username display
      const username = sender?.split("@")[0].split(":")[0] || "Anonymous";

      const url = new URL(`${BASE}/canvas/quote`);
      url.searchParams.set("quote",    quoteText);
      url.searchParams.set("username", username);

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(20_000) });

      if (!res.ok) throw new Error(`Canvas API returned HTTP ${res.status}`);

      const contentType = res.headers.get("content-type") || "";
      let imageBuffer;

      if (contentType.includes("application/json")) {
        const data = await res.json();
        const imgUrl = data?.url || data?.image_url || data?.data?.url;
        if (!imgUrl) throw new Error("No image URL in API response");
        const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(20_000) });
        if (!imgRes.ok) throw new Error("Failed to download quote image");
        imageBuffer = Buffer.from(await imgRes.arrayBuffer());
      } else {
        imageBuffer = Buffer.from(await res.arrayBuffer());
      }

      await sock.sendMessage(jid, {
        image:   imageBuffer,
        caption: `💬 _"${quoteText}"_`,
      }, { quoted: msg });

      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("[quotegen]", err?.message);
      await sock.sendMessage(jid, {
        text: `❌ Failed to generate quote image: ${err.message}`,
      }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
    }
  },
};
