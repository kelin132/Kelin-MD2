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
//  Layout:
//  ┌─────────────────────────────────────────────┐
//  │  Guild icon / banner image fills FULL BG    │
//  │  Dark overlay for readability               │
//  │                                             │
//  │  ◯ pfp (bottom-left area)                  │
//  │                                             │
//  │  Guild Name   ·  colour swatches            │
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

  // ── 1. FULL-CANVAS BACKGROUND ─────────────────────────────────────────────
  // Start with a solid dark fallback
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0,   "#2d1140");
  bgGrad.addColorStop(0.4, "#4a2552");
  bgGrad.addColorStop(0.7, "#6b3580");
  bgGrad.addColorStop(1,   "#3a1f5a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // If there's a guild icon/banner image, draw it to fill the ENTIRE background
  const bannerImg = await loadImageSafe(guild.icon || user.profilePic || null);
  if (bannerImg) {
    // Cover-fit: scale so the image covers the whole canvas, centred
    const scaleX = W / bannerImg.width;
    const scaleY = H / bannerImg.height;
    const scale  = Math.max(scaleX, scaleY);
    const dw = bannerImg.width  * scale;
    const dh = bannerImg.height * scale;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;
    ctx.drawImage(bannerImg, dx, dy, dw, dh);

    // Dark gradient overlay so the text stays readable
    const overlay = ctx.createLinearGradient(0, 0, 0, H);
    overlay.addColorStop(0,   "rgba(20,5,35,0.62)");
    overlay.addColorStop(0.5, "rgba(30,8,50,0.52)");
    overlay.addColorStop(1,   "rgba(10,2,20,0.75)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);
  } else {
    // Soft noise blobs for depth (fallback only)
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
  }

  // Warm center spotlight glow
  const spot = ctx.createRadialGradient(W / 2, H * 0.4, 40, W / 2, H * 0.4, W * 0.6);
  spot.addColorStop(0, "rgba(255,220,255,0.07)");
  spot.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, W, H);

  // ── 2. CIRCULAR PROFILE PICTURE ───────────────────────────────────────────────
  const pfpR    = 85;
  const pfpCX   = 130;
  const pfpCY   = H * 0.55;

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

  // ── 3. USERNAME (above pfp) ────────────────────────────────────────────────
  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.font         = "bold 20px Sans";
  ctx.fillStyle    = PALE_PINK;
  ctx.shadowColor  = "rgba(0,0,0,0.8)";
  ctx.shadowBlur   = 8;
  ctx.fillText(fitText(ctx, user.name || "Unknown", 220), pfpCX, pfpCY - pfpR - 22);
  ctx.restore();

  // ── 4. GUILD NAME (centre, lower half) ────────────────────────────────────────────────────────────
  const guildNameY = H * 0.76;
  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.font         = "bold 52px Sans";
  ctx.fillStyle    = "#ffffff";
  ctx.shadowColor  = "rgba(223,174,213,0.9)";
  ctx.shadowBlur   = 22;
  ctx.fillText(fitText(ctx, (guild.name || "Unknown").toUpperCase(), W - 80), W / 2, guildNameY);
  ctx.restore();

  // ── 5. COLOUR SWATCHES ─────────────────────────────────────────────────────
  const swatchY = guildNameY + 58;
  drawSwatch(ctx, W / 2 - 100, swatchY, "#4a2552");
  drawSwatch(ctx, W / 2 + 10,  swatchY, "#dfaed5");

  // ── 6. ANIME PROGRESSION BADGE ────────────────────────────────────────────────
  const guildLevel = Math.max(1, Number(guild.level) || 1);
  const guildXp = Math.max(0, Number(guild.guildXp) || 0);
  const guildTreasury = Math.max(0, Number(guild.treasury) || 0);
  const guildTax = Math.max(0, Number(guild.taxRate ?? 0.05) * 100);
  const guildMembers = Array.isArray(guild.members) ? guild.members.length : Number(guild.memberCount) || 0;
  const guildCapacity = Number(guild.memberCapacity) || 8 + guildLevel * 2;
  const badgeX = W - 300;
  const badgeY = 30;
  ctx.save();
  ctx.fillStyle = "rgba(20, 8, 38, 0.72)";
  ctx.strokeStyle = "rgba(240, 212, 232, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(badgeX, badgeY, 266, 98, 18);
  } else {
    roundRect(ctx, badgeX, badgeY, 266, 98, 18);
  }
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "bold 20px Sans";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`✦ GUILD LEVEL ${guildLevel}`, badgeX + 18, badgeY + 24);
  ctx.font = "14px Sans";
  ctx.fillStyle = "#f0d4e8";
  ctx.fillText(`XP ${guildXp.toLocaleString()}  •  Tax ${guildTax.toFixed(0)}%`, badgeX + 18, badgeY + 52);
  ctx.fillText(`Treasury $${guildTreasury.toLocaleString()}  •  ${guildMembers}/${guildCapacity}`, badgeX + 18, badgeY + 78);
  ctx.restore();

  // ── 7. DESCRIPTION (if any) ───────────────────────────────────────────────────
  if (guild.description) {
    ctx.save();
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.font         = "italic 20px Sans";
    ctx.fillStyle    = "rgba(240,212,232,0.82)";
    ctx.shadowColor  = "rgba(0,0,0,0.7)";
    ctx.shadowBlur   = 6;
    ctx.fillText(fitText(ctx, guild.description, W - 100), W / 2, swatchY + 50);
    ctx.restore();
  }

  // ── 8. FLOWER / DECORATIVE ACCENTS ───────────────────────────────────────
  drawFlower(ctx, 80, H - 80, 36, "rgba(223,174,213,0.22)");

  // ── 9. FOOTER ────────────────────────────────────────────────────────────
  ctx.save();
  ctx.textAlign    = "right";
  ctx.textBaseline = "bottom";
  ctx.font         = "16px monospace";
  ctx.fillStyle    = "rgba(223,174,213,0.55)";
  ctx.shadowColor  = "rgba(0,0,0,0.8)";
  ctx.shadowBlur   = 4;
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
  const w = 90, h = 28, r = 14;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur  = 8;
  roundRect(ctx, x, y - h / 2, w, h, r);
  ctx.fillStyle = "rgba(10,3,20,0.75)";
  ctx.fill();
  ctx.strokeStyle = "rgba(223,174,213,0.5)";
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
