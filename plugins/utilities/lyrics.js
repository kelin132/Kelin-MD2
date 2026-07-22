// plugins/utilities/lyrics.js
// Fetch song lyrics with two API sources for reliability

import axios from "axios";

const PRIMARY_URL  = "https://apis-devlostboysearch.vercel.app/lyrics?song=";
const FALLBACK_URL = "https://api.lyrics.ovh/suggest/"; // search endpoint
const LYRICS_URL   = "https://api.lyrics.ovh/v1/";      // fetch by artist + title

/** Try the primary lostboy API */
async function fetchPrimary(query) {
  const { data } = await axios.get(PRIMARY_URL + encodeURIComponent(query), { timeout: 10000 });

  const res = data?.results?.results;
  if (
    !data?.results?.status ||
    !res?.lyrics ||
    res.lyrics.toLowerCase().includes("no lyrics available") ||
    res.lyrics.trim().length < 10
  ) return null;

  // Primary API sometimes puts "Artist - Track" in both fields — split it
  let track  = res.track  || query;
  let artist = res.artist || "Unknown";

  if (track === artist && track.includes(" - ")) {
    const parts = track.split(" - ");
    artist = parts[0].trim();
    track  = parts.slice(1).join(" - ").trim();
  }

  return {
    track,
    artist,
    album:    res.album !== artist ? res.album : null,
    duration: res.duration || null,
    lyrics:   res.lyrics.trim(),
  };
}

/** Try lyrics.ovh — search for best match, then fetch lyrics */
async function fetchFallback(query) {
  const { data: searchData } = await axios.get(
    FALLBACK_URL + encodeURIComponent(query),
    { timeout: 10000 }
  );

  const hit = searchData?.data?.[0];
  if (!hit) return null;

  const artist = hit.artist?.name || "Unknown";
  const track  = hit.title || query;

  const { data: lyricsData } = await axios.get(
    `${LYRICS_URL}${encodeURIComponent(artist)}/${encodeURIComponent(track)}`,
    { timeout: 10000 }
  );

  if (!lyricsData?.lyrics || lyricsData.lyrics.trim().length < 10) return null;

  return {
    track,
    artist,
    album:    null,
    duration: null,
    lyrics:   lyricsData.lyrics.trim(),
  };
}

/** Split long text at paragraph/newline boundaries */
function splitMessage(text, maxLength = 3900) {
  const parts = [];
  while (text.length > maxLength) {
    // Prefer splitting at a blank line, then any newline
    let idx = text.lastIndexOf("\n\n", maxLength);
    if (idx === -1) idx = text.lastIndexOf("\n", maxLength);
    if (idx === -1) idx = maxLength;
    parts.push(text.slice(0, idx).trimEnd());
    text = text.slice(idx).trimStart();
  }
  if (text.trim()) parts.push(text.trim());
  return parts;
}

export default {
  name: "lyrics",
  description: "Get song lyrics",
  category: "search",
  usage: ".lyrics <song name>",
  aliases: ["lyric"],
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return sock.sendMessage(jid, {
        text: `🎵 *Lyrics Command*\n\nUsage: *.lyrics <song name>*\n\nExample: .lyrics Bohemian Rhapsody`
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text: "🔎 Searching for lyrics..." }, { quoted: msg });

    let song = null;
    let source = "";

    try {
      song = await fetchPrimary(text);
      if (song) source = "primary";
    } catch (err) {
      // primary failed — fall through to fallback
    }

    if (!song) {
      try {
        song = await fetchFallback(text);
        if (song) source = "fallback";
      } catch (err) {
        // fallback also failed
      }
    }

    if (!song) {
      return sock.sendMessage(jid, {
        text: `❌ No lyrics found for *${text}*.\n\nTips:\n• Try adding the artist name: *.lyrics Queen Bohemian Rhapsody*\n• Check the spelling and try again.`
      }, { quoted: msg });
    }

    let header = `🎵 *${song.track}*\n`;
    header    += `👤 Artist: ${song.artist}\n`;
    if (song.album) header += `💿 Album: ${song.album}\n`;
    if (song.duration) header += `⏱ Duration: ${song.duration}\n`;
    header    += `\n`;

    const footer = `\n\n> 🤖 Powered by KELIN-MD`;
    const full   = header + song.lyrics + footer;
    const parts  = splitMessage(full, 3900);

    for (let i = 0; i < parts.length; i++) {
      await sock.sendMessage(jid, { text: parts[i] }, { quoted: msg });
      if (i < parts.length - 1) await new Promise(r => setTimeout(r, 600));
    }
  }
};
