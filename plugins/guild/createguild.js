import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";
import { generateGuildProfile, getProfilePic, getContactName } from "../../lib/guildGen.mjs";

export default {
  name: "createguild",
  description: "Create a new guild",
  category: "guild",
  usage: ".createguild <guild_name>",
  aliases: ["makeguild", "newguild"],
  cooldown: 30,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    if (!await requireRegistration(sock, msg, sender)) return;

    if (!text) {
      return sock.sendMessage(jid, {
        text: "❌ Usage: *.createguild <guild_name>*\n\nExample: .createguild Warriors"
      }, { quoted: msg });
    }

    const guildName = text.trim();

    if (guildName.length < 3 || guildName.length > 30) {
      return sock.sendMessage(jid, {
        text: "❌ Guild name must be *3–30 characters* long."
      }, { quoted: msg });
    }

    const existing = await guildSystem.getGuild(guildName);
    if (existing) {
      return sock.sendMessage(jid, {
        text: `❌ Guild *"${guildName}"* already exists!`
      }, { quoted: msg });
    }

    const guild = await guildSystem.createGuild(guildName, sender);

    if (!guild) {
      return sock.sendMessage(jid, {
        text: "❌ Failed to create guild. Please try again."
      }, { quoted: msg });
    }

    const ownerPic  = await getProfilePic(sock, sender);
    const ownerName = getContactName(sock, sender);

    const caption =
`✅ *Guild Created!*

⚔️ Name     : ${guildName}
👑 Owner    : ${ownerName}
👥 Members  : 1
💰 Treasury : $0
⭐ Level    : 1

Use *.guildhelp* to see all guild commands.`;

    try {
      const imgBuffer = await generateGuildProfile(
        { name: guildName, icon: ownerPic },
        { name: ownerName, profilePic: ownerPic }
      );

      await sock.sendMessage(jid, {
        image: imgBuffer,
        caption,
      }, { quoted: msg });
    } catch {
      // Canvas failed — fall back to text only
      await sock.sendMessage(jid, {
        text: caption,
        mentions: [sender]
      }, { quoted: msg });
    }
  }
};
