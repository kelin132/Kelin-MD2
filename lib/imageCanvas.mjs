import { createCanvas, loadImage } from "canvas";

function drawCover(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  ctx.restore();
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function centerText(ctx, text, x, y, font, color) {
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.textAlign = "left";
}

function addCanvasBorder(ctx, width, height, color = "#f5c542") {
  ctx.strokeStyle = color;
  ctx.lineWidth = 12;
  ctx.strokeRect(18, 18, width - 36, height - 36);
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, width - 72, height - 72);
}

export async function renderWanted(buffer) {
  const width = 1000;
  const height = 1200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const image = await loadImage(buffer);

  ctx.fillStyle = "#ead4a0";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#7b1e16";
  ctx.fillRect(0, 0, width, 220);
  centerText(ctx, "WANTED", width / 2, 145, "bold 116px Georgia", "#f8e7b8");

  ctx.fillStyle = "#f8e7b8";
  ctx.fillRect(110, 265, 780, 610);
  drawCover(ctx, image, 140, 295, 720, 550);
  ctx.strokeStyle = "#7b1e16";
  ctx.lineWidth = 10;
  ctx.strokeRect(120, 275, 760, 590);

  centerText(ctx, "DEAD OR ALIVE", width / 2, 970, "bold 68px Georgia", "#7b1e16");
  centerText(ctx, "REWARD: 30,000 RYO", width / 2, 1055, "bold 42px Arial", "#7b1e16");
  centerText(ctx, "KELIN BOUNTY OFFICE", width / 2, 1125, "bold 26px Arial", "#7b1e16");
  addCanvasBorder(ctx, width, height, "#7b1e16");
  return canvas.toBuffer("image/png");
}

export async function renderTrigger(buffer) {
  const width = 1000;
  const height = 760;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const image = await loadImage(buffer);

  ctx.fillStyle = "#160b12";
  ctx.fillRect(0, 0, width, height);
  drawCover(ctx, image, 55, 55, 890, 650);

  ctx.fillStyle = "rgba(185, 0, 22, 0.43)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#ff334d";
  ctx.lineWidth = 8;
  for (let x = -height; x < width + height; x += 52) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height, height);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 520, width, 240);
  centerText(ctx, "TRIGGERED", width / 2, 650, "bold 94px Arial Black", "#ffffff");
  centerText(ctx, "KELIN EDITION", width / 2, 710, "bold 26px Arial", "#ffb3bd");
  addCanvasBorder(ctx, width, height, "#ff334d");
  return canvas.toBuffer("image/png");
}

export async function renderPrison(buffer) {
  const width = 900;
  const height = 900;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const image = await loadImage(buffer);

  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, width, height);
  drawCover(ctx, image, 70, 70, 760, 760);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#b7c0cc";
  ctx.lineWidth = 18;
  for (let x = 30; x <= width - 30; x += 86) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 4;
  for (let x = 38; x <= width - 30; x += 86) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(8, 12, 20, 0.72)";
  ctx.fillRect(0, 720, width, 180);
  centerText(ctx, "LOCKED UP", width / 2, 800, "bold 70px Arial Black", "#f8fafc");
  centerText(ctx, "KELIN PRISON", width / 2, 850, "bold 24px Arial", "#cbd5e1");
  addCanvasBorder(ctx, width, height, "#94a3b8");
  return canvas.toBuffer("image/png");
}

export async function renderMnm(buffer) {
  const width = 1000;
  const height = 760;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const image = await loadImage(buffer);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#ffe259");
  gradient.addColorStop(1, "#ffa751");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#d62d35";
  ctx.beginPath();
  ctx.arc(width / 2, 340, 270, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(width / 2, 340, 220, 0, Math.PI * 2);
  ctx.clip();
  drawCover(ctx, image, width / 2 - 220, 120, 440, 440);
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 82px Arial Black";
  ctx.textAlign = "center";
  ctx.fillText("m", width / 2 - 45, 680);
  ctx.fillText("&", width / 2, 680);
  ctx.fillText("m", width / 2 + 55, 680);
  ctx.textAlign = "left";
  centerText(ctx, "CANDY MODE", width / 2, 735, "bold 24px Arial", "#7f1d1d");
  addCanvasBorder(ctx, width, height, "#7f1d1d");
  return canvas.toBuffer("image/png");
}