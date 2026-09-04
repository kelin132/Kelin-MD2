/**
 * KELIN MD — Company Card Canvas Generator
 * 900 × 480  dark-gold corporate design
 * Owner avatar top-left, company info centre & right
 */

let _canvasPromise;
async function getCanvas() {
  _canvasPromise ??= import("canvas");
  return _canvasPromise;
}

async function loadImageSafe(url, timeoutMs = 7000) {
  if (!url) return null;
  try {
    const { loadImage } = await getCanvas();
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "Mozilla/5.0 (KelinMD-Bot)" },
    });
    if (!res.ok) return null;
    return await loadImage(Buffer.from(await res.arrayBuffer()));
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

function drawStatBox(ctx, x, y, w, h, label, value, color = "#d4a017") {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur  = 10;
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, "rgba(255,255,255,0.05)");
  grad.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = color + "66";
  ctx.lineWidth   = 1.2;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = color;
  ctx.font      = "bold 11px Sans";
  ctx.textAlign = "left";
  ctx.fillText(label.toUpperCase(), x + 10, y + 18);

  ctx.fillStyle = "#fff";
  ctx.font      = "bold 18px Sans";
  ctx.fillText(value, x + 10, y + h - 8);
}

/**
 * Generate a company info card.
 * @param {object} data
 * @param {string}  data.companyName
 * @param {string}  data.tierLabel    e.g. "Medium Company"
 * @param {string}  data.tierEmoji    e.g. "🏢"
 * @param {number}  data.tier
 * @param {number}  data.employeeCount
 * @param {number}  data.maxEmployees
 * @param {number}  data.dailyCost
 * @param {number}  data.totalPaid
 * @param {string}  data.ownerName    registered economy name
 * @param {string}  [data.ownerAvatarUrl]
 * @param {string}  [data.foundedDate]  e.g. "26 Jul 2026"
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateCompanyCard(data) {
  const { createCanvas } = await getCanvas();

  const W = 900, H = 480;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  /* ── BACKGROUND ─────────────────────────────────────────────── */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   "#09090f");
  bg.addColorStop(0.5, "#0d0d18");
  bg.addColorStop(1,   "#050510");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Gold top-right ambient glow
  const glow = ctx.createRadialGradient(W, 0, 0, W, 0, 400);
  glow.addColorStop(0,   "rgba(212,160,23,0.22)");
  glow.addColorStop(0.5, "rgba(120,80,5,0.07)");
  glow.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Subtle bottom-left green glow
  const glow2 = ctx.createRadialGradient(0, H, 0, 0, H, 280);
  glow2.addColorStop(0,   "rgba(0,160,100,0.10)");
  glow2.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  /* ── GOLD TOP BAR ───────────────────────────────────────────── */
  const topBar = ctx.createLinearGradient(0, 0, W, 0);
  topBar.addColorStop(0,   "#d4a017");
  topBar.addColorStop(0.5, "#f0c040");
  topBar.addColorStop(1,   "#d4a017");
  ctx.fillStyle = topBar;
  ctx.fillRect(0, 0, W, 5);

  /* ── LEFT PANEL (owner section) ─────────────────────────────── */
  const LP_W = 220;
  const lpGrad = ctx.createLinearGradient(0, 0, LP_W, 0);
  lpGrad.addColorStop(0, "rgba(12,10,25,0.95)");
  lpGrad.addColorStop(1, "rgba(18,14,35,0.80)");
  ctx.fillStyle = lpGrad;
  ctx.fillRect(0, 5, LP_W, H - 5);

  ctx.strokeStyle = "rgba(212,160,23,0.18)";
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(LP_W, 5);
  ctx.lineTo(LP_W, H);
  ctx.stroke();

  /* ── OWNER AVATAR ───────────────────────────────────────────── */
  const AV_CX = LP_W / 2;
  const AV_CY = 110;
  const AV_R  = 55;

  // Glow ring
  ctx.save();
  ctx.shadowColor = "#d4a017";
  ctx.shadowBlur  = 22;
  ctx.beginPath();
  ctx.arc(AV_CX, AV_CY, AV_R + 4, 0, Math.PI * 2);
  ctx.strokeStyle = "#d4a017";
  ctx.lineWidth   = 2.5;
  ctx.stroke();
  ctx.restore();

  // Avatar clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2);
  ctx.clip();
  const avatar = await loadImageSafe(data.ownerAvatarUrl);
  if (avatar) {
    const sz = AV_R * 2;
    ctx.drawImage(avatar, AV_CX - AV_R, AV_CY - AV_R, sz, sz);
  } else {
    // Initials fallback
    const initials = (data.ownerName || "?").slice(0, 2).toUpperCase();
    ctx.fillStyle = "#1a1230";
    ctx.fillRect(AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
    ctx.fillStyle = "#d4a017";
    ctx.font      = "bold 32px Sans";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, AV_CX, AV_CY);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  // Inner ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(212,160,23,0.6)";
  ctx.lineWidth   = 1.8;
  ctx.stroke();
  ctx.restore();

  /* ── OWNER LABEL ─────────────────────────────────────────────── */
  ctx.fillStyle = "#d4a017";
  ctx.font      = "bold 11px Sans";
  ctx.textAlign = "center";
  ctx.fillText("OWNER", AV_CX, AV_CY + AV_R + 20);

  ctx.fillStyle = "#fff";
  ctx.font      = "bold 14px Sans";
  ctx.fillText(data.ownerName || "Unknown", AV_CX, AV_CY + AV_R + 38);

  /* ── "COMPANY" LEFT FOOTER LABEL ────────────────────────────── */
  ctx.fillStyle = "rgba(212,160,23,0.4)";
  ctx.font      = "11px Sans";
  ctx.fillText("KELIN MD", AV_CX, H - 16);

  /* ── RIGHT CONTENT AREA ─────────────────────────────────────── */
  const RX = LP_W + 30;
  const RW = W - RX - 24;

  // Tier badge
  const BADGE_Y  = 28;
  const BADGE_H  = 26;
  const BADGE_W  = 160;
  ctx.save();
  ctx.shadowColor = "#d4a017";
  ctx.shadowBlur  = 8;
  ctx.fillStyle   = "rgba(212,160,23,0.12)";
  roundRect(ctx, RX, BADGE_Y, BADGE_W, BADGE_H, 13);
  ctx.fill();
  ctx.strokeStyle = "#d4a017";
  ctx.lineWidth   = 1;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#f0c040";
  ctx.font      = "bold 12px Sans";
  ctx.textAlign = "left";
  ctx.fillText(`${data.tierEmoji} TIER ${data.tier} — ${data.tierLabel.toUpperCase()}`, RX + 10, BADGE_Y + 17);

  // Company name
  ctx.fillStyle = "#ffffff";
  const nameSize = data.companyName.length > 18 ? 32 : data.companyName.length > 12 ? 38 : 44;
  ctx.font      = `bold ${nameSize}px Sans`;
  ctx.textAlign = "left";
  ctx.fillText(data.companyName.toUpperCase(), RX, BADGE_Y + BADGE_H + 48);

  // Gold underline
  ctx.fillStyle = "#d4a017";
  ctx.fillRect(RX, BADGE_Y + BADGE_H + 56, Math.min(data.companyName.length * (nameSize * 0.62), RW), 2);

  /* ── STAT BOXES ─────────────────────────────────────────────── */
  const BOX_Y  = BADGE_Y + BADGE_H + 80;
  const BOX_H  = 64;
  const GAP    = 14;
  const BOX_W  = (RW - GAP * 2) / 3;

  const totalSalaryDay = data.dailyCost || 0;

  drawStatBox(ctx, RX,              BOX_Y, BOX_W, BOX_H, "👥 Employees",  `${data.employeeCount}/${data.maxEmployees}`,         "#d4a017");
  drawStatBox(ctx, RX + BOX_W + GAP, BOX_Y, BOX_W, BOX_H, "💸 Daily Cost", `$${totalSalaryDay.toLocaleString()}`,                "#e85d5d");
  drawStatBox(ctx, RX + (BOX_W + GAP) * 2, BOX_Y, BOX_W, BOX_H, "🏦 Total Paid", `$${(data.totalPaid || 0).toLocaleString()}`, "#5db8e8");

  // Second row
  const BOX_Y2 = BOX_Y + BOX_H + GAP;
  const BOX_W2 = (RW - GAP) / 2;
  drawStatBox(ctx, RX,               BOX_Y2, BOX_W2, BOX_H, "📅 Founded",    data.foundedDate || "—",         "#a78bfa");
  drawStatBox(ctx, RX + BOX_W2 + GAP, BOX_Y2, BOX_W2, BOX_H, "💰 Company Value", `$${(data.tier * 1_000_000_000).toLocaleString()}`, "#22c55e");

  /* ── BOTTOM BORDER ──────────────────────────────────────────── */
  const botBar = ctx.createLinearGradient(0, 0, W, 0);
  botBar.addColorStop(0,   "#d4a017");
  botBar.addColorStop(0.5, "#f0c040");
  botBar.addColorStop(1,   "#d4a017");
  ctx.fillStyle = botBar;
  ctx.fillRect(0, H - 4, W, 4);

  return canvas.toBuffer("image/png");
}
