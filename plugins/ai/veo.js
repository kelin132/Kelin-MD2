/**
 * KELIN MD — .veo command
 * Generate a video from a text prompt through Omegatech's Veo endpoint.
 *
 * Supported forms:
 *   .veo A cow walking through a neon city
 *   .veo                         (reply to a text/caption message)
 *   .veo @user make the sky purple (mention + prompt)
 */

import { getPrompt } from "./sora.js";

const VEO_ENDPOINT = "https://omegatech-api.dixonomega.tech/api/ai/Ai-video";
const MAX_PROMPT_LENGTH = 500;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

async function generateVideo(prompt) {
  const params = new URLSearchParams({ prompt });
  const response = await fetch(`${VEO_ENDPOINT}?${params.toString()}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(120_000),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`The video service returned an invalid response (${response.status}).`);
  }

  const videoUrl = payload?.videoUrl;
  if (!response.ok || payload?.success !== true || !videoUrl) {
    const message =
      payload?.message ||
      payload?.error ||
      `The video service returned status ${response.status}.`;
    throw new Error(message);
  }

  return {
    videoUrl,
    frameUrl: payload?.frameUrl || payload?.thumbUrl || null,
  };
}

async function downloadVideo(videoUrl) {
  const response = await fetch(videoUrl, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 (KELIN-MD Veo)" },
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    throw new Error(`The generated video could not be downloaded (HTTP ${response.status}).`);
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_VIDEO_BYTES) {
    throw new Error("The generated video is too large to send through WhatsApp.");
  }

  const contentType = response.headers.get("content-type") || "";
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("The generated video file was empty.");
  if (/text\/html|application\/json/i.test(contentType)) {
    throw new Error("The generated video link expired before it could be downloaded.");
  }

  return buffer;
}

export default {
  name: "veo",
  description: "Generate an AI video with Veo from a text prompt",
  category: "ai",
  usage: ".veo <video prompt> (or reply to a text message)",
  aliases: ["ai-video"],
  cooldown: 30,
  isPremium: true,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    const prompt = getPrompt(msg, text);

    if (!prompt) {
      return sock.sendMessage(
        jid,
        {
          text:
            "🎥 Usage: *.veo <video prompt>*\n\n" +
            "You can also reply to a text/caption message with *.veo*.",
        },
        { quoted: msg },
      );
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return sock.sendMessage(
        jid,
        { text: `❌ Keep the video prompt under ${MAX_PROMPT_LENGTH} characters.` },
        { quoted: msg },
      );
    }

    try {
      await sock.sendPresenceUpdate("composing", jid);
      await sock.sendMessage(
        jid,
        { text: `🎥 Generating your Veo video...\n\n_${prompt}_` },
        { quoted: msg },
      );

      const { videoUrl, frameUrl } = await generateVideo(prompt);
      const downloadPromise = downloadVideo(videoUrl);

      if (frameUrl) {
        await sock.sendMessage(
          jid,
          {
            image: { url: frameUrl },
            caption: "✅ Video generated. Uploading it now…",
          },
          { quoted: msg },
        );
      } else {
        await sock.sendMessage(
          jid,
          { text: "✅ Video generated. Uploading it now…" },
          { quoted: msg },
        );
      }

      const videoBuffer = await downloadPromise;
      await sock.sendMessage(
        jid,
        {
          video: videoBuffer,
          mimetype: "video/webm",
          fileName: "kelin-veo.webm",
          caption: `🎥 *Veo video*\n\n_Prompt: ${prompt}_`,
        },
        { quoted: msg },
      );
    } catch (err) {
      console.error("[veo]", err);
      await sock.sendMessage(
        jid,
        {
          text:
            "❌ I couldn't generate that Veo video right now.\n\n" +
            `_${err instanceof Error ? err.message : "The video service is unavailable."}_`,
        },
        { quoted: msg },
      );
    } finally {
      await sock.sendPresenceUpdate("paused", jid);
    }
  },
};