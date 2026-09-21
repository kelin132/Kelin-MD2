const KORD_API_BASE = "https://api.kord.live/api";
const REQUEST_TIMEOUT_MS = 90_000;

const URL_KEYS = new Set([
  "url",
  "link",
  "download_url",
  "downloadUrl",
  "video_url",
  "videoUrl",
  "audio_url",
  "audioUrl",
  "media_url",
  "mediaUrl",
  "direct_url",
  "directUrl",
  "mp3",
  "mp4",
]);

const SKIP_KEYS = new Set([
  "thumbnail",
  "thumb",
  "image",
  "cover",
  "poster",
  "avatar",
  "preview",
]);

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function errorMessage(payload, status) {
  return payload?.message || payload?.error || `Kord API request failed (HTTP ${status})`;
}

/**
 * Kord's public downloader endpoints all use GET /api/<endpoint>?url=...
 */
export async function kordGet(endpoint, sourceUrl) {
  const url = new URL(`${KORD_API_BASE}/${endpoint}`);
  url.searchParams.set("url", sourceUrl);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const raw = await response.text();

  let payload;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`Kord API returned invalid JSON (HTTP ${response.status})`);
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(errorMessage(payload, response.status));
  }
  return payload;
}

function collectUrlEntries(value, entries = [], seen = new Set(), parent = {}) {
  if (!value || typeof value !== "object" || seen.has(value)) return entries;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const child of value) collectUrlEntries(child, entries, seen, parent);
    return entries;
  }

  for (const [key, child] of Object.entries(value)) {
    if (SKIP_KEYS.has(key)) continue;
    if (URL_KEYS.has(key) && isHttpUrl(child)) {
      entries.push({ ...parent, ...value, url: child, key });
    } else if (isHttpUrl(child)) {
      entries.push({ ...parent, ...value, url: child, key });
    }
  }

  for (const [key, child] of Object.entries(value)) {
    if (SKIP_KEYS.has(key) || URL_KEYS.has(key)) continue;
    if (child && typeof child === "object") {
      collectUrlEntries(child, entries, seen, { ...parent, [key]: child });
    }
  }
  return entries;
}

function qualityNumber(entry) {
  const match = String(entry?.quality || entry?.label || "").match(/(\d{3,4})/);
  return match ? Number(match[1]) : 0;
}

function entryText(entry) {
  return [
    entry?.key,
    entry?.type,
    entry?.format,
    entry?.quality,
    entry?.label,
    entry?.mime,
  ].filter(Boolean).join(" ").toLowerCase();
}

export function pickKordMedia(payload, kind = "video") {
  const entries = collectUrlEntries(payload);
  if (!entries.length) return null;

  const wanted = kind === "audio"
    ? entries.filter((entry) => /audio|mp3|m4a|song/.test(entryText(entry)))
    : kind === "video"
      ? entries.filter((entry) => !entry.isAudio && /video|mp4|download|nowm|without watermark/.test(entryText(entry)))
      : entries;

  const candidates = wanted.length ? wanted : entries;
  const preferred = [...candidates].sort((a, b) => {
    const aText = entryText(a);
    const bText = entryText(b);
    const aScore = (aText.includes("without watermark") ? 100 : 0)
      + (aText.includes("hd") ? 10 : 0)
      + qualityNumber(a);
    const bScore = (bText.includes("without watermark") ? 100 : 0)
      + (bText.includes("hd") ? 10 : 0)
      + qualityNumber(b);
    return bScore - aScore;
  })[0];

  return preferred?.url || null;
}

export function pickKordYouTubeVideo(payload) {
  const entries = collectUrlEntries(payload)
    .filter((entry) => entry.isAudio !== true && /mp4|video/.test(entryText(entry)));
  if (!entries.length) return pickKordMedia(payload, "video");

  // Keep WhatsApp uploads practical. Prefer the highest available quality up
  // to 720p rather than accidentally selecting a 300 MB 4K stream.
  const atMost720 = entries.filter((entry) => {
    const quality = qualityNumber(entry);
    return quality > 0 && quality <= 720;
  });
  return [...(atMost720.length ? atMost720 : entries)]
    .sort((a, b) => qualityNumber(b) - qualityNumber(a))[0]?.url || null;
}

export function pickKordTitle(payload, fallback = "") {
  const seen = new Set();
  function find(value) {
    if (!value || typeof value !== "object" || seen.has(value)) return "";
    seen.add(value);
    if (typeof value.title === "string" && value.title.trim()) return value.title.trim();
    if (typeof value.filename === "string" && value.filename.trim()) {
      return value.filename.trim().replace(/\.(?:mp3|mp4|webm|m4a)$/i, "");
    }
    for (const child of Array.isArray(value) ? value : Object.values(value)) {
      const result = find(child);
      if (result) return result;
    }
    return "";
  }
  return find(payload) || fallback;
}