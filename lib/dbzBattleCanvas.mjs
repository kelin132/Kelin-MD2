/**
 * KELIN MD — Dragon Ball Z Battle Canvas
 * GBA-style arena renderer, same layout convention as the Pokémon canvas:
 *  • Player sprite bottom-left, full-size, facing right
 *  • Enemy/opponent sprite top-right, flipped to face left
 *  • HP / KI bars overlaid as panel cards
 *  • Rocky wasteland background with energy aura effects
 *
 * Cutout fix: images are loaded with their original alpha channel intact
 * (PNG proxy first, JPEG as last-resort fallback). getVisibleBounds() scans
 * the pixel data to find the real character bounds, then drawFittedSprite()
 * draws only that region — eliminating transparent padding squares.
 */

let _canvasMod;
async function getCanvasModule() {
  _canvasMod ??= import("canvas");
  return _canvasMod;
}

// ── Image loading ─────────────────────────────────────────────────────────────

/** PNG proxy — preserves the alpha channel so transparent art stays transparent. */
function toPngProxy(url, w = 420) {
  if (!url) return null;
  const bare = url.replace(/^https?:\/\//, "");
  return `https://wsrv.nl/?url=${encodeURIComponent(bare)}&output=png&w=${w}`;
}

/** JPEG proxy — last-resort fallback for runtimes without PNG/WebP support. */
function toJpegProxy(url, w = 420) {
  if (!url) return null;
  const bare = url.replace(/^https?:\/\//, "");
  return `https://wsrv.nl/?url=${encodeURIComponent(bare)}&output=jpg&w=${w}&q=85`;
}

/**
 * Load an image, preserving its alpha channel whenever possible.
 * Order: original URL → PNG proxy → JPEG proxy (last resort, loses transparency).
 */
async function loadImageSafe(url, label = "img") {
  if (!url) return null;
  const { loadImage } = await getCanvasModule();

  // PNG proxy FIRST — DBZ API images are WebP which Cairo/node-canvas often
  // cannot decode natively. wsrv.nl re-encodes to PNG and preserves the alpha
  // channel, giving us a clean transparent background for the character.
  // Raw URL second (some CDN PNGs load fine directly), JPEG last resort.
  const attempts = [toPngProxy(url, 420), url, toJpegProxy(url, 420)];
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
    } catch {
      // try next attempt silently
    }
  }
  console.warn(`[dbzCanvas] all attempts failed for ${label}`);
  return null;
}

// ── Visible-bounds detection ──────────────────────────────────────────────────

/**
 * Scan an image's pixel data to find the smallest bounding rectangle that
 * contains all non-transparent pixels. DBZ API art is commonly a transparent
 * PNG/WebP with wildly different padding between characters — without this the
 * sprite occupies a fixed square full of empty space, giving the "box cutout"
 * look instead of a clean character silhouette.
 *
 * Returns { x, y, width, height } in source pixels.
 */
async function getVisibleBounds(img) {
  if (!img) return null;
  const { createCanvas } = await getCanvasModule();
  const width  = Math.max(1, img.width  || img.naturalWidth  || 1);
  const height = Math.max(1, img.height || img.naturalHeight || 1);
  const probe  = createCanvas(width, height);
  const ctx    = probe.getContext("2d");

  try {
    ctx.drawImage(img, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    let minX = width, minY = height, maxX = -1, maxY = -1;

    // Alpha threshold of 16 keeps soft anti-aliased edges while ignoring
    // fully-transparent padding.
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

    // Tiny source padding so hair and aura edges don't feel clipped after
    // the crop is scaled into the arena.
    const padX = Math.max(2, Math.round((maxX - minX + 1) * 0.025));
    const padY = Math.max(2, Math.round((maxY - minY + 1) * 0.025));
    const x      = Math.max(0,         minX - padX);
    const y      = Math.max(0,         minY - padY);
    const right  = Math.min(width  - 1, maxX + padX);
    const bottom = Math.min(height - 1, maxY + padY);
    return { x, y, width: right - x + 1, height: bottom - y + 1 };
  } catch {
    // If pixel probing is unavailable (fallback canvas implementation), use
    // the full source bounds so rendering stays functional.
    return { x: 0, y: 0, width, height };
  }
}

/**
 * Draw a sprite using its visible bounds, preserving aspect ratio and
 * anchoring the artwork on a known ground point.
 * `faceLeft` mirrors the sprite horizontally without moving the anchor.
 */
async function drawFittedSprite(ctx, img, bounds, {
  centerX,
  groundY,
  maxWidth,
  maxHeight,
  faceLeft  = false,
  filter    = null,
} = {}) {
  if (!img) return null;
  const source = bounds || {
    x: 0, y: 0,
    width:  img.width  || img.naturalWidth  || 1,
    height: img.height || img.naturalHeight || 1,
  };
  const ratio  = source.width / source.height;
  const height = Math.min(maxHeight, maxWidth / ratio);
  const width  = height * ratio;
  const x      = centerX - width / 2;
  const y      = groundY - height;

  ctx.save();
  if (filter) {
    try { ctx.filter = filter; } catch { /**/ }
  }
  if (faceLeft) {
    ctx.translate(x + width, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, source.x, source.y, source.width, source.height,
                  0, 0, width, height);
  } else {
    ctx.drawImage(img, source.x, source.y, source.width, source.height,
                  x, y, width, height);
  }
  ctx.filter = "none";
  ctx.restore();
  return { x, y, width, height, groundY };
}

// ── Drawing utilities ─────────────────────────────────────────────────────────

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

/** Draw an elliptical shadow beneath a fighter to ground them on the arena floor. */
function drawGroundShadow(ctx, cx, footY, rx) {
  const g = ctx.createRadialGradient(cx, footY, 2, cx, footY, rx);
  g.addColorStop(0, "rgba(0,0,0,0.50)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, footY, rx, rx * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Soft energy aura glow around a fighter's feet. */
function drawAuraGlow(ctx, cx, footY, color, dim = false) {
  if (dim) return;
  const g = ctx.createRadialGradient(cx, footY - 20, 10, cx, footY - 20, 90);
  g.addColorStop(0, color + "44");
  g.addColorStop(1, color + "00");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, footY - 10, 90, 60, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** HP/KI stat bar. */
function drawBar(ctx, x, y, w, h, current, max, fillColor) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fill();
  if (pct > 0) {
    roundRect(ctx, x, y, Math.max(6, w * pct), h, h / 2);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, fillColor);
    g.addColorStop(1, fillColor + "99");
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();
}

/** Compact stat panel card (name + HP bar + KI bar + values). */
function drawStatPanel(ctx, x, y, w, fighter, accentColor, flip = false) {
  const h = 90;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = "rgba(0,0,0,0.68)";
  ctx.fill();
  ctx.strokeStyle = accentColor + "99";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();

  const name = (fighter.username || fighter.name || "Fighter").slice(0, 18);
  ctx.fillStyle = accentColor;
  ctx.font = "bold 15px Sans";
  ctx.textAlign = flip ? "right" : "left";
  ctx.fillText(name, flip ? x + w - 10 : x + 10, y + 20);

  const hp  = Math.max(0, Math.round(fighter.hp));
  const ki  = Math.max(0, Math.round(fighter.ki ?? fighter.maxKi ?? 0));
  const BAR_X = x + 10, BAR_W = w - 20, BAR_H = 11;

  drawBar(ctx, BAR_X, y + 28, BAR_W, BAR_H, hp, fighter.maxHp, "#ff6b00");
  ctx.fillStyle = "#fff";
  ctx.font = "11px Sans";
  ctx.textAlign = "left";
  ctx.fillText(`❤️ ${hp}/${fighter.maxHp}`, BAR_X, y + 52);

  drawBar(ctx, BAR_X, y + 55, BAR_W, BAR_H, ki, fighter.maxKi ?? 300, "#00bfff");
  ctx.fillText(`💠 ${ki}/${fighter.maxKi ?? 300}`, BAR_X, y + 79);
}

// ── Background ────────────────────────────────────────────────────────────────

function drawBackground(ctx, W, H) {
  // Sky gradient — dark orange/red DBZ battle sky
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.65);
  sky.addColorStop(0,    "#0d0500");
  sky.addColorStop(0.35, "#5c1800");
  sky.addColorStop(0.65, "#a83800");
  sky.addColorStop(1,    "#c85000");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Floating energy particles in the sky
  ctx.save();
  for (let i = 0; i < 28; i++) {
    const px = ((i * 97 + 37) % W);
    const py = ((i * 61 + 13) % (H * 0.6));
    const pr = (i % 3) + 1;
    ctx.globalAlpha = 0.2 + (i % 4) * 0.07;
    ctx.fillStyle = i % 2 === 0 ? "#ffcc00" : "#ff6600";
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Mountain silhouettes
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  const mountains = [
    [0,    0.60, 260, 0.40],
    [0.18, 0.52, 220, 0.48],
    [0.45, 0.57, 300, 0.43],
    [0.72, 0.50, 240, 0.50],
    [0.90, 0.63, 180, 0.37],
  ];
  mountains.forEach(([xPct, yPct, mw]) => {
    const mx = W * xPct, my = H * yPct;
    ctx.beginPath();
    ctx.moveTo(mx, H);
    ctx.lineTo(mx + mw / 2, my);
    ctx.lineTo(mx + mw, H);
    ctx.closePath();
    ctx.fill();
  });

  // Arena floor — perspective trapezoid
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(W * 0.04, H * 0.50);
  ctx.lineTo(W * 0.96, H * 0.50);
  ctx.lineTo(W * 1.02, H);
  ctx.lineTo(-W * 0.02, H);
  ctx.closePath();
  ctx.clip();

  const floor = ctx.createLinearGradient(0, H * 0.50, 0, H);
  floor.addColorStop(0, "#3d1a00");
  floor.addColorStop(1, "#1a0800");
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, W, H);

  // Ground crack lines
  ctx.strokeStyle = "rgba(255,120,0,0.18)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 10; i++) {
    const sx = (W / 10) * i + 20;
    ctx.beginPath();
    ctx.moveTo(sx, H * 0.50);
    ctx.lineTo(sx + (i % 2 === 0 ? 40 : -30), H);
    ctx.stroke();
  }
  ctx.restore();

  // Divider glow line at horizon
  const divider = ctx.createLinearGradient(0, 0, W, 0);
  divider.addColorStop(0,   "rgba(255,140,0,0)");
  divider.addColorStop(0.5, "rgba(255,180,0,0.6)");
  divider.addColorStop(1,   "rgba(255,140,0,0)");
  ctx.strokeStyle = divider;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.50);
  ctx.lineTo(W, H * 0.50);
  ctx.stroke();
}

// ── Round / VS label ──────────────────────────────────────────────────────────

function drawRoundBadge(ctx, W, round) {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, W / 2 - 70, 10, 140, 36, 8);
  ctx.fill();
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 20px Sans";
  ctx.textAlign = "center";
  ctx.fillText(`⚡ ROUND ${round}`, W / 2, 35);
}

// ── Damage callout ────────────────────────────────────────────────────────────

function drawDamageCallout(ctx, x, y, damage) {
  ctx.save();
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#ff3333";
  ctx.font = "bold 40px Sans";
  ctx.textAlign = "center";
  ctx.fillText(`-${damage}`, x, y);
  ctx.restore();
}

// ── Main: PvP battle scene ────────────────────────────────────────────────────

export async function generateBattleScene({ left, right, round = 1, hitSide = null, damage = null }) {
  const { createCanvas } = await getCanvasModule();
  const W = 960, H = 540;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  drawBackground(ctx, W, H);
  drawRoundBadge(ctx, W, round);

  // Load both sprites + compute their visible bounds in parallel
  const [leftImg, rightImg] = await Promise.all([
    loadImageSafe(left.imageUrl,  left.username  || left.name  || "left"),
    loadImageSafe(right.imageUrl, right.username || right.name || "right"),
  ]);
  const [leftBounds, rightBounds] = await Promise.all([
    getVisibleBounds(leftImg),
    getVisibleBounds(rightImg),
  ]);

  // ── Shared ground level — both fighters side by side ─────────────────────
  const groundY  = H * 0.88;

  // ── LEFT fighter — left side, faces RIGHT ────────────────────────────────
  const lCenterX = W * 0.25;
  const lGroundY = groundY;

  drawGroundShadow(ctx, lCenterX, lGroundY, 95);
  drawAuraGlow(ctx,     lCenterX, lGroundY, "#ff8c00", hitSide === "left");

  if (leftImg) {
    await drawFittedSprite(ctx, leftImg, leftBounds, {
      centerX:  lCenterX,
      groundY:  lGroundY,
      maxWidth:  260,
      maxHeight: 260,
      faceLeft: false,
      filter: hitSide === "left" ? "brightness(0.55) grayscale(0.4)" : null,
    });
  } else {
    ctx.fillStyle = hitSide === "left" ? "#555" : "#ff8c00";
    ctx.font = "120px Sans";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🐉", lCenterX, lGroundY - 120);
    ctx.textBaseline = "alphabetic";
  }

  // ── RIGHT fighter — right side, flipped to face LEFT ─────────────────────
  const rCenterX = W * 0.75;
  const rGroundY = groundY;

  drawGroundShadow(ctx, rCenterX, rGroundY, 95);
  drawAuraGlow(ctx,     rCenterX, rGroundY, "#e53e3e", hitSide === "right");

  if (rightImg) {
    await drawFittedSprite(ctx, rightImg, rightBounds, {
      centerX:  rCenterX,
      groundY:  rGroundY,
      maxWidth:  260,
      maxHeight: 260,
      faceLeft: true,
      filter: hitSide === "right" ? "brightness(0.55) grayscale(0.4)" : null,
    });
  } else {
    ctx.fillStyle = hitSide === "right" ? "#555" : "#c0392b";
    ctx.font = "110px Sans";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("👹", rCenterX, rGroundY - 110);
    ctx.textBaseline = "alphabetic";
  }

  // ── Stat panels ────────────────────────────────────────────────────────────
  drawStatPanel(ctx, 10,       10, 260, left,  "#ff8c00", false);
  drawStatPanel(ctx, W - 270, 10, 260, right, "#e53e3e",  true);

  // ── Damage callout on the hit side ────────────────────────────────────────
  if (damage !== null && hitSide) {
    const cx = hitSide === "right" ? rCenterX : lCenterX;
    const cy = groundY - 280;
    drawDamageCallout(ctx, cx, cy, damage);
  }

  // ── Character name labels under sprites ───────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font      = "italic 13px Sans";
  ctx.textAlign = "center";
  ctx.fillText(left.character  || left.username  || "Fighter", lCenterX, groundY + 14);
  ctx.fillText(right.character || right.username || "Villain", rCenterX, groundY + 14);

  return canvas.toBuffer("image/png");
}

// ── PvE hunt scene (reuses battle scene with enemy data remapped) ─────────────

export async function generateHuntScene({ player, enemy, round = 1, hitSide = null, damage = null }) {
  return generateBattleScene({
    left: {
      username:  player.username || "You",
      character: player.character || null,
      imageUrl:  player.imageUrl || null,
      transformed: !!player.transformed,
      auraColor: player.auraColor || null,
      hp:        player.hp,
      maxHp:     player.maxHp,
      ki:        player.ki,
      maxKi:     player.maxKi,
    },
    right: {
      username:  enemy.name,
      character: enemy.name,
      imageUrl:  enemy.imageUrl || null,
      transformed: !!enemy.transformed,
      auraColor: enemy.auraColor || null,
      hp:        enemy.hp,
      maxHp:     enemy.maxHp,
      ki:        enemy.ki   ?? 100,
      maxKi:     enemy.maxKi ?? 100,
    },
    round,
    hitSide,
    damage,
  });
}

// ── Result / win-loss card ────────────────────────────────────────────────────

export async function generateResultScene({ winner, loser, rewardText, outcome = "win" }) {
  const { createCanvas } = await getCanvasModule();
  const W = 800, H = 420;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  if (outcome === "win") {
    bg.addColorStop(0, "#0a1f0a"); bg.addColorStop(1, "#0f2e0f");
  } else if (outcome === "flee") {
    bg.addColorStop(0, "#1f1c0a"); bg.addColorStop(1, "#2e280f");
  } else {
    bg.addColorStop(0, "#1f0a0a"); bg.addColorStop(1, "#2e0f0f");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const accent = outcome === "win" ? "#4ade80" : outcome === "flee" ? "#fbbf24" : "#f87171";
  ctx.strokeStyle = accent;
  ctx.lineWidth   = 4;
  roundRect(ctx, 8, 8, W - 16, H - 16, 14);
  ctx.stroke();

  // Title
  const title = outcome === "win" ? "🏆 VICTORY!" : outcome === "flee" ? "🏃 ESCAPED!" : "💀 DEFEATED!";
  ctx.fillStyle = accent;
  ctx.font      = "bold 50px Sans";
  ctx.textAlign = "center";
  ctx.fillText(title, W / 2, 70);

  // Load both images + visible bounds in parallel
  const [wImg, lImg] = await Promise.all([
    loadImageSafe(winner.imageUrl, "winner"),
    loadImageSafe(loser.imageUrl,  "loser"),
  ]);
  const [wBounds, lBounds] = await Promise.all([
    getVisibleBounds(wImg),
    getVisibleBounds(lImg),
  ]);

  // Winner — left side, gold glow
  const wGroundY = 330, lGroundY = 320;
  const wCenterX = W * 0.30, lCenterX = W * 0.72;

  if (wImg) {
    ctx.save();
    ctx.shadowColor = "#ffd700"; ctx.shadowBlur = 28;
    await drawFittedSprite(ctx, wImg, wBounds, {
      centerX: wCenterX, groundY: wGroundY,
      maxWidth: 220, maxHeight: 220,
    });
    ctx.restore();
  } else {
    ctx.font = "110px Sans"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🏆", wCenterX, wGroundY - 110);
    ctx.textBaseline = "alphabetic";
  }

  // Loser — right side, desaturated
  if (lImg) {
    await drawFittedSprite(ctx, lImg, lBounds, {
      centerX: lCenterX, groundY: lGroundY,
      maxWidth: 160, maxHeight: 160,
      filter: "grayscale(1) brightness(0.45)",
    });
  }

  // Names
  ctx.font = "bold 18px Sans"; ctx.textAlign = "center";
  ctx.fillStyle = "#ffd700";
  ctx.fillText(winner.username || winner.name || "Winner", wCenterX, wGroundY + 20);
  ctx.fillStyle = "#555";
  ctx.fillText(loser.username  || loser.name  || "Loser",  lCenterX, lGroundY + 20);

  // Reward strip
  if (rewardText) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(ctx, W / 2 - 210, H - 60, 420, 42, 10);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font      = "bold 18px Sans";
    ctx.textAlign = "center";
    ctx.fillText(rewardText, W / 2, H - 30);
  }

  return canvas.toBuffer("image/png");
}

// ── Profile card ──────────────────────────────────────────────────────────────

export async function generateProfileScene(player) {
  const { createCanvas } = await getCanvasModule();
  const W = 720, H = 400;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0d0d1f"); bg.addColorStop(1, "#1a0a00");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#ff8c00"; ctx.lineWidth = 3;
  roundRect(ctx, 8, 8, W - 16, H - 16, 14);
  ctx.stroke();

  // Header
  ctx.fillStyle = "#ffd700"; ctx.font = "bold 24px Sans"; ctx.textAlign = "center";
  ctx.fillText("⚡ FIGHTER PROFILE ⚡", W / 2, 42);

  // Character sprite — load with alpha-preserving path, then crop to visible bounds
  const img    = await loadImageSafe(player.characterImageUrl || null, "profile");
  const bounds = await getVisibleBounds(img);

  const spriteGroundY = H - 20;
  const spriteCenterX = 140;

  if (img) {
    ctx.save();
    ctx.shadowColor = "#ff8c00"; ctx.shadowBlur = 20;
    await drawFittedSprite(ctx, img, bounds, {
      centerX:   spriteCenterX,
      groundY:   spriteGroundY,
      maxWidth:  240,
      maxHeight: 300,
    });
    ctx.restore();

    // Character label below sprite
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "italic 13px Sans";
    ctx.textAlign = "center";
    ctx.fillText(player.character || "Unknown", spriteCenterX, spriteGroundY + 14);
  } else {
    ctx.fillStyle = "#ff8c00"; ctx.font = "110px Sans";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🐉", spriteCenterX, H / 2);
    ctx.textBaseline = "alphabetic";
  }

  // Stats panel (right side)
  const TX = spriteCenterX + 130;
  const TW = W - TX - 20;

  function row(emoji, label, value, y, highlight = false) {
    ctx.textAlign = "left";
    ctx.font      = "13px Sans";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(`${emoji} ${label}`, TX, y);
    ctx.font      = highlight ? "bold 18px Sans" : "16px Sans";
    ctx.fillStyle = highlight ? "#ffd700" : "#fff";
    ctx.fillText(String(value), TX, y + 20);
  }

  const startY = 70, rh = 48;
  row("🐉", "FIGHTER", player.username || "?",                                         startY,       true);
  row("🌍", "RACE",    player.race     || "Unknown",                                   startY + rh);
  row("⚡", "RANK",    player.rank     || "Earthling",                                 startY + rh * 2);
  row("⭐", "LEVEL",   `${player.level}   (XP ${player.xp}/${player.xpNeeded})`,       startY + rh * 3);
  row("❤️", "HP",      `${player.hp}/${player.maxHp}`,                                 startY + rh * 4.5);
  row("💠", "KI",      `${player.ki}/${player.maxKi}`,                                 startY + rh * 5.5);

  const col2 = TX + TW / 2;
  function row2(emoji, label, value, y) {
    ctx.textAlign = "left";
    ctx.font = "13px Sans"; ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(`${emoji} ${label}`, col2, y);
    ctx.font = "16px Sans"; ctx.fillStyle = "#fff";
    ctx.fillText(String(value), col2, y + 20);
  }
  row2("⚔️", "ATK",  player.attack,   startY + rh * 4.5);
  row2("🛡️", "DEF",  player.defense,  startY + rh * 5.5);
  row2("💨", "SPD",  player.speed,    startY + rh * 6.3);
  row2("💰", "ZENI", player.zeni,     startY + rh * 7.1);

  // W/L record
  ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.font = "13px Sans"; ctx.textAlign = "center";
  ctx.fillText(`🏆 ${player.wins || 0} Wins  |  ☠️ ${player.losses || 0} Losses  |  📋 ${player.missionsCompleted || 0} Missions`, W / 2, H - 22);
  ctx.fillText(".dprofile • .dtrain • .dhunt • .dbattle @user", W / 2, H - 6);

  return canvas.toBuffer("image/png");
}

export default {
  generateBattleScene,
  generateHuntScene,
  generateResultScene,
  generateProfileScene,
};
