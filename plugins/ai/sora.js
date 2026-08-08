/**
 * KELIN MD — .sora command
 * Generate a video from a text prompt through Omegatech's Sora endpoint.
 *
 * Supported forms:
 *   .sora A cow walking through a neon city
 *   .sora                         (reply to a text/caption message)
 *   .sora @user make the sky purple (mention + prompt)
 */

const SORA_ENDPOINT = "https://omegatech-api.dixonomega.tech/api/ai/Txt2video";
const MAX_PROMPT_LENGTH = 500;

function unwrapMessage(message) {
  if (!message || typeof message !== "object") return null;
  return (
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message
  );
}

function getMessageText(message) {
  const unwrapped = unwrapMessage(message);
  if (!unwrapped) return "";

  return String(
    unwrapped.conversation ||
    unwrapped.extendedTextMessage?.text ||
    unwrapped.imageMessage?.caption ||
    unwrapped.videoMessage?.caption ||
    unwrapped.documentMessage?.caption ||
    unwrapped.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    "",
  ).trim();
}

function getContextInfo(msg) {
  const message = unwrapMessage(msg?.message);
  return (
    message?.extendedTextMessage?.contextInfo ||
    message?.imageMessage?.contextInfo ||
    message?.videoMessage?.contextInfo ||
    message?.documentMessage?.contextInfo ||
    message?.documentWithCaptionMessage?.message?.documentMessage?.contextInfo ||
    null
  );
}

function removeMentionPlaceholders(text, mentionedJid = []) {
  let prompt = String(text || "").trim();

  for (const jid of mentionedJid) {
    const number = String(jid || "").split("@")[0].split(":")[0];
    if (!number) continue;
    prompt = prompt
      .replace(new RegExp(`@${number}\\b`, "g"), " ")
      .replace(new RegExp(`\\b${number}\\b`, "g"), " ");
  }

  return prompt.replace(/\s+/g, " ").trim();
}

function getPrompt(msg, text) {
  const contextInfo = getContextInfo(msg);
  const directPrompt = removeMentionPlaceholders(text, contextInfo?.mentionedJid);
  if (directPrompt) return directPrompt;

  return getMessageText(contextInfo?.quotedMessage);
}

async function generateVideo(prompt) {
  const params = new URLSearchParams({
    action: "generate",
    prompt,
    ratio: "auto",
    sound: "true",
  });

  const response = await fetch(`${SORA_ENDPOINT}?${params.toString()}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(120_000),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`The video service returned an invalid response (${response.status}).`);
  }

  const videoUrl = payload?.data?.videoUrl;
  if (!response.ok || payload?.success !== true || !videoUrl) {
    const message = payload?.message || payload?.error || `The video service returned status ${response.status}.`;
    throw new Error(message);
  }

  return videoUrl;
}

export default {
  name: "sora",
  description: "Generate an AI video from a text prompt",
  category: "ai",
  usage: ".sora <video prompt> (or reply to a text message)",
  aliases: ["txt2video", "aivideo"],
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
            "🎬 Usage: *.sora <video prompt>*\n\n" +
            "You can also reply to a text/caption message with *.sora*.",
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
        { text: `🎬 Generating your video...\n\n_${prompt}_` },
        { quoted: msg },
      );

      const videoUrl = await generateVideo(prompt);
      await sock.sendMessage(
        jid,
        {
          video: { url: videoUrl },
          mimetype: "video/mp4",
          caption: `🎬 *Sora video*\n\n_Prompt: ${prompt}_`,
        },
        { quoted: msg },
      );
    } catch (err) {
      console.error("[sora]", err);
      await sock.sendMessage(
        jid,
        {
          text:
            "❌ I couldn't generate that video right now.\n\n" +
            `_${err instanceof Error ? err.message : "The video service is unavailable."}_`,
        },
        { quoted: msg },
      );
    } finally {
      await sock.sendPresenceUpdate("paused", jid);
    }
  },
};