import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";

export default {
  name: "guildapprove",
  description: "Approve a guild membership application",
  category: "guild",
  usage: ".guildapprove <application_code>",
  aliases: ["gapprove"],
  cooldown: 5,

  async run({ sock, msg, sender, text }) {
    const chat = msg.key.remoteJid;
    if (!await requireRegistration(sock, msg, sender)) return;
    const code = String(text || "").trim();
    if (!code) return sock.sendMessage(chat, { text: "Usage: *.guildapprove <code>* — view codes with *.guildapps*." }, { quoted: msg });
    const result = await guildSystem.reviewApplication(code, sender, "approve");
    const messages = {
      application_missing: "That application is missing, expired, or already reviewed.",
      guild_missing: "The guild for this application no longer exists.",
      not_owner: "Only the guild leader can approve applications.",
      already_in_guild: `This trainer is already in ${result.guildName || "another guild"}.`,
      member_cap: `The guild is full at ${result.capacity} members. Upgrade it first.`,
      already_reviewed: "That application was just reviewed. Refresh with *.guildapps*.",
    };
    return sock.sendMessage(chat, {
      text: result.ok ? "✅ Application approved. The trainer is now on your guild roster." : `❌ ${messages[result.reason] || "Could not approve that application."}`,
    }, { quoted: msg });
  },
};
