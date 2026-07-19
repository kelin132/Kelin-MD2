/**
 * KELIN MD — Shared Gemini API helper
 * Used by all AI plugins. Set GEMINI_API_KEY in your .env / panel env vars.
 */

const MODEL = "gemini-1.5-flash";
const BASE   = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Send a prompt to Gemini and return the text response.
 * @param {string} prompt - User's message
 * @param {string|null} systemPrompt - Optional system/persona instruction
 * @returns {Promise<string>}
 */
export async function askGemini(prompt, systemPrompt = null) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set. Add it to your .env or panel environment variables.");

  const contents = [];
  if (systemPrompt) {
    // Fake a prior exchange to set the persona
    contents.push({ role: "user",  parts: [{ text: systemPrompt }] });
    contents.push({ role: "model", parts: [{ text: "Understood. I will follow these instructions." }] });
  }
  contents.push({ role: "user", parts: [{ text: prompt }] });

  const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${key}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ contents, generationConfig: { maxOutputTokens: 1024 } }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown error");
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini.");
  return text.trim();
}
