import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";
import { generateGuildProfile, getProfilePic, getContactName } from "../../lib/guildGen.mjs";

export default {
  name: "myguild",
  description: "View your guild profile and info",
  category: "guild",
  usage: ".myguild",
  aliases: ["myg", "myguilds", "guildinfo"],
  cooldown: 5,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    if (!await requireRegistration(sock, msg, sender)) return;

    let guild;

    if (text?.trim()) {
      // Allow looking up a specific guild by name
      guild = await guildSystem.getGuild(text.trim());
      if (!guild) {
        return sock.sendMessage(jid, {
          text: `❌ Guild *"${text.trim()}"* not found.\n\nUse *.guildlist* to see all guilds.`
        }, { quoted: msg });
      }
    } else {
      guild = await guildSystem.getUserPrimaryGuild(sender);
      if (!guild) {
        return sock.sendMessage(jid, {
          text:
`╭─〔 🏰 *𝐌𝐘 𝐆𝐔𝐈𝐋𝐃* 〕
│ ❌ *You are not in any guild!*
│
├◆ *.createguild <name>* — Create your own
├◆ *.guildlist*          — Browse all guilds
├◆ *.joinguild <name>*   — Join a guild
└───────────────◆`
        }, { quoted: msg });
      }
    }

    const ownerPic  = await getProfilePic(sock, guild.owner);
    const ownerName = getContactName(sock, guild.owner);
    const created   = guild.createdAt
      ? new Date(guild.createdAt).toLocaleDateString()
      : "Unknown";

    const isOwner  = guild.owner === sender;
    const isMember = guild.members.includes(sender);

    const caption =
`╭─〔 🏰 *𝐆𝐔𝐈𝐋𝐃 𝐏𝐑𝐎𝐅𝐈𝐋𝐄* 〕
├◆ *Name*     :: *${guild.name}*
├◆ *Owner*    :: *${ownerName}*
├◆ *Level*    :: *${guild.level}*
├◆ *Members*  :: *${guild.members.length}*
├◆ *Treasury* :: *$${guild.treasury.toLocaleString()}*
├◆ *Created*  :: *${created}*${guild.description ? `\n├◆ *Desc*     :: _${guild.description}_` : ""}
│
├◆ *Your Role* :: *${isOwner ? "👑 Owner" : isMember ? "👥 Member" : "👀 Visitor"}*
└───────────────◆`;

    try {
      const imgBuffer = await generateGuildProfile(
        { name: guild.name, icon: guild.icon || null, description: guild.description || "" },
        { name: ownerName, profilePic: ownerPic }
      );
      await sock.sendMessage(jid, { image: imgBuffer, caption }, { quoted: msg });
    } catch {
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    }
  }
};
