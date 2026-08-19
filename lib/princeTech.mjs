const BASE_URL = "https://api.princetechn.com/api";
const API_KEY = "prince";
const DEFAULT_TIMEOUT = 45_000;
const DEFAULT_MAX_BYTES = 150 * 1024 * 1024;

const MEDIA_KEYS = [
  "url", "link", "download_url", "downloadUrl", "audio_url", "audioUrl",
  "video_url", "videoUrl", "media_url", "mediaUrl", "file", "file_url",
  "fileUrl", "mp3", "mp4", "nowm", "hd", "sd", "result", "data",
];

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function findMedia(value, seen = new Set(), keyHint = "", { allowImage = false } = {}) {
  if (isHttpUrl(value)) {
    if (!allowImage && /thumbnail|thumb|preview|poster|cover|^image$|image_url/i.test(keyHint)) return null;
    return value;
  }
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  for (const key of MEDIA_KEYS) {
    const found = findMedia(value[key], seen, key, { allowImage });
    if (found) return found;
  }
  for (const [key, child] of Object.entries(value)) {
    const found = findMedia(child, seen, key, { allowImage });
    if (found) return found;
  }
  return null;
}

function findText(value, seen = new Set()) {
  if (typeof value === "string" && value.trim() && !isHttpUrl(value)) return value.trim();
  if (!value || typeof value !== "object" || seen.has(value)) return "";
  seen.add(value);
  for (const key of ["answer", "response", "reply", "text", "message", "result", "data"]) {
    const found = findText(value[key], seen);
    if (found) return found;
  }
  return "";
}

async function request(path, params = {}, { timeoutMs = DEFAULT_TIMEOUT, maxBytes = DEFAULT_MAX_BYTES } = {}) {
  const query = new URLSearchParams({ apikey: API_KEY });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value));
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${BASE_URL}/${path}?${query.toString()}`, {
      headers: { Accept: "application/json, image/*, audio/*, video/*", "User-Agent": "KELIN-MD2/1.0" },
      signal: controller.signal,
      redirect: "follow",
    });
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json") || contentType.includes("text/json")) {
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`Prince Tech returned invalid JSON (HTTP ${response.status})`);
      }
      if (!response.ok || payload?.success === false || Number(payload?.status) >= 400) {
        throw new Error(payload?.message || payload?.error || `Prince Tech request failed (HTTP ${response.status})`);
      }
      return { kind: "json", payload };
    }
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > maxBytes) throw new Error(`Prince Tech media is too large (${Math.ceil(declaredLength / 1024 / 1024)} MB)`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!response.ok || !buffer.length) throw new Error(`Prince Tech request failed (HTTP ${response.status})`);
    if (buffer.length > maxBytes) throw new Error(`Prince Tech media is too large (${Math.ceil(buffer.length / 1024 / 1024)} MB)`);
    return { kind: "binary", buffer, mimetype: contentType.split(";")[0] || "application/octet-stream" };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`Prince Tech request timed out after ${timeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function princeMedia(path, params, options) {
  const response = await request(path, params, options);
  if (response.kind === "binary") return { url: null, buffer: response.buffer, mimetype: response.mimetype, payload: null };
  const url = findMedia(response.payload);
  if (!url) throw new Error("Prince Tech returned no downloadable media URL");
  return { url, buffer: null, mimetype: "", payload: response.payload };
}

export async function princeJson(path, params, options) {
  const response = await request(path, params, options);
  if (response.kind !== "json") throw new Error("Prince Tech returned binary data instead of JSON");
  return response.payload;
}

export function princeText(payload) {
  return findText(payload);
}

export async function princeImage(path, text, options) {
  const response = await request(path, { text }, options);
  if (response.kind === "binary") return { buffer: response.buffer, mimetype: response.mimetype, payload: null };
  const payload = response.payload;
  const image = findMedia(payload, new Set(), "", { allowImage: true }) || payload?.result?.image_url || payload?.image_url || payload?.url;
  if (!image) throw new Error("Prince Tech returned no generated image URL");
  return { url: image, buffer: null, mimetype: "", payload };
}

export const PRINCE_ENDPOINTS = Object.freeze({
  play: "download/mp3",
  playVideo: "download/ytmp4",
  yt: "download/mp4",
  ytVideo: "download/ytvid",
  instagram: "download/instadl",
  fancy: "tools/fancy",
  ai: "ai/gpt4o-mini",
  glossySilver: "ephoto360/glossysilver",
});
