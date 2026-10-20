import { guildSystem } from "../../lib/guildSystem.js";

export default {
  name: "joinguild",
  description: "Apply to join a guild",
  category: "guild",
  usage: ".joinguild <guild_name>",
  aliases: ["guildjoin", "gjoin"],
  cooldown: 10,

  async run({ sock, msg, text }) {
    const chat = msg.key.remoteJid;
    const guildName = String(text || "").trim();
    if (!guildName) {
      return sock.sendMessage(chat, {
        text: "Open *.guildlist* to browse guilds, then use *.joinguild <name>* to get the website application link. You must sign in on AIDORU and submit the application there.",
      }, { quoted: msg });
    }

    const guild = await guildSystem.getGuild(guildName);
    if (!guild) {
      return sock.sendMessage(chat, {
        text: `❌ Guild *${guildName}* was not found. Use *.guildlist* to browse, then try the exact guild name.`,
      }, { quoted: msg });
    }

    return sock.sendMessage(chat, {
      text: `🏰 Apply to *${guild.name}* on AIDORU:\nhttps://aidoru.zone.id/guild?apply=${encodeURIComponent(String(guild._id))}\n\nSign in, open the highlighted guild, and tap *Apply to join*. The guild leader must approve your request; this command does not add you automatically.`,
    }, { quoted: msg });
  },
};
