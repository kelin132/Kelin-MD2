/**
 * KELIN MD — Ban / Unban card generator
 * 820 × 360 landscape card
 */

let canvasModulePromise;
async function getCanvasModule() {
  canvasModulePromise ??= import("canvas");
  return canvasModulePromise;
}

async function loadImageSafe(url, timeoutMs = 5000) {
  if (!url) return null;
  try {
    const { loadImage } = await getCanvasModule();
    return await Promise.race([
      loadImage(url),
      new Promise((_, r) => setTimeout(() => r(new Error("timeout")), timeoutMs)),
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

/**
 * @param {"ban"|"unban"} type
 * @param {object} data
 * @param {string} data.username
 * @param {string} [data.reason]
 * @param {string} [data.bannedBy]
 * @param {string} [data.date]
 * @param {string} [data.avatarUrl]
 * @returns {Promise<Buffer>}
 */
export async function generateBanCard(type, data) {
  const { createCanvas } = await getCanvasModule();

  const W = 820, H = 360;
  const isBan    = type === "ban";
  const ACCENT   = isBan ? "#ef4444" : "#22c55e";    // red or green
  const DIM      = isBan ? "#7f1d1d" : "#14532d";    // dark tint
  const LABEL    = isBan ? "BANNED"  : "UNBANNED";

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  /* ── BACKGROUND ── */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   "#080810");
  bg.addColorStop(0.6, "#0d0d1a");
  bg.addColorStop(1,   "#060610");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Accent corner glow (top-right)
  const glow1 = ctx.createRadialGradient(W, 0, 0, W, 0, 420);
  glow1.addColorStop(0,   isBan ? "rgba(239,68,68,0.30)" : "rgba(34,197,94,0.28)");
  glow1.addColorStop(0.5, isBan ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.07)");
  glow1.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  // Subtle bottom-left counter-glow
  const glow2 = ctx.createRadialGradient(0, H, 0, 0, H, 260);
  glow2.addColorStop(0,   "rgba(80,40,200,0.18)");
  glow2.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  /* ── CARD BORDER ── */
  ctx.save();
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur  = 22;
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth   = 1.5;
  roundRect(ctx, 18, 18, W - 36, H - 36, 18);
  ctx.stroke();
  ctx.restore();

  /* ── LEFT PANEL — avatar circle ── */
  const AV_CX = 130, AV_CY = H / 2, AV_R = 72;

  // Outer glow ring
  ctx.save();
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur  = 30;
  ctx.beginPath();
  ctx.arc(AV_CX, AV_CY, AV_R + 6, 0, Math.PI * 2);
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth   = 2.5;
  ctx.stroke();
  ctx.restore();

  // Avatar clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2);
  ctx.clip();
  const avatar = await loadImageSafe(data.avatarUrl);
  if (avatar) {
    ctx.drawImage(avatar, AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  } else {
    // Fallback: dark circle with initials
    ctx.fillStyle = DIM;
    ctx.fill();
    ctx.fillStyle = ACCENT;
    ctx.font      = "bold 44px Sans";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((data.username || "?")[0].toUpperCase(), AV_CX, AV_CY);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  // Inner ring
  ctx.beginPath();
  ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2);
  ctx.strokeStyle = `${ACCENT}99`;
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Ban overlay (red X) on top of avatar when banned
  if (isBan) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle   = "#000000";
    ctx.beginPath();
    ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Draw X
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth   = 9;
    ctx.lineCap     = "round";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur  = 16;
    const off = 32;
    ctx.beginPath();
    ctx.moveTo(AV_CX - off, AV_CY - off);
    ctx.lineTo(AV_CX + off, AV_CY + off);
    ctx.moveTo(AV_CX + off, AV_CY - off);
    ctx.lineTo(AV_CX - off, AV_CY + off);
    ctx.stroke();
    ctx.restore();
  }

  /* ── VERTICAL DIVIDER ── */
  const divX = 232;
  const divGrad = ctx.createLinearGradient(divX, 40, divX, H - 40);
  divGrad.addColorStop(0,   "rgba(255,255,255,0)");
  divGrad.addColorStop(0.3, `${ACCENT}55`);
  divGrad.addColorStop(0.7, `${ACCENT}55`);
  divGrad.addColorStop(1,   "rgba(255,255,255,0)");
  ctx.strokeStyle = divGrad;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(divX, 40);
  ctx.lineTo(divX, H - 40);
  ctx.stroke();

  /* ── RIGHT PANEL ── */
  const RX = divX + 28;
  const textAlign = "left";
  ctx.textAlign = textAlign;

  // Status pill — "BANNED" / "UNBANNED"
  const pillW  = 160, pillH = 34;
  const pillX  = RX, pillY = 42;

  ctx.save();
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur  = 18;
  ctx.fillStyle   = `${DIM}cc`;
  roundRect(ctx, pillX, pillY, pillW, pillH, 17);
  ctx.fill();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = ACCENT;
  ctx.font      = "bold 15px Sans";
  ctx.textAlign = "center";
  ctx.fillText(LABEL, pillX + pillW / 2, pillY + 22);

  // Big username
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font      = "bold 38px Sans";
  const displayName = (data.username || "User").length > 16
    ? (data.username || "User").slice(0, 16) + "…"
    : (data.username || "User");
  ctx.fillText(displayName, RX, 126);

  // Horizontal rule below name
  const hrY = 140;
  const hrGrad = ctx.createLinearGradient(RX, hrY, RX + 520, hrY);
  hrGrad.addColorStop(0,   ACCENT);
  hrGrad.addColorStop(0.6, `${ACCENT}44`);
  hrGrad.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.strokeStyle = hrGrad;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(RX, hrY);
  ctx.lineTo(RX + 520, hrY);
  ctx.stroke();

  /* ── INFO ROWS ── */
  function infoRow(label, value, y) {
    ctx.fillStyle = `${ACCENT}bb`;
    ctx.font      = "bold 12px Sans";
    ctx.textAlign = "left";
    ctx.fillText(label.toUpperCase(), RX, y);

    ctx.fillStyle = "#e2e8f0";
    ctx.font      = "15px Sans";
    ctx.fillText(value || "—", RX + 130, y);
  }

  const ROW1 = 176, GAP = 34;
  infoRow("Reason",    (data.reason   || "No reason given").slice(0, 52), ROW1);
  infoRow("Action by", data.bannedBy  || "Owner",                         ROW1 + GAP);
  infoRow("Date",      data.date      || new Date().toDateString(),        ROW1 + GAP * 2);

  if (!isBan) {
    infoRow("Status", "All commands restored ✓", ROW1 + GAP * 3);
  }

  /* ── FOOTER ── */
  const footY = H - 26;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.font      = "bold 12px Sans";
  ctx.textAlign = "right";
  ctx.fillText("KELIN MD  •  USER MANAGEMENT", W - 36, footY);

  // Footer left — total XP / joined placeholder
  ctx.textAlign = "left";
  ctx.fillText(isBan ? "⚠️  User has been permanently blocked" : "✅  User access fully restored", RX, footY);

  return canvas.toBuffer("image/png");
}
