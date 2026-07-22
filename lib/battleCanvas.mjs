/**
 * KELIN MD — Naruto battle canvas renderer
 * Draws the visual "battle screen" shown alongside each battle message:
 * both fighters' portraits, HP/Chakra bars, round counter, and a
 * damage callout on whoever was just hit. Also draws the win/lose card
 * shown when a battle ends.
 *
 * Uses the `canvas` package — same conventions as lib/profileGen.mjs.
 */
import { createCanvas, loadImage } from "canvas";

async function loadImageSafe(url) {
  try {
    if (!url) return null;
    return await loadImage(url);
  } catch {
    return null;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Draw an image "cover"-fit into a square/circle region. */
function drawCover(ctx, img, x, y, size) {
  const aspect = img.width / img.height;
  let dw, dh, dx, dy;
  if (aspect > 1) { dh = size; dw = dh * aspect; dx = x - (dw - size) / 2; dy = y; }
  else            { dw = size; dh = dw / aspect;  dx = x; dy = y - (dh - size) / 2; }
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Circular portrait with a colored ring border. Falls back to an emoji-style placeholder. */
async function drawPortrait(ctx, imageUrl, x, y, size, ringColor, dim = false) {
  const img = await loadImageSafe(imageUrl);

  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (img) {
    if (dim) { try { ctx.filter = "grayscale(1) brightness(0.55)"; } catch { /* older canvas builds ignore filter */ } }
    drawCover(ctx, img, x, y, size);
    ctx.filter = "none";
  } else {
    ctx.fillStyle = "#222";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#666";
    ctx.font = `${Math.floor(size * 0.5)}px Sans`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🥷", x + size / 2, y + size / 2);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.lineWidth = 8;
  ctx.strokeStyle = dim ? "#555" : ringColor;
  ctx.stroke();
}

/** A labeled stat bar (HP/Chakra) with a colored fill proportional to current/max. */
function drawBar(ctx, x, y, w, h, current, max, fillColor, bgColor = "rgba(255,255,255,0.12)") {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  if (pct > 0) {
    roundRect(ctx, x, y, w * pct, h, h / 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();
}

function hpColor(current, max) {
  const pct = max > 0 ? current / max : 0;
  if (pct > 0.5) return "#3ddc61";
  if (pct > 0.25) return "#f2c94c";
  return "#eb4d4d";
}

function fitText(ctx, text, maxWidth, startSize, font = "bold __px Sans") {
  let size = startSize;
  while (size > 14) {
    ctx.font = font.replace("__", size);
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.font = font.replace("__", size);
  return size;
}

/**
 * Render the live battle scene: two portraits, HP/Chakra bars, round
 * counter, and (optionally) a damage callout on whichever side just
 * got hit.
 *
 * @param {object} opts
 * @param {object} opts.left  — { username, hp, maxHp, chakra, maxChakra, imageUrl }
 * @param {object} opts.right — same shape as left
 * @param {number} [opts.round]
 * @param {"left"|"right"|null} [opts.hitSide] — who just took damage
 * @param {number} [opts.damage] — amount to show on the callout
 * @param {boolean} [opts.crit]
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateBattleScene({ left, right, round = 1, hitSide = null, damage = null, crit = false }) {
  const width = 1000, height = 560;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#1a1200");
  grad.addColorStop(0.5, "#171717");
  grad.addColorStop(1, "#120018");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Faint center emblem
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 340px Sans";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("忍", width / 2, height / 2 + 10);
  ctx.globalAlpha = 1;

  // Side flash tint on whoever just got hit
  if (hitSide === "left")  { ctx.fillStyle = "rgba(235,77,77,0.18)"; ctx.fillRect(0, 0, width / 2, height); }
  if (hitSide === "right") { ctx.fillStyle = "rgba(235,77,77,0.18)"; ctx.fillRect(width / 2, 0, width / 2, height); }

  const portraitSize = 210;
  const topY = 70;
  const barW = 340;

  // Left fighter
  await drawPortrait(ctx, left.imageUrl, 70, topY, portraitSize, "#ff9d2e");
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  fitText(ctx, left.username, barW, 30);
  ctx.fillText(left.username, 70, topY + portraitSize + 40);

  drawBar(ctx, 70, topY + portraitSize + 55, barW, 22, Math.max(0, left.hp), left.maxHp, hpColor(left.hp, left.maxHp));
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px Sans";
  ctx.fillText(`❤ ${Math.max(0, left.hp)}/${left.maxHp}`, 78, topY + portraitSize + 70);

  drawBar(ctx, 70, topY + portraitSize + 90, barW, 14, Math.max(0, left.chakra), left.maxChakra, "#3d9bdc");
  ctx.font = "bold 13px Sans";
  ctx.fillText(`⚡ ${Math.max(0, left.chakra)}/${left.maxChakra}`, 78, topY + portraitSize + 101);

  // Right fighter (mirrored)
  const rightX = width - 70 - portraitSize;
  await drawPortrait(ctx, right.imageUrl, rightX, topY, portraitSize, "#4d7dff");
  ctx.textAlign = "right";
  ctx.fillStyle = "#fff";
  fitText(ctx, right.username, barW, 30);
  ctx.fillText(right.username, width - 70, topY + portraitSize + 40);

  drawBar(ctx, width - 70 - barW, topY + portraitSize + 55, barW, 22, Math.max(0, right.hp), right.maxHp, hpColor(right.hp, right.maxHp));
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px Sans";
  ctx.fillText(`❤ ${Math.max(0, right.hp)}/${right.maxHp}`, width - 70 - barW + 8, topY + portraitSize + 70);

  drawBar(ctx, width - 70 - barW, topY + portraitSize + 90, barW, 14, Math.max(0, right.chakra), right.maxChakra, "#3d9bdc");
  ctx.font = "bold 13px Sans";
  ctx.fillText(`⚡ ${Math.max(0, right.chakra)}/${right.maxChakra}`, width - 70 - barW + 8, topY + portraitSize + 101);

  // VS badge
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffcc33";
  ctx.font = "bold 54px Sans";
  ctx.fillText("VS", width / 2, topY + portraitSize / 2 + 15);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "bold 22px Sans";
  ctx.fillText(`ROUND ${round}`, width / 2, topY + portraitSize / 2 - 40);

  // Damage callout
  if (damage != null && hitSide) {
    const cx = hitSide === "left" ? 70 + portraitSize / 2 : rightX + portraitSize / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = crit ? "#ffcc33" : "#ff5252";
    ctx.font = `bold ${crit ? 58 : 46}px Sans`;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    const label = `-${damage}`;
    ctx.strokeText(label, cx, topY - 15);
    ctx.fillText(label, cx, topY - 15);
    if (crit) {
      ctx.font = "bold 20px Sans";
      ctx.fillStyle = "#ffcc33";
      ctx.fillText("CRITICAL!", cx, topY - 45);
    }
    ctx.restore();
  }

  return canvas.toBuffer("image/png");
}

/**
 * Render the end-of-battle result card: winner front and center,
 * loser desaturated in the corner, plus a rewards line.
 *
 * @param {object} opts
 * @param {object} opts.winner — { username, imageUrl }
 * @param {object} opts.loser  — { username, imageUrl }
 * @param {string} [opts.rewardText] — e.g. "+300 Ryo | +100 XP"
 * @param {string} [opts.outcome] — "victory" | "flee"
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateResultScene({ winner, loser, rewardText = "", outcome = "victory" }) {
  const width = 1000, height = 620;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const grad = ctx.createRadialGradient(width / 2, 220, 50, width / 2, 220, 650);
  grad.addColorStop(0, "#3a2900");
  grad.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Banner
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffcc33";
  ctx.font = "bold 64px Sans";
  ctx.fillText(outcome === "flee" ? "🏳️ BATTLE FORFEITED" : "🏆 VICTORY!", width / 2, 90);

  // Winner portrait — large, centered
  const size = 300;
  const x = (width - size) / 2;
  const y = 130;
  await drawPortrait(ctx, winner.imageUrl, x, y, size, "#ffd54a");
  ctx.fillStyle = "#fff";
  ctx.font = "bold 34px Sans";
  fitText(ctx, winner.username, size + 80, 34);
  ctx.fillText(winner.username, width / 2, y + size + 50);
  ctx.fillStyle = "#ffcc33";
  ctx.font = "bold 20px Sans";
  ctx.fillText("WINNER", width / 2, y + size + 80);

  // Loser — small, desaturated, bottom corner
  const lSize = 130;
  await drawPortrait(ctx, loser.imageUrl, width - lSize - 60, height - lSize - 70, lSize, "#666", true);
  ctx.fillStyle = "#999";
  ctx.font = "bold 18px Sans";
  ctx.textAlign = "center";
  fitText(ctx, loser.username, lSize + 40, 18);
  ctx.fillText(loser.username, width - lSize - 60 + lSize / 2, height - 55);
  ctx.font = "bold 15px Sans";
  ctx.fillStyle = "#eb4d4d";
  ctx.fillText("DEFEATED", width - lSize - 60 + lSize / 2, height - 35);

  // Rewards
  if (rewardText) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 26px Sans";
    ctx.fillText(rewardText, width / 2 - 100, height - 60);
  }

  return canvas.toBuffer("image/png");
}
