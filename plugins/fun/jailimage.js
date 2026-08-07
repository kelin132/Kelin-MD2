/**
 * .jailimage
 * Put a replied image behind jail bars using the David Cyril Canvas API.
 * https://apis.davidcyril.name.ng/endpoints/canvas/#jail
 */

import { getQuotedImageBuffer, noQuoteText } from "../image/_imageHelper.js";
import { renderPrison } from "../../lib/imageCanvas.mjs";

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
      await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
      const imageBuffer = await renderPrison(await getQuotedImageBuffer(sock, msg));

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
