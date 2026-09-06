/**
 * KELIN MD — .play2 command
 * Searches YouTube, downloads audio, and plays it in a Discord voice channel.
 */
import { downloadMediaBuffer } from "../../lib/omegaDownload.js";
import { playDiscordVoice } from "../../lib/discordVoice.mjs";
import { fetchAudio, sendBanner, ytSearch } from "./play.js";

function explainPlaybackError(error) {
  const message = String(error?.message || error || "");
  if (/abort|timed out|timeout/i.test(message)) {
    return "The audio provider timed out before the track finished downloading. Try the command again or use a YouTube URL.";
  }
  return "The audio provider did not return a playable track. Try again or use a YouTube URL.";
}

export default {
  name: "play2",
  description: "Play YouTube audio in your Discord voice channel",
  category: "download",
  usage: ".play2 <song name or YouTube URL>",
  aliases: ["voiceplay", "vplay"],
  cooldown: 15,

  async run({ sock, msg, text, discord }) {
    const jid = msg.key.remoteJid;

    if (!discord?.message) {
      return sock.sendMessage(jid, {
        text: "🔊 `.play2` is only available from the Discord bot.",
      }, { quoted: msg });
    }

    if (!text) {
      return sock.sendMessage(jid, {
        text: "🔊 Usage: `.play2 <song name or YouTube URL>`\n\nExample: `.play2 Shape of You`",
      }, { quoted: msg });
    }

    try {
      const meta = await ytSearch(text);
      await sendBanner(sock, jid, msg, meta, "Connecting to voice channel…");

      const { dl, buffer, mimetype: returnedMimetype, title } = await fetchAudio(meta.url, meta.title);
      const trackTitle = title || meta.title;
      const file = buffer
        ? { buffer, mimetype: returnedMimetype || "audio/mpeg" }
        : await downloadMediaBuffer(dl);

      let voiceResult;
      try {
        voiceResult = await playDiscordVoice({
          client: discord.client,
          message: discord.message,
          audioBuffer: file.buffer,
          title: trackTitle,
        });
      } catch (voiceError) {
        console.error("[play2] voice playback failed:", voiceError.message);
        return sock.sendMessage(jid, {
          text: "❌ I downloaded the audio, but could not start voice playback. " +
            "Make sure I have Connect and Speak permissions and that FFmpeg is installed.",
        }, { quoted: msg });
      }

      if (!voiceResult.ok) {
        const message = voiceResult.reason === "not-in-voice"
          ? "🔊 Join a voice channel first, then run `.play2` again."
          : voiceResult.reason === "missing-permissions"
            ? "❌ I need **Connect** and **Speak** permissions in your voice channel."
            : "❌ I could not connect to that voice channel.";
        return sock.sendMessage(jid, { text: message }, { quoted: msg });
      }

      return sock.sendMessage(jid, {
        text: `🎵 Now playing **${trackTitle}** in <#${voiceResult.channel.id}>`,
      }, { quoted: msg });
    } catch (error) {
      console.error("[play2]", error.message);
      return sock.sendMessage(jid, {
        text: `❌ I could not start that track: ${explainPlaybackError(error)}`,
      }, { quoted: msg });
    }
  },
};