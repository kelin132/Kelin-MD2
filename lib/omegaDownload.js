const VALORE_BASE = "https://dl.valore.web.id/api/download";

const MEDIA_KEYS = [
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

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function findMedia(value, seen = new Set()) {
  if (isHttpUrl(value)) return value;
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);

  for (const key of MEDIA_KEYS) {
    const candidate = value[key];
    if (isHttpUrl(candidate)) return candidate;
    if (candidate && typeof candidate === "object") {
      const nested = findMedia(candidate, seen);
      if (nested) return nested;
    }
  }

  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    if (isHttpUrl(child)) return child;
    const nested = findMedia(child, seen);
    if (nested) return nested;
  }

  return null;
}

function findFirst(value, keys, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return "";
  seen.add(value);

  for (const key of keys) {
    if (typeof value[key] === "string" && value[key].trim()) {
      return value[key].trim();
    }
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
 * Call the Valore AIO downloader.
 *
 * The exported name remains omegaDownload for compatibility with existing
 * command modules, but every request now uses the supplied Valore endpoint.
 */
export async function omegaDownload(_route, params = {}, { timeoutMs = 45_000 } = {}) {
  const url = sourceUrlFromParams(params);
  if (!url) throw new Error("A media URL or search URL is required");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(VALORE_BASE, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Session-Id": `cli-${Date.now()}`,
        "User-Agent": "KELIN-MD2/1.0",
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    const raw = await response.text();
    let payload;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      throw new Error(`Valore returned a non-JSON response (HTTP ${response.status})`);
    }

    if (!response.ok || payload?.success === false || payload?.status === "error" || payload?.statusCode >= 400) {
      throw new Error(
        payload?.message || payload?.error || `Valore request failed (HTTP ${response.status})`,
      );
    }

    const media = findMedia(payload);
    if (!media) throw new Error("Valore returned no downloadable media URL");

    return {
      url: media,
      title: findFirst(payload, ["title", "name", "filename", "fileName"]) || "KELIN MD Download",
      payload,
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Valore request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const OMEGA_DOWNLOAD_ROUTES = Object.freeze({
  play: VALORE_BASE,
  all: VALORE_BASE,
});

export const VALORE_DOWNLOAD_API = VALORE_BASE;
