/**
 * KELIN MD — Dark Pokémon challenge invite canvas.
 *
 * The invite renderer intentionally keeps the battle prompt as the WhatsApp
 * caption, so the artwork appears above the text in the chat. Profile photos
 * are best-effort; every failed/hidden photo falls back to a trainer sprite.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomFrontTrainer } from "./trainerSprites.mjs";

let canvasModulePromise;

async function getCanvasModule() {
  canvasModulePromise ??= import("canvas");
  return canvasModulePromise;
}

async function loadImageSafe(source) {
  if (!source) return null;

  try {
    const { loadImage } = await getCanvasModule();
    if (/^https?:\/\//i.test(source)) {
      const response = await fetch(source, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 (KelinMD-Bot)" },
      });
      if (!response.ok) return null;
      return await loadImage(Buffer.from(await response.arrayBuffer()));
    }

    const filePath = source.startsWith("file://")
      ? fileURLToPath(source)
      : source;
    return await loadImage(await readFile(filePath));
  } catch {
    return null;
  }
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
  let value = String(text || "Trainer");
  if (ctx.measureText(value).width <= maxWidth) return value;

  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

function drawGlow(ctx, x, y, radius, color) {
  const gradient = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
  gradient.addColorStop(0, `${color}55`);
  gradient.addColorStop(0.55, `${color}18`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawFallbackTrainer(ctx, image, cx, cy, radius) {
  if (!image) {
    ctx.fillStyle = "#1d2840";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#93a4c8";
    ctx.font = "700 34px Sans";
    ctx.textAlign = "center";
    ctx.fillText("TRAINER", cx, cy + 12);
    return;
  }

  const scale = Math.min((radius * 1.65) / image.width, (radius * 1.65) / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, cx - width / 2, cy - height / 2 + radius * 0.1, width, height);
}

async function drawPortrait(ctx, { cx, cy, radius, color, avatarUrl, trainerPath }) {
  drawGlow(ctx, cx, cy, radius * 1.7, color);

  const avatar = await loadImageSafe(avatarUrl);
  const trainer = avatar ? null : await loadImageSafe(trainerPath);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  const background = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  background.addColorStop(0, "#24304d");
  background.addColorStop(1, "#0e1427");
  ctx.fillStyle = background;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  if (avatar) {
    const scale = Math.max((radius * 2) / avatar.width, (radius * 2) / avatar.height);
    const width = avatar.width * scale;
    const height = avatar.height * scale;
    ctx.drawImage(avatar, cx - width / 2, cy - height / 2, width, height);
  } else {
    drawFallbackTrainer(ctx, trainer, cx, cy, radius);
  }
  ctx.restore();

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 28;
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 12, Math.PI * 1.08, Math.PI * 1.72);
  ctx.stroke();
}

/**
 * Render the image sent for a pending `.ch` invite.
 *
 * @param {object} options
 * @param {{name: string, avatarUrl?: string}} options.challenger
 * @param {{name: string, avatarUrl?: string}} options.opponent
 * @returns {Promise<Buffer>}
 */
export async function generateChallengeCanvas({ challenger, opponent }) {
  const { createCanvas } = await getCanvasModule();
  const W = 1200;
  const H = 760;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const background = ctx.createLinearGradient(0, 0, W, H);
  background.addColorStop(0, "#080b16");
  background.addColorStop(0.5, "#11172b");
  background.addColorStop(1, "#090c18");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);

  const haze = ctx.createRadialGradient(W * 0.5, H * 0.56, 0, W * 0.5, H * 0.56, W * 0.6);
  haze.addColorStop(0, "rgba(72, 91, 178, 0.18)");
  haze.addColorStop(1, "rgba(72, 91, 178, 0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(152, 171, 225, 0.09)";
  ctx.lineWidth = 2;
  for (let x = -H; x < W; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(x + H, 0);
    ctx.stroke();
  }

  roundedRect(ctx, 36, 34, W - 72, H - 68, 34);
  ctx.strokeStyle = "rgba(126, 151, 232, 0.28)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#f4f7ff";
  ctx.font = "700 26px Sans";
  ctx.letterSpacing = "4px";
  ctx.fillText("POKÉMON TRAINER DUEL", W / 2, 94);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#8494bd";
  ctx.font = "500 16px Sans";
  ctx.fillText("A challenger has entered the arena", W / 2, 126);

  const leftX = 300;
  const rightX = 900;
  const portraitY = 390;
  const portraitRadius = 166;
  const leftTrainer = randomFrontTrainer();
  const rightTrainer = randomFrontTrainer();

  await Promise.all([
    drawPortrait(ctx, {
      cx: leftX,
      cy: portraitY,
      radius: portraitRadius,
      color: "#4fd7ff",
      avatarUrl: challenger?.avatarUrl,
      trainerPath: leftTrainer.imagePath,
    }),
    drawPortrait(ctx, {
      cx: rightX,
      cy: portraitY,
      radius: portraitRadius,
      color: "#ff5e92",
      avatarUrl: opponent?.avatarUrl,
      trainerPath: rightTrainer.imagePath,
    }),
  ]);

  ctx.fillStyle = "#4fd7ff";
  ctx.font = "700 28px Sans";
  ctx.fillText(fitText(ctx, challenger?.name || "Challenger", 330), leftX, 610);
  ctx.fillStyle = "#ff5e92";
  ctx.fillText(fitText(ctx, opponent?.name || "Opponent", 330), rightX, 610);

  drawGlow(ctx, W / 2, portraitY, 92, "#b4c7ff");
  ctx.fillStyle = "#0b1020";
  ctx.beginPath();
  ctx.arc(W / 2, portraitY, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c5d2ff";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#f7f9ff";
  ctx.font = "900 38px Sans";
  ctx.fillText("VS", W / 2, portraitY + 14);

  ctx.fillStyle = "#7e8fb9";
  ctx.font = "500 17px Sans";
  ctx.fillText("Reply with .ch accept to enter the battle", W / 2, 688);

  return canvas.toBuffer("image/png");
}