import { guildSystem, guildUpgradeRequirements } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";
import { generateGuildProfile, getProfilePic, getContactName } from "../../lib/guildGen.mjs";

export default {
  name: "joinguild",
  description: "Join an existing guild by name",
  category: "guild",
  usage: ".joinguild <guild_name>",
  aliases: ["guildjoin", "gjoin"],
  cooldown: 10,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    if (!await requireRegistration(sock, msg, sender)) return;

    if (!text?.trim()) {
      return sock.sendMessage(jid, {
        text:
`╭─〔 🏰 *𝐉𝐎𝐈𝐍 𝐆𝐔𝐈𝐋𝐃* 〕
│ 📖 *Usage*   :: *.joinguild <name>*
│ 💡 *Example* :: *.joinguild Warriors*
│
│ Use *.guildlist* to see all guilds.
└───────────────◆`
      }, { quoted: msg });
    }

    const guildName = text.trim();
    const guild = await guildSystem.getGuild(guildName);

    if (!guild) {
      return sock.sendMessage(jid, {
        text: `❌ Guild *"${guildName}"* does not exist.\n\nUse *.guildlist* to see all available guilds.`
      }, { quoted: msg });
    }

    if (guild.members.includes(sender)) {
      return sock.sendMessage(jid, {
        text: `❌ You are already a member of *${guild.name}*.\n\nUse *.myguild* to see your guild.`
      }, { quoted: msg });
    }

    const success = await guildSystem.addMember(guildName, sender);
    if (success === "member_cap") {
      const requirements = guildUpgradeRequirements(Number(guild.level) || 1);
      return sock.sendMessage(jid, {
        text: `❌ *${guild.name}* is full at ${requirements.memberCapacity} members.\n\nThe guild owner must use *.guildupgrade ${guild.name}* after meeting the next-level requirements.`,
      }, { quoted: msg });
    }
    if (!success) {
      return sock.sendMessage(jid, { text: "❌ Failed to join guild. Please try again." }, { quoted: msg });
    }

    const updated  = await guildSystem.getGuild(guildName);
    const ownerPic = await getProfilePic(sock, guild.owner);
    const myName   = getContactName(sock, sender);
    const myPic    = await getProfilePic(sock, sender);

    const caption =
`╭─〔 🏰 *𝐉𝐎𝐈𝐍𝐄𝐃 𝐆𝐔𝐈𝐋𝐃* 〕
├◆ *Guild*    :: *${guild.name}*
├◆ *Owner*    :: *@${guild.owner.split("@")[0]}*
├◆ *Level*    :: *${updated.level}*
├◆ *Members*  :: *${updated.members.length}*
├◆ *Treasury* :: *$${updated.treasury.toLocaleString()}*${guild.description ? `\n├◆ *Desc* :: _${guild.description}_` : ""}
│
├◆ *.myguild* — view your guild
└───────────────◆`;

    try {
      const imgBuffer = await generateGuildProfile(
        {
          name: guild.name,
          icon: guild.icon || null,
          description: guild.description || "",
          level: updated.level,
          guildXp: updated.guildXp,
          treasury: updated.treasury,
          taxRate: updated.taxRate,
          memberCount: updated.members.length,
          memberCapacity: guildUpgradeRequirements(updated.level).memberCapacity,
        },
        { name: myName, profilePic: myPic || ownerPic }
      );
      await sock.sendMessage(jid, { image: imgBuffer, caption, mentions: [guild.owner] }, { quoted: msg });
    } catch {
      await sock.sendMessage(jid, { text: caption, mentions: [guild.owner] }, { quoted: msg });
    }
  }
};
