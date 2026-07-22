// plugins/guild/guildleave.js
// Leave a guild you are a member of (owners must transfer or disband first)

import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";

export default {
  name: "guildleave",
  description: "Leave a guild you are a member of",
  category: "guild",
  usage: ".guildleave <guild_name>",
  aliases: ["leaveguild", "gleave"],
  cooldown: 10,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    if (!await requireRegistration(sock, msg, sender)) return;

    if (!text) {
      return sock.sendMessage(jid, {
        text: "❌ Usage: *.guildleave <guild_name>*\n\nExample: .guildleave Warriors\n\n_Owners: transfer ownership or disband before leaving._"
      }, { quoted: msg });
    }

    const guildName = text.trim();
    const guild = await guildSystem.getGuild(guildName);

    if (!guild) {
      return sock.sendMessage(jid, {
        text: `❌ Guild *"${guildName}"* not found.\n\nUse *.myguilds* to see your guilds.`
      }, { quoted: msg });
    }

    if (!guild.members.includes(sender)) {
      return sock.sendMessage(jid, {
        text: `❌ You are not a member of *${guildName}*.`
      }, { quoted: msg });
    }

    // Owner cannot simply leave — they must disband or transfer first
    if (guild.owner === sender) {
      return sock.sendMessage(jid, {
        text:
`❌ You are the *owner* of *${guildName}* and cannot leave without disbanding.

To disband the guild use: *(disbandguild command coming soon)*
Or kick all members first with *.guildkick*.`
      }, { quoted: msg });
    }

    const success = await guildSystem.removeMember(guildName, sender);

    if (!success) {
      return sock.sendMessage(jid, {
        text: "❌ Failed to leave guild. Please try again."
      }, { quoted: msg });
    }

    return sock.sendMessage(jid, {
      text:
`👋 *You left *${guildName}*!*

You are no longer a member of this guild.

• Create your own: *.createguild <name>*
• Find another: *.allguilds*`
    }, { quoted: msg });
  }
};
