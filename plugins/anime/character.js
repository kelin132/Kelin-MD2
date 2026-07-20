import axios from "axios";

export default {
  name: "character",
  aliases: ["animechar", "charinfo"],
  description: "Search anime character info",
  category: "anime",
  usage: ".character <character name>",
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "❌ Provide a character name.\n\nExample: .character Naruto" }, { quoted: msg });

    try {
      const { data } = await axios.get(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(text)}&limit=1`);
      if (!data.data.length) return sock.sendMessage(jid, { text: "❌ No character found with that name." }, { quoted: msg });

      const char = data.data[0];
      let info = `👤 *${char.name}*\n`;
      if (char.nicknames?.length) info += `✨ *Nicknames:* ${char.nicknames.join(", ")}\n`;
      info += `\n📝 *About:*\n${(char.about || "No information available.").slice(0, 500)}`;
      if (char.about?.length > 500) info += "...";

      await sock.sendMessage(jid, { image: { url: char.images.jpg.image_url }, caption: info }, { quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, { text: "❌ Failed to fetch character info. Try again later." }, { quoted: msg });
    }
  },
};
