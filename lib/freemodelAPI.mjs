/**
 * KELIN MD — FreeModel API helper
 * https://api.freemodel.dev  (OpenAI-compatible)
 *
 * Requires FREEMODEL_API_KEY in your .env / environment variables.
 */

const BASE = "https://api.freemodel.dev/v1";

const DEFAULT_KEY = "fe_oa_1082a9981924c2d7ad381924d5b39c281d8f20eab259e5eb";

// Env var overrides the default if set
function getKey() {
  return process.env.FREEMODEL_API_KEY || DEFAULT_KEY;
}

/**
 * Chat with a model via the FreeModel API.
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
