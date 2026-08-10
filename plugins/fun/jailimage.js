/**
 * .jailimage
 * Put a replied image behind jail bars using the David Cyril Canvas API.
 * https://apis.davidcyril.name.ng/endpoints/canvas/#jail
 */

import { getQuotedImageUrl, noQuoteText } from "../image/_imageHelper.js";

const BASE = "https://apis.davidcyril.name.ng";

export default {
  name: "prison",
  aliases: ["prison", "jailpic", "jailmeme", "bars"],
  description: "Put a replied image behind jail bars",
  category: "Image",
  usage: ".jailimage (reply to an image)",
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    try {
      const imgUrl = await getQuotedImageUrl(sock, msg);

      await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

      const apiUrl = `${BASE}/canvas/jail?image=${encodeURIComponent(imgUrl)}`;
      const res    = await fetch(apiUrl, { signal: AbortSignal.timeout(20_000) });

      if (!res.ok) throw new Error(`Canvas API returned HTTP ${res.status}`);

      const contentType = res.headers.get("content-type") || "";
      let imageBuffer;

      if (contentType.includes("application/json")) {
        const data = await res.json();
        const url  = data?.url || data?.image_url || data?.data?.url;
        if (!url) throw new Error("No image URL in API response");
        const imgRes = await fetch(url, { signal: AbortSignal.timeout(20_000) });
        if (!imgRes.ok) throw new Error("Failed to download result image");
        imageBuffer = Buffer.from(await imgRes.arrayBuffer());
      } else {
        imageBuffer = Buffer.from(await res.arrayBuffer());
      }

      await sock.sendMessage(jid, {
        image:   imageBuffer,
        caption: "🔒 *GET IN THE CELL!* 🔒",
      }, { quoted: msg });

      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      if (err.message === "NOQUOTE" || err.message === "NOIMAGE") {
        return sock.sendMessage(jid, { text: noQuoteText() }, { quoted: msg });
      }
      console.error("[jailimage]", err?.message);
      await sock.sendMessage(jid, {
        text: `❌ Failed to create jail image: ${err.message}`,
      }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
    }
  },
};
