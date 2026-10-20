import { isRegistered } from "./database.js";
import { invalidatePermissionCache } from "../../lib/permissions.mjs";

const WEBSITE_REGISTRATION_URL = "https://aidoru.zone.id/login?mode=create";

export default {
  name: "register",
  description: "Open website registration or confirm your linked account",
  category: "economy",
  usage: ".register",
  aliases: ["reg", "signup"],
  cooldown: 5,

  async run({ sock, msg, sender }) {
    const chatId = msg.key.remoteJid;
    const inGroup = chatId?.endsWith("@g.us");
    const already = await isRegistered(sender);

    if (already) {
      invalidatePermissionCache(sender);
      const mentions = inGroup && sender ? [sender] : [];
      const tag = inGroup ? `@${sender.split("@")[0].split(":")[0]} ` : "";
      return sock.sendMessage(
        chatId,
        {
          text: `✅ ${tag}You have now registered yourself to AIDORU. Your bot account is connected; use *.p* to see your profile.`,
          ...(mentions.length ? { mentions } : {}),
        },
        { quoted: msg, ...(mentions.length ? { mentions } : {}) },
      );
    }

    const mentions = inGroup && sender ? [sender] : [];
    const tag = inGroup ? `@${sender.split("@")[0].split(":")[0]} ` : "";
    return sock.sendMessage(
      chatId,
      {
        text:
          `🌐 ${tag}Create your AIDORU account on the website: ${WEBSITE_REGISTRATION_URL}\n\n` +
          "Sign up with the same WhatsApp number you use with this bot and verify the code. " +
          "Your existing bot data is kept; after verification, send *.register* here again to confirm.",
        ...(mentions.length ? { mentions } : {}),
      },
      { quoted: msg, ...(mentions.length ? { mentions } : {}) },
    );
  },
};
