/**
 * KELIN MD — FreeModel API helper
 * https://api.freemodel.dev  (OpenAI-compatible)
 *
 * Requires FREEMODEL_API_KEY in your .env / environment variables.
 * If not set, falls back to the built-in default key.
 */

const BASE = "https://api.freemodel.dev/v1";

const DEFAULT_KEY = "fe_oa_1082a9981924c2d7ad381924d5b39c281d8f20eab259e5eb";

// Env var overrides the default if set
function getKey() {
  return process.env.FREEMODEL_API_KEY || DEFAULT_KEY;
}

// ── Per-uid conversation history for multi-turn Claude sessions ───────────────
// Each uid maps to an array of { role, content } pairs (no system message here).
// The system prompt is injected fresh on every call so persona never drifts.
const _claudeHistory = new Map();
const MAX_CLAUDE_TURNS = 20; // keep last N exchanges to bound memory/tokens

/**
 * Chat with a model via the FreeModel API (low-level).
 * @param {Array<{role:string,content:string}>} messages
 * @param {string} [model="gpt-4o-mini"]
 * @returns {Promise<string>}
 */
export async function freeModelChat(messages, model = "gpt-4o-mini") {
  const key = getKey();

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`FreeModel API error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("FreeModel returned an empty response");
  return content;
}

/**
 * Ask Claude via the FreeModel API.
 * Maintains per-uid conversation history so multi-turn chats keep context.
 *
 * @param {string} systemPrompt  – Persona/system instructions (injected every call)
 * @param {string} userText      – User's current message
 * @param {string} [uid]         – Session id (e.g. WhatsApp JID); history resets when cleared
 * @param {string} [model]       – Claude model name
 * @returns {Promise<string>}
 */
export async function askClaude(
  systemPrompt,
  userText,
  uid = "default",
  model = "claude-3-5-haiku-20241022"
) {
  // Retrieve existing history (without system turn)
  const history = _claudeHistory.get(uid) || [];
  const updatedHistory = [...history, { role: "user", content: userText }];

  // Build the full messages array: system first, then conversation history
  const messages = [
    { role: "system", content: systemPrompt },
    ...updatedHistory,
  ];

  const reply = await freeModelChat(messages, model);

  // Save the exchange back to history
  updatedHistory.push({ role: "assistant", content: reply });
  // Trim to MAX_CLAUDE_TURNS (each turn = 1 user + 1 assistant = 2 entries)
  _claudeHistory.set(uid, updatedHistory.slice(-(MAX_CLAUDE_TURNS * 2)));

  return reply;
}

/** Clear a Claude session's conversation history (e.g. for ".akira reset"). */
export function resetClaudeSession(uid) {
  _claudeHistory.delete(uid);
}
