import { getUser, saveUser, requireRegistration } from "./database.js";
import { getQuotedImageBuffer, noQuoteText } from "../image/_imageHelper.js";
import { encodeProfileBackground } from "../../lib/profileBackground.mjs";

const MAX_BACKGROUND_BYTES = 8 * 1024 * 1024;

export default {
  name: "bg",
  aliases: ["profilebg", "profilebackground"],
  category: "economy",
  cooldown: 15,
  description: "Set or remove your profile banner background",
  usage: ".bg (reply to an image) | .bg reset",

  async run({ sock, msg, sender, text: rawText = "" }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const text = rawText.trim().toLowerCase();

    if (text === "reset" || text === "remove" || text === "clear") {
      const user = await getUser(sender);
      user.profileBackground = null;
      await saveUser(sender, user);
      return reply("✅ Your profile background was removed. The default manga-style banner is back.");
    }

    let buffer;
    try {
      buffer = await getQuotedImageBuffer(sock, msg);
    } catch (error) {
      if (error.message === "NOQUOTE" || error.message === "NOIMAGE") {
        return reply(`${noQuoteText()}\n\nUse *.bg reset* to return to the default banner.`);
      }
      console.warn("[bg] image download failed:", error.message);
      return reply("❌ I couldn't download that image. Please try replying to it again.");
    }

    if (!buffer?.length) return reply("❌ That image is empty. Please try another one.");
    if (buffer.length > MAX_BACKGROUND_BYTES) {
      return reply("❌ That image is too large. Please use an image under 8 MB.");
    }

    try {
      const user = await getUser(sender);
      user.profileBackground = encodeProfileBackground(buffer);
      await saveUser(sender, user);
      return reply("✅ Profile background updated. Run *.profile* to see it.");
    } catch (error) {
      console.warn("[bg] background save failed:", error.message);
      return reply("❌ I couldn't save that background right now. Please try again in a moment.");
    }
  },
};