/**
 * KELIN MD — DBZ Battle Canvas (lib/dbz/canvas.mjs)
 * Full arena renderer for the Dragon Ball Z fight system.
 *
 * Exports:
 *   generateBattleScene({ player, enemy, round, hitSide, damage, crit, statusText, isKiBlast })
 *   generateTransformScene({ fighter, fromFormName, toFormName })
 *   generateBattleResult({ winner, loser, rewardText, outcome })
 *   generateVillainArrivalScene({ villain, level, kiFlavorText, fleeTimerMin, isBoss })
 *   generateCharacterSelectCanvas(characters, page, perPage)
 *
 * Character sprites are loaded from their original transparent source first.
 * A PNG proxy is used as the first fallback so alpha survives when the
 * runtime cannot decode WebP. JPEG remains the final compatibility fallback.
 */

let _canvasMod;
async function getCanvasModule() {
  _canvasMod ??= import("canvas");
  return _canvasMod;
}

// ── Image loading ──────────────────────────────────────────────────────────────

function toPngProxy(url, w = 420) {
  if (!url) return null;
  const bare = url.replace(/^https?:\/\//, "");
  return `https://wsrv.nl/?url=${encodeURIComponent(bare)}&output=png&w=${w}`;
}

function toJpegProxy(url, w = 420) {
  if (!url) return null;
  const bare = url.replace(/^https?:\/\//, "");
  return `https://wsrv.nl/?url=${encodeURIComponent(bare)}&output=jpg&w=${w}&q=85`;
}

async function loadImageSafe(url, label = "img") {
  if (!url) return null;
  const { loadImage } = await getCanvasModule();
  // Preserve the original alpha channel whenever possible. The old JPEG-first
  // path flattened transparent character art against a white matte, leaving a
  // visible square around fighters in the arena.
  const attempts = [url, toPngProxy(url, 420), toJpegProxy(url, 420)];
  for (const attempt of attempts) {
    if (!attempt) continue;
    try {
      const res = await fetch(attempt, {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "Mozilla/5.0 (KelinMD-Bot)" },
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      return await loadImage(buf);
    } catch {}
  }
  return null;
}

/**
 * Find the visible part of a sprite instead of treating its source canvas as
 * the character's bounds. DBZ API art is commonly a transparent WebP with
 * wildly different padding and aspect ratios between characters.
 */
async function getVisibleBounds(img) {
  if (!img) return null;
  const { createCanvas } = await getCanvasModule();
  const width = Math.max(1, img.width || img.naturalWidth || 1);
  const height = Math.max(1, img.height || img.naturalHeight || 1);
  const probe = createCanvas(width, height);
  const probeCtx = probe.getContext("2d");

  try {
    probeCtx.drawImage(img, 0, 0, width, height);
    const { data } = probeCtx.getImageData(0, 0, width, height);
    let minX = width, minY = height, maxX = -1, maxY = -1;

    // A low threshold keeps soft anti-aliased edges while ignoring fully
    // transparent padding around the character.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 16) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return { x: 0, y: 0, width, height };

    // Keep a small amount of source padding so hair and aura edges do not
    // feel clipped after the crop is scaled into the arena.
    const padX = Math.max(2, Math.round((maxX - minX + 1) * 0.025));
    const padY = Math.max(2, Math.round((maxY - minY + 1) * 0.025));
    const x = Math.max(0, minX - padX);
    const y = Math.max(0, minY - padY);
    const right = Math.min(width - 1, maxX + padX);
    const bottom = Math.min(height - 1, maxY + padY);
    return { x, y, width: right - x + 1, height: bottom - y + 1 };
  } catch {
    // If pixel probing is unavailable on a fallback image implementation,
    // keep the renderer functional and use the full source bounds.
    return { x: 0, y: 0, width, height };
  }
}

/**
 * Draw a sprite from its visible bounds, preserving aspect ratio and placing
 * its artwork on a known ground point. `faceLeft` mirrors the source without
 * changing the fighter's anchor.
 */
async function drawFittedSprite(ctx, img, bounds, {
  centerX,
  groundY,
  maxWidth,
  maxHeight,
  faceLeft = false,
  filter = null,
} = {}) {
  if (!img) return null;
  const source = bounds || {
    x: 0,
    y: 0,
    width: img.width || img.naturalWidth || 1,
    height: img.height || img.naturalHeight || 1,
  };
  const sourceRatio = source.width / source.height;
  const height = Math.min(maxHeight, maxWidth / sourceRatio);
  const width = height * sourceRatio;
  const x = centerX - width / 2;
  const y = groundY - height;

  ctx.save();
  if (filter) {
    try { ctx.filter = filter; } catch {}
  }
  if (faceLeft) {
    ctx.translate(x + width, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, source.x, source.y, source.width, source.height, 0, 0, width, height);
  } else {
    ctx.drawImage(img, source.x, source.y, source.width, source.height, x, y, width, height);
  }
  ctx.filter = "none";
  ctx.restore();

  return { x, y, width, height, groundY };
}

// ── Drawing utilities ──────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r = 8) {
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

function hpColor(pct) {
  if (pct > 0.5) return "#ff6b00";
  if (pct > 0.2) return "#f7d02c";
  return "#f34444";
}

function kiColor(pct) {
  return pct > 0.4 ? "#00bfff" : "#7878ff";
}

// ── Race-keyed arena themes ────────────────────────────────────────────────────
const RACE_THEMES = {
  Namekian:      { skyTop: "#051a05", skyMid: "#0d3a14", skyBot: "#1a5c2a", groundTop: "#0d2a0d", groundBot: "#071507", accent: "#00ff88", platform: "rgba(0,200,80,0.22)" },
  Saiyan:        { skyTop: "#1a0800", skyMid: "#6b1e00", skyBot: "#c04000", groundTop: "#3d1a00", groundBot: "#1a0800", accent: "#ff8800", platform: "rgba(255,100,0,0.22)" },
  Android:       { skyTop: "#050514", skyMid: "#0f0f30", skyBot: "#1e1e4a", groundTop: "#0a0a20", groundBot: "#050512", accent: "#00aaff", platform: "rgba(0,120,255,0.20)" },
  Majin:         { skyTop: "#1f0020", skyMid: "#3a0045", skyBot: "#5a0070", groundTop: "#2a002a", groundBot: "#100015", accent: "#ff55ff", platform: "rgba(200,0,200,0.20)" },
  "Frieza Race": { skyTop: "#050505", skyMid: "#150020", skyBot: "#250040", groundTop: "#0a000a", groundBot: "#040004", accent: "#cc66ff", platform: "rgba(160,50,200,0.18)" },
  Human:         { skyTop: "#0a1428", skyMid: "#1a2e50", skyBot: "#2a4a80", groundTop: "#1a1a2a", groundBot: "#0a0a12", accent: "#88aaff", platform: "rgba(80,120,200,0.20)" },
  default:       { skyTop: "#0b0f24", skyMid: "#152249", skyBot: "#233a68", groundTop: "#0d1220", groundBot: "#050810", accent: "#6699ff", platform: "rgba(100,150,255,0.18)" },
};

function getTheme(race) {
  return RACE_THEMES[race] || RACE_THEMES.default;
}

function drawArenaBackground(ctx, W, H, race) {
  const t = getTheme(race);

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  sky.addColorStop(0,   t.skyTop);
  sky.addColorStop(0.5, t.skyMid);
  sky.addColorStop(1,   t.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Faint energy particles drifting in sky
  ctx.save();
  for (let i = 0; i < 24; i++) {
    const px = ((i * 113 + 37) % W);
    const py = ((i * 71  + 19) % (H * 0.55));
    const pr = (i % 3) + 0.8;
    ctx.globalAlpha = 0.12 + (i % 5) * 0.04;
    ctx.fillStyle   = i % 2 === 0 ? t.accent : "#ffffff";
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Mountain/rock silhouettes
  ctx.fillStyle = "rgba(0,0,0,0.50)";
  [[0, 0.58, 280, 0.42], [0.20, 0.50, 230, 0.50], [0.50, 0.55, 310, 0.45], [0.75, 0.52, 240, 0.48], [0.92, 0.62, 190, 0.38]].forEach(([xPct, yPct, mw, hPct]) => {
    ctx.beginPath();
    ctx.moveTo(W * xPct, H);
    ctx.lineTo(W * xPct + mw / 2, H * yPct);
    ctx.lineTo(W * xPct + mw, H);
    ctx.closePath();
    ctx.fill();
  });

  // Ground
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, H * 0.52);
  ctx.lineTo(W, H * 0.52);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.clip();
  const floor = ctx.createLinearGradient(0, H * 0.52, 0, H);
  floor.addColorStop(0, t.groundTop);
  floor.addColorStop(1, t.groundBot);
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, W, H);
  // Crack lines on ground
  ctx.strokeStyle = t.accent + "22";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) {
    const sx = (W / 9) * i + 30;
    ctx.beginPath();
    ctx.moveTo(sx, H * 0.52);
    ctx.lineTo(sx + (i % 2 === 0 ? 50 : -40), H);
    ctx.stroke();
  }
  ctx.restore();

  // Horizon glow line
  const divider = ctx.createLinearGradient(0, 0, W, 0);
  divider.addColorStop(0,   "rgba(0,0,0,0)");
  divider.addColorStop(0.5, t.accent + "88");
  divider.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.strokeStyle = divider;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.52); ctx.lineTo(W, H * 0.52);
  ctx.stroke();

  // Player platform (bottom-left)
  drawPlatformEllipse(ctx, W * 0.26, H * 0.74, 130, 26, t.platform, t.accent);
  // Enemy platform (top-right)
  drawPlatformEllipse(ctx, W * 0.74, H * 0.38, 110, 20, t.platform, t.accent);

  // Vignette
  const vig = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.18, W / 2, H * 0.5, H * 0.9);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Frame border
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth   = 3;
  ctx.strokeRect(2, 2, W - 4, H - 4);
}

function drawPlatformEllipse(ctx, cx, cy, rw, rh, fillColor, strokeColor) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(cx, cy + 10, rw, rh * 1.2, 0, 0, Math.PI * 2); ctx.fill();

  const g = ctx.createRadialGradient(cx, cy - 4, 8, cx, cy, rw);
  g.addColorStop(0, fillColor);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = strokeColor + "50";
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2); ctx.stroke();
}

function drawGroundShadow(ctx, cx, footY, rx) {
  const g = ctx.createRadialGradient(cx, footY, 2, cx, footY, rx);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx, footY, rx, rx * 0.28, 0, 0, Math.PI * 2); ctx.fill();
}

function drawAuraGlow(ctx, cx, cy, color, large = false) {
  const r = large ? 130 : 90;
  const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
  g.addColorStop(0, color + "66");
  g.addColorStop(1, color + "00");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.65, 0, 0, Math.PI * 2); ctx.fill();
}

// ── Stat panel (name + HP bar + Ki bar) ───────────────────────────────────────
function drawStatPanel(ctx, x, y, w, fighter, accentColor) {
  const h = 94;
  // Shadow
  ctx.save();
  ctx.shadowColor  = "rgba(0,0,0,0.5)";
  ctx.shadowBlur   = 12;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = "rgba(255,255,255,0.93)";
  ctx.fill();
  ctx.restore();

  // Panel gradient
  const panel = ctx.createLinearGradient(x, y, x, y + h);
  panel.addColorStop(0, "rgba(255,255,255,0.97)");
  panel.addColorStop(1, "rgba(230,232,240,0.93)");
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = panel;
  ctx.fill();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth   = 2.5;
  ctx.stroke();

  // Accent strip
  const strip = ctx.createLinearGradient(x, y, x + w, y);
  strip.addColorStop(0, accentColor);
  strip.addColorStop(1, "rgba(255,255,255,0.2)");
  roundRect(ctx, x, y, w, 8, 12);
  ctx.fillStyle = strip;
  ctx.fill();

  // Name
  const name = (fighter.displayName || fighter.name || "Fighter").slice(0, 20);
  ctx.fillStyle  = "#111";
  ctx.font       = "bold 16px Sans";
  ctx.textAlign  = "left";
  ctx.fillText(name, x + 10, y + 28);

  // Level badge
  const lvlLabel = `Lv.${fighter.level}`;
  ctx.font       = "bold 13px Sans";
  const lvlW     = ctx.measureText(lvlLabel).width + 14;
  roundRect(ctx, x + w - lvlW - 8, y + 14, lvlW, 20, 10);
  ctx.fillStyle  = accentColor;
  ctx.fill();
  ctx.fillStyle  = "#fff";
  ctx.textAlign  = "center";
  ctx.fillText(lvlLabel, x + w - lvlW / 2 - 8, y + 28);

  const BAR_X = x + 10, BAR_W = w - 20;

  // HP bar
  ctx.fillStyle  = "#333";
  ctx.font       = "bold 11px Sans";
  ctx.textAlign  = "left";
  ctx.fillText("HP", BAR_X, y + 50);
  drawBarFull(ctx, BAR_X + 22, y + 40, BAR_W - 22, 10, fighter.hp, fighter.maxHp, hpColor(fighter.hp / fighter.maxHp));
  ctx.fillStyle  = "#333";
  ctx.font       = "11px Sans";
  ctx.fillText(`${Math.max(0, fighter.hp)}/${fighter.maxHp}`, BAR_X, y + 65);

  // Ki bar
  const kiPct = (fighter.ki || 0) / (fighter.maxKi || 300);
  ctx.fillStyle  = "#336699";
  ctx.font       = "bold 11px Sans";
  ctx.fillText("KI", BAR_X, y + 82);
  drawBarFull(ctx, BAR_X + 22, y + 72, BAR_W - 22, 9, fighter.ki || 0, fighter.maxKi || 300, kiColor(kiPct));
  ctx.fillStyle  = "#336699";
  ctx.font       = "11px Sans";
  ctx.fillText(`${Math.floor(fighter.ki || 0)}/${fighter.maxKi || 300}`, BAR_X + BAR_W - 50, y + 82);
}

function drawBarFull(ctx, x, y, w, h, current, max, color) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "#d5d5da";
  ctx.fill();
  if (pct > 0) {
    roundRect(ctx, x, y, w * pct, h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
    // Gloss
    roundRect(ctx, x, y, w * pct, h / 2, h / 2);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth   = 1;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();
}

// ── Damage callout ─────────────────────────────────────────────────────────────
function drawDamageCallout(ctx, cx, cy, damage, crit, isKiBlast) {
  ctx.save();
  ctx.textAlign  = "center";
  ctx.textBaseline = "middle";

  if (isKiBlast && !crit) {
    // Beam streak from center to hit point
    ctx.save();
    const grad = ctx.createLinearGradient(cx - 80, cy, cx + 80, cy);
    grad.addColorStop(0, "rgba(0,180,255,0)");
    grad.addColorStop(0.5, "rgba(0,220,255,0.7)");
    grad.addColorStop(1, "rgba(0,180,255,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 6;
    ctx.lineCap     = "round";
    ctx.beginPath(); ctx.moveTo(cx - 80, cy); ctx.lineTo(cx + 80, cy); ctx.stroke();
    ctx.restore();
  }

  if (crit) {
    // Shockwave rings
    ctx.strokeStyle = "rgba(255,215,0,0.55)";
    ctx.lineWidth   = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(cx, cy, 30 + i * 18, 0, Math.PI * 2); ctx.stroke();
    }
    // Ray burst
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth   = 2;
    for (let r = 0; r < 12; r++) {
      const angle = (r / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 28, cy + Math.sin(angle) * 28);
      ctx.lineTo(cx + Math.cos(angle) * 56, cy + Math.sin(angle) * 56);
      ctx.stroke();
    }
    ctx.restore();
  }

  const fontSize = crit ? 62 : 48;
  ctx.font       = `bold ${fontSize}px Sans`;
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur  = 10;
  ctx.strokeStyle = "#000";
  ctx.lineWidth   = 5;
  const label     = `-${damage}`;
  ctx.strokeText(label, cx, cy);
  ctx.fillStyle   = crit ? "#ffd700" : isKiBlast ? "#00ddff" : "#ff4444";
  ctx.fillText(label, cx, cy);

  if (crit) {
    ctx.font      = "bold 20px Sans";
    ctx.fillStyle = "#ffd700";
    ctx.shadowBlur = 4;
    ctx.fillText("★ CRITICAL! ★", cx, cy - 44);
  }

  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

// ── Round badge ────────────────────────────────────────────────────────────────
function drawRoundBadge(ctx, W, round) {
  const bW = 160, bH = 42, bX = W / 2 - bW / 2, bY = 12;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  roundRect(ctx, bX, bY, bW, bH, 21);
  const g = ctx.createLinearGradient(bX, bY, bX, bY + bH);
  g.addColorStop(0, "rgba(30,10,0,0.88)"); g.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,200,0,0.6)"; ctx.lineWidth = 1.5;
  roundRect(ctx, bX, bY, bW, bH, 21); ctx.stroke();
  ctx.fillStyle = "#ffd700"; ctx.font = "bold 19px Sans"; ctx.textAlign = "center";
  ctx.fillText(`⚡ ROUND ${round}`, W / 2, bY + 27);
}

// ── Status text box ────────────────────────────────────────────────────────────
function drawStatusBox(ctx, W, H, statusText) {
  if (!statusText) return;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 10;
  roundRect(ctx, 10, H - 58, W - 20, 46, 10);
  const g = ctx.createLinearGradient(0, H - 58, 0, H - 12);
  g.addColorStop(0, "rgba(10,5,0,0.93)"); g.addColorStop(1, "rgba(5,0,0,0.93)");
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,140,0,0.5)"; ctx.lineWidth = 1.5;
  roundRect(ctx, 10, H - 58, W - 20, 46, 10); ctx.stroke();
  ctx.fillStyle = "#ffe8cc"; ctx.font = "bold 15px Sans"; ctx.textAlign = "left";
  ctx.fillText("▶ " + statusText.substring(0, 106), 22, H - 29);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main battle screen.
 * player / enemy: { name, level, hp, maxHp, ki, maxKi, imageUrl, race, transformed, auraColor }
 */
export async function generateBattleScene({
  player, enemy,
  round = 1,
  hitSide  = null,
  damage   = null,
  crit     = false,
  statusText = "",
  isKiBlast  = false,
}) {
  const { createCanvas } = await getCanvasModule();
  const W = 1100, H = 600;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // Background keyed off enemy race
  drawArenaBackground(ctx, W, H, enemy.race || "default");

  // Hit flash overlay
  if (hitSide === "player") {
    ctx.fillStyle = "rgba(255,40,40,0.20)";
    ctx.fillRect(0, H * 0.44, W * 0.5, H);
  } else if (hitSide === "enemy") {
    ctx.fillStyle = "rgba(255,40,40,0.20)";
    ctx.fillRect(W * 0.5, 0, W * 0.5, H * 0.56);
  }

  // Load sprites in parallel
  const [playerImg, enemyImg] = await Promise.all([
    loadImageSafe(player.imageUrl, player.name),
    loadImageSafe(enemy.imageUrl,  enemy.name),
  ]);
  const [playerBounds, enemyBounds] = await Promise.all([
    getVisibleBounds(playerImg),
    getVisibleBounds(enemyImg),
  ]);

  const ENEMY_SIZE = 196, ENEMY_CX = W * 0.74, ENEMY_CY = H * 0.36;
  const PLAYER_SIZE = 218, PLAYER_CX = W * 0.26, PLAYER_CY = H * 0.72;
  const enemyGroundY = ENEMY_CY + 10;
  const playerGroundY = PLAYER_CY + 12;

  // Aura glow when transformed
  if (enemy.transformed || enemy.auraColor) {
    drawAuraGlow(ctx, ENEMY_CX, ENEMY_CY, enemy.auraColor || "#ffdd00", enemy.transformed);
  }
  if (player.transformed || player.auraColor) {
    drawAuraGlow(ctx, PLAYER_CX, PLAYER_CY, player.auraColor || "#ff8800", player.transformed);
  }

  drawGroundShadow(ctx, ENEMY_CX,  ENEMY_CY  + 8,  82);
  drawGroundShadow(ctx, PLAYER_CX, PLAYER_CY + 10, 96);

  // Enemy sprite — flipped to face left
  if (enemyImg) {
    await drawFittedSprite(ctx, enemyImg, enemyBounds, {
      centerX: ENEMY_CX,
      groundY: enemyGroundY,
      maxWidth: ENEMY_SIZE,
      maxHeight: ENEMY_SIZE,
      faceLeft: true,
      filter: hitSide === "enemy" ? "brightness(0.55) grayscale(0.3)" : null,
    });
  } else {
    ctx.fillStyle = "#888"; ctx.font = `${Math.floor(ENEMY_SIZE * 0.5)}px Sans`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("👹", ENEMY_CX, enemyGroundY - ENEMY_SIZE / 2);
    ctx.textBaseline = "alphabetic";
  }

  // Player sprite — faces right
  if (playerImg) {
    await drawFittedSprite(ctx, playerImg, playerBounds, {
      centerX: PLAYER_CX,
      groundY: playerGroundY,
      maxWidth: PLAYER_SIZE,
      maxHeight: PLAYER_SIZE,
      filter: hitSide === "player" ? "brightness(0.55) grayscale(0.3)" : null,
    });
  } else {
    ctx.fillStyle = "#888"; ctx.font = `${Math.floor(PLAYER_SIZE * 0.5)}px Sans`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🐉", PLAYER_CX, playerGroundY - PLAYER_SIZE / 2);
    ctx.textBaseline = "alphabetic";
  }

  // Stat panels
  const theme = getTheme(enemy.race || "default");
  drawStatPanel(ctx, 12, 12, 296, { ...enemy,  displayName: enemy.name  }, theme.accent);
  drawStatPanel(ctx, W - 308, H - 108, 294, { ...player, displayName: player.name }, "#ff8800");

  // Round badge
  drawRoundBadge(ctx, W, round);

  // Damage callout
  if (damage != null && hitSide) {
    const cx = hitSide === "enemy" ? ENEMY_CX  : PLAYER_CX;
    const cy = hitSide === "enemy" ? enemyGroundY - ENEMY_SIZE + 10 : playerGroundY - PLAYER_SIZE + 10;
    drawDamageCallout(ctx, cx, cy, damage, crit, isKiBlast);
  }

  // Status box
  drawStatusBox(ctx, W, H, statusText);

  return canvas.toBuffer("image/png");
}

/**
 * Transformation scene — full-bleed card when a fighter transforms.
 */
export async function generateTransformScene({ fighter, fromFormName, toFormName }) {
  const { createCanvas } = await getCanvasModule();
  const W = 960, H = 420;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // Dark dramatic BG
  const bg = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.7);
  bg.addColorStop(0, "#1a1400"); bg.addColorStop(1, "#000000");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Ray burst behind fighter
  const aura = fighter.auraColor || "#ffdd00";
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.strokeStyle = aura; ctx.lineWidth = 3;
  for (let r = 0; r < 20; r++) {
    const angle = (r / 20) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 + Math.cos(angle) * 60, H / 2 + Math.sin(angle) * 60);
    ctx.lineTo(W / 2 + Math.cos(angle) * 220, H / 2 + Math.sin(angle) * 220);
    ctx.stroke();
  }
  ctx.restore();

  // Aura glow
  const auraGrad = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 180);
  auraGrad.addColorStop(0, aura + "88"); auraGrad.addColorStop(1, aura + "00");
  ctx.fillStyle = auraGrad;
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 180, 0, Math.PI * 2); ctx.fill();

  // Fighter sprite
  const img = await loadImageSafe(fighter.imageUrl, fighter.name);
  const bounds = await getVisibleBounds(img);
  const sz  = 260;
  if (img) {
    ctx.save();
    ctx.shadowColor = aura; ctx.shadowBlur = 40;
    await drawFittedSprite(ctx, img, bounds, {
      centerX: W / 2,
      groundY: H / 2 + sz / 2 - 20,
      maxWidth: sz,
      maxHeight: sz,
    });
    ctx.restore();
  }

  // Title
  ctx.textAlign  = "center";
  ctx.fillStyle  = aura;
  ctx.font       = "bold 38px Sans";
  ctx.strokeStyle = "#000"; ctx.lineWidth = 5;
  ctx.strokeText("⚡ POWER UP! ⚡", W / 2, 56);
  ctx.fillText("⚡ POWER UP! ⚡", W / 2, 56);

  // Form name
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 24px Sans";
  ctx.fillText(`${fighter.name || "Fighter"} → ${toFormName}`, W / 2, H - 50);

  if (fromFormName) {
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "16px Sans";
    ctx.fillText(`${fromFormName}  ⟶  ${toFormName}`, W / 2, H - 22);
  }

  return canvas.toBuffer("image/png");
}

/**
 * Battle result card.
 * winner / loser: { name, imageUrl }
 */
export async function generateBattleResult({ winner, loser, rewardText = "", outcome = "victory" }) {
  const { createCanvas } = await getCanvasModule();
  const W = 960, H = 480;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  const bg = ctx.createRadialGradient(W / 2, 200, 30, W / 2, 200, 620);
  bg.addColorStop(0, outcome === "victory" ? "#1a0a00" : "#0a0a14");
  bg.addColorStop(1, "#000000");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Banner
  ctx.textAlign = "center";
  ctx.fillStyle = outcome === "victory" ? "#ffd700" : outcome === "fled" ? "#aaaaaa" : "#ff4444";
  ctx.font      = "bold 54px Sans";
  const title   = outcome === "fled" ? "🏃 FLED FROM BATTLE!" : outcome === "defeat" ? "💀 DEFEATED!" : "🏆 VICTORY!";
  ctx.fillText(title, W / 2, 70);

  const [wImg, lImg] = await Promise.all([
    loadImageSafe(winner.imageUrl, winner.name),
    loadImageSafe(loser.imageUrl,  loser.name),
  ]);
  const [wBounds, lBounds] = await Promise.all([
    getVisibleBounds(wImg),
    getVisibleBounds(lImg),
  ]);

  // Winner — center with glow
  const wSz = 220, wX = (W - wSz) / 2, wY = 96;
  if (wImg) {
    ctx.save();
    ctx.shadowColor = "#ffd700"; ctx.shadowBlur = 36;
    await drawFittedSprite(ctx, wImg, wBounds, {
      centerX: W / 2,
      groundY: wY + wSz,
      maxWidth: wSz,
      maxHeight: wSz,
    });
    ctx.restore();
  }
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 28px Sans"; ctx.textAlign = "center";
  ctx.fillText(winner.name, W / 2, wY + wSz + 34);
  ctx.fillStyle = "#ffd700"; ctx.font = "bold 16px Sans";
  ctx.fillText("WINNER", W / 2, wY + wSz + 56);

  // Loser — small & desaturated
  if (lImg) {
    const lSz = 110, lX = W - lSz - 36, lY = H - lSz - 36;
    ctx.save();
    await drawFittedSprite(ctx, lImg, lBounds, {
      centerX: lX + lSz / 2,
      groundY: lY + lSz,
      maxWidth: lSz,
      maxHeight: lSz,
      filter: "grayscale(1) brightness(0.45)",
    });
    ctx.restore();
    ctx.fillStyle = "#666"; ctx.font = "14px Sans"; ctx.textAlign = "right";
    ctx.fillText(loser.name, W - 36, H - 14);
  }

  // Reward strip
  if (rewardText) {
    roundRect(ctx, W / 2 - 210, H - 66, 420, 42, 10);
    ctx.fillStyle = "rgba(255,215,0,0.14)"; ctx.fill();
    ctx.fillStyle = "#ffd700"; ctx.font = "bold 18px Sans"; ctx.textAlign = "center";
    ctx.fillText(rewardText, W / 2, H - 37);
  }

  return canvas.toBuffer("image/png");
}

/**
 * Villain arrival cutscene image.
 * villain: { name, imageUrl, race, kiFlavorText }
 */
export async function generateVillainArrivalScene({ villain, level, kiFlavorText, fleeTimerMin = 30, isBoss = false }) {
  const { createCanvas } = await getCanvasModule();
  const W = 1100, H = 600;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // Ominous dark red/black sky regardless of race
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0,   "#000000");
  sky.addColorStop(0.3, "#1a0000");
  sky.addColorStop(0.6, isBoss ? "#400000" : "#2a0400");
  sky.addColorStop(1,   "#000000");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  // Dark ground strip
  ctx.save();
  ctx.beginPath(); ctx.rect(0, H * 0.62, W, H * 0.38); ctx.clip();
  const floor = ctx.createLinearGradient(0, H * 0.62, 0, H);
  floor.addColorStop(0, "#1a0000"); floor.addColorStop(1, "#050000");
  ctx.fillStyle = floor; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Horizon line glow
  const hor = ctx.createLinearGradient(0, 0, W, 0);
  hor.addColorStop(0, "rgba(200,0,0,0)");
  hor.addColorStop(0.5, "rgba(200,0,0,0.6)");
  hor.addColorStop(1, "rgba(200,0,0,0)");
  ctx.strokeStyle = hor; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, H * 0.62); ctx.lineTo(W, H * 0.62); ctx.stroke();

  // Villain sprite — large and centered
  const img = await loadImageSafe(villain.imageUrl, villain.name);
  const bounds = await getVisibleBounds(img);
  const VS  = isBoss ? 400 : 340;
  const VX  = W / 2 - VS / 2;
  const VY  = H * 0.62 - VS + 30;

  // Centered ray burst
  const burstColor = isBoss ? "#ff0000" : "#cc0000";
  ctx.save();
  ctx.globalAlpha = isBoss ? 0.45 : 0.28;
  ctx.strokeStyle = burstColor; ctx.lineWidth = isBoss ? 3 : 2;
  const burstR = isBoss ? 260 : 200;
  for (let r = 0; r < 24; r++) {
    const angle = (r / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 + Math.cos(angle) * 70, VY + VS / 2 + Math.sin(angle) * 70);
    ctx.lineTo(W / 2 + Math.cos(angle) * burstR, VY + VS / 2 + Math.sin(angle) * burstR);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Radial glow behind villain
  const glowR = isBoss ? 300 : 240;
  const glow  = ctx.createRadialGradient(W / 2, VY + VS / 2, 30, W / 2, VY + VS / 2, glowR);
  glow.addColorStop(0, (isBoss ? "#ff0000" : "#cc2200") + "66");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(W / 2, VY + VS / 2, glowR, 0, Math.PI * 2); ctx.fill();

  // Ground shadow
  drawGroundShadow(ctx, W / 2, H * 0.62, VS * 0.45);

  // Villain sprite
  if (img) {
    ctx.save();
    ctx.shadowColor = isBoss ? "#ff0000" : "#cc3300"; ctx.shadowBlur = isBoss ? 50 : 32;
    await drawFittedSprite(ctx, img, bounds, {
      centerX: W / 2,
      groundY: H * 0.62 + 30,
      maxWidth: VS,
      maxHeight: VS,
    });
    ctx.restore();
  } else {
    ctx.fillStyle = "#cc0000"; ctx.font = `${Math.floor(VS * 0.55)}px Sans`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("👹", W / 2, H * 0.62 - VS / 2 + 30);
    ctx.textBaseline = "alphabetic";
  }

  // Power level readout (flavor text, top-right)
  if (kiFlavorText) {
    const plText = `⚡ POWER LEVEL: ${kiFlavorText}`;
    ctx.save();
    ctx.font  = "bold 18px Sans";
    const plW = ctx.measureText(plText).width + 24;
    roundRect(ctx, W - plW - 16, 16, plW, 34, 8);
    ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fill();
    ctx.strokeStyle = "#ff4400"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle   = "#ff6600"; ctx.textAlign = "center";
    ctx.fillText(plText, W - plW / 2 - 16, 38);
    ctx.restore();
  }

  // Level badge
  const lvlText = `LEVEL ${level}`;
  ctx.save();
  ctx.font  = "bold 16px Sans";
  const lvW = ctx.measureText(lvlText).width + 20;
  roundRect(ctx, 16, 16, lvW, 32, 8);
  ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fill();
  ctx.strokeStyle = "#ff4400"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle   = "#ff8844"; ctx.textAlign = "left";
  ctx.fillText(lvlText, 26, 36);
  ctx.restore();

  // Bottom banner
  const bannerH = 80;
  const bannerY = H - bannerH;
  roundRect(ctx, 0, bannerY, W, bannerH, 0);
  const bannerBG = ctx.createLinearGradient(0, bannerY, 0, H);
  bannerBG.addColorStop(0, "rgba(80,0,0,0.90)"); bannerBG.addColorStop(1, "rgba(20,0,0,0.95)");
  ctx.fillStyle = bannerBG; ctx.fill();
  ctx.strokeStyle = "#ff2200"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, bannerY); ctx.lineTo(W, bannerY); ctx.stroke();

  ctx.textAlign = "center";
  // Villain name + level
  ctx.fillStyle = isBoss ? "#ff2200" : "#ff6600";
  ctx.font      = isBoss ? "bold 32px Sans" : "bold 28px Sans";
  ctx.fillText(villain.name, W / 2, bannerY + 30);

  // Threat line + engage command
  const threat = isBoss
    ? `🔥 CATASTROPHIC POWER DETECTED! — Level ${level}`
    : `A menacing power approaches — Level ${level}`;
  ctx.fillStyle = "#ffaa66"; ctx.font = "16px Sans";
  ctx.fillText(threat, W / 2, bannerY + 52);

  ctx.fillStyle = "rgba(255,180,100,0.65)"; ctx.font = "13px Sans";
  ctx.fillText(`Use .dbzfight to engage  •  Flees in ${fleeTimerMin} min`, W / 2, bannerY + 70);

  // Heavy vignette
  const vig = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.12, W / 2, H * 0.45, H * 0.88);
  vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  return canvas.toBuffer("image/png");
}

/**
 * Character selection grid (paginated).
 * characters: array of { id, name, race, imageUrl, kiFlavorText }
 * Returns a PNG buffer.
 */
export async function generateCharacterSelectCanvas(characters, page = 1, perPage = 8) {
  const { createCanvas } = await getCanvasModule();
  const COLS   = 4;
  const CELL_W = 220;
  const CELL_H = 235;
  const PAD    = 18;
  const HDR_H  = 76;

  const displayChars = characters.slice(0, perPage);
  const rows  = Math.ceil(displayChars.length / COLS);
  const W     = COLS * CELL_W + (COLS + 1) * PAD;
  const H     = HDR_H + rows * CELL_H + (rows + 1) * PAD + 32;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0d0500"); bg.addColorStop(1, "#1a0800");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Starfield
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  for (let i = 0; i < 80; i++) {
    const sx = ((i * 127 + 31) % W);
    const sy = ((i * 83  + 17) % H);
    const sr = ((i % 3) === 0) ? 1.2 : 0.6;
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  }

  // Header
  ctx.textAlign = "center"; ctx.fillStyle = "#ffd700"; ctx.font = "bold 30px Sans";
  ctx.fillText("⚡ SELECT YOUR FIGHTER ⚡", W / 2, 44);
  ctx.fillStyle = "rgba(255,200,100,0.55)"; ctx.font = "15px Sans";
  ctx.fillText(`Page ${page}  •  Reply .dbzpick <number or name> to choose`, W / 2, 64);

  // Load all images in parallel
  const images = await Promise.all(displayChars.map(c => loadImageSafe(c.imageUrl, c.name)));
  const bounds = await Promise.all(images.map(img => getVisibleBounds(img)));

  for (let i = 0; i < displayChars.length; i++) {
    const c   = displayChars[i];
    const row = Math.floor(i / COLS);
    const col = i % COLS;

    const rowCount  = Math.min(COLS, displayChars.length - row * COLS);
    const rowStart  = (W - (rowCount * CELL_W + (rowCount - 1) * PAD)) / 2;
    const cx        = rowStart + col * (CELL_W + PAD);
    const cy        = HDR_H + PAD + row * (CELL_H + PAD);

    // Card background
    roundRect(ctx, cx, cy, CELL_W, CELL_H, 14);
    const cardG = ctx.createLinearGradient(cx, cy, cx, cy + CELL_H);
    cardG.addColorStop(0, "rgba(255,255,255,0.09)");
    cardG.addColorStop(1, "rgba(255,120,0,0.05)");
    ctx.fillStyle = cardG; ctx.fill();
    ctx.strokeStyle = "rgba(255,180,0,0.40)"; ctx.lineWidth = 2; ctx.stroke();

    // Number badge
    ctx.fillStyle = "#ffd700"; ctx.font = "bold 17px Sans"; ctx.textAlign = "left";
    ctx.fillText(`#${(page - 1) * perPage + i + 1}`, cx + 10, cy + 22);

    // Race badge (top right)
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.font = "11px Sans"; ctx.textAlign = "right";
    ctx.fillText(c.race || "?", cx + CELL_W - 10, cy + 22);

    // Portrait
    const img   = images[i];
    const visible = bounds[i];
    const imgSz = 135;
    const imgX  = cx + (CELL_W - imgSz) / 2;
    const imgY  = cy + 28;
    if (img) {
      await drawFittedSprite(ctx, img, visible, {
        centerX: cx + CELL_W / 2,
        groundY: imgY + imgSz,
        maxWidth: imgSz,
        maxHeight: imgSz,
      });
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(imgX, imgY, imgSz, imgSz);
      ctx.fillStyle = "#888"; ctx.font = "40px Sans"; ctx.textAlign = "center";
      ctx.fillText("?", cx + CELL_W / 2, imgY + imgSz / 2 + 14);
    }

    // Name
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 15px Sans"; ctx.textAlign = "center";
    ctx.fillText(c.name, cx + CELL_W / 2, cy + 180);

    // Ki flavor text (small, orange)
    if (c.kiFlavorText) {
      ctx.fillStyle = "#ff8844"; ctx.font = "11px Sans";
      ctx.fillText(`⚡ ${c.kiFlavorText.slice(0, 22)}`, cx + CELL_W / 2, cy + 198);
    }

    // Race below
    ctx.fillStyle = "rgba(200,180,140,0.65)"; ctx.font = "12px Sans";
    ctx.fillText(c.race || "Unknown", cx + CELL_W / 2, cy + 216);
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "13px Sans"; ctx.textAlign = "center";
  ctx.fillText(".dbzselect <page>  to browse  •  .dbzpick <#>  to choose", W / 2, H - 10);

  return canvas.toBuffer("image/png");
}
