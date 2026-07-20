/**
 * plugins/utilities/lyrics.js
 * Fetch song lyrics via some-random-api.com
 * Converted from CJS → ESM (project uses "type":"module")
 */

async function lyricsCommand(sock, chatId, songTitle) {
  if (!songTitle) {
    await sock.sendMessage(chatId, {
      text: "🔍 Please enter the song name to get the lyrics!\nUsage: *lyrics <song name>*",
    });
    return;
  }

  try {
    const apiUrl = `https://some-random-api.com/lyrics?title=${encodeURIComponent(songTitle)}`;
    const res    = await fetch(apiUrl);

    if (!res.ok) throw new Error(await res.text());

    const json = await res.json();

    if (!json.lyrics) {
      await sock.sendMessage(chatId, {
        text: `❌ Sorry, I couldn't find any lyrics for "${songTitle}".`,
      });
      return;
    }

    await sock.sendMessage(chatId, {
      text: `🎵 *Song Lyrics* 🎶\n\n▢ *Title:* ${json.title || songTitle}\n▢ *Artist:* ${json.author || "Unknown"}\n\n📜 *Lyrics:*\n${json.lyrics}\n\nHope you enjoy the music! 🎧 🎶`,
    });
  } catch (error) {
    console.error("Error in lyrics command:", error);
    await sock.sendMessage(chatId, {
      text: `❌ An error occurred while fetching the lyrics for "${songTitle}".`,
    });
  }
}

export { lyricsCommand };
