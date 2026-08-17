import { guildSystem, guildUpgradeRequirements } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";

export default {
  name: "addmember",
  description: "Add a member to your guild (owner only)",
  category: "guild",
  usage: ".addmember @user",
  aliases: ["guildinvite", "ginvite", "gadd"],
  cooldown: 10,

  async run({ sock, msg, sender, args, text }) {
    const jid = msg.key.remoteJid;

    if (!await requireRegistration(sock, msg, sender)) return;

    const targetJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || (args[0]?.match(/^[0-9]+$/) ? `${args[0]}@s.whatsapp.net` : null);

    if (!targetJid) {
      return sock.sendMessage(jid, {
        text:
`╭─〔 🏰 *𝐀𝐃𝐃 𝐌𝐄𝐌𝐁𝐄𝐑* 〕
│ 📖 *Usage* :: *.addmember @user*
│ ⚠️ You must be the guild owner
└───────────────◆`
      }, { quoted: msg });
    }

    // Find owner's guild
    const guilds = await guildSystem.getUserGuilds(sender);
    const ownedGuild = guilds.find(g => g.owner === sender);

    if (!ownedGuild) {
      return sock.sendMessage(jid, {
        text: "❌ You don't own any guild!\n\nCreate one with *.createguild <name>*"
      }, { quoted: msg });
    }

    if (targetJid === sender) {
      return sock.sendMessage(jid, { text: "❌ You're already the guild owner!" }, { quoted: msg });
    }

    const success = await guildSystem.addMember(ownedGuild.name, targetJid);

    if (success === "member_cap") {
      const level = Number(ownedGuild.level) || 1;
      const requirements = guildUpgradeRequirements(level);
      return sock.sendMessage(jid, {
        text: `❌ *${ownedGuild.name}* is full at ${requirements.memberCapacity} members.\n\nUpgrade the guild with *.guildupgrade ${ownedGuild.name}* after reaching the treasury, guild XP, and member requirements.`,
      }, { quoted: msg });
    }

    if (success) {
      const updated = await guildSystem.getGuild(ownedGuild.name);
      await sock.sendMessage(jid, {
        text:
`╭─〔 🏰 *𝐀𝐃𝐃 𝐌𝐄𝐌𝐁𝐄𝐑* 〕
├◆ *Result*  :: *ADDED 🟢*
├◆ *Guild*   :: *${ownedGuild.name}*
├◆ *Member*  :: *@${targetJid.split("@")[0]}*
├◆ *Members* :: *${updated.members.length} total*
└───────────────◆`,
        mentions: [targetJid]
      }, { quoted: msg });
    } else {
      await sock.sendMessage(jid, {
        text: "❌ That user is already a member or an error occurred."
      }, { quoted: msg });
    }
  }
};
