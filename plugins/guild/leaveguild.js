import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";

export default {
  name: "leaveguild",
  description: "Leave a guild you are a member of",
  category: "guild",
  usage: ".leaveguild",
  aliases: ["guildleave", "gleave"],
  cooldown: 10,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    if (!await requireRegistration(sock, msg, sender)) return;

    let guild;

    if (text?.trim()) {
      guild = await guildSystem.getGuild(text.trim());
      if (!guild) {
        return sock.sendMessage(jid, {
          text: `❌ Guild *"${text.trim()}"* not found.`
        }, { quoted: msg });
      }
    } else {
      // Auto-find their guild (non-owned first, then owned)
      const guilds = await guildSystem.getUserGuilds(sender);
      guild = guilds.find(g => g.owner !== sender) || guilds[0];
      if (!guild) {
        return sock.sendMessage(jid, {
          text: "❌ You are not in any guild.\n\nUse *.joinguild <name>* to join one."
        }, { quoted: msg });
      }
    }

    if (!guild.members.includes(sender)) {
      return sock.sendMessage(jid, {
        text: `❌ You are not a member of *${guild.name}*.`
      }, { quoted: msg });
    }

    if (guild.owner === sender) {
      return sock.sendMessage(jid, {
        text:
`╭─〔 🏰 *𝐋𝐄𝐀𝐕𝐄 𝐆𝐔𝐈𝐋𝐃* 〕
│ ❌ You are the *owner* of *${guild.name}*!
│
│ You cannot leave your own guild.
│ *(Disband feature coming soon)*
└───────────────◆`
      }, { quoted: msg });
    }

    const success = await guildSystem.removeMember(guild.name, sender);

    if (!success) {
      return sock.sendMessage(jid, { text: "❌ Failed to leave guild. Please try again." }, { quoted: msg });
    }

    await sock.sendMessage(jid, {
      text:
`╭─〔 🏰 *𝐋𝐄𝐅𝐓 𝐆𝐔𝐈𝐋𝐃* 〕
├◆ *Result* :: *LEFT 🔴*
├◆ *Guild*  :: *${guild.name}*
│
├◆ *.createguild <name>* — Start your own
├◆ *.guildlist*          — Browse guilds
└───────────────◆`
    }, { quoted: msg });
  }
};
