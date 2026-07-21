import axios from "axios";

export default {
  name: "lyrics",
  description: "Get song lyrics",
  category: "search",
  usage: ".lyrics <song name>",
  aliases: ["lyric"],
  cooldown: 5,

  async run({ sock, msg, text }) {
    try {
      if (!text) {
        return await sock.sendMessage(
          msg.key.remoteJid,
          {
            text: `🎵 *Lyrics Command*

Usage:
.lyrics <song name>

Example:
.lyrics Ordinary`
          },
          { quoted: msg }
        );
      }

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: "🔎 Searching for lyrics..."
        },
        { quoted: msg }
      );

      const { data } = await axios.get(
        `https://apis-devlostboysearch.vercel.app/lyrics?song=${encodeURIComponent(text)}`,
        { timeout: 10000 }
      );

      if (
        !data?.results?.status ||
        !data?.results?.results?.lyrics
      ) {
        return await sock.sendMessage(
          msg.key.remoteJid,
          {
            text: `❌ No lyrics found for *${text}*.`
          },
          { quoted: msg }
        );
      }

      const song = data.results.results;

      let caption = `🎵 *${song.track}*\n`;
      caption += `👤 Artist: ${song.artist}\n`;

      if (song.album && song.album !== song.artist)
        caption += `💿 Album: ${song.album}\n`;

      if (song.duration)
        caption += `⏱ Duration: ${song.duration}\n`;

      caption += `\n${song.lyrics}\n\n`;
      caption += `> 🤖 Powered by KELIN-MD`;

      const parts = splitMessage(caption, 4000);

      for (const part of parts) {
        await sock.sendMessage(
          msg.key.remoteJid,
          { text: part },
          { quoted: msg }
        );

        if (parts.length > 1)
          await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (err) {
      console.error(err);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: "❌ Failed to fetch lyrics. Please try again later."
        },
        { quoted: msg }
      );
    }
  }
};

function splitMessage(text, maxLength = 4000) {
  const parts = [];

  while (text.length > maxLength) {
    let index = text.lastIndexOf("\n", maxLength);

    if (index === -1) index = maxLength;

    parts.push(text.slice(0, index));
    text = text.slice(index);
  }

  parts.push(text);

  return parts;
}