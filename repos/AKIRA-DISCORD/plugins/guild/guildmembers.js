import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";

const WEBSITE_URL = "https://aidoru.zone.id/guild";

export default {
  name: "guildmembers",
  description: "Show all members in your guild",
  category: "guild",
  usage: ".guildmembers [guild_name]",
  aliases: ["gmembers", "guildm"],
  cooldown: 5,

  async run({ sock, msg, sender, text }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const requested = text?.trim();
    const guild = requested
      ? await guildSystem.getGuild(requested)
      : await guildSystem.getUserPrimaryGuild(sender);

    if (!guild) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: requested
          ? `❌ Guild "${requested}" not found.`
          : "❌ You are not in a guild yet. Use *.guildlist* to find one.",
      }, { quoted: msg });
    }

    const members = await guildSystem.getGuildMembers(guild.name);
    if (!members || members.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ No members are recorded for *${guild.name}* yet.`,
      }, { quoted: msg });
    }

    const lines = members.map((member, index) => {
      const badge = member.isOwner ? "👑" : "◆";
      return `│ ${badge} ${index + 1}. *${member.name}*`;
    }).join("\n");

    await sock.sendMessage(msg.key.remoteJid, {
      text: `╭─〔 🌸 *GUILD MEMBERS* 〕\n│ 🏯 *${guild.name}* · Lv.${Number(guild.level || 1)}\n│ 👥 ${members.length} member${members.length === 1 ? "" : "s"}\n│\n${lines}\n│\n│ > You can view your guild here\n│ ${WEBSITE_URL}\n└───────────────◆`,
    }, { quoted: msg });
  },
};
