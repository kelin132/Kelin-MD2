/**
 * Small client for the PrinceTech AI endpoints used by Flux and Akira.
 *
 * Keep the API key in the hosting environment as PRINCE_API_KEY. The
 * documented PrinceTech key is used only as a compatibility default so the
 * media commands work on existing deployments that have not added the
 * variable yet.
 */

const BASE_URL = "https://api.princetechn.com/api";
const DEFAULT_TIMEOUT_MS = 15_000;

function getApiKey() {
  return process.env.PRINCE_API_KEY?.trim() || "prince";
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

  const response = await fetch(`${BASE_URL}/${endpoint.replace(/^\/+/, "")}?${query}`, {
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