/**
 * KELIN MD — Pokémon battle canvas renderer
 * Classic GBA-style Pokémon battle screen with HP bars, sprites, and effects.
 */
import { createCanvas, loadImage } from "canvas";

async function loadImageSafe(url, label = "pokemon") {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (KelinMD-Bot)" },
    });
    if (!res.ok) return null;
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

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
  if (pct > 0.5) return "#30e858";
  if (pct > 0.2) return "#f7d02c";
  return "#f34444";
}

function drawHPBox(ctx, x, y, w, name, level, hp, maxHp, shiny = false) {
  // Box background
  roundRect(ctx, x, y, w, 80, 8);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fill();
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Name
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 18px Sans";
  ctx.textAlign = "left";
  ctx.fillText(name + (shiny ? " ⭐" : ""), x + 10, y + 22);

  // Level
  ctx.font = "14px Sans";
  ctx.fillStyle = "#444";
  ctx.textAlign = "right";
  ctx.fillText(`Lv.${level}`, x + w - 10, y + 22);

  // HP label
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 13px Sans";
  ctx.textAlign = "left";
  ctx.fillText("HP", x + 10, y + 44);

  // HP bar background
  const barX = x + 32, barY = y + 34, barW = w - 50, barH = 10;
  roundRect(ctx, barX, barY, barW, barH, 5);
  ctx.fillStyle = "#c8c8c8";
  ctx.fill();

  // HP bar fill
  const pct = Math.max(0, Math.min(1, hp / maxHp));
  if (pct > 0) {
    roundRect(ctx, barX, barY, barW * pct, barH, 5);
    ctx.fillStyle = hpColor(pct);
    ctx.fill();
  }

  // HP numbers
  ctx.fillStyle = "#333";
  ctx.font = "13px Sans";
  ctx.textAlign = "right";
  ctx.fillText(`${Math.max(0, hp)}/${maxHp}`, x + w - 10, y + 68);
}

function drawGrassBackground(ctx, w, h) {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  sky.addColorStop(0, "#87ceeb");
  sky.addColorStop(1, "#c8e8f0");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.55);

  // Far hill
  ctx.fillStyle = "#5ab552";
  ctx.beginPath();
  ctx.ellipse(w * 0.75, h * 0.5, 220, 90, 0, 0, Math.PI * 2);
  ctx.fill();

  // Near grass ground
  const ground = ctx.createLinearGradient(0, h * 0.52, 0, h);
  ground.addColorStop(0, "#6dbf67");
  ground.addColorStop(1, "#3d8b37");
  ctx.fillStyle = ground;
  ctx.fillRect(0, h * 0.52, w, h * 0.48);

  // Dividing line
  ctx.strokeStyle = "#3a7a35";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.52);
  ctx.lineTo(w, h * 0.52);
  ctx.stroke();

  // Battle platform — enemy side (top right)
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.ellipse(w * 0.72, h * 0.42, 100, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8bc34a";
  ctx.beginPath();
  ctx.ellipse(w * 0.72, h * 0.40, 100, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Battle platform — player side (bottom left)
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(w * 0.28, h * 0.70, 120, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7cb342";
  ctx.beginPath();
  ctx.ellipse(w * 0.28, h * 0.68, 120, 28, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw the main battle scene.
 * @param {object} opts
 * @param {object} opts.player  { name, level, hp, maxHp, imageUrl, shiny }  — player's Pokémon
 * @param {object} opts.enemy   { name, level, hp, maxHp, imageUrl, shiny }  — opponent Pokémon
 * @param {number} [opts.round]
 * @param {"player"|"enemy"|null} [opts.hitSide] — who just took damage
 * @param {number} [opts.damage]
 * @param {boolean} [opts.crit]
 * @param {string} [opts.statusText] — e.g. "Pikachu used Thunderbolt!"
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateBattleScene({ player, enemy, round = 1, hitSide = null, damage = null, crit = false, statusText = "" }) {
  const W = 960, H = 540;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  drawGrassBackground(ctx, W, H);

  // Hit flash
  if (hitSide === "player") {
    ctx.fillStyle = "rgba(255,50,50,0.25)";
    ctx.fillRect(0, H * 0.5, W * 0.5, H * 0.5);
  }
  if (hitSide === "enemy") {
    ctx.fillStyle = "rgba(255,50,50,0.25)";
    ctx.fillRect(W * 0.5, 0, W * 0.5, H * 0.5);
  }

  // Load sprites
  const [playerImg, enemyImg] = await Promise.all([
    loadImageSafe(player.imageUrl || player.backImageUrl, player.name),
    loadImageSafe(enemy.imageUrl, enemy.name),
  ]);

  // Enemy sprite (front, top-right platform)
  const enemySize = 160;
  const enemyX = W * 0.72 - enemySize / 2;
  const enemyY = H * 0.40 - enemySize + 22;
  if (enemyImg) {
    ctx.drawImage(enemyImg, enemyX, enemyY, enemySize, enemySize);
  } else {
    ctx.fillStyle = "#888";
    ctx.font = `${Math.floor(enemySize * 0.6)}px Sans`;
    ctx.textAlign = "center";
    ctx.fillText("❓", enemyX + enemySize / 2, enemyY + enemySize * 0.7);
  }

  // Player sprite (back, bottom-left platform)
  const playerSize = 180;
  const playerX = W * 0.28 - playerSize / 2;
  const playerY = H * 0.68 - playerSize + 28;
  if (playerImg) {
    // Flip horizontally to show back
    ctx.save();
    ctx.translate(playerX + playerSize, playerY);
    ctx.scale(-1, 1);
    ctx.drawImage(playerImg, 0, 0, playerSize, playerSize);
    ctx.restore();
  } else {
    ctx.fillStyle = "#888";
    ctx.font = `${Math.floor(playerSize * 0.5)}px Sans`;
    ctx.textAlign = "center";
    ctx.fillText("🐉", playerX + playerSize / 2, playerY + playerSize * 0.7);
  }

  // HP boxes
  drawHPBox(ctx, 10, 10, 280, enemy.name, enemy.level, enemy.hp, enemy.maxHp, enemy.shiny);
  drawHPBox(ctx, W - 300, H - 100, 290, player.name, player.level, player.hp, player.maxHp, player.shiny);

  // Round badge
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  roundRect(ctx, W / 2 - 65, 14, 130, 38, 19);
  ctx.fill();
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 17px Sans";
  ctx.textAlign = "center";
  ctx.fillText(`⚔ ROUND ${round}`, W / 2, 38);

  // Damage callout
  if (damage != null && hitSide) {
    const cx = hitSide === "enemy" ? enemyX + enemySize / 2 : playerX + playerSize / 2;
    const cy = hitSide === "enemy" ? enemyY - 20 : playerY - 10;
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = `bold ${crit ? 52 : 40}px Sans`;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 5;
    const label = `-${damage}`;
    ctx.strokeText(label, cx, cy);
    ctx.fillStyle = crit ? "#ffd700" : "#ff4444";
    ctx.fillText(label, cx, cy);
    if (crit) {
      ctx.font = "bold 18px Sans";
      ctx.fillStyle = "#ffd700";
      ctx.fillText("CRITICAL!", cx, cy - 30);
    }
    ctx.restore();
  }

  // Status text box at bottom
  if (statusText) {
    roundRect(ctx, 10, H - 60, W - 20, 46, 8);
    ctx.fillStyle = "rgba(240,248,255,0.95)";
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.font = "bold 16px Sans";
    ctx.textAlign = "left";
    ctx.fillText(statusText, 22, H - 30);
  }

  return canvas.toBuffer("image/png");
}

/**
 * Draw the pokeball throw animation / catch result.
 * @param {object} opts
 * @param {object} opts.pokemon — { name, imageUrl, level }
 * @param {string} opts.ballType — key from POKEBALL_CATCH_RATES
 * @param {boolean} opts.caught
 * @param {string} [opts.trainerName]
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateCatchScene({ pokemon, ballType, caught, trainerName = "Trainer" }) {
  const W = 960, H = 400;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1a1a2e");
  bg.addColorStop(1, "#16213e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Stars
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 60; i++) {
    const sx = Math.random() * W;
    const sy = Math.random() * H * 0.6;
    const sr = Math.random() * 1.5 + 0.5;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pokémon sprite (left)
  const pokeImg = await loadImageSafe(pokemon.imageUrl, pokemon.name);
  const pokeSize = 200;
  const pokeX = 80;
  const pokeY = (H - pokeSize) / 2;

  if (caught) {
    // Desaturated / fading into ball
    if (pokeImg) {
      ctx.save();
      try { ctx.filter = "grayscale(0.7) brightness(1.2)"; } catch {}
      ctx.globalAlpha = 0.5;
      ctx.drawImage(pokeImg, pokeX, pokeY, pokeSize, pokeSize);
      ctx.filter = "none";
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  } else {
    if (pokeImg) ctx.drawImage(pokeImg, pokeX, pokeY, pokeSize, pokeSize);
  }

  // Pokemon name + level
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px Sans";
  ctx.textAlign = "center";
  ctx.fillText(`${pokemon.name} Lv.${pokemon.level}`, pokeX + pokeSize / 2, pokeY + pokeSize + 28);

  // Pokéball (center-right)
  const ballX = W / 2 + 60;
  const ballY = H / 2;
  const ballR = 70;

  // Ball shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(ballX, ballY + ballR + 8, ballR * 0.8, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top half
  const ballColor = getBallColor(ballType);
  ctx.fillStyle = ballColor.top;
  ctx.beginPath();
  ctx.arc(ballX, ballY, ballR, Math.PI, 0);
  ctx.fill();

  // Bottom half
  ctx.fillStyle = ballColor.bottom;
  ctx.beginPath();
  ctx.arc(ballX, ballY, ballR, 0, Math.PI);
  ctx.fill();

  // Center band
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(ballX - ballR, ballY);
  ctx.lineTo(ballX + ballR, ballY);
  ctx.stroke();

  // Center button
  ctx.fillStyle = caught ? "#ffe000" : "#fff";
  ctx.beginPath();
  ctx.arc(ballX, ballY, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Shine
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.arc(ballX - 22, ballY - 22, 18, 0, Math.PI * 2);
  ctx.fill();

  // Result text (right side)
  const resultX = W * 0.78;
  const resultY = H / 2;

  if (caught) {
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 38px Sans";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    ctx.strokeText("GOTCHA!", resultX, resultY - 20);
    ctx.fillText("GOTCHA!", resultX, resultY - 20);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px Sans";
    ctx.fillText(`${pokemon.name} was caught!`, resultX, resultY + 20);
    ctx.fillStyle = "#aef";
    ctx.font = "18px Sans";
    ctx.fillText(`by ${trainerName}`, resultX, resultY + 50);
  } else {
    ctx.fillStyle = "#ff6b6b";
    ctx.font = "bold 36px Sans";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    ctx.strokeText("BROKE FREE!", resultX, resultY - 20);
    ctx.fillText("BROKE FREE!", resultX, resultY - 20);
    ctx.fillStyle = "#fff";
    ctx.font = "20px Sans";
    ctx.fillText(`${pokemon.name} escaped!`, resultX, resultY + 20);
    ctx.fillStyle = "#faa";
    ctx.font = "16px Sans";
    ctx.fillText("Try again with a stronger ball.", resultX, resultY + 50);
  }

  return canvas.toBuffer("image/png");
}

function getBallColor(ballType) {
  const colors = {
    pokeball:    { top: "#ff1a1a", bottom: "#fff" },
    greatball:   { top: "#1a6bff", bottom: "#fff" },
    ultraball:   { top: "#f7d02c", bottom: "#1a1a1a" },
    masterball:  { top: "#9c27b0", bottom: "#e91e8c" },
    premierball: { top: "#fff",    bottom: "#fff" },
    healball:    { top: "#ff80ab", bottom: "#fff" },
    duskball:    { top: "#37474f", bottom: "#263238" },
    netball:     { top: "#00695c", bottom: "#fff" },
    luxuryball:  { top: "#1a1a1a", bottom: "#e65100" },
    quickball:   { top: "#1a1aff", bottom: "#f7d02c" },
  };
  return colors[ballType] || colors.pokeball;
}

/**
 * Battle result card after a battle ends.
 */
export async function generateBattleResult({ winner, loser, rewardText = "", outcome = "victory" }) {
  const W = 960, H = 480;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createRadialGradient(W / 2, 200, 30, W / 2, 200, 600);
  bg.addColorStop(0, "#2d2000");
  bg.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Banner
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 56px Sans";
  ctx.fillText(outcome === "fled" ? "🏃 FLED FROM BATTLE!" : "🏆 VICTORY!", W / 2, 70);

  // Winner image
  const wImg = await loadImageSafe(winner.imageUrl, winner.name);
  const loserImg = await loadImageSafe(loser.imageUrl, loser.name);

  const wSize = 220;
  const wX = (W - wSize) / 2;
  const wY = 100;

  if (wImg) {
    // Draw winner with glow
    ctx.save();
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 30;
    ctx.drawImage(wImg, wX, wY, wSize, wSize);
    ctx.restore();
  }

  ctx.fillStyle = "#fff";
  ctx.font = "bold 28px Sans";
  ctx.textAlign = "center";
  ctx.fillText(winner.name, W / 2, wY + wSize + 36);
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 16px Sans";
  ctx.fillText("WINNER", W / 2, wY + wSize + 60);

  // Loser — small, desaturated
  if (loserImg) {
    const lSize = 110;
    ctx.save();
    try { ctx.filter = "grayscale(1) brightness(0.5)"; } catch {}
    ctx.drawImage(loserImg, W - lSize - 40, H - lSize - 40, lSize, lSize);
    ctx.filter = "none";
    ctx.restore();
  }
  ctx.fillStyle = "#777";
  ctx.font = "14px Sans";
  ctx.textAlign = "right";
  ctx.fillText(loser.name, W - 40, H - 20);

  // Rewards
  if (rewardText) {
    roundRect(ctx, W / 2 - 200, H - 70, 400, 40, 10);
    ctx.fillStyle = "rgba(255,215,0,0.15)";
    ctx.fill();
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 18px Sans";
    ctx.textAlign = "center";
    ctx.fillText(rewardText, W / 2, H - 42);
  }

  return canvas.toBuffer("image/png");
}

/**
 * Starter Pokémon selection canvas.
 * Shows all 7 starters in a 4x2 grid (last row centred) with their names and types.
 * @param {Array} starters — [{ name, displayName, type, emoji, id }]
 */
export async function generateStarterCanvas(starters) {
  const COLS = 4;
  const CELL_W = 220;
  const CELL_H = 220;
  const PAD = 20;
  const HEADER_H = 80;

  const rows = Math.ceil(starters.length / COLS);
  const W = COLS * CELL_W + (COLS + 1) * PAD;
  const H = HEADER_H + rows * CELL_H + (rows + 1) * PAD + 20;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0d1b2a");
  bg.addColorStop(1, "#1b2838");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Starfield
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 80; i++) {
    const sx = Math.random() * W;
    const sy = Math.random() * H;
    const sr = Math.random() * 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Header
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 34px Sans";
  ctx.fillText("✨ CHOOSE YOUR STARTER POKÉMON! ✨", W / 2, 50);

  // Load all images in parallel
  const images = await Promise.all(
    starters.map((s) =>
      loadImageSafe(
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${s.id}.png`,
        s.name
      )
    )
  );

  for (let i = 0; i < starters.length; i++) {
    const row = Math.floor(i / COLS);
    const col = i % COLS;

    // Centre last row if it's not full
    const rowCount = Math.min(COLS, starters.length - row * COLS);
    const rowStart = (W - (rowCount * CELL_W + (rowCount - 1) * PAD)) / 2;

    const x = rowStart + col * (CELL_W + PAD);
    const y = HEADER_H + PAD + row * (CELL_H + PAD);

    // Card background
    roundRect(ctx, x, y, CELL_W, CELL_H, 14);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,215,0,0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Number badge
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 18px Sans";
    ctx.textAlign = "left";
    ctx.fillText(`#${i + 1}`, x + 10, y + 24);

    // Pokémon image
    const img = images[i];
    const imgSize = 130;
    const imgX = x + (CELL_W - imgSize) / 2;
    const imgY = y + 28;
    if (img) {
      ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(imgX, imgY, imgSize, imgSize);
      ctx.fillStyle = "#888";
      ctx.font = "40px Sans";
      ctx.textAlign = "center";
      ctx.fillText("?", x + CELL_W / 2, imgY + imgSize / 2 + 14);
    }

    // Name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 17px Sans";
    ctx.textAlign = "center";
    ctx.fillText(starters[i].displayName, x + CELL_W / 2, y + 175);

    // Type
    ctx.fillStyle = "#aad4ff";
    ctx.font = "13px Sans";
    ctx.fillText(`${starters[i].emoji} ${starters[i].type}`, x + CELL_W / 2, y + 196);
  }

  // Footer hint
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "15px Sans";
  ctx.textAlign = "center";
  ctx.fillText("Reply .startjourney <number or name> to choose", W / 2, H - 10);

  return canvas.toBuffer("image/png");
}

/**
 * Party overview canvas.
 * Pikachu-themed battlefield background with all party Pokémon shown as sprites.
 * @param {Array} party  [{ name, displayName, level, hp, maxHp, primaryType, imageUrl, shiny, attack, defense, speed }]
 * @param {string} trainerName
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generatePartyCanvas(party, trainerName = "Trainer") {
  const W = 960;
  const H = 540;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── Background: Pikachu yellow stadium ──
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  skyGrad.addColorStop(0, "#fff9c4");
  skyGrad.addColorStop(1, "#ffe082");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Ground strip
  const groundGrad = ctx.createLinearGradient(0, H * 0.55, 0, H);
  groundGrad.addColorStop(0, "#8bc34a");
  groundGrad.addColorStop(1, "#558b2f");
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);

  // Stadium ellipse arc
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.55, W * 0.5, 60, 0, Math.PI, 0);
  ctx.stroke();
  ctx.restore();

  // Lightning bolt watermark
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#f9a825";
  ctx.beginPath();
  ctx.moveTo(W * 0.44, H * 0.08);
  ctx.lineTo(W * 0.38, H * 0.48);
  ctx.lineTo(W * 0.52, H * 0.38);
  ctx.lineTo(W * 0.46, H * 0.84);
  ctx.lineTo(W * 0.56, H * 0.44);
  ctx.lineTo(W * 0.42, H * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Header bar
  roundRect(ctx, 0, 0, W, 54, 0);
  ctx.fillStyle = "rgba(0,0,0,0.58)";
  ctx.fill();
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 27px Sans";
  ctx.textAlign = "left";
  ctx.fillText(`⚡ ${trainerName}'s Party (${party.length}/6)`, 20, 38);

  // Load sprites
  const imgs = await Promise.all(
    party.map((p) => loadImageSafe(p.imageUrl, p.name))
  );

  const typeColors = {
    fire:"#ff6f00",water:"#0277bd",grass:"#388e3c",electric:"#f9a825",
    psychic:"#ad1457",normal:"#546e7a",flying:"#0288d1",bug:"#558b2f",
    poison:"#6a1b9a",rock:"#5d4037",ground:"#ef6c00",ice:"#00838f",
    fighting:"#b71c1c",ghost:"#4a148c",dragon:"#1a237e",dark:"#212121",
    steel:"#455a64",fairy:"#e91e63",
  };
  const typeEmojis = {
    fire:"🔥",water:"💧",grass:"🍃",electric:"⚡",psychic:"🔮",normal:"⭐",
    flying:"🌤️",bug:"🐛",poison:"☠️",rock:"🪨",ground:"🌍",ice:"❄️",
    fighting:"🥊",ghost:"👻",dragon:"🐉",dark:"🌑",steel:"⚙️",fairy:"🌸",
  };

  const COLS = Math.min(party.length, 3);
  const CARD_W = 280;
  const CARD_H = 200;
  const GAP_X = 20;
  const GAP_Y = 16;

  for (let i = 0; i < party.length; i++) {
    const p = party[i];
    const row = Math.floor(i / COLS);
    const col = i % COLS;

    // Centre the row (handles last row with fewer cards)
    const rowCount = Math.min(COLS, party.length - row * COLS);
    const rowStartX = (W - (rowCount * CARD_W + (rowCount - 1) * GAP_X)) / 2;

    const cx = rowStartX + col * (CARD_W + GAP_X);
    const cy = 64 + row * (CARD_H + GAP_Y);

    const typeColor = typeColors[p.primaryType] || "#546e7a";
    const isFainted = p.hp <= 0;

    // Card background
    roundRect(ctx, cx, cy, CARD_W, CARD_H, 14);
    const cardGrad = ctx.createLinearGradient(cx, cy, cx, cy + CARD_H);
    cardGrad.addColorStop(0, isFainted ? "rgba(30,30,30,0.85)" : "rgba(18,18,36,0.85)");
    cardGrad.addColorStop(1, isFainted ? "rgba(50,50,50,0.85)" : `${typeColor}55`);
    ctx.fillStyle = cardGrad;
    ctx.fill();
    ctx.strokeStyle = isFainted ? "#555" : typeColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Pokémon sprite (right side of card)
    const img = imgs[i];
    const spriteSize = 120;
    const spriteX = cx + CARD_W - spriteSize - 6;
    const spriteY = cy + (CARD_H - spriteSize) / 2;
    if (img) {
      ctx.save();
      if (isFainted) {
        try { ctx.filter = "grayscale(1) brightness(0.35)"; } catch {}
      }
      ctx.drawImage(img, spriteX, spriteY, spriteSize, spriteSize);
      if (isFainted) { try { ctx.filter = "none"; } catch {} }
      ctx.restore();
    }

    // Slot number
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 15px Sans";
    ctx.textAlign = "left";
    ctx.fillText(`#${i + 1}`, cx + 10, cy + 22);

    // Shiny
    if (p.shiny) {
      ctx.fillStyle = "#ffe57f";
      ctx.font = "13px Sans";
      ctx.textAlign = "right";
      ctx.fillText("✨", cx + CARD_W - 10, cy + 22);
    }

    // Name
    const nick = p.nickname ? ` "${p.nickname}"` : "";
    ctx.fillStyle = isFainted ? "#888" : "#ffffff";
    ctx.font = "bold 16px Sans";
    ctx.textAlign = "left";
    ctx.fillText(`${p.displayName || p.name}${nick}`, cx + 10, cy + 46);

    // Level + type
    const emoji = typeEmojis[p.primaryType] || "⭐";
    ctx.fillStyle = isFainted ? "#666" : "#aad4ff";
    ctx.font = "13px Sans";
    ctx.fillText(`Lv.${p.level}  ${emoji} ${p.primaryType}`, cx + 10, cy + 66);

    // HP bar
    const barW = 148;
    const barH = 10;
    const barX = cx + 10;
    const barY = cy + 82;
    const hpPct = Math.max(0, Math.min(1, p.hp / p.maxHp));
    const barCol = hpPct > 0.5 ? "#4caf50" : hpPct > 0.2 ? "#ff9800" : "#f44336";

    roundRect(ctx, barX, barY, barW, barH, 5);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();
    if (hpPct > 0) {
      roundRect(ctx, barX, barY, barW * hpPct, barH, 5);
      ctx.fillStyle = barCol;
      ctx.fill();
    }

    ctx.fillStyle = isFainted ? "#888" : "#ddd";
    ctx.font = "12px Sans";
    ctx.fillText(`❤️ ${p.hp}/${p.maxHp}${isFainted ? " 💀" : ""}`, barX, barY + 24);

    // Stats
    ctx.fillStyle = isFainted ? "#555" : "#aaa";
    ctx.font = "12px Sans";
    ctx.fillText(`⚔️${p.attack}  🛡️${p.defense}  💨${p.speed || "?"}`, barX, barY + 44);
  }

  // Footer
  ctx.fillStyle = "rgba(0,0,0,0.52)";
  ctx.fillRect(0, H - 34, W, 34);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "14px Sans";
  ctx.textAlign = "center";
  ctx.fillText("⚡ Pikachu says: Ready to battle! ⚡", W / 2, H - 10);

  return canvas.toBuffer("image/png");
}
