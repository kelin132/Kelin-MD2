import { downloadContentFromMessage } from "@whiskeysockets/baileys";

let formatterPromise;

function unwrapMessage(message) {
  let current = message || {};
  for (let i = 0; i < 6; i += 1) {
    const wrapped =
      current.ephemeralMessage?.message ||
      current.viewOnceMessage?.message ||
      current.viewOnceMessageV2?.message ||
      current.viewOnceMessageV2Extension?.message ||
      current.documentWithCaptionMessage?.message ||
      current.editedMessage?.message;
    if (!wrapped) break;
    current = wrapped;
  }
  return current;
}

function getContext(message) {
  return (
    message?.extendedTextMessage?.contextInfo ||
    message?.imageMessage?.contextInfo ||
    message?.videoMessage?.contextInfo ||
    message?.stickerMessage?.contextInfo ||
    message?.documentMessage?.contextInfo ||
    message?.buttonsResponseMessage?.contextInfo ||
    message?.templateButtonReplyMessage?.contextInfo ||
    message?.listResponseMessage?.contextInfo ||
    null
  );
}

export function getQuotedMessage(msg) {
  const message = unwrapMessage(msg?.message);
  return unwrapMessage(getContext(message)?.quotedMessage);
}

export async function downloadQuotedStickerOrImage(msg) {
  const quoted = getQuotedMessage(msg);
  if (!quoted) {
    const error = new Error("NOQUOTE");
    error.code = "NOQUOTE";
    throw error;
  }

  const media = quoted.stickerMessage
    ? { message: quoted.stickerMessage, type: "sticker" }
    : quoted.imageMessage
      ? { message: quoted.imageMessage, type: "image" }
      : null;

  if (!media) {
    const error = new Error("NOT_STICKER_OR_IMAGE");
    error.code = "NOT_STICKER_OR_IMAGE";
    throw error;
  }

  const stream = await downloadContentFromMessage(media.message, media.type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return { buffer: Buffer.concat(chunks), type: media.type };
}

async function getStickerFormatter() {
  if (!formatterPromise) {
    formatterPromise = import("wa-sticker-formatter").then((module) => {
      const source = module.default && typeof module.default === "object"
        ? module.default
        : module;
      const Sticker = module.Sticker || source.Sticker;
      const StickerTypes = module.StickerTypes || source.StickerTypes || {};
      if (typeof Sticker !== "function") {
        throw new Error("wa-sticker-formatter did not expose Sticker");
      }
      return { Sticker, StickerTypes };
    });
  }
  return formatterPromise;
}

export async function createSticker(buffer, { pack, author = "AIDORU" } = {}) {
  const { Sticker, StickerTypes } = await getStickerFormatter();
  return new Sticker(buffer, {
    pack: pack || "AIDORU",
    author,
    type: StickerTypes.FULL || "full",
    quality: 80,
  }).toBuffer();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderMemeSticker(buffer, text) {
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const image = await loadImage(buffer);
  const width = 512;
  const height = 512;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, width, height);
  const scale = Math.min((width - 20) / image.width, (height - 20) / image.height);
  const drawWidth = Math.max(1, Math.round(image.width * scale));
  const drawHeight = Math.max(1, Math.round(image.height * scale));
  ctx.drawImage(
    image,
    Math.round((width - drawWidth) / 2),
    Math.round((height - drawHeight) / 2),
    drawWidth,
    drawHeight,
  );

  const safeText = String(text || "").replace(/\s+/g, " ").trim().slice(0, 160);
  let fontSize = 52;
  let lines = [];
  while (fontSize >= 24) {
    ctx.font = `bold ${fontSize}px Arial`;
    lines = wrapText(ctx, safeText, width - 44);
    if (lines.length <= 4) break;
    fontSize -= 4;
  }

  const lineHeight = Math.round(fontSize * 1.08);
  const padding = 13;
  const textBlockHeight = lines.length * lineHeight + padding * 2;
  const top = Math.max(0, height - textBlockHeight - 12);
  const longestLine = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);

  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.fillRect(
    Math.max(0, (width - longestLine) / 2 - padding),
    top,
    Math.min(width, longestLine + padding * 2),
    textBlockHeight,
  );

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(4, Math.round(fontSize / 10));
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#ffffff";

  lines.forEach((line, index) => {
    const y = top + padding + index * lineHeight;
    ctx.strokeText(line, width / 2, y);
    ctx.fillText(line, width / 2, y);
  });

  return canvas.toBuffer("image/png");
}

export function formatPackName(name, fallback = "AIDORU") {
  const clean = String(name || "")
    .replace(/[|<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 42);
  return clean ? `${clean} | AIDORU` : fallback;
}