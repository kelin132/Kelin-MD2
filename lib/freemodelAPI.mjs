/**
 * KELIN MD — FreeModel API helper
 * https://api.freemodel.dev  (OpenAI-compatible)
 *
 * Requires FREEMODEL_API_KEY in your .env / environment variables.
 */

const BASE = "https://api.freemodel.dev/v1";

// Read key at call time so it works even if env is set after module load
function getKey() {
  return process.env.FREEMODEL_API_KEY || "";
}

/**
 * Chat with a model via the FreeModel API.
 * @param {Array<{role:string,content:string}>} messages
 * @param {string} [model="gpt-4o-mini"]
 * @returns {Promise<string>}
 */
export async function freeModelChat(messages, model = "gpt-4o-mini") {
  const key = getKey();
  if (!key) throw new Error("FREEMODEL_API_KEY is not set");

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
