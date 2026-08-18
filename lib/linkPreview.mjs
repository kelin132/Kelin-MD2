import { getLinkPreview } from "link-preview-js";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const USER_AGENT = "WhatsApp/2.22.24.81 A";
const DEFAULT_TIMEOUT_MS = 7000;
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

function isBlockedAddress(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || a === 0;
  }

  const normalized = String(address).toLowerCase();
  return normalized === "::1"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe80:");
}

async function resolvePublicAddress(targetUrl) {
  const hostname = new URL(targetUrl).hostname;
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("loopback preview host is not allowed");
  }
  const { address } = await lookup(hostname);
  if (isBlockedAddress(address)) throw new Error("private preview host is not allowed");
  return address;
}

function withTimeout(promise, timeoutMs, label = "operation") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function fetchImageBuffer(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return null;

  try {
    const response = await withTimeout(
      fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        redirect: "follow",
      }),
      timeoutMs,
      "thumbnail fetch"
    );
    if (!response.ok) return null;

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_THUMBNAIL_BYTES) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.length > 0 && buffer.length <= MAX_THUMBNAIL_BYTES ? buffer : null;
  } catch {
    return null;
  }
}

function firstImage(previewData) {
  const images = Array.isArray(previewData?.images) ? previewData.images : [];
  return images.find((value) => typeof value === "string" && /^https?:\/\//i.test(value)) || null;
}

export async function getPreviewMetadata(targetUrl, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (typeof targetUrl !== "string" || !/^https?:\/\//i.test(targetUrl)) {
    throw new Error("A valid http(s) URL is required");
  }

  const previewData = await withTimeout(
    getLinkPreview(targetUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: timeoutMs,
      resolveDNSHost: resolvePublicAddress,
    }),
    timeoutMs,
    "link preview"
  );

  return {
    title: previewData?.title || "Link Preview",
    description: previewData?.description || "",
    imageUrl: firstImage(previewData),
    canonicalUrl: previewData?.url || targetUrl,
  };
}

export async function getExternalAdReply(targetUrl, {
  title = "Link Preview",
  body = "",
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const metadata = await getPreviewMetadata(targetUrl, timeoutMs);
  const thumbnail = await fetchImageBuffer(metadata.imageUrl, timeoutMs);
  return {
    title: metadata.title || title,
    body: metadata.description || body,
    sourceUrl: targetUrl,
    canonicalUrl: metadata.canonicalUrl || targetUrl,
    mediaType: 1,
    renderLargerThumbnail: true,
    showAdAttribution: false,
    ...(thumbnail ? { thumbnail } : {}),
    ...(metadata.imageUrl ? { thumbnailUrl: metadata.imageUrl } : {}),
  };
}

export async function sendLinkPreview(sock, chatId, targetUrl, {
  text,
  quoted,
  title = "Link Preview",
  body = "",
  fallbackText = targetUrl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  try {
    const preview = await getExternalAdReply(targetUrl, { title, body, timeoutMs });
    const messageText = text || `${preview.title || title}\n${targetUrl}`;
    const options = quoted ? { quoted } : undefined;

    return await sock.sendMessage(chatId, {
      text: messageText,
      contextInfo: { externalAdReply: preview },
    }, options);
  } catch (error) {
    console.warn("LINK_PREVIEW_FALLBACK:", error?.message || error);
    return sock.sendMessage(chatId, { text: fallbackText }, quoted ? { quoted } : undefined);
  }
}

export { fetchImageBuffer };
export default sendLinkPreview;

export const LINK_PREVIEW_USER_AGENT = USER_AGENT;
export const LINK_PREVIEW_TIMEOUT_MS = DEFAULT_TIMEOUT_MS;

