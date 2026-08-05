import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";

export default {
  name: "removemember",
  description: "Remove a member from your guild (owner only)",
  category: "guild",
  usage: ".removemember @user",
  aliases: ["guildkick", "gkick", "gremove"],
  cooldown: 5,

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    if (!await requireRegistration(sock, msg, sender)) return;

    const targetJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || (args[0]?.match(/^[0-9]+$/) ? `${args[0]}@s.whatsapp.net` : null);

    if (!targetJid) {
      return sock.sendMessage(jid, {
        text:
`╭─〔 🏰 *𝐑𝐄𝐌𝐎𝐕𝐄 𝐌𝐄𝐌𝐁𝐄𝐑* 〕
│ 📖 *Usage* :: *.removemember @user*
│ ⚠️ You must be the guild owner
└───────────────◆`
      }, { quoted: msg });
    }

    // Find owner's guild
    const guilds = await guildSystem.getUserGuilds(sender);
    const ownedGuild = guilds.find(g => g.owner === sender);

    if (!ownedGuild) {
      return sock.sendMessage(jid, {
        text: "❌ You don't own any guild!"
      }, { quoted: msg });
    }

    if (targetJid === sender) {
      return sock.sendMessage(jid, { text: "❌ You can't remove yourself! Use *.leaveguild* instead." }, { quoted: msg });
    }

    const guild = await guildSystem.getGuild(ownedGuild.name);
    if (!guild.members.includes(targetJid)) {
      return sock.sendMessage(jid, {
        text: `❌ @${targetJid.split("@")[0]} is not a member of *${ownedGuild.name}*.`,
        mentions: [targetJid]
      }, { quoted: msg });
    }

    const success = await guildSystem.removeMember(ownedGuild.name, targetJid);

    if (success) {
      const updated = await guildSystem.getGuild(ownedGuild.name);
      await sock.sendMessage(jid, {
        text:
`╭─〔 🏰 *𝐑𝐄𝐌𝐎𝐕𝐄 𝐌𝐄𝐌𝐁𝐄𝐑* 〕
├◆ *Result*  :: *REMOVED 🔴*
├◆ *Guild*   :: *${ownedGuild.name}*
├◆ *Member*  :: *@${targetJid.split("@")[0]}*
├◆ *Members* :: *${updated.members.length} remaining*
└───────────────◆`,
        mentions: [targetJid]
      }, { quoted: msg });
    } else {
      await sock.sendMessage(jid, { text: "❌ Failed to remove member." }, { quoted: msg });
    }
  }
};
