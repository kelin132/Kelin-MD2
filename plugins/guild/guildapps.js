import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";

export default {
  name: "guildapps",
  description: "Review pending applications to your guild",
  category: "guild",
  usage: ".guildapps <guild_name>",
  aliases: ["guildapplications", "gapps"],
  cooldown: 5,

  async run({ sock, msg, sender, text }) {
    const chat = msg.key.remoteJid;
    if (!await requireRegistration(sock, msg, sender)) return;
    const guildName = String(text || "").trim();
    if (!guildName) {
      return sock.sendMessage(chat, { text: "Usage: *.guildapps <guild_name>*." }, { quoted: msg });
    }
    const guild = await guildSystem.getGuild(guildName);
    if (!guild) return sock.sendMessage(chat, { text: "Guild not found. Use *.guildlist* to browse." }, { quoted: msg });
    const result = await guildSystem.getPendingApplications(String(guild._id), sender);
    if (!result.ok) return sock.sendMessage(chat, { text: "❌ Could not load applications for this guild." }, { quoted: msg });
    if (!result.applications.length) {
      return sock.sendMessage(chat, { text: `No pending applications for *${guild.name}*.` }, { quoted: msg });
    }
    const rows = result.applications.map((application, index) =>
      `${index + 1}. *${application.applicantName || application.applicantId}* — code \`${application.code}\``,
    );
    return sock.sendMessage(chat, {
      text: `╭─〔 🛡️ *${guild.name.toUpperCase()} APPLICATIONS* 〕\n${rows.join("\n")}\n\nApprove: *.guildapprove <code>*\nDecline: *.guilddeny <code>*\n└───────────────◆`,
    }, { quoted: msg });
  },
};
