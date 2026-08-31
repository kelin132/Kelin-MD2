function timeoutSignal(milliseconds) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function generateAnimeImage(prompt, negativePrompt) {
  let fullPrompt = `${prompt}, anime style, anime art, vibrant, detailed, high quality`;
  if (negativePrompt) fullPrompt += `, avoid: ${negativePrompt}`;

  const query = new URLSearchParams({
    model: "flux",
    width: "1024",
    height: "1024",
    nologo: "true",
    enhance: "true",
  });
  const request = timeoutSignal(90_000);
  try {
    const response = await fetch(
      `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?${query}`,
      { signal: request.signal, headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1024) throw new Error("empty image");
    return buffer;
  } finally {
    request.clear();
  }
}

export default {
  name: "anime",
  aliases: ["animeimg", "animeart"],
  description: "Generate an anime-style image from a prompt",
  category: "anime",
  usage: ".anime <prompt> [| negative prompt]",
  cooldown: 15,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const full = (args || []).join(" ").trim();
    if (!full) {
      return sock.sendMessage(jid, {
        text:
`🎌 *Anime Image*

Usage: .anime <prompt>
Example: .anime girl with pink hair in a cherry blossom garden

Optional negative prompt:
.anime <prompt> | no text, no watermark`,
      }, { quoted: msg });
    }

    const [rawPrompt, rawNegative] = full.split("|");
    const prompt = rawPrompt.trim();
    const negativePrompt = (rawNegative || "").trim();

    try {
      await sock.sendMessage(jid, { react: { text: "🎨", key: msg.key } });
      const image = await generateAnimeImage(prompt, negativePrompt);
      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
      return sock.sendMessage(jid, {
        image,
        caption: `🎌 *${prompt}*\n_via Pollinations_`,
      }, { quoted: msg });
    } catch (err) {
      console.error("[anime]", err.message);
      await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } }).catch(() => {});
      return sock.sendMessage(jid, { text: "❌ Anime image generation failed. Try again later." }, { quoted: msg });
    }
  },
};
