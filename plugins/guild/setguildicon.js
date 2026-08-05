import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";
import { generateGuildProfile, getProfilePic, getContactName } from "../../lib/guildGen.mjs";

export default {
  name: "setguildicon",
  description: "Set your guild's banner/icon image URL (owner only)",
  category: "guild",
  usage: ".setguildicon <image_url>",
  aliases: ["gicon", "gbanner", "guildicon"],
  cooldown: 10,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    if (!await requireRegistration(sock, msg, sender)) return;

    if (!text?.trim()) {
      return sock.sendMessage(jid, {
        text:
`╭─〔 🏰 *𝐒𝐄𝐓 𝐈𝐂𝐎𝐍* 〕
│ 📖 *Usage* :: *.setguildicon <image_url>*
│ 💡 Paste a direct image link (jpg/png)
│ ⚠️ Owner only
└───────────────◆`
      }, { quoted: msg });
    }

    const iconUrl = text.trim();

    // Basic URL validation
    if (!iconUrl.startsWith("http://") && !iconUrl.startsWith("https://")) {
      return sock.sendMessage(jid, {
        text: "❌ Please provide a valid image URL starting with *http://* or *https://*"
      }, { quoted: msg });
    }

    const guilds = await guildSystem.getUserGuilds(sender);
    const ownedGuild = guilds.find(g => g.owner === sender);

    if (!ownedGuild) {
      return sock.sendMessage(jid, {
        text: "❌ You don't own any guild!\n\nCreate one with *.createguild <name>*"
      }, { quoted: msg });
    }

    const result = await guildSystem.setIcon(ownedGuild.name, sender, iconUrl);

    if (result === "not_owner") {
      return sock.sendMessage(jid, { text: "❌ You are not the owner of this guild." }, { quoted: msg });
    }

    const ownerPic  = await getProfilePic(sock, sender);
    const ownerName = getContactName(sock, sender);

    const caption =
`╭─〔 🏰 *𝐒𝐄𝐓 𝐈𝐂𝐎𝐍* 〕
├◆ *Result* :: *UPDATED 🟢*
├◆ *Guild*  :: *${ownedGuild.name}*
├◆ *Banner* :: Updated!
└───────────────◆`;

    try {
      const updated   = await guildSystem.getGuild(ownedGuild.name);
      const imgBuffer = await generateGuildProfile(
        { name: ownedGuild.name, icon: iconUrl, description: updated.description || "" },
        { name: ownerName, profilePic: ownerPic }
      );
      await sock.sendMessage(jid, { image: imgBuffer, caption }, { quoted: msg });
    } catch {
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    }
  }
};
