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

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_FILE  = join(__dirname, "..", "data", "series-cache.json");
const ANILIST_URL = "https://graphql.anilist.co";
const REQUEST_TIMEOUT_MS = 6_000;   // per-request ceiling
const MIN_DELAY_MS       = 750;     // ≥750 ms between requests ≈ 1.3 req/s

mkdirSync(dirname(CACHE_FILE), { recursive: true });

// ── Disk-backed in-memory cache ──────────────────────────────────────────────
/** @type {Map<string, string>} normalised-name → series (empty string = tried, not found) */
const cache = new Map();

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

  // Cache hit (including negative cache — empty string means "tried, not found")
  if (cache.has(key)) {
    return cache.get(key) || "Unknown";
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
        if (!cache.has(key)) {           // only if nothing else cached it meanwhile
          cache.set(key, r || "");
          markDirty();
        }
      }).catch(() => {});
      return "Unknown";
    }
    result = winner;
  } else {
    result = await lookupPromise;
  }

  cache.set(key, result || "");
  markDirty();
  return result || "Unknown";
}

/**
 * Synchronous cache-only lookup. Returns null if not yet enriched.
 * @param {string} characterName
 * @returns {string | null}
 */
export function getSeriesCached(characterName) {
  const key = String(characterName || "").toLowerCase().trim();
  if (!cache.has(key)) return null;
  return cache.get(key) || "Unknown";
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
        .then(r => { cache.set(key, r || ""); markDirty(); })
        .catch(() => {});
    }
  }
}
