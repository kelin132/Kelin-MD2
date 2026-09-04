import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";

export default {
  name: "setguilddesc",
  description: "Set your guild's description (owner only)",
  category: "guild",
  usage: ".setguilddesc <description>",
  aliases: ["gdesc", "guilddesc"],
  cooldown: 10,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    if (!await requireRegistration(sock, msg, sender)) return;

    if (!text?.trim()) {
      return sock.sendMessage(jid, {
        text:
`╭─〔 🏰 *𝐒𝐄𝐓 𝐃𝐄𝐒𝐂* 〕
│ 📖 *Usage* :: *.setguilddesc <text>*
│ 💡 *Example* :: *.setguilddesc Elite PvP guild!*
│ ⚠️ Max 100 characters
└───────────────◆`
      }, { quoted: msg });
    }

    const desc = text.trim().slice(0, 100);

    const guilds = await guildSystem.getUserGuilds(sender);
    const ownedGuild = guilds.find(g => g.owner === sender);

    if (!ownedGuild) {
      return sock.sendMessage(jid, {
        text: "❌ You don't own any guild!\n\nCreate one with *.createguild <name>*"
      }, { quoted: msg });
    }

    const result = await guildSystem.setDescription(ownedGuild.name, sender, desc);

    if (result === "not_owner") {
      return sock.sendMessage(jid, { text: "❌ You are not the owner of this guild." }, { quoted: msg });
    }

    await sock.sendMessage(jid, {
      text:
`╭─〔 🏰 *𝐒𝐄𝐓 𝐃𝐄𝐒𝐂𝐑𝐈𝐏𝐓𝐈𝐎𝐍* 〕
├◆ *Result* :: *UPDATED 🟢*
├◆ *Guild*  :: *${ownedGuild.name}*
├◆ *Desc*   :: _${desc}_
└───────────────◆`
    }, { quoted: msg });
  }
};
