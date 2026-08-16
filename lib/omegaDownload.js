const OMEGA_BASE = "https://omegatech-api.dixonomega.tech/api/download";

const MEDIA_KEYS = [
  "download_url",
  "downloadUrl",
  "audio_url",
  "audioUrl",
  "video_url",
  "videoUrl",
  "media_url",
  "mediaUrl",
  "direct_url",
  "directUrl",
  "download",
  "audio",
  "video",
  "mp3",
  "mp4",
  "nowm",
  "play",
  "hd",
  "sd",
  "url",
  "link",
];

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function findMedia(value, seen = new Set()) {
  if (!value || seen.has(value)) return null;
  if (isHttpUrl(value)) return value;
  if (typeof value !== "object") return null;
  seen.add(value);

  for (const key of MEDIA_KEYS) {
    const found = findMedia(value[key], seen);
    if (found) return found;
  }

  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const found = findMedia(child, seen);
    if (found) return found;
  }

  return null;
}

function findFirst(value, keys) {
  if (!value || typeof value !== "object") return "";
  for (const key of keys) {
    if (typeof value[key] === "string" && value[key].trim()) return value[key].trim();
  }
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const found = findFirst(child, keys);
    if (found) return found;
  }
  return "";
}

export async function omegaDownload(route, params, { timeoutMs = 45_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && String(value).trim()) {
      query.set(key, String(value));
    }
  }

  try {
    const response = await fetch(`${OMEGA_BASE}/${route}?${query.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Kelin-MD2/1.0",
      },
      signal: controller.signal,
    });

    const raw = await response.text();
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error(`OmegaTech returned a non-JSON response (HTTP ${response.status})`);
    }

    if (!response.ok || payload?.success === false || payload?.statusCode >= 400) {
      throw new Error(payload?.message || payload?.error || `OmegaTech request failed (HTTP ${response.status})`);
    }

    const media = findMedia(payload);
    if (!media) throw new Error("OmegaTech returned no downloadable media URL");

    return {
      url: media,
      title: findFirst(payload, ["title", "name", "filename", "fileName"]) || "KELIN MD Download",
      payload,
    };
  } finally {
    clearTimeout(timer);
  }
}

export const OMEGA_DOWNLOAD_ROUTES = Object.freeze({
  play: `${OMEGA_BASE}/play`,
  all: `${OMEGA_BASE}/all`,
});
