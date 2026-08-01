/**
 * KELIN MD — David Cyril API helper
 * https://apis.davidcyril.name.ng
 */

const BASE = "https://apis.davidcyril.name.ng";

// ─── Kimi K2.6 response cleaner ───────────────────────────────────────────────
// Kimi K2.6 is a "thinking" model: it streams its internal chain-of-thought
// before writing the actual reply. The raw `data` field from the API contains
// the thinking chain fused with the final answer.
//
// Pattern observed:
//   "...No constraints violated.Hello! How can I help you today?"
//   "...I can keep it minimal.2 plus 2 is 4."
//
// Strategy:
//   1. Split on double-newlines; take the last paragraph.
//   2. Strip well-known thinking-conclusion prefixes.
//   3. If the paragraph still contains meta-language (I need to, I will, Plan:…),
//      grab only the content after the final ".<Letter/digit>" junction.

function cleanKimiResponse(raw) {
  if (!raw || typeof raw !== "string") return raw;

  // 1. Take the last double-newline-separated paragraph
  const segments = raw.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  let text = segments.length > 1 ? segments[segments.length - 1] : raw;

  // 2. Strip common thinking-conclusion prefixes
  const prefixPatterns = [
    /^No constraints violated\.\s*/i,
    /^No constraint violated\.\s*/i,
    /^Answer:\s*.+?\.\s*/i,        // "Answer: 4. I can..."
    /^Final answer:\s*/i,
    /^Final response:\s*/i,
    /^My response:\s*/i,
    /^Response:\s*/i,
    /^Here('s| is) my (answer|response|reply):\s*/i,
    /^Therefore[,:]?\s*/i,
    /^So[,:]?\s+(?=\S)/i,
  ];
  for (const pat of prefixPatterns) {
    text = text.replace(pat, "");
  }

  // 3. If the paragraph still reads like planning/meta-text,
  //    extract only what appears after the last ".<Capital|digit>" junction.
  const metaSignals = [
    "I need to", "I will", "I should", "I must",
    "I can ", "I'm going to", "Let me", "My plan",
    "Plan:", "Step ", "Note:", "Constraint",
  ];
  const looksLikeMeta = metaSignals.some(s => text.includes(s));
  if (looksLikeMeta) {
    // Find the last period immediately followed by a non-space character
    const match = text.match(/\.([A-Z0-9"''"«\[({][^]*?)$/);
    if (match && match[1].trim()) {
      text = match[1].trim();
    }
  }

  return text.trim();
}

// ─── AI endpoints ─────────────────────────────────────────────────────────────

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
 * Ask Kimi K2.6 via the David Cyril proxy (no API key needed).
 * Endpoint: GET /ai/kimi-k2.6?prompt=<text>&uid=<uid>
 *
 * Kimi K2.6 is a "thinking" model that prepends its chain-of-thought to the
 * response. cleanKimiResponse() strips that before the text is returned.
 *
 * @param {string} prompt – full prompt (include persona injection)
 * @param {string} uid    – unique session ID
 * @returns {Promise<string>}
 */
export async function askKimiK26(prompt, uid = "default") {
  const url = `${BASE}/ai/kimi-k2.6?prompt=${encodeURIComponent(prompt)}&uid=${encodeURIComponent(uid)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || data.error || "Kimi K2.6 request failed");
  if (!data.data)    throw new Error("Kimi K2.6 returned an empty response. Try again.");
  return cleanKimiResponse(data.data);
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

// ── Canvas / Welcome Card ─────────────────────────────────────────────────────

/**
 * Generate a welcome card image using the David Cyril Canvas API.
 *
 * @param {object} opts
 * @param {string}  opts.avatar      – URL of the new member's profile picture
 * @param {string}  opts.text1       – Main text (member name / number)
 * @param {string}  opts.text2       – Secondary text (welcome message)
 * @param {string}  opts.text3       – Tertiary text (e.g. "Member 129")
 * @param {string}  [opts.background] – URL of background image (optional)
 * @returns {Promise<Buffer>}          PNG image buffer
 */
export async function generateWelcomeCard({ avatar, text1, text2, text3, background }) {
  const url = new URL(`${BASE}/canvas/welcomecard`);
  if (background) url.searchParams.set("background", background);
  url.searchParams.set("text1", text1);
  url.searchParams.set("text2", text2);
  url.searchParams.set("text3", text3);
  url.searchParams.set("avatar", avatar);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Welcome card API error: HTTP ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}
