import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";

export default {
  name: "myguilds",
  description: "List all guilds you own or belong to",
  category: "guild",
  usage: ".myguilds",
  aliases: ["myg"],
  cooldown: 5,

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const guilds      = await guildSystem.getUserGuilds(sender);
    const ownerGuilds = guilds.filter(g => g.owner === sender);
    const memberGuilds = guilds.filter(g => g.owner !== sender);

    if (guilds.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "⚔️ You are not in any guilds yet!\n\n• Create one: *.createguild <name>*\n• See all guilds: *.allguilds*"
      }, { quoted: msg });
    }

    let text = "⚔️ *YOUR GUILDS*\n\n";

    if (ownerGuilds.length > 0) {
      text += "👑 *Guilds You Own:*\n";
      ownerGuilds.forEach(g => {
        text += `  • *${g.name}* — ${g.members.length} members, Level ${g.level}, $${g.treasury.toLocaleString()} treasury\n`;
      });
      text += "\n";
    }

    if (memberGuilds.length > 0) {
      text += "👥 *Member In:*\n";
      memberGuilds.forEach(g => {
        text += `  • *${g.name}* — Level ${g.level}, ${g.members.length} members\n`;
      });
    }

    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
  }
};
