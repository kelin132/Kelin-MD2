/**
 * KELIN MD — Shared Gemini API helper (official Google API, not a proxy)
 * Used by .gemini, .akira, and any other AI plugin.
 *
 * Setup: get a free key at https://aistudio.google.com/app/apikey
 * (no credit card required, permanent free tier) and set
 * GEMINI_API_KEY in your .env / panel environment variables.
 */

// gemini-1.5-flash and gemini-2.0-flash have both been fully shut down
// by Google — this is the current stable, free-tier-eligible model as
// of mid-2026. If Google retires this one too, swap it here.
const MODEL = "gemini-2.5-flash";
const BASE  = "https://generativelanguage.googleapis.com/v1beta/models";

// Per-uid conversation history, so multi-turn chats (like Akira) keep
// context. This lives in memory only — it resets if the bot restarts,
// and callers can wipe a session early via resetGeminiSession(uid).
const _history = new Map(); // uid -> [{ role, parts }, ...]
const MAX_TURNS = 20; // keep the last N exchanges per session to bound memory/tokens

/**
 * Send a prompt to Gemini and return the text response.
 *
 * @param {string} prompt        - User's message
 * @param {object} [opts]
 * @param {string} [opts.systemPrompt] - Optional persona/system instruction
 * @param {string} [opts.uid]          - Session id; when given, conversation history persists across calls
 * @returns {Promise<string>}
 */
export async function askGemini(prompt, opts = {}) {
  const { systemPrompt = null, uid = null } = opts;

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/app/apikey and add it to your .env.");

  const contents = uid ? [..._history.get(uid) || []] : [];
  contents.push({ role: "user", parts: [{ text: prompt }] });

  const body = { contents, generationConfig: { maxOutputTokens: 1024 } };
  if (systemPrompt) body.system_instruction = { parts: [{ text: systemPrompt }] };

  const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${key}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown error");
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini — it may have blocked the prompt.");

  if (uid) {
    contents.push({ role: "model", parts: [{ text }] });
    // Keep only the most recent turns so history doesn't grow forever
    _history.set(uid, contents.slice(-MAX_TURNS * 2));
  }

  return text.trim();
}

/** Clear a session's conversation history (e.g. for a ".akira reset" command). */
export function resetGeminiSession(uid) {
  _history.delete(uid);
}
