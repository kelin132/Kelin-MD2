const BASE = "https://knightbotapi.stream/api";
const API_KEY = process.env.KNIGHTBOT_API_KEY || "knight";
const TIMEOUT_MS = 30_000;
const MEDIA_KEYS = ["download", "dl_url", "dl", "download_url", "downloadUrl", "video_url", "videoUrl", "audio_url", "audioUrl", "mp4", "mp3", "video", "audio", "media_url", "mediaUrl", "link"];
const isUrl = (value) => typeof value === "string" && /^https?:\/\//i.test(value);

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
