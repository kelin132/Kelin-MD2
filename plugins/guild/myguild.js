import { guildSystem, guildTaxRate, guildUpgradeRequirements } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";
import { generateGuildProfile, getProfilePic, getContactName } from "../../lib/guildGen.mjs";

const WEBSITE_URL = "https://aidoru.zone.id/guild";

function progressLines(guild) {
  const level = Math.max(1, Number(guild.level) || 1);
  const requirements = guildUpgradeRequirements(level);
  const memberCount = Array.isArray(guild.members) ? guild.members.length : 0;
  return [
    `├◆ *Guild XP*  :: *${Number(guild.guildXp || 0).toLocaleString()} / ${requirements.guildXp.toLocaleString()}*`,
    `├◆ *Tax Rate*   :: *${(guildTaxRate(level) * 100).toFixed(0)}%*`,
    `├◆ *Capacity*   :: *${memberCount} / ${requirements.memberCapacity}*`,
    `├◆ *Next Cost*  :: *$${requirements.treasury.toLocaleString()} treasury*`,
    `├◆ *Next Crew*  :: *${requirements.members} members*`,
  ].join("\n");
}

export default {
  name: "myguild",
  description: "View your guild profile, progression, tax, and upgrade requirements",
  category: "guild",
  usage: ".myguild [guild_name]",
  aliases: ["myg", "myguilds", "guildinfo"],
  cooldown: 5,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    if (!await requireRegistration(sock, msg, sender)) return;

    let guild;

    if (text?.trim()) {
      guild = await guildSystem.getGuild(text.trim());
      if (!guild) {
        return sock.sendMessage(jid, {
          text: `❌ Guild *"${text.trim()}"* not found.\n\nUse *.guildlist* to see all guilds.`,
        }, { quoted: msg });
      }
    } else {
      guild = await guildSystem.getUserPrimaryGuild(sender);
      if (!guild) {
        return sock.sendMessage(jid, {
          text:
`╭─〔 🏰 *MY GUILD* 〕
│ ❌ *You are not in any guild!*
│
├◆ *.createguild <name>* — Create your own
├◆ *.guildlist*          — Browse all guilds
├◆ *.joinguild <name>*   — Join a guild
└───────────────◆`,
        }, { quoted: msg });
      }
    }

    const ownerPic = await getProfilePic(sock, guild.owner);
    const ownerName = getContactName(sock, guild.owner);
    const created = guild.createdAt
      ? new Date(guild.createdAt).toLocaleDateString()
      : "Unknown";
    const isOwner = guild.owner === sender;
    const isMember = Array.isArray(guild.members) && guild.members.includes(sender);
    const level = Math.max(1, Number(guild.level) || 1);

    const caption =
`╭─〔 🏰 *GUILD PROFILE* 〕
├◆ *Name*     :: *${guild.name}*
├◆ *Owner*    :: *${ownerName}*
├◆ *Level*    :: *${level}*
├◆ *Members*  :: *${Array.isArray(guild.members) ? guild.members.length : 0}*
├◆ *Treasury* :: *$${Number(guild.treasury || 0).toLocaleString()}*
${progressLines(guild)}
├◆ *Created*  :: *${created}*${guild.description ? `\n├◆ *Desc*     :: _${guild.description}_` : ""}
│
├◆ *Your Role* :: *${isOwner ? "👑 Owner" : isMember ? "👥 Member" : "👀 Visitor"}*
│
│ > You can view your guild here
│ ${WEBSITE_URL}
└───────────────◆`;

    try {
      const imgBuffer = await generateGuildProfile(
        {
          name: guild.name,
          icon: guild.icon || null,
          description: guild.description || "",
          level,
          guildXp: Number(guild.guildXp || 0),
          treasury: Number(guild.treasury || 0),
          taxRate: guildTaxRate(level),
        },
        { name: ownerName, profilePic: ownerPic },
      );
      await sock.sendMessage(jid, {
        image: imgBuffer,
        caption,
      }, { quoted: msg });
    } catch {
      await sock.sendMessage(jid, {
        text: caption,
      }, { quoted: msg });
    }
  },
};
