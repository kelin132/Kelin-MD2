import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";
import { generateGuildProfile, getProfilePic, getContactName } from "../../lib/guildGen.mjs";

export default {
  name: "createguild",
  description: "Create a new guild",
  category: "guild",
  usage: ".createguild <guild_name>",
  aliases: ["makeguild", "newguild"],
  cooldown: 30,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    if (!await requireRegistration(sock, msg, sender)) return;

    if (!text) {
      return sock.sendMessage(jid, {
        text:
`╭─〔 🏰 *𝐂𝐑𝐄𝐀𝐓𝐄 𝐆𝐔𝐈𝐋𝐃* 〕
│ 📖 *Usage* :: *.createguild <name>*
│ 💡 *Example* :: *.createguild Warriors*
│
│ ⚠️ Name must be *3–30 characters*
└───────────────◆`
      }, { quoted: msg });
    }

    const guildName = text.trim();

    if (guildName.length < 3 || guildName.length > 30) {
      return sock.sendMessage(jid, {
        text: "❌ Guild name must be *3–30 characters* long."
      }, { quoted: msg });
    }

    const existing = await guildSystem.getGuild(guildName);
    if (existing) {
      return sock.sendMessage(jid, {
        text: `❌ Guild *"${guildName}"* already exists!`
      }, { quoted: msg });
    }

    // Check if user already owns a guild
    const userGuilds = await guildSystem.getUserGuilds(sender);
    if (userGuilds.some(g => g.owner === sender)) {
      return sock.sendMessage(jid, {
        text: "❌ You already own a guild! Use *.setguildname* to rename it."
      }, { quoted: msg });
    }

    const guild = await guildSystem.createGuild(guildName, sender);

    if (!guild) {
      return sock.sendMessage(jid, {
        text: "❌ Failed to create guild. Please try again."
      }, { quoted: msg });
    }

    const ownerPic  = await getProfilePic(sock, sender);
    const ownerName = getContactName(sock, sender);

    const caption =
`╭─〔 🏰 *𝐆𝐔𝐈𝐋𝐃 𝐂𝐑𝐄𝐀𝐓𝐄𝐃* 〕
├◆ *Name*     :: *${guildName}*
├◆ *Owner*    :: *${ownerName}*
├◆ *Members*  :: *1*
├◆ *Level*    :: *1*
├◆ *Treasury* :: *$0*
│
├◆ Use *.setguilddesc* to add a description
├◆ Use *.setguildicon* to set a banner
├◆ Use *.addmember @user* to invite members
└───────────────◆`;

    try {
      const imgBuffer = await generateGuildProfile(
        { name: guildName, icon: null },
        { name: ownerName, profilePic: ownerPic }
      );
      await sock.sendMessage(jid, { image: imgBuffer, caption }, { quoted: msg });
    } catch {
      await sock.sendMessage(jid, { text: caption, mentions: [sender] }, { quoted: msg });
    }
  }
};
