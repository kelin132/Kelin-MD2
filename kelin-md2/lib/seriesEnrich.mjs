/**
 * KELIN MD — Series enrichment via AniList GraphQL
 *
 * Maps anime character names → their anime/series title.
 * Results are persisted to disk so they survive bot restarts.
 *
 * AniList rate limit: ~90 req/min. We cap at 1/sec to stay safe.
 * Duplicate in-flight requests for the same name are coalesced.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join }        from "path";
import { fileURLToPath }        from "url";
import { inflateSync }           from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_FILE  = join(__dirname, "..", "data", "series-cache.json");
const ANILIST_URL = "https://graphql.anilist.co";
const REQUEST_TIMEOUT_MS = 6_000;   // per-request ceiling
const MIN_DELAY_MS       = 750;     // ≥750 ms between requests ≈ 1.3 req/s
const MEDIA_TIMEOUT_MS   = 8_000;

mkdirSync(dirname(CACHE_FILE), { recursive: true });

// ── Disk-backed in-memory cache ──────────────────────────────────────────────
/** @type {Map<string, string>} normalised-name → series (empty string = tried, not found) */
const cache = new Map();
const mediaSeriesCache = new Map(); // media URL → series or ""

function loadDiskCache() {
  try {
    if (existsSync(CACHE_FILE)) {
      const obj = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
      for (const [k, v] of Object.entries(obj)) cache.set(k, v || "");
    }
  } catch { /* corrupt — start fresh */ }
}
loadDiskCache();

let _dirty = false;
function markDirty() {
  if (_dirty) return;
  _dirty = true;
  // Debounce writes: flush after 3 s of inactivity
  setTimeout(() => {
    _dirty = false;
    try {
      const obj = {};
      for (const [k, v] of cache) obj[k] = v;
      writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), "utf8");
    } catch { /* non-fatal */ }
  }, 3_000);
}

function isKnownSeries(value) {
  const series = String(value || "").trim();
  return Boolean(series) && series.toLowerCase() !== "unknown";
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2f;/gi, "/")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

/**
 * PNG cards from Shoob contain Adobe XMP metadata with an exact
 * "Series Name" layer. Reading it is much more reliable than guessing a
 * series from a character name (and works for obscure/event cards too).
 */
function extractPngSeries(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buffer.subarray(0, 8).equals(signature)) return null;

  let offset = 8;
  const textParts = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > buffer.length) break;
    const data = buffer.subarray(start, end);

    if (type === "tEXt") {
      textParts.push(data.toString("latin1"));
    } else if (type === "iTXt") {
      const keywordEnd = data.indexOf(0);
      if (keywordEnd >= 0) {
        const keyword = data.toString("utf8", 0, keywordEnd);
        let cursor = keywordEnd + 1;
        const compressionFlag = data[cursor++];
        cursor++; // compression method
        const languageEnd = data.indexOf(0, cursor);
        if (languageEnd < 0) break;
        cursor = languageEnd + 1;
        const translatedEnd = data.indexOf(0, cursor);
        if (translatedEnd < 0) break;
        cursor = translatedEnd + 1;
        let text = data.subarray(cursor);
        if (compressionFlag === 1) {
          try { text = inflateSync(text); } catch { text = Buffer.alloc(0); }
        }
        textParts.push(`${keyword}\0${text.toString("utf8")}`);
      }
    }

    offset = end + 4; // skip CRC
    if (type === "IEND") break;
  }

  return extractSeriesFromText(textParts.join("\n"));
}

function extractSeriesFromText(text) {
  const source = String(text || "");
  const patterns = [
    /LayerName=["']Series Name["'][\s\S]{0,400}?LayerText=["']([^"']+)["']/i,
    /Series Name[\s\S]{0,400}?LayerText=["']([^"']+)["']/i,
    /(?:series[_\s-]*name|anime[_\s-]*series)["']?\s*[:=]\s*["']([^"']+)["']/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match && isKnownSeries(match[1])) {
      return decodeXmlEntities(match[1]).trim();
    }
  }
  return null;
}

function seriesFromMediaFilename(mediaUrl) {
  try {
    const filename = decodeURIComponent(String(mediaUrl).split("/").pop() || "");
    const parts = filename.split(";");
    // Some animated cards use: character;tier;series,event.gif
    if (parts.length >= 3 && isKnownSeries(parts[2])) {
      return parts[2].split(",")[0].replace(/[_-]+/g, " ").trim();
    }
  } catch { /* malformed URL — use the other enrichers */ }
  return null;
}

async function getSeriesFromMedia(mediaUrl) {
  if (!mediaUrl) return null;
  const url = String(mediaUrl);
  if (mediaSeriesCache.has(url)) {
    return mediaSeriesCache.get(url) || null;
  }

  const filenameSeries = seriesFromMediaFilename(url);
  if (filenameSeries) {
    mediaSeriesCache.set(url, filenameSeries);
    return filenameSeries;
  }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "KELIN-MD card-series-enricher/1.0" },
      signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`media HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    const bytes = Buffer.from(await response.arrayBuffer());
    const textSeries = contentType.includes("png") || bytes.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
      ? extractPngSeries(bytes)
      : extractSeriesFromText(bytes.toString("latin1"));

    mediaSeriesCache.set(url, textSeries || "");
    return textSeries;
  } catch {
    mediaSeriesCache.set(url, "");
    return null;
  }
}

// ── AniList query ─────────────────────────────────────────────────────────────
const GQL_QUERY = `
query($name:String){
  Character(search:$name){
    media(type:ANIME,sort:POPULARITY_DESC,perPage:1){
      nodes{title{english romaji}}
    }
  }
}`.trim();

async function queryAniList(name) {
  const res = await fetch(ANILIST_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ query: GQL_QUERY, variables: { name } }),
    signal:  AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const node = json?.data?.Character?.media?.nodes?.[0];
  const title = node?.title?.english || node?.title?.romaji;
  return title ? String(title).trim() : null;
}

// ── Rate-limited serial queue ─────────────────────────────────────────────────
let _lastFetch = 0;
let _running   = false;
const _queue   = [];

/** Deduplicate: if the same name is already queued, return the same promise */
const _pending = new Map(); // key → Promise<string|null>

async function drainQueue() {
  if (_running) return;
  _running = true;
  while (_queue.length > 0) {
    const { key, name, resolve } = _queue.shift();
    const wait = MIN_DELAY_MS - (Date.now() - _lastFetch);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    _lastFetch = Date.now();
    let result = null;
    try { result = await queryAniList(name); } catch { /* swallow */ }
    _pending.delete(key);
    resolve(result);
  }
  _running = false;
}

function enqueue(key, name) {
  if (_pending.has(key)) return _pending.get(key);
  const p = new Promise(resolve => {
    _queue.push({ key, name, resolve });
    drainQueue();
  });
  _pending.set(key, p);
  return p;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Look up the anime/series for a card character name.
 *
 * - Returns cached result instantly if known.
 * - Otherwise queues an AniList request (rate-limited at ~1/s).
 * - `opts.timeout` (ms): if set, returns "Unknown" after that many ms
 *   but the background request continues so the result is cached for later.
 *
 * @param {string} characterName
 * @param {{ timeout?: number }} [opts]
 * @returns {Promise<string>}
 */
export async function getSeries(characterName, opts = {}) {
  const key = String(characterName || "").toLowerCase().trim();
  if (!key) return "Unknown";

  // Only known values are useful cache hits. Do not permanently cache a
  // transient AniList failure as "Unknown".
  if (cache.has(key)) {
    const cached = cache.get(key);
    if (isKnownSeries(cached)) return cached;
    cache.delete(key);
  }

  // Queue the AniList lookup
  const lookupPromise = enqueue(key, characterName);

  let result = null;
  if (opts.timeout) {
    // Race against caller's timeout; background request continues to cache result
    const timer = new Promise(r => setTimeout(() => r("__timeout__"), opts.timeout));
    const winner = await Promise.race([lookupPromise, timer]);
    if (winner === "__timeout__") {
      // Let the lookup finish in the background — update cache when done
      lookupPromise.then(r => {
        if (isKnownSeries(r) && !cache.has(key)) {
          cache.set(key, r);
          markDirty();
        }
      }).catch(() => {});
      return "Unknown";
    }
    result = winner;
  } else {
    result = await lookupPromise;
  }

  if (isKnownSeries(result)) {
    cache.set(key, result);
    markDirty();
    return result;
  }
  return "Unknown";
}

/**
 * Synchronous cache-only lookup. Returns null if not yet enriched.
 * @param {string} characterName
 * @returns {string | null}
 */
export function getSeriesCached(characterName) {
  const key = String(characterName || "").toLowerCase().trim();
  if (!cache.has(key)) return null;
  const value = cache.get(key);
  return isKnownSeries(value) ? value : null;
}

/**
 * Resolve a complete card object. Card artwork metadata is checked before the
 * API-provided series value and AniList character lookup, so summon and
 * collection repair use the exact series assigned to the card rather than an
 * approximation.
 *
 * @param {{name?: string, media?: string, series?: string}} card
 * @param {{timeout?: number}} [opts]
 * @returns {Promise<string>}
 */
export async function getSeriesForCard(card, opts = {}) {
  const mediaSeries = await getSeriesFromMedia(card?.media);
  if (isKnownSeries(mediaSeries)) {
    const key = String(card?.name || "").toLowerCase().trim();
    if (key) {
      cache.set(key, mediaSeries);
      markDirty();
    }
    return mediaSeries;
  }

  // The card API can contain a stale or mismatched series value. If artwork
  // metadata was unavailable, retain that value as the next-best fallback.
  if (isKnownSeries(card?.series)) return String(card.series).trim();

  return getSeries(card?.name, opts);
}

/**
 * Kick off background enrichment for a list of names without blocking.
 * Skips names that are already cached.
 * @param {string[]} names
 */
export function prefetchSeries(names) {
  for (const name of names) {
    const key = String(name || "").toLowerCase().trim();
    if (key && !cache.has(key)) {
      enqueue(key, name)
        .then(r => {
          if (isKnownSeries(r)) {
            cache.set(key, r);
            markDirty();
          }
        })
        .catch(() => {});
    }
  }
}
