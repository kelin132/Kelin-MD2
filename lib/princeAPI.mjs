/**
 * Small client for the PrinceTech AI endpoints used by Flux and Akira.
 *
 * Keep the API key in the hosting environment as PRINCE_API_KEY. It is
 * intentionally never included in source control or error messages.
 */

const BASE_URL = "https://api.princetechn.com/api/ai";
const DEFAULT_TIMEOUT_MS = 15_000;

function getApiKey() {
  const key = process.env.PRINCE_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "PRINCE_API_KEY is not set. Add it to the bot's environment variables.",
    );
  }
  return key;
}

function withTimeout(timeoutMs) {
  return AbortSignal.timeout(timeoutMs);
}

export async function princeApiJson(endpoint, params = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const query = new URLSearchParams({
    apikey: getApiKey(),
    ...Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)]),
    ),
  });

  const response = await fetch(`${BASE_URL}/${endpoint}?${query}`, {
    signal: withTimeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`PrinceTech ${endpoint} request failed (${response.status})`);
  }

  const data = await response.json().catch(() => null);
  if (!data || data.success === false) {
    throw new Error(`PrinceTech ${endpoint} returned an invalid response`);
  }

  return data;
}

export async function princeApiText(endpoint, params = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const data = await princeApiJson(endpoint, params, timeoutMs);
  const result = data?.result;
  if (typeof result !== "string" || !result.trim()) {
    throw new Error(`PrinceTech ${endpoint} returned no text`);
  }
  return result.trim();
}