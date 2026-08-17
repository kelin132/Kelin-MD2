const OMEGA_BASE = "https://omegatech-api.dixonomega.tech/api/download";
const DEFAULT_MEDIA_TIMEOUT = 90_000;
const MAX_MEDIA_BYTES = 150 * 1024 * 1024;

const MEDIA_KEYS = [
  "medias",
  "media",
  "downloads",
  "formats",
  "links",
  "download_url",
  "downloadUrl",
  "download_url_hd",
  "downloadUrlHd",
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

const NON_MEDIA_KEYS = new Set([
  "thumbnail",
  "thumb",
  "image",
  "cover",
  "poster",
  "preview",
  "avatar",
]);

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function isMediaEntry(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    isHttpUrl(value.url) &&
    (value.type || value.format || value.quality || value.videoAvailable || value.audioAvailable),
  );
}

function collectMediaEntries(value, entries = [], seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return entries;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const child of value) collectMediaEntries(child, entries, seen);
    return entries;
  }

  if (isMediaEntry(value)) entries.push(value);
  for (const [key, child] of Object.entries(value)) {
    if (!NON_MEDIA_KEYS.has(key)) collectMediaEntries(child, entries, seen);
  }
  return entries;
}

function mediaQualityNumber(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function selectMediaEntry(payload, route, params = {}) {
  const entries = collectMediaEntries(payload);
  if (!entries.length) return null;

  const wantsAudio = route === "play" || route === "audio" || /^(mp3|m4a|audio)$/i.test(String(params.format || ""));
  const wantsVideo = route === "video" || /^(mp4|video)$/i.test(String(params.format || ""));

  if (wantsAudio) {
    const audio = entries.filter((entry) =>
      /audio|mp3|m4a/i.test(`${entry.type || ""} ${entry.format || ""}`),
    );
    if (audio.length) {
      return [...audio].sort((a, b) => mediaQualityNumber(b.quality) - mediaQualityNumber(a.quality))[0];
    }
  }

  if (wantsVideo || !wantsAudio) {
    const video = entries.filter((entry) =>
      /video|mp4|webm/i.test(`${entry.type || ""} ${entry.format || ""}`),
    );
    if (video.length) {
      const playable = video.filter((entry) => entry.audioAvailable !== false);
      const sized = (playable.length ? playable : video).filter((entry) =>
        !entry.size || Number(entry.size) <= 16 * 1024 * 1024,
      );
      return [...(sized.length ? sized : playable.length ? playable : video)].sort(
        (a, b) => mediaQualityNumber(b.quality) - mediaQualityNumber(a.quality),
      )[0];
    }
  }

  return entries[0];
}

function findMedia(value, seen = new Set(), keyHint = "") {
  if (isHttpUrl(value)) return NON_MEDIA_KEYS.has(keyHint) ? null : value;
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);

  for (const key of MEDIA_KEYS) {
    if (NON_MEDIA_KEYS.has(key)) continue;
    const candidate = value[key];
    const found = findMedia(candidate, seen, key);
    if (found) return found;
  }

  for (const [key, child] of Object.entries(value)) {
    if (NON_MEDIA_KEYS.has(key)) continue;
    const found = findMedia(child, seen, key);
    if (found) return found;
  }

  return null;
}

function findFirst(value, keys, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return "";
  seen.add(value);

  for (const key of keys) {
    if (typeof value[key] === "string" && value[key].trim()) return value[key].trim();
  }

  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const found = findFirst(child, keys, seen);
    if (found) return found;
  }

  return "";
}

function sourceUrlFromParams(params = {}) {
  const source = params.url ?? params.query ?? params.link;
  return typeof source === "string" ? source.trim() : "";
}

/**
 * Call the OmegaTech downloader and choose a real media entry instead of a thumbnail.
 */
export async function omegaDownload(route, params = {}, { timeoutMs = 45_000 } = {}) {
  const url = sourceUrlFromParams(params);
  if (!url) throw new Error("A media URL or search URL is required");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params || {})) {
      if (value !== undefined && value !== null && String(value).trim()) {
        query.set(key, String(value));
      }
    }

    const response = await fetch(`${OMEGA_BASE}/${route}?${query.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "KELIN-MD2/1.0",
      },
      signal: controller.signal,
    });

    const raw = await response.text();
    let payload;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      throw new Error(`OmegaTech returned a non-JSON response (HTTP ${response.status})`);
    }

    if (!response.ok || payload?.success === false || payload?.status === "error" || payload?.statusCode >= 400) {
      throw new Error(payload?.message || payload?.error || `OmegaTech request failed (HTTP ${response.status})`);
    }

    const selected = selectMediaEntry(payload, route, params);
    const media = selected?.url || findMedia(payload);
    if (!media) throw new Error("OmegaTech returned no downloadable media URL");

    return {
      url: media,
      title: findFirst(payload, ["title", "name", "filename", "fileName"]) || "KELIN MD Download",
      type: selected?.type || "",
      format: selected?.format || "",
      quality: selected?.quality || "",
      payload,
    };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`OmegaTech request timed out after ${timeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Download provider media into memory before sending it through WhatsApp.
 * This prevents WhatsApp from fetching volatile signed provider URLs directly.
 */
export async function downloadMediaBuffer(url, { timeoutMs = DEFAULT_MEDIA_TIMEOUT, maxBytes = MAX_MEDIA_BYTES } = {}) {
  if (!isHttpUrl(url)) throw new Error("Downloader returned an invalid media URL");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "audio/*,video/*,image/*;q=0.9,*/*;q=0.5",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36",
        Referer: "https://www.youtube.com/",
        Origin: "https://www.youtube.com",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Media fetch failed (HTTP ${response.status})`);

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > maxBytes) throw new Error(`Media is too large (${Math.ceil(declaredLength / 1024 / 1024)} MB)`);

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) throw new Error("Media provider returned an empty file");
    if (buffer.length > maxBytes) throw new Error(`Media is too large (${Math.ceil(buffer.length / 1024 / 1024)} MB)`);

    return {
      buffer,
      mimetype: response.headers.get("content-type")?.split(";")[0] || "application/octet-stream",
      size: buffer.length,
    };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`Media fetch timed out after ${timeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const OMEGA_DOWNLOAD_ROUTES = Object.freeze({
  play: `${OMEGA_BASE}/play`,
  all: `${OMEGA_BASE}/all`,
});

export const OMEGA_DOWNLOAD_API = OMEGA_BASE;
