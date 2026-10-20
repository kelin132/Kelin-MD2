import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";

export default {
  name: "guilddeny",
  description: "Decline a guild membership application",
  category: "guild",
  usage: ".guilddeny <application_code>",
  aliases: ["gdeny", "guildreject"],
  cooldown: 5,

  async run({ sock, msg, sender, text }) {
    const chat = msg.key.remoteJid;
    if (!await requireRegistration(sock, msg, sender)) return;
    const code = String(text || "").trim();
    if (!code) return sock.sendMessage(chat, { text: "Usage: *.guilddeny <code>* — view codes with *.guildapps*." }, { quoted: msg });
    const result = await guildSystem.reviewApplication(code, sender, "reject");
    const messages = {
      application_missing: "That application is missing, expired, or already reviewed.",
      guild_missing: "The guild for this application no longer exists.",
      not_owner: "Only the guild leader can decline applications.",
      already_reviewed: "That application was just reviewed. Refresh with *.guildapps*.",
    };
    return sock.sendMessage(chat, {
      text: result.ok ? "Application declined." : `❌ ${messages[result.reason] || "Could not decline that application."}`,
    }, { quoted: msg });
  },
};
