import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";

export default {
  name: "createguild",
  description: "Create a new guild",
  category: "guild",
  usage: ".createguild <guild_name>",
  aliases: ["makeguild", "newguild"],
  cooldown: 30,

  async run({ sock, msg, sender, text }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    if (!text) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Usage: *.createguild <guild_name>*\n\nExample: .createguild Warriors"
      }, { quoted: msg });
    }

    const guildName = text.trim();

    if (guildName.length < 3 || guildName.length > 30) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Guild name must be *3–30 characters* long."
      }, { quoted: msg });
    }

    const existing = await guildSystem.getGuild(guildName);
    if (existing) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Guild *"${guildName}"* already exists!`
      }, { quoted: msg });
    }

    const guild = await guildSystem.createGuild(guildName, sender);

    if (guild) {
      await sock.sendMessage(msg.key.remoteJid, {
        text:
`✅ *Guild Created!*

⚔️ Name     : ${guildName}
👑 Owner    : @${sender.split("@")[0]}
👥 Members  : 1
💰 Treasury : $0
⭐ Level    : 1

Use *.guildhelp* to see all guild commands.`,
        mentions: [sender]
      }, { quoted: msg });
    } else {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Failed to create guild. Please try again."
      }, { quoted: msg });
    }
  }
};
