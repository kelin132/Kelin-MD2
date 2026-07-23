/**
 * KELIN MD — David Cyril API helper
 * https://apis.davidcyril.name.ng
 */

const BASE = "https://apis.davidcyril.name.ng";

/**
 * Ask Gemini via the David Cyril proxy.
 * @param {string} text   – user prompt
 * @param {string} uid    – unique session ID (e.g. sender JID)
 * @returns {Promise<string>}
 */
export async function askGeminiDC(text, uid = "default") {
  const url = `${BASE}/ai/gemini?text=${encodeURIComponent(text)}&uid=${encodeURIComponent(uid)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || data.error || "Gemini request failed");
  return data.message;
}

/**
 * Ask ChatGPT (GPT-4o) via the David Cyril proxy.
 * @param {string} prompt – user prompt
 * @param {string} uid    – unique session ID
 * @returns {Promise<string>}
 */
export async function askChatGPT(prompt, uid = "default") {
  const url = `${BASE}/ai/chatgpt?prompt=${encodeURIComponent(prompt)}&uid=${encodeURIComponent(uid)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || data.error || "ChatGPT request failed");
  return data.data?.choices?.[0]?.message?.content ?? "";
}

// ── Anime helpers ─────────────────────────────────────────────────────────────

/**
 * Search AnimeIndo (Indonesian subtitles) for an anime by title.
 * GET /animeindo/search?q=<query>
 * Returns: { status: true, result: [{ title, description, status, thumbnail, url }] }
 */
export async function searchAnimeIndo(query) {
  const url = `${BASE}/animeindo/search?q=${encodeURIComponent(query)}`;
  const res  = await fetch(url);
  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Anime search failed");
  return data.result || [];
}

/**
 * Get currently airing anime list.
 * GET /anime/airing
 * Returns: { success: true, results: [{ id, title, title_english, latest_episode, score, image }] }
 */
export async function getAiringAnime() {
  const res  = await fetch(`${BASE}/anime/airing`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Airing fetch failed");
  return data.results || [];
}

/**
 * Get trending anime list.
 * GET /anime/trending
 * Returns: { success: true, results: [{ rank, id, title, title_english, episodes, status, score, genres, image }] }
 */
export async function getTrendingAnime() {
  const res  = await fetch(`${BASE}/anime/trending`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Trending fetch failed");
  return data.results || [];
}

/**
 * Ask Dolphin AI via the David Cyril proxy (no API key needed).
 * Endpoint: GET /ai/dolphin?prompt=<text>&uid=<uid>
 * @param {string} prompt – full prompt (include persona injection)
 * @param {string} uid    – unique session ID
 * @returns {Promise<string>}
 */
export async function askDolphin(prompt, uid = "default") {
  const url = `${BASE}/ai/dolphin?prompt=${encodeURIComponent(prompt)}&uid=${encodeURIComponent(uid)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || data.error || "Dolphin request failed");
  if (!data.data) throw new Error("Dolphin returned an empty response. Try again.");
  return data.data;
}

/**
 * Ask DeepSeek R1 via the David Cyril proxy.
 * @param {string} text – user prompt
 * @param {string} uid  – unique session ID
 * @returns {Promise<string>}
 */
export async function askDeepSeek(text, uid = "default") {
  const url = `${BASE}/ai/deepseek-r1?text=${encodeURIComponent(text)}&uid=${encodeURIComponent(uid)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || data.error || "DeepSeek request failed");
  if (!data.response) throw new Error("DeepSeek returned an empty response. Try rephrasing your question.");
  return data.response;
}
/** Gifted Search API */
export const SEARCH_BASE = 'https://apis.davidcyril.name.ng/canvas/';

export async function searchGet(endpoint, params = {}, timeout = 20000) {
    const u = new URL(`${SEARCH_BASE}/${endpoint}`);
    u.searchParams.set('apikey', KEY);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) u.searchParams.set(String(k), String(v));
    }
    return fetchJson(u.toString(), timeout);
}
