import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";

export default {
  name: "setguildname",
  description: "Rename your guild (owner only)",
  category: "guild",
  usage: ".setguildname <new_name>",
  aliases: ["grename", "guildname"],
  cooldown: 30,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    if (!await requireRegistration(sock, msg, sender)) return;

    if (!text?.trim()) {
      return sock.sendMessage(jid, {
        text:
`╭─〔 🏰 *𝐒𝐄𝐓 𝐍𝐀𝐌𝐄* 〕
│ 📖 *Usage* :: *.setguildname <new_name>*
│ ⚠️ Name must be *3–30 characters*
│ ⚠️ Owner only
└───────────────◆`
      }, { quoted: msg });
    }

    const newName = text.trim();

    if (newName.length < 3 || newName.length > 30) {
      return sock.sendMessage(jid, {
        text: "❌ Guild name must be *3–30 characters* long."
      }, { quoted: msg });
    }

    const guilds = await guildSystem.getUserGuilds(sender);
    const ownedGuild = guilds.find(g => g.owner === sender);

    if (!ownedGuild) {
      return sock.sendMessage(jid, {
        text: "❌ You don't own any guild!"
      }, { quoted: msg });
    }

    if (ownedGuild.name === newName) {
      return sock.sendMessage(jid, { text: "❌ That's already your guild's name!" }, { quoted: msg });
    }

    const result = await guildSystem.renameGuild(ownedGuild.name, sender, newName);

    if (result === "not_owner") {
      return sock.sendMessage(jid, { text: "❌ You are not the owner of this guild." }, { quoted: msg });
    }
    if (result === "name_taken") {
      return sock.sendMessage(jid, { text: `❌ Guild name *"${newName}"* is already taken.` }, { quoted: msg });
    }
    if (!result) {
      return sock.sendMessage(jid, { text: "❌ Failed to rename guild. Please try again." }, { quoted: msg });
    }

    await sock.sendMessage(jid, {
      text:
`╭─〔 🏰 *𝐑𝐄𝐍𝐀𝐌𝐄𝐃 𝐆𝐔𝐈𝐋𝐃* 〕
├◆ *Result*    :: *RENAMED 🟢*
├◆ *Old Name*  :: *${ownedGuild.name}*
├◆ *New Name*  :: *${newName}*
│
├◆ Use *.myguild* to see your updated profile
└───────────────◆`
    }, { quoted: msg });
  }
};
