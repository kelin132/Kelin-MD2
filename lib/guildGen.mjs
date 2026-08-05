// ── Contact helpers ───────────────────────────────────────────────────────────

/**
 * Fetch a WhatsApp contact's profile-picture URL.
 * Returns null if unavailable (private, no picture, error).
 */
export async function getProfilePic(sock, jid) {
  try {
    return await sock.profilePictureUrl(jid, "image");
  } catch {
    return null;
  }
}

/**
 * Resolve a human-readable display name for a JID from the sock contact store.
 * Falls back to the phone-number portion of the JID when no name is found.
 */
export function getContactName(sock, jid) {
  const contacts = sock.store?.contacts || {};
  const c = contacts[jid];
  if (c?.pushName) return c.pushName;
  if (c?.name)     return c.name;
  if (c?.notify)   return c.notify;
  return jid?.split("@")[0] || "Unknown";
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

async function getCanvasModule() {
  try {
    return await import("@napi-rs/canvas");
  } catch {
    return await import("canvas");
  }
}

async function loadImageSafe(src) {
  if (!src) return null;
  try {
    const mod = await getCanvasModule();
    const loadImage = mod.loadImage || mod.default?.loadImage;
    return await loadImage(src);
  } catch {
    return null;
  }
}

// ── Guild profile card ─────────────────────────────────────────────────────────
//
//  Layout inspired by the reference image:
//  ┌─────────────────────────────────────────────┐
//  │  blurred / gradient purple-pink background  │
//  │                                             │
//  │     username text (top centre)              │
//  │                                             │
//  │  ╔──────────────────────────────╗           │
//  │  ║  banner (guild icon / bg)   ║           │
//  │  ╚──────────────────────────────╝           │
//  │  ◯ pfp (overlaps banner bottom-left)        │
//  │                                             │
//  │  Guild Name   ·  #colour1  ·  #colour2      │
//  │                                             │
//  │  🌸 flower accent              KELIN GUILDS │
//  └─────────────────────────────────────────────┘

/**
 * Generate a guild profile card.
 *
 * @param {{ name: string, icon?: string|null, description?: string }} guild
 * @param {{ name: string, profilePic?: string|null, jid?: string }} user
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateGuildProfile(guild, user) {
  const { createCanvas, GlobalFonts } = await getCanvasModule();

  const W  = 900;
  const H  = 560;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // ── Palette ──────────────────────────────────────────────────────────────────
  const DARK_PURPLE  = "#3a1f4a";
  const MID_PURPLE   = "#5c2d7a";
  const LIGHT_PINK   = "#dfaed5";
  const PALE_PINK    = "#f0d4e8";
  const ACCENT_CYAN  = "#c4a0d8";

  // ── 1. BACKGROUND (blurred purple-pink gradient) ─────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0,   "#2d1140");
  bgGrad.addColorStop(0.4, "#4a2552");
  bgGrad.addColorStop(0.7, "#6b3580");
  bgGrad.addColorStop(1,   "#3a1f5a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Soft noise overlay — draw a few translucent blobs for depth
  for (let i = 0; i < 6; i++) {
    const gr = ctx.createRadialGradient(
      (i * 150) % W, (i * 90) % H, 10,
      (i * 150) % W, (i * 90) % H, 180
    );
    gr.addColorStop(0, `rgba(223,174,213,0.12)`);
    gr.addColorStop(1, `rgba(223,174,213,0)`);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  }

  // ── 2. BANNER PANEL (upper-right, rounded rect) ───────────────────────────────
  const bannerX = 200;
  const bannerY = 80;
  const bannerW = 640;
  const bannerH = 240;
  const bannerR = 20;

  // Shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur  = 30;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, bannerX, bannerY, bannerW, bannerH, bannerR);
  ctx.fillStyle = "#1a0b2a";
  ctx.fill();
  ctx.restore();

  // Clip and draw banner background (guild icon or owner pic)
  ctx.save();
  roundRect(ctx, bannerX, bannerY, bannerW, bannerH, bannerR);
  ctx.clip();

  const bannerImg = await loadImageSafe(guild.icon || user.profilePic || null);
  if (bannerImg) {
    const aspect = bannerImg.width / bannerImg.height;
    let dw, dh, dx, dy;
    if (aspect > bannerW / bannerH) {
      dh = bannerH; dw = dh * aspect;
      dx = bannerX + (bannerW - dw) / 2; dy = bannerY;
    } else {
      dw = bannerW; dh = dw / aspect;
      dx = bannerX; dy = bannerY + (bannerH - dh) / 2;
    }
    ctx.drawImage(bannerImg, dx, dy, dw, dh);
    // Dark overlay for readability
    ctx.fillStyle = "rgba(40,10,60,0.45)";
    ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
  } else {
    // Fallback gradient banner
    const bGrad = ctx.createLinearGradient(bannerX, bannerY, bannerX + bannerW, bannerY + bannerH);
    bGrad.addColorStop(0, "#4a1060");
    bGrad.addColorStop(1, "#8a3090");
    ctx.fillStyle = bGrad;
    ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
  }

  // Glimmer line at top of banner
  const shimmer = ctx.createLinearGradient(bannerX, bannerY, bannerX + bannerW, bannerY);
  shimmer.addColorStop(0,   "rgba(255,255,255,0)");
  shimmer.addColorStop(0.5, "rgba(255,255,255,0.25)");
  shimmer.addColorStop(1,   "rgba(255,255,255,0)");
  ctx.fillStyle = shimmer;
  ctx.fillRect(bannerX, bannerY, bannerW, 3);

  ctx.restore();

  // Banner border
  ctx.save();
  roundRect(ctx, bannerX, bannerY, bannerW, bannerH, bannerR);
  ctx.lineWidth   = 2.5;
  ctx.strokeStyle = "rgba(223,174,213,0.55)";
  ctx.stroke();
  ctx.restore();

  // ── 3. CIRCULAR PROFILE PICTURE ───────────────────────────────────────────────
  const pfpR    = 85;               // radius
  const pfpCX   = bannerX + 20 + pfpR; // left side of banner, slightly inset
  const pfpCY   = bannerY + bannerH;   // sits on the bottom edge of the banner

  // Shadow
  ctx.save();
  ctx.shadowColor  = "rgba(0,0,0,0.7)";
  ctx.shadowBlur   = 20;
  ctx.beginPath();
  ctx.arc(pfpCX, pfpCY, pfpR, 0, Math.PI * 2);
  ctx.fillStyle = "#1a0b2a";
  ctx.fill();
  ctx.restore();

  // Clip circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(pfpCX, pfpCY, pfpR, 0, Math.PI * 2);
  ctx.clip();

  const pfpImg = await loadImageSafe(user.profilePic || null);
  if (pfpImg) {
    const aspect = pfpImg.width / pfpImg.height;
    const side   = pfpR * 2;
    let dw, dh, dx, dy;
    if (aspect > 1) {
      dh = side; dw = dh * aspect;
      dx = pfpCX - pfpR + (side - dw) / 2; dy = pfpCY - pfpR;
    } else {
      dw = side; dh = dw / aspect;
      dx = pfpCX - pfpR; dy = pfpCY - pfpR + (side - dh) / 2;
    }
    ctx.drawImage(pfpImg, dx, dy, dw, dh);
  } else {
    // Placeholder gradient
    const pfpGrad = ctx.createRadialGradient(pfpCX, pfpCY, 10, pfpCX, pfpCY, pfpR);
    pfpGrad.addColorStop(0, "#7a3a9a");
    pfpGrad.addColorStop(1, "#3a1a5a");
    ctx.fillStyle = pfpGrad;
    ctx.fillRect(pfpCX - pfpR, pfpCY - pfpR, pfpR * 2, pfpR * 2);
  }
  ctx.restore();

  // Circle border — pink glow
  ctx.save();
  ctx.shadowColor  = LIGHT_PINK;
  ctx.shadowBlur   = 14;
  ctx.beginPath();
  ctx.arc(pfpCX, pfpCY, pfpR, 0, Math.PI * 2);
  ctx.lineWidth   = 4;
  ctx.strokeStyle = PALE_PINK;
  ctx.stroke();
  ctx.restore();

  // Small moon badge
  const moonX = pfpCX + pfpR * 0.62;
  const moonY = pfpCY + pfpR * 0.62;
  ctx.save();
  ctx.beginPath();
  ctx.arc(moonX, moonY, 16, 0, Math.PI * 2);
  ctx.fillStyle = "#4a2552";
  ctx.fill();
  ctx.strokeStyle = PALE_PINK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  ctx.font      = "bold 14px Sans";
  ctx.fillStyle = PALE_PINK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🌙", moonX, moonY);

  // ── 4. USERNAME (top center of banner) ────────────────────────────────────────
  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";

  // Small pfp thumbnail beside username text (top of banner)
  const nameX = bannerX + bannerW / 2 + 10;
  const nameY = bannerY + 38;

  // Tiny avatar circle for username header
  const tinyCX = nameX - 70;
  const tinyR  = 18;
  ctx.save();
  ctx.beginPath();
  ctx.arc(tinyCX, nameY, tinyR, 0, Math.PI * 2);
  ctx.clip();
  if (pfpImg) {
    ctx.drawImage(pfpImg, tinyCX - tinyR, nameY - tinyR, tinyR * 2, tinyR * 2);
  } else {
    ctx.fillStyle = "#7a3a9a";
    ctx.fillRect(tinyCX - tinyR, nameY - tinyR, tinyR * 2, tinyR * 2);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(tinyCX, nameY, tinyR, 0, Math.PI * 2);
  ctx.strokeStyle = PALE_PINK;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Username text
  ctx.font         = "bold 22px Sans";
  ctx.fillStyle    = PALE_PINK;
  ctx.shadowColor  = "rgba(0,0,0,0.6)";
  ctx.shadowBlur   = 6;
  ctx.fillText(fitText(ctx, user.name || "Unknown", 280), nameX, nameY);
  ctx.restore();

  // ── 5. GUILD NAME (below pfp area) ────────────────────────────────────────────
  const guildNameY = pfpCY + pfpR + 50;
  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.font         = "bold 48px Sans";
  ctx.fillStyle    = "#ffffff";
  ctx.shadowColor  = "rgba(223,174,213,0.8)";
  ctx.shadowBlur   = 18;
  ctx.fillText(fitText(ctx, (guild.name || "Unknown").toUpperCase(), W - 80), W / 2, guildNameY);
  ctx.restore();

  // ── 6. COLOUR SWATCHES (like the reference image) ─────────────────────────────
  const swatchY = guildNameY + 55;
  drawSwatch(ctx, W / 2 - 90, swatchY, "#4a2552");
  drawSwatch(ctx, W / 2 + 10, swatchY, "#dfaed5");

  // ── 7. DESCRIPTION (if any) ───────────────────────────────────────────────────
  if (guild.description) {
    ctx.save();
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.font         = "italic 20px Sans";
    ctx.fillStyle    = "rgba(240,212,232,0.75)";
    ctx.fillText(fitText(ctx, guild.description, W - 100), W / 2, swatchY + 50);
    ctx.restore();
  }

  // ── 8. FLOWER / DECORATIVE ACCENTS ───────────────────────────────────────────
  // Bottom-left flower (simplified petal pattern)
  drawFlower(ctx, 80, H - 80, 36, "rgba(223,174,213,0.22)");

  // ── 9. FOOTER ────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.textAlign    = "right";
  ctx.textBaseline = "bottom";
  ctx.font         = "16px monospace";
  ctx.fillStyle    = "rgba(223,174,213,0.45)";
  ctx.fillText("KELIN GUILDS", W - 24, H - 16);
  ctx.restore();

  return canvas.toBuffer("image/png");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

function drawSwatch(ctx, x, y, hex) {
  // Pill-shaped swatch like in the reference image
  const w = 90, h = 28, r = 14;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur  = 8;
  roundRect(ctx, x, y - h / 2, w, h, r);
  ctx.fillStyle = "rgba(30,10,45,0.7)";
  ctx.fill();
  ctx.strokeStyle = "rgba(223,174,213,0.4)";
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.font         = "bold 13px monospace";
  ctx.fillStyle    = hex;
  ctx.fillText(hex, x + w / 2, y);
  ctx.restore();
}

function drawFlower(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(
      cx + Math.cos(angle) * r * 0.6,
      cy + Math.sin(angle) * r * 0.6,
      r * 0.45, r * 0.25,
      angle, 0, Math.PI * 2
    );
    ctx.fill();
  }
  // Centre
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(240,212,232,0.35)";
  ctx.fill();
  ctx.restore();
}
