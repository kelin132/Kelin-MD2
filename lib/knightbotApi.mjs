const BASE = "https://knightbotapi.stream/api";
const API_KEY = process.env.KNIGHTBOT_API_KEY || "knight";
const TIMEOUT_MS = 30_000;
const MEDIA_KEYS = ["download", "dl_url", "dl", "download_url", "downloadUrl", "video_url", "videoUrl", "audio_url", "audioUrl", "mp4", "mp3", "video", "audio", "media_url", "mediaUrl", "link"];
const isUrl = (value) => typeof value === "string" && /^https?:\/\//i.test(value);
const IMAGE_FIELD_PATTERN = /(?:image|photo|picture|thumbnail|thumb|preview|cover|poster|^orig$|^original$)/i;
const VIDEO_FIELD_PATTERN = /(?:video|audio|music|stream)/i;
const GENERIC_URL_KEYS = new Set(["url", "link", "download", "download_url", "downloadurl", "dl", "dl_url", "dlurl", "media_url", "mediaurl", "src"]);
const VIDEO_FILE_PATTERN = /\.(?:mp4|m4v|webm|mov|avi|m3u8|mp3|m4a|aac|wav|ogg)(?:[?#]|$)/i;
const IMAGE_FILE_PATTERN = /\.(?:jpe?g|png|gif|webp|avif|bmp)(?:[?#]|$)/i;

export function pickPinterestImageCandidates(payload, sourceUrl = "") {
  const preferred = [];
  const fallback = [];
  const add = (list, value) => { if (!list.includes(value)) list.push(value); };
  function visit(value, key = "", imageContext = false, depth = 0) {
    if (depth > 8 || value == null) return;
    if (typeof value === "string") {
      if (!isUrl(value) || value === sourceUrl || VIDEO_FILE_PATTERN.test(value)) return;
      if (imageContext || IMAGE_FIELD_PATTERN.test(key) || IMAGE_FILE_PATTERN.test(value)) add(preferred, value);
      else if (GENERIC_URL_KEYS.has(key.toLowerCase())) add(fallback, value);
      return;
    }
    if (Array.isArray(value)) { for (const item of value) visit(item, key, imageContext, depth + 1); return; }
    if (typeof value !== "object") return;
    for (const [childKey, child] of Object.entries(value)) {
      if (VIDEO_FIELD_PATTERN.test(childKey)) continue;
      visit(child, childKey, imageContext || IMAGE_FIELD_PATTERN.test(childKey), depth + 1);
    }
  }
  visit(payload);
  return [...preferred, ...fallback].slice(0, 30);
}

export async function knightbotGet(endpoint, params = {}, timeoutMs = TIMEOUT_MS, apiKey = API_KEY) {
  const url = new URL(`${BASE}/${String(endpoint || "").replace(/^\/+/, "")}`);
  url.searchParams.set("apikey", apiKey);
  for (const [key, value] of Object.entries(params)) if (value != null) url.searchParams.set(key, String(value));
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
  let payload;
  try { payload = await response.json(); } catch { throw new Error(`KnightBot returned invalid JSON (HTTP ${response.status})`); }
  const message = payload?.result?.error || payload?.message || payload?.error || `KnightBot request failed (HTTP ${response.status})`;
  if (!response.ok || payload?.success === false || Number(payload?.status) >= 400) throw new Error(message);
  return payload;
}

export function pickKnightMedia(payload, sourceUrl = "") {
  const seen = new Set();
  function find(value, depth = 0) {
    if (!value || typeof value !== "object" || depth > 8 || seen.has(value)) return null;
    seen.add(value);
    if (Array.isArray(value)) { for (const child of value) { const result = find(child, depth + 1); if (result) return result; } return null; }
    for (const key of MEDIA_KEYS) { const candidate = value[key]; if (isUrl(candidate) && candidate !== sourceUrl) return candidate; }
    for (const [key, child] of Object.entries(value)) { if (/thumbnail|thumb|cover|poster|preview|image/i.test(key)) continue; const result = find(child, depth + 1); if (result) return result; }
    return null;
  }
  return find(payload);
}

export function pickKnightTitle(payload, fallback = "") {
  const seen = new Set();
  function find(value, depth = 0) {
    if (!value || typeof value !== "object" || depth > 8 || seen.has(value)) return "";
    seen.add(value);
    if (Array.isArray(value)) { for (const child of value) { const result = find(child, depth + 1); if (result) return result; } return ""; }
    if (typeof value.title === "string" && value.title.trim()) return value.title.trim();
    for (const child of Object.values(value)) { const result = find(child, depth + 1); if (result) return result; }
    return "";
  }
  return find(payload) || fallback;
}
