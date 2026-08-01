/**
 * KELIN MD — Profile card image generator (v3 — Sakura Night)
 * Full redesign: anime cherry-blossom tree background, pink accents,
 * level-roles section in the right panel.
 * Canvas size: 900 × 540
 */

const canvasModulePromise = import("canvas");
async function getCanvasModule() { return canvasModulePromise; }

async function loadImageSafe(url, timeoutMs = 5000) {
  if (!url) return null;
  try {
    const { loadImage } = await getCanvasModule();
    return await Promise.race([
      loadImage(url),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
  } catch { return null; }
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

function drawStatBox(ctx, x, y, w, h, label, value, glowColor) {
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur  = 12;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = glowColor;
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = glowColor;
  ctx.font      = "bold 12px Sans";
  ctx.textAlign = "left";
  ctx.fillText(label.toUpperCase(), x + 12, y + 18);
  ctx.fillStyle = "#ffffff";
  ctx.font      = "bold 20px Sans";
  ctx.fillText(value, x + 12, y + h - 10);
}

// ── Seeded RNG for consistent tree/petal placement ────────────────────────────
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 0x100000000;
  };
}

// ── Sakura tree & scene ───────────────────────────────────────────────────────
function drawSakuraBg(ctx, W, H) {
  const rng = makeRng(0xDEADBEEF);

  /* Night sky gradient */
  const sky = ctx.createLinearGradient(0, 0, W, H);
  sky.addColorStop(0,   "#07071a");
  sky.addColorStop(0.4, "#18062e");
  sky.addColorStop(1,   "#07071a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  /* Stars */
  ctx.save();
  for (let i = 0; i < 90; i++) {
    const sx = rng() * W;
    const sy = rng() * H * 0.85;
    const sr = 0.5 + rng() * 1.3;
    ctx.globalAlpha = 0.3 + rng() * 0.55;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  /* Moon — top-right */
  const MX = W - 100, MY = 80, MR = 46;
  ctx.save();
  ctx.shadowColor = "#fff8e7";
  ctx.shadowBlur  = 55;
  const moonGlow = ctx.createRadialGradient(MX, MY, 0, MX, MY, MR * 2.5);
  moonGlow.addColorStop(0,   "rgba(255,248,220,0.22)");
  moonGlow.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = moonGlow;
  ctx.beginPath(); ctx.arc(MX, MY, MR * 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = "#fff8e7";
  ctx.shadowBlur  = 18;
  ctx.fillStyle   = "#fef9e7";
  ctx.beginPath(); ctx.arc(MX, MY, MR, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  /* ── Tree ── */
  ctx.save();
  ctx.lineCap  = "round";
  ctx.lineJoin = "round";

  const TRUNK = "#4a2f1a";

  // Helper to draw a branch
  function branch(x0, y0, x1, y1, cx, cy, lw) {
    ctx.strokeStyle = TRUNK;
    ctx.lineWidth   = lw;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
  }

  // Main trunk
  ctx.strokeStyle = TRUNK;
  ctx.lineWidth   = 20;
  ctx.beginPath();
  ctx.moveTo(860, H + 20);
  ctx.bezierCurveTo(850, H * 0.75, 790, H * 0.55, 720, 210);
  ctx.stroke();

  // Branch 1 — sweeps left (main flowering branch)
  branch(720, 210, 290, 55,  500, 55,  11);
  // Branch 2 — up-right toward moon area
  branch(760, 270, 890, 75,  830, 150,  8);
  // Branch 3 — drooping lower-left
  branch(750, 290, 580, 380, 670, 310,  7);
  // Sub-branch 1a — tip of branch 1
  branch(290, 55,  180, 100, 235, 45,   5);
  branch(290, 55,  320, -5,  300, 20,   4);
  // Sub-branch 1b — mid of branch 1
  branch(490, 80,  410, 20,  450, 35,   5);
  branch(490, 80,  540, 30,  515, 45,   4);
  // Sub-branch 2 — top of branch 2
  branch(890, 75,  900, 10,  900, 40,   4);
  ctx.restore();

  /* ── Blossom clusters ── */
  const clusters = [
    { x: 290, y: 55,  r: 62 },
    { x: 180, y: 100, r: 48 },
    { x: 320, y: -5,  r: 45 },
    { x: 490, y: 80,  r: 55 },
    { x: 540, y: 30,  r: 48 },
    { x: 410, y: 20,  r: 42 },
    { x: 720, y: 210, r: 50 },
    { x: 890, y: 75,  r: 58 },
    { x: 900, y: 10,  r: 42 },
    { x: 580, y: 380, r: 38 },
    { x: 630, y: 160, r: 35 },
  ];

  const PINKS = ["#ffb7c5","#ff9ab0","#ffd1dc","#ff6b9d","#ffccd5"];

  for (const cl of clusters) {
    ctx.save();
    const count = 14 + Math.floor(rng() * 10);
    for (let i = 0; i < count; i++) {
      const ang  = rng() * Math.PI * 2;
      const dist = rng() * cl.r;
      const bx   = cl.x + Math.cos(ang) * dist;
      const by   = cl.y + Math.sin(ang) * dist;
      const br   = 7 + rng() * 11;
      ctx.globalAlpha = 0.55 + rng() * 0.38;
      const gc = ctx.createRadialGradient(bx - br * 0.2, by - br * 0.2, 0, bx, by, br);
      gc.addColorStop(0, "#ffe4ec");
      gc.addColorStop(0.5, PINKS[Math.floor(rng() * PINKS.length)]);
      gc.addColorStop(1, "rgba(255,100,140,0.1)");
      ctx.fillStyle = gc;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /* ── Falling petals ── */
  ctx.save();
  for (let i = 0; i < 22; i++) {
    const px = rng() * W;
    const py = rng() * H;
    const pr = 3 + rng() * 5.5;
    const pa = rng() * Math.PI * 2;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(pa);
    ctx.globalAlpha = 0.5 + rng() * 0.4;
    ctx.fillStyle = PINKS[Math.floor(rng() * PINKS.length)];
    ctx.beginPath();
    ctx.ellipse(0, 0, pr * 0.55, pr, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ── Main generator ────────────────────────────────────────────────────────────
/**
 * @param {object} data
 * @param {string}  data.username
 * @param {string}  data.tag
 * @param {string}  data.role            — staff/premium/member role
 * @param {number}  data.level
 * @param {number}  data.xp
 * @param {number}  data.xpTarget
 * @param {number}  data.wallet
 * @param {number}  data.bank
 * @param {string}  [data.bio]
 * @param {string}  [data.guild]
 * @param {string}  [data.joined]
 * @param {number}  [data.streak]
 * @param {number}  [data.items]
 * @param {number}  [data.transactions]
 * @param {string}  [data.profileImage]
 * @param {{ name, emoji, color }}  [data.levelRole]    — current level role
 * @param {Array}   [data.earnedRoles]   — all earned role objects
 */
export async function generateProfileImage(data) {
  const { createCanvas } = await getCanvasModule();

  const W = 900, H = 540;
  const LEFT_W = 256;
  const PAD    = 14;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  /* ── Sakura night background ── */
  drawSakuraBg(ctx, W, H);

  /* ── Left panel ── */
  const leftGrad = ctx.createLinearGradient(0, 0, LEFT_W, 0);
  leftGrad.addColorStop(0, "rgba(8,3,18,0.93)");
  leftGrad.addColorStop(1, "rgba(15,5,28,0.82)");
  ctx.fillStyle = leftGrad;
  ctx.fillRect(0, 0, LEFT_W, H);
  ctx.strokeStyle = "rgba(255,100,150,0.18)";
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(LEFT_W, 0); ctx.lineTo(LEFT_W, H);
  ctx.stroke();

  /* ── Avatar ── */
  const AV_R  = 64;
  const AV_CX = LEFT_W / 2;
  const AV_CY = 104;

  // Glow ring
  ctx.save();
  ctx.shadowColor = "#ff6b9d";
  ctx.shadowBlur  = 30;
  ctx.beginPath();
  ctx.arc(AV_CX, AV_CY, AV_R + 5, 0, Math.PI * 2);
  ctx.strokeStyle = "#ff6b9d";
  ctx.lineWidth   = 2.5;
  ctx.stroke();
  ctx.restore();

  // Clip & draw avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2);
  ctx.clip();
  const avatar = await loadImageSafe(data.profileImage || null);
  if (avatar) {
    ctx.drawImage(avatar, AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  } else {
    const pg = ctx.createLinearGradient(AV_CX - AV_R, AV_CY - AV_R, AV_CX + AV_R, AV_CY + AV_R);
    pg.addColorStop(0, "#2a0a3a");
    pg.addColorStop(1, "#3d1040");
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.fillStyle = "rgba(255,107,157,0.5)";
    ctx.font      = "bold 52px Sans";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((data.username || "?")[0].toUpperCase(), AV_CX, AV_CY);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
  // Inner border
  ctx.save();
  ctx.beginPath();
  ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,107,157,0.65)";
  ctx.lineWidth   = 2;
  ctx.stroke();
  ctx.restore();

  /* ── Staff/premium role badge ── */
  const badgeY = AV_CY + AV_R + 13;
  const badgeW = 120, badgeH = 22;
  const badgeX = AV_CX - badgeW / 2;
  ctx.save();
  ctx.shadowColor = "#d4a017";
  ctx.shadowBlur  = 10;
  ctx.fillStyle   = "#1a1000";
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 11);
  ctx.fill();
  ctx.strokeStyle = "#d4a017";
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#d4a017";
  ctx.font      = "bold 11px Sans";
  ctx.textAlign = "center";
  ctx.fillText((data.role || "Member").toUpperCase(), AV_CX, badgeY + 15);

  /* ── Level role badge (pink) ── */
  const roleLabel = data.levelRole
    ? `${data.levelRole.emoji} ${data.levelRole.name}`.toUpperCase()
    : "NEWCOMER";
  const lr2Y = badgeY + badgeH + 6;
  const lr2W = 134, lr2H = 20;
  const lr2X = AV_CX - lr2W / 2;
  const roleColor = data.levelRole?.color || "#ff6b9d";
  ctx.save();
  ctx.shadowColor = roleColor;
  ctx.shadowBlur  = 8;
  ctx.fillStyle   = "rgba(20,0,15,0.85)";
  roundRect(ctx, lr2X, lr2Y, lr2W, lr2H, 10);
  ctx.fill();
  ctx.strokeStyle = roleColor;
  ctx.lineWidth   = 1.2;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = roleColor;
  ctx.font      = "bold 10px Sans";
  ctx.textAlign = "center";
  ctx.fillText(roleLabel, AV_CX, lr2Y + 14);

  /* ── Username ── */
  const nameY = lr2Y + lr2H + 18;
  ctx.fillStyle = "#ffffff";
  ctx.font      = "bold 21px Sans";
  ctx.textAlign = "center";
  const dname = (data.username || "User").length > 13
    ? (data.username || "User").slice(0, 13) + "…"
    : (data.username || "User");
  ctx.fillText(dname, AV_CX, nameY);

  ctx.fillStyle = "rgba(255,255,255,0.36)";
  ctx.font      = "13px Sans";
  ctx.fillText(`#${data.tag || "0"}`, AV_CX, nameY + 17);

  /* ── Info rows ── */
  const infoStartY = nameY + 36;
  const infoLineH  = 27;
  function drawInfoRow(label, value, iy) {
    ctx.fillStyle = "rgba(255,140,180,0.55)";
    ctx.font      = "bold 9px Sans";
    ctx.textAlign = "left";
    ctx.fillText(label.toUpperCase(), PAD + 4, iy);
    ctx.fillStyle = "#e8d0f8";
    ctx.font      = "12px Sans";
    ctx.fillText((value || "—").slice(0, 26), PAD + 4, iy + 13);
  }
  drawInfoRow("Bio",    data.bio    || "No bio set.",  infoStartY);
  drawInfoRow("Guild",  data.guild  || "None",          infoStartY + infoLineH);
  drawInfoRow("Joined", data.joined || "Unknown",        infoStartY + infoLineH * 2);

  /* ── Level + XP bar ── */
  const lvlY = H - 96;
  const barX = PAD + 4;
  const barW = LEFT_W - PAD * 2 - 8;
  const barH = 10;

  // Level circle
  ctx.save();
  ctx.shadowColor = "#ff6b9d";
  ctx.shadowBlur  = 16;
  ctx.fillStyle   = "#1a0010";
  ctx.beginPath(); ctx.arc(barX + 22, lvlY - 10, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#ff6b9d";
  ctx.lineWidth   = 2;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#ff6b9d";
  ctx.font      = "bold 18px Sans";
  ctx.textAlign = "center";
  ctx.fillText(String(data.level ?? 1), barX + 22, lvlY - 3);
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.font      = "bold 8px Sans";
  ctx.fillText("LEVEL", barX + 22, lvlY + 11);

  // XP label
  ctx.fillStyle = "#ffffff";
  ctx.font      = "bold 10px Sans";
  ctx.textAlign = "left";
  ctx.fillText(`${data.xp ?? 0} / ${data.xpTarget ?? 100} XP`, barX + 52, lvlY - 4);

  // XP bar track
  const bx = barX + 50, by = lvlY + 4, bw = barW - 50;
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  roundRect(ctx, bx, by, bw, barH, 5); ctx.fill();

  const pct = Math.min((data.xp ?? 0) / Math.max(data.xpTarget ?? 100, 1), 1);
  const xpGrad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  xpGrad.addColorStop(0, "#ff6b9d");
  xpGrad.addColorStop(1, "#ff4757");
  ctx.fillStyle = xpGrad;
  roundRect(ctx, bx, by, Math.max(bw * pct, barH), barH, 5); ctx.fill();

  /* ── Streak badge ── */
  if ((data.streak ?? 0) > 0) {
    const stY = H - 28;
    const stW = LEFT_W - PAD * 2;
    ctx.save();
    ctx.shadowColor = "#ff6b9d";
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = "#1a0010";
    roundRect(ctx, PAD, stY - 16, stW, 22, 11); ctx.fill();
    ctx.strokeStyle = "#ff6b9d";
    ctx.lineWidth   = 1.2;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#ff9db8";
    ctx.font      = "bold 11px Sans";
    ctx.textAlign = "center";
    ctx.fillText(`STREAK: ${data.streak} days`, LEFT_W / 2, stY - 1);
  }

  /* ════════════════════════════════════
     RIGHT PANEL
  ════════════════════════════════════ */
  const RX = LEFT_W + PAD;
  const RW = W - RX - PAD;

  /* Title */
  ctx.fillStyle = "#ffffff";
  ctx.font      = "bold 24px Sans";
  ctx.textAlign = "left";
  ctx.fillText("PLAYER PROFILE", RX, 34);
  ctx.fillStyle = "rgba(255,150,190,0.45)";
  ctx.font      = "11px Sans";
  ctx.fillText("KELIN MD  •  SAKURA NIGHT  v3", RX, 52);
  ctx.strokeStyle = "rgba(255,107,157,0.2)";
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(RX, 60); ctx.lineTo(RX + RW, 60); ctx.stroke();

  /* ── Earned roles strip ── */
  const earnedRoles = (data.earnedRoles || []).slice(-5); // last 5 earned
  if (earnedRoles.length > 0) {
    const tagY = 64;
    let tx = RX;
    const tagH = 20;
    ctx.font = "bold 10px Sans";
    for (const r of earnedRoles) {
      const label = r.name.toUpperCase();
      const tw    = ctx.measureText(label).width + 18;
      if (tx + tw > RX + RW) break;
      ctx.save();
      ctx.shadowColor = r.color;
      ctx.shadowBlur  = 6;
      ctx.fillStyle   = "rgba(10,0,20,0.7)";
      roundRect(ctx, tx, tagY, tw, tagH, 10);
      ctx.fill();
      ctx.strokeStyle = r.color;
      ctx.lineWidth   = 1;
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = r.color;
      ctx.font      = "bold 10px Sans";
      ctx.textAlign = "left";
      ctx.fillText(label, tx + 9, tagY + 14);
      tx += tw + 6;
    }
  }

  /* ── Stats grid ── */
  const GCOLS = 2, GAP = 10;
  const COL_W = (RW - GAP) / GCOLS;
  const ROW_H = 66, G_TOP = 90;

  const PINK   = "#ff6b9d";
  const PURPLE = "#a855f7";
  const TEAL   = "#2dd4bf";
  const GOLD   = "#d4a017";

  const fmtMoney = (n) => {
    if (n >= 1e12) return `$${(n/1e12).toFixed(1)}T`;
    if (n >= 1e9)  return `$${(n/1e9).toFixed(1)}B`;
    if (n >= 1e6)  return `$${(n/1e6).toFixed(1)}M`;
    if (n >= 1e3)  return `$${(n/1e3).toFixed(1)}K`;
    return `$${n.toLocaleString()}`;
  };

  const rows = [
    [
      { label: "Wallet",    value: fmtMoney(data.wallet ?? 0),            color: PINK   },
      { label: "Bank",      value: fmtMoney(data.bank   ?? 0),            color: PURPLE },
    ],
    [
      { label: "Level",     value: `Lv.${data.level ?? 1}`,               color: PINK   },
      { label: "Total XP",  value: `${(data.xp ?? 0).toLocaleString()}`,  color: TEAL   },
    ],
    [
      { label: "Inventory", value: `${data.items         ?? 0} items`,    color: TEAL   },
      { label: "Trades",    value: `${data.transactions  ?? 0} tx`,       color: PURPLE },
    ],
  ];

  rows.forEach((row, ri) => {
    const gy = G_TOP + ri * (ROW_H + GAP);
    row.forEach((cell, ci) => {
      drawStatBox(ctx, RX + ci * (COL_W + GAP), gy, COL_W, ROW_H, cell.label, cell.value, cell.color);
    });
  });

  // Net worth — full width
  const nwY = G_TOP + rows.length * (ROW_H + GAP);
  const netWorth = (data.wallet ?? 0) + (data.bank ?? 0);
  drawStatBox(ctx, RX, nwY, RW, ROW_H - 10, "Net Worth", fmtMoney(netWorth), GOLD);

  // Footnote
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.font      = "10px Sans";
  ctx.textAlign = "left";
  ctx.fillText(
    `Total XP: ${(data.xp ?? 0).toLocaleString()}  •  Joined: ${data.joined || "Unknown"}`,
    RX, H - 10
  );

  return canvas.toBuffer("image/png");
}

/* ── Helpers ── */
export async function getProfilePic(sock, jid) {
  try { return await sock.profilePictureUrl(jid, "image"); }
  catch { return null; }
}

export function resolveRole({ isOwner, isMod, isStaff, isPremium, staffLevel } = {}) {
  if (isOwner)                     return "Owner";
  if (staffLevel >= 3)             return "Admin";
  if (staffLevel >= 2 || isStaff)  return "Staff";
  if (staffLevel >= 1 || isMod)    return "Mod";
  if (isPremium)                   return "Premium";
  return "Member";
}
