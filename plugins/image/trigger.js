// plugins/image/trigger.js — Gun/triggered meme via PopCat API

import { getQuotedImageBuffer, noQuoteText } from "./_imageHelper.js";
import { renderTrigger } from "../../lib/imageCanvas.mjs";

export default {
  name: "trigger",
  aliases: ["triggered", "gun", "triggermeme"],
  description: "Add a gun to a replied image (triggered meme)",
  category: "image",
  usage: ".trigger (reply to an image)",
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    try {
      const image = await renderTrigger(await getQuotedImageBuffer(sock, msg));
      await sock.sendMessage(jid, { image, mimetype: "image/png", caption: "🔫 *TRIGGERED!!*" }, { quoted: msg });
    } catch (err) {
      if (err.message === "NOQUOTE" || err.message === "NOIMAGE") {
        return sock.sendMessage(jid, { text: noQuoteText() }, { quoted: msg });
      }
      console.error("TRIGGER ERROR:", err);
      await sock.sendMessage(jid, { text: "❌ Failed to apply trigger effect. Try again!" }, { quoted: msg });
    }
  },
};
