/**
 * KELIN MD — Suno AI music generator
 *
 * Commands:
 *   .suno <prompt>
 *   .suno <prompt> --style <genre>
 *
 * Aliases: .sonu, .music, .song
 */
import { downloadMediaBuffer } from "../../lib/omegaDownload.js";

const SUNO_API = "https://api.omegatech.app/api/ai/sonu-pro";
const SUNO_LEGACY_API = "https://omegatech-api.dixonomega.tech/api/ai/sonu3";
const DEFAULT_STYLE = "Pop";
const REQUEST_TIMEOUT = 45_000;
const MAX_PROMPT_LENGTH = 600;
const activeGenerations = new Set();
const SUNO_BLOCK_COOLDOWN = 10 * 60 * 1000;
let sunoBlockedUntil = 0;

function isBlockedOrLimited(error) {
  return /blocked|abuse|rate.?limit|too many requests|forbidden|429|403/i.test(String(error?.message || error));
}

function userFacingError(error) {
  if (isBlockedOrLimited(error)) {
    return "🎵 Suno is temporarily unavailable because the music provider rate-limited this server. Please try again later.";
  }
  if (/timed out|timeout/i.test(String(error?.message || error))) {
    return "🎵 Suno took too long to respond. Please try again later.";
  }
  return "🎵 Music generation failed. Please try again later.";
}

function cleanText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function extractTrack(payload) {
  const queue = [payload];
  const seen = new Set();
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);
    if (Array.isArray(value.tracks) && value.tracks[0]) return value.tracks[0];
    if (value.track && typeof value.track === "object") return value.track;
    for (const child of Object.values(value)) {
      if (child && typeof child === "object") queue.push(child);
    }
  }
  return payload?.data || payload || {};
}

function safeFileName(value) {
  return String(value || "Suno-AI-Track")
    .replace(/[\\/:*?"<>|\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90) || "Suno-AI-Track";
}

function parsePrompt(text) {
  const styleMatch = String(text).match(/\s+--style\s+(.+?)\s*$/i);
  const prompt = String(text).replace(/\s+--style\s+(.+?)\s*$/i, "").trim();
  return {
    prompt,
    style: cleanText(styleMatch?.[1], DEFAULT_STYLE),
  };
}

async function requestJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "KELIN-MD2/1.0" },
      signal: controller.signal,
    });
    const raw = await response.text();
    let payload;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      throw new Error(`Suno API returned a non-JSON response (HTTP ${response.status})`);
    }
    if (!response.ok || payload?.success === false || payload?.status === "error") {
      const error = new Error(payload?.message || payload?.error || `Suno API request failed (HTTP ${response.status})`);
      error.status = response.status;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`Suno request timed out after ${REQUEST_TIMEOUT / 1000} seconds`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function trackFromPayload(payload) {
  const track = extractTrack(payload);
  const audioUrl = cleanText(track.musicFile || track.audio_url || track.audioUrl || track.url || payload?.url);
  if (!audioUrl || !/^https?:\/\//i.test(audioUrl)) return null;
  return {
    title: cleanText(track.title || payload?.title, "Untitled"),
    lyrics: cleanText(track.lyrics || payload?.lyrics),
    duration: track.duration || payload?.duration || "N/A",
    audioUrl,
    coverUrl: cleanText(track.coverImage || track.image_url || payload?.thumbnail),
  };
}

async function generateMusic(prompt, style) {
  if (Date.now() < sunoBlockedUntil) {
    throw new Error("Suno provider is temporarily rate-limited");
  }

  const query = new URLSearchParams({
    action: "generate",
    prompt,
    title: prompt,
    isInstrumental: "false",
    musicStyle: style,
  });
  let firstError;
  try {
    const result = trackFromPayload(await requestJson(`${SUNO_API}?${query.toString()}`));
    if (result) return result;
    firstError = new Error("Suno Pro returned no downloadable audio");
  } catch (error) {
    firstError = error;
    if (isBlockedOrLimited(error)) sunoBlockedUntil = Date.now() + SUNO_BLOCK_COOLDOWN;
  }

  if (isBlockedOrLimited(firstError)) {
    throw firstError;
  }

  try {
    const legacyQuery = new URLSearchParams({ action: "full", prompt });
    const result = trackFromPayload(await requestJson(`${SUNO_LEGACY_API}?${legacyQuery.toString()}`));
    if (result) return result;
    throw new Error("Suno legacy endpoint returned no downloadable audio");
  } catch (fallbackError) {
    if (isBlockedOrLimited(fallbackError)) sunoBlockedUntil = Date.now() + SUNO_BLOCK_COOLDOWN;
    const combined = new Error(`${firstError?.message || "Suno Pro failed"}; fallback failed: ${fallbackError?.message || "unknown error"}`);
    combined.providerBlocked = isBlockedOrLimited(firstError) || isBlockedOrLimited(fallbackError);
    throw combined;
  }
}

function resultCaption({ title, style, duration, prompt, lyrics }) {
  const lines = [
    "✅ *Music Generated Successfully!*",
    "",
    `🎵 *Title:* ${title}`,
    `🎼 *Style:* ${style}`,
    `⏱️ *Duration:* ${duration}s`,
    `📝 *Prompt:* ${prompt.slice(0, 120)}${prompt.length > 120 ? "..." : ""}`,
    "🚀 *Source:* Omegatech AI",
  ];
  if (lyrics) {
    lines.push("", `🎤 *Lyrics:*
${lyrics.slice(0, 1200)}${lyrics.length > 1200 ? "..." : ""}`);
  }
  return lines.join("\n");
}

export default {
  name: "suno",
  description: "Generate AI music from a text prompt",
  category: "ai",
  usage: ".suno <prompt> [--style <genre>]",
  aliases: ["sonu", "music", "song"],
  cooldown: 15,
  limit: 3,
  hidden: false,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    const rawText = String(text || "").trim();
    if (!rawText) {
      await sock.sendMessage(jid, {
        text: "🎵 *Suno AI Music Generator*\n\nUsage: *.suno <prompt> [--style <genre>]*\n\nExample: *.suno a soft anime opening about friendship --style J-pop*",
      }, { quoted: msg });
      return;
    }

    const { prompt, style } = parsePrompt(rawText);
    if (!prompt) {
      await sock.sendMessage(jid, { text: "Please provide a music prompt." }, { quoted: msg });
      return;
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      await sock.sendMessage(jid, { text: `Please keep the prompt under ${MAX_PROMPT_LENGTH} characters.` }, { quoted: msg });
      return;
    }

    const generationKey = `${msg.key.participant || jid}:${prompt.toLowerCase()}:${style.toLowerCase()}`;
    if (activeGenerations.has(generationKey)) {
      await sock.sendMessage(jid, { text: "⏳ This song is already being generated. Please wait for it to finish." }, { quoted: msg });
      return;
    }
    activeGenerations.add(generationKey);

    try {
      await sock.sendMessage(jid, {
        text: `🎵 *Generating your music...*\n\n📝 *Prompt:* ${prompt}\n🎼 *Style:* ${style}\n⏰ Usually ready within 45 seconds.`,
      }, { quoted: msg });
      await msg.react?.("🎵");

      const generated = await generateMusic(prompt, style);
      const file = await downloadMediaBuffer(generated.audioUrl, { timeoutMs: 60_000 });
      const caption = resultCaption({ ...generated, prompt, style });
      await sock.sendMessage(jid, {
        audio: file.buffer,
        mimetype: file.mimetype.startsWith("audio/") ? file.mimetype : "audio/mpeg",
        fileName: `${safeFileName(generated.title)}.mp3`,
        ptt: false,
        caption,
      }, { quoted: msg });
      await msg.react?.("✅");
    } catch (error) {
      await msg.react?.("❌");
      console.error("[suno]", error?.stack || error?.message || error);
      await sock.sendMessage(jid, {
        text: `❌ *Suno generation failed.*\n\n${userFacingError(error)}`,
      }, { quoted: msg });
    } finally {
      activeGenerations.delete(generationKey);
    }
  },
};
