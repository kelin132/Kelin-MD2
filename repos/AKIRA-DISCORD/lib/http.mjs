const DEFAULT_TIMEOUT_MS = 15_000;

async function request(url, {
  headers = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  ...options
} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}`);
    }

    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function requestJson(url, options = {}) {
  return request(url, options).then((response) => response.json());
}

export async function requestBuffer(url, options = {}) {
  return request(url, options).then(async (response) => {
    return Buffer.from(await response.arrayBuffer());
  });
}