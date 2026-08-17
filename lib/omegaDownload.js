const VALORE_BASE = "https://dl.valore.web.id/api/download";
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
 * Call the Valore AIO downloader and choose a real media entry instead of a thumbnail.
 */
export async function omegaDownload(route, params = {}, { timeoutMs = 45_000 } = {}) {
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
      throw new Error(payload?.message || payload?.error || `Valore request failed (HTTP ${response.status})`);
    }

    const selected = selectMediaEntry(payload, route, params);
    const media = selected?.url || findMedia(payload);
    if (!media) throw new Error("Valore returned no downloadable media URL");

    return {
      url: media,
      title: findFirst(payload, ["title", "name", "filename", "fileName"]) || "KELIN MD Download",
      type: selected?.type || "",
      format: selected?.format || "",
      quality: selected?.quality || "",
      payload,
    };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`Valore request timed out after ${timeoutMs}ms`);
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
  play: VALORE_BASE,
  all: VALORE_BASE,
});

export const VALORE_DOWNLOAD_API = VALORE_BASE;

/**
 * Download YouTube audio through the maintained yt-dlp binary. This avoids
 * depending on YouTube's frequently changing watch-page HTML parser.
 */
export async function downloadYoutubeAudio(videoUrl, { timeoutMs = DEFAULT_MEDIA_TIMEOUT, maxBytes = MAX_MEDIA_BYTES } = {}) {
  if (!/^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(String(videoUrl || ""))) {
    throw new Error("A direct YouTube URL is required for the local audio fallback");
  }

  let youtubedl;
  try {
    const module = await import("youtube-dl-exec");
    youtubedl = module.default || module;
  } catch {
    throw new Error("The yt-dlp audio fallback is not installed");
  }

  let process;
  try {
    process = youtubedl.exec(videoUrl, {
      format: "bestaudio[ext=m4a]/bestaudio",
      output: "-",
      noPlaylist: true,
      noWarnings: true,
      noProgress: true,
      quiet: true,
      noCheckCertificates: true,
      addHeader: [
        "referer:https://www.youtube.com/",
        "user-agent:Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36",
      ],
    }, {
      timeout: timeoutMs,
      killSignal: "SIGKILL",
      maxBuffer: maxBytes,
    });
  } catch (error) {
    throw new Error(`yt-dlp could not start: ${error.message}`);
  }

  const chunks = [];
  const stderr = [];
  let size = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    process.kill("SIGKILL");
  }, timeoutMs);

  try {
    const exitCode = await new Promise((resolve, reject) => {
      process.stdout.on("data", (chunk) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > maxBytes) {
          process.kill("SIGKILL");
          reject(new Error(`YouTube audio is too large (${Math.ceil(size / 1024 / 1024)} MB)`));
          return;
        }
        chunks.push(buffer);
      });
      process.stderr?.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
      process.once("error", reject);
      process.once("close", (code) => resolve(code));
    });

    if (timedOut) throw new Error(`timed out after ${timeoutMs}ms`);
    if (exitCode !== 0) {
      const details = Buffer.concat(stderr).toString("utf8").trim().slice(-500);
      throw new Error(details || `exited with code ${exitCode}`);
    }
  } catch (error) {
    throw new Error(`yt-dlp audio download failed: ${error.message}`);
  } finally {
    clearTimeout(timer);
  }

  const buffer = Buffer.concat(chunks);
  if (!buffer.length) throw new Error("yt-dlp returned an empty audio file");
  return {
    buffer,
    mimetype: "audio/mp4",
    size: buffer.length,
    title: "YouTube Audio",
    extension: "m4a",
  };
}
