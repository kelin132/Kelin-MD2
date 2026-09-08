/**
 * KELIN MD — Dungeon Crawler Canvas Generator (v2)
 * Character sheet / room reveal / battle / result cards
 */

let _canvasPromise;
async function getCanvas() {
  _canvasPromise ??= import("canvas");
  return _canvasPromise;
}

const CLASS_COLORS = {
  warrior: "#e0a03c",
  mage: "#7a5cff",
  rogue: "#3ddc72",
};

const RARITY_COLORS = { Common: "#9aa4b2", Rare: "#38a3ff", Epic: "#b45cff" };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x + r, y);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillText(ctx, text, x, y, { font, color, align = "left" }) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

function bgGradient(ctx, W, H, top = "#120c08", bottom = "#040302") {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function torchParticles(ctx, W, H, count = 40) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = Math.random() * 0.4 + 0.05;
    ctx.fillStyle = Math.random() > 0.5 ? "#ffb347" : "#ffffff";
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 1.3 + 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBar(ctx, x, y, w, h, pct, color, bgColor = "rgba(255,255,255,0.08)") {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  const p = Math.max(0, Math.min(1, pct));
  if (p > 0) {
    roundRect(ctx, x, y, w * p, h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function drawHero(ctx, cx, cy, size, classKey, hasWeapon, hasArmor) {
  const color = CLASS_COLORS[classKey] || "#cccccc";
  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.35;

  ctx.beginPath();
  ctx.moveTo(-size * 0.4, size);
  ctx.quadraticCurveTo(-size * 0.5, -size * 0.1, 0, -size * 0.3);
  ctx.quadraticCurveTo(size * 0.5, -size * 0.1, size * 0.4, size);
  ctx.closePath();
  ctx.fillStyle = hasArmor ? "#7d8a9a" : color;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, -size * 0.55, size * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "#e8c9a0";
  ctx.fill();

  const weaponColor = hasWeapon ? "#ffd76b" : "#d8d8e0";

  if (classKey === "warrior") {
    ctx.strokeStyle = weaponColor;
    ctx.lineWidth = size * 0.09;
    ctx.beginPath();
    ctx.moveTo(size * 0.45, size * 0.1);
    ctx.lineTo(size * 0.9, -size * 0.55);
    ctx.stroke();
    ctx.fillStyle = "#8a5a2b";
    roundRect(ctx, -size * 0.75, -size * 0.15, size * 0.32, size * 0.5, 6);
    ctx.fill();
  } else if (classKey === "mage") {
    ctx.strokeStyle = "#8a5a2b";
    ctx.lineWidth = size * 0.07;
    ctx.beginPath();
    ctx.moveTo(size * 0.55, size);
    ctx.lineTo(size * 0.7, -size * 0.65);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size * 0.7, -size * 0.72, size * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = hasWeapon ? "#ffd76b" : "#9fe3f5";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = size * 0.4;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-size * 0.32, -size * 0.68);
    ctx.lineTo(0, -size * 1.25);
    ctx.lineTo(size * 0.32, -size * 0.68);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = weaponColor;
    ctx.lineWidth = size * 0.08;
    ctx.beginPath();
    ctx.moveTo(size * 0.35, size * 0.15);
    ctx.lineTo(size * 0.7, -size * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.35, size * 0.15);
    ctx.lineTo(-size * 0.7, -size * 0.3);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(0, -size * 0.58, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawEnemy(ctx, cx, cy, size, isBoss, isElite) {
  ctx.save();
  ctx.translate(cx, cy);
  const color = isBoss ? "#ff4747" : isElite ? "#ffb020" : "#9a5cff";
  ctx.shadowColor = color;
  ctx.shadowBlur = size * (isBoss ? 0.6 : isElite ? 0.5 : 0.35);

  ctx.beginPath();
  ctx.moveTo(-size * 0.5, size * 0.9);
  ctx.quadraticCurveTo(-size * 0.6, -size * 0.2, 0, -size * 0.5);
  ctx.quadraticCurveTo(size * 0.6, -size * 0.2, size * 0.5, size * 0.9);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff200";
  ctx.beginPath();
  ctx.arc(-size * 0.18, -size * 0.25, size * 0.08, 0, Math.PI * 2);
  ctx.arc(size * 0.18, -size * 0.25, size * 0.08, 0, Math.PI * 2);
  ctx.fill();

  if (isBoss || isElite) {
    ctx.strokeStyle = "#ffb020";
    ctx.lineWidth = size * 0.06;
    for (const dx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dx * size * 0.25, -size * 0.5);
      ctx.lineTo(dx * size * 0.45, -size * 0.85);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/* ────────────────────────────────────────────────────────────────────── */
export async function generateCharacterCard({ character, effAtk, effDef }) {
  const { createCanvas } = await getCanvas();
  const W = 800, H = 520;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const color = CLASS_COLORS[character.class] || "#ccc";

  bgGradient(ctx, W, H);
  torchParticles(ctx, W, H, 30);

  fillText(ctx, character.name, 200, 62, { font: "bold 28px Sans", color: "#fff" });
  const prestigeTag = character.prestige > 0 ? `  ⭐x${character.prestige}` : "";
  fillText(ctx, `Lv.${character.level} ${character.class[0].toUpperCase() + character.class.slice(1)}${prestigeTag}`, 200, 88, { font: "15px Sans", color });

  drawHero(ctx, 100, 210, 75, character.class, !!character.weapon, !!character.armor);

  const barX = 200, barW = 560;
  fillText(ctx, `HP  ${character.hp}/${character.maxHp}`, barX, 128, { font: "bold 13px Sans", color: "#ff8080" });
  drawBar(ctx, barX, 136, barW, 16, character.hp / character.maxHp, "#ff4747");

  const xpNeed = 50 * character.level;
  fillText(ctx, `XP  ${character.xp}/${xpNeed}`, barX, 170, { font: "bold 13px Sans", color: "#9fe3f5" });
  drawBar(ctx, barX, 178, barW, 16, character.xp / xpNeed, "#38a3ff");

  const stats = [
    ["⚔️ ATK", `${effAtk}${character.weapon ? ` (+${character.weapon.bonus})` : ""}`],
    ["🛡 DEF", `${effDef}${character.armor ? ` (+${character.armor.bonus})` : ""}`],
    ["🍀 CRIT", `${Math.round(character.crit * 100)}%`],
    ["💰 Gold", character.gold],
    ["🧪 Potions", character.potions],
    ["🚪 Rooms Cleared", character.roomsCleared],
  ];
  const colW = 280;
  stats.forEach(([label, val], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = barX + col * colW;
    const y = 218 + row * 42;
    roundRect(ctx, x, y, colW - 16, 34, 8);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    fillText(ctx, label, x + 14, y + 22, { font: "12px Sans", color: "#9aa4b2" });
    fillText(ctx, String(val), x + colW - 30, y + 23, { font: "bold 15px Sans", color: "#fff", align: "right" });
  });

  // equipment slots
  const eqY = 356;
  fillText(ctx, "EQUIPMENT", barX, eqY, { font: "bold 12px Sans", color: "#8891a0" });
  [character.weapon, character.armor].forEach((item, i) => {
    const x = barX + i * 284;
    const y = eqY + 10;
    roundRect(ctx, x, y, 268, 44, 8);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.strokeStyle = item ? RARITY_COLORS[item.rarity] : "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    fillText(ctx, item ? `${i === 0 ? "⚔️" : "🛡"} ${item.name}` : `${i === 0 ? "⚔️" : "🛡"} (empty)`, x + 12, y + 27, {
      font: "13px Sans",
      color: item ? "#fff" : "#666",
    });
  });

  fillText(ctx, `💀 Deaths: ${character.deaths}`, W - 20, H - 16, { font: "12px Sans", color: "#665", align: "right" });
  fillText(ctx, `🎒 ${character.inventory.length} item${character.inventory.length === 1 ? "" : "s"} in bag`, 20, H - 16, { font: "12px Sans", color: "#665" });

  return canvas.toBuffer("image/png");
}

/* ────────────────────────────────────────────────────────────────────── */
const ROOM_LABELS = {
  enemy: "⚔️ Monster Ambush",
  boss: "👑 Boss Chamber",
  treasure: "💰 Treasure Room",
  rest: "🔥 Resting Point",
  trap: "🕳 Trap!",
  merchant: "🛒 Traveling Merchant",
  event: "❓ Mysterious Event",
};

export async function generateRoomCard({ type, roomNumber, totalRooms, detail, difficulty }) {
  const { createCanvas } = await getCanvas();
  const W = 800, H = 420;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  bgGradient(ctx, W, H, "#0e0a08", "#030201");
  torchParticles(ctx, W, H, 45);

  ctx.save();
  ctx.strokeStyle = "rgba(120,90,60,0.5)";
  ctx.lineWidth = 4;
  roundRect(ctx, 30, 30, W - 60, H - 130, 16);
  ctx.stroke();
  ctx.restore();

  fillText(ctx, `ROOM ${roomNumber}/${totalRooms}${difficulty ? `  •  ${difficulty}` : ""}`, W / 2, 70, { font: "bold 18px Sans", color: "#c8a06a", align: "center" });
  fillText(ctx, ROOM_LABELS[type] || type, W / 2, 200, { font: "bold 38px Sans", color: "#fff", align: "center" });
  if (detail) fillText(ctx, detail, W / 2, 240, { font: "16px Sans", color: "#b9c0cc", align: "center" });

  drawBar(ctx, 60, H - 60, W - 120, 18, roomNumber / totalRooms, "#c8a06a");
  fillText(ctx, "dungeon progress", W / 2, H - 68, { font: "12px Sans", color: "#8891a0", align: "center" });

  return canvas.toBuffer("image/png");
}

/* ────────────────────────────────────────────────────────────────────── */
export async function generateBattleCard({ character, enemy, lastLine, effAtk, effDef, skillAvailable }) {
  const { createCanvas } = await getCanvas();
  const W = 900, H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  bgGradient(ctx, W, H, enemy.isBoss ? "#240707" : enemy.isElite ? "#241a05" : "#12070f", "#030201");
  torchParticles(ctx, W, H, 40);

  fillText(ctx, enemy.isBoss ? "👑 BOSS BATTLE" : enemy.isElite ? "⚡ ELITE BATTLE" : "⚔️ BATTLE", W / 2, 40, {
    font: "bold 24px Sans",
    color: enemy.isBoss ? "#ff4747" : enemy.isElite ? "#ffb020" : "#ff9f43",
    align: "center",
  });

  drawHero(ctx, 170, 250, 90, character.class, !!character.weapon, !!character.armor);
  drawEnemy(ctx, W - 170, 250, enemy.isBoss ? 110 : enemy.isElite ? 96 : 85, enemy.isBoss, enemy.isElite);

  fillText(ctx, `${character.name} (⚔️${effAtk} 🛡${effDef})`, 170, 370, { font: "bold 15px Sans", color: "#fff", align: "center" });
  drawBar(ctx, 60, 382, 220, 16, character.hp / character.maxHp, "#50EF39");
  fillText(ctx, `${character.hp}/${character.maxHp}`, 170, 414, { font: "13px Sans", color: "#cfd6e0", align: "center" });

  fillText(ctx, enemy.name, W - 170, 370, { font: "bold 16px Sans", color: "#fff", align: "center" });
  drawBar(ctx, W - 280, 382, 220, 16, enemy.hp / enemy.maxHp, "#ff4747");
  fillText(ctx, `${enemy.hp}/${enemy.maxHp}`, W - 170, 414, { font: "13px Sans", color: "#cfd6e0", align: "center" });

  fillText(ctx, "VS", W / 2, 250, { font: "bold 28px Sans", color: "#665", align: "center" });

  fillText(ctx, skillAvailable ? "✨ skill ready" : "✨ skill used", W / 2, 440, {
    font: "bold 13px Sans",
    color: skillAvailable ? "#F6F657" : "#555",
    align: "center",
  });

  if (lastLine) {
    roundRect(ctx, W / 2 - 280, H - 46, 560, 34, 10);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fill();
    fillText(ctx, lastLine, W / 2, H - 23, { font: "13px Sans", color: "#F6F657", align: "center" });
  }

  return canvas.toBuffer("image/png");
}

/* ────────────────────────────────────────────────────────────────────── */
export async function generateResultCard({ success, character, roomsCleared, meta = {} }) {
  const { createCanvas } = await getCanvas();
  const W = 800, H = 460;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  bgGradient(ctx, W, H, success ? "#06210f" : "#1a0505", "#030201");
  torchParticles(ctx, W, H, 40);

  fillText(ctx, success ? "🏆 DUNGEON CLEARED!" : "💀 YOU DIED", W / 2, 80, {
    font: "bold 38px Sans",
    color: success ? "#50EF39" : "#ff4747",
    align: "center",
  });

  drawHero(ctx, W / 2, 220, 90, character.class, !!character.weapon, !!character.armor);

  fillText(ctx, `${character.name} — Lv.${character.level}`, W / 2, 320, { font: "bold 20px Sans", color: "#fff", align: "center" });
  fillText(ctx, `( reached room ${roomsCleared} )`, W / 2, 346, { font: "14px Sans", color: "#9aa4b2", align: "center" });

  const lines = [];
  if (meta.xpGainedTotal) lines.push(`+${meta.xpGainedTotal} XP`);
  if (meta.goldGainedTotal) lines.push(`+$${meta.goldGainedTotal} gold`);
  if (meta.goldLost) lines.push(`-$${meta.goldLost} gold lost`);
  if (lines.length) {
    fillText(ctx, lines.join("   •   "), W / 2, 400, { font: "16px Sans", color: "#F6F657", align: "center" });
  }

  return canvas.toBuffer("image/png");
}

/* ────────────────────────────────────────────────────────────────────── */
export async function generateLeaderboardCard({ entries }) {
  const { createCanvas } = await getCanvas();
  const W = 800, H = 120 + entries.length * 62;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  bgGradient(ctx, W, H);
  torchParticles(ctx, W, H, 30);

  fillText(ctx, "🏰 DUNGEON LEADERBOARD", W / 2, 54, { font: "bold 26px Sans", color: "#fff", align: "center" });
  fillText(ctx, "( ranked by prestige, then level )", W / 2, 78, { font: "13px Sans", color: "#8891a0", align: "center" });

  entries.forEach((e, i) => {
    const y = 104 + i * 62;
    roundRect(ctx, 40, y, W - 80, 50, 10);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    const medal = ["🥇", "🥈", "🥉"][i] || `#${i + 1}`;
    fillText(ctx, medal, 66, y + 33, { font: "bold 20px Sans", color: "#F6F657", align: "center" });
    const prestigeTag = e.prestige > 0 ? ` ⭐x${e.prestige}` : "";
    fillText(ctx, `${e.name} (${e.class})${prestigeTag}`, 100, y + 30, { font: "bold 15px Sans", color: "#fff" });
    fillText(ctx, `Lv.${e.level}  •  $${e.gold.toLocaleString()}`, W - 60, y + 30, { font: "13px Sans", color: "#9fe3f5", align: "right" });
  });

  return canvas.toBuffer("image/png");
}
