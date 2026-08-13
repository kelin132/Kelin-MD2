/**
 * KELIN MD — Economy profile card image generator.
 *
 * The layout is intentionally close to the supplied reference:
 * a wide personal banner, a circular avatar overlapping the banner, and a
 * compact identity/stat area below it. Users can provide their own banner
 * through the `.bg` command.
 */

const canvasModulePromise = import("canvas");
async function getCanvasModule() { return canvasModulePromise; }

async function loadImageSafe(source, timeoutMs = 5000) {
  if (!source) return null;
  try {
    const { loadImage } = await getCanvasModule();
    return await Promise.race([
      loadImage(source),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

function roundRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawImageCover(ctx, image, x, y, w, h) {
  const scale = Math.max(w / image.width, h / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image, x + (w - width) / 2, y + (h - height) / 2, width, height);
}

function drawDefaultBanner(ctx, x, y, w, h) {
  const paper = ctx.createLinearGradient(x, y, x + w, y + h);
  paper.addColorStop(0, "#fffdfa");
  paper.addColorStop(0.55, "#f4f2ef");
  paper.addColorStop(1, "#dedbd8");
  ctx.fillStyle = paper;
  ctx.fillRect(x, y, w, h);

  // Soft manga halftone texture.
  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = "#8d8a88";
  for (let py = y + 8; py < y + h; py += 12) {
    for (let px = x + 8; px < x + w; px += 12) {
      ctx.beginPath();
      ctx.arc(px, py, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Fine sweeping lines echo the inked look without needing a bundled asset.
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#777472";
  ctx.lineWidth = 1.5;
  for (let i = -3; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 155, y + h + 10);
    ctx.bezierCurveTo(
      x + w * 0.25 + i * 70, y + h * 0.45,
      x + w * 0.55 - i * 28, y + h * 0.15,
      x + w + i * 35, y + 18
    );
    ctx.stroke();
  }
  ctx.restore();

  const stars = [
    [x + 48, y + 42, 8], [x + 150, y + 18, 5], [x + w - 92, y + 40, 7],
    [x + w - 34, y + h - 34, 5], [x + 82, y + h - 30, 6],
  ];
  ctx.save();
  ctx.strokeStyle = "#aaa7a4";
  ctx.lineWidth = 2;
  for (const [sx, sy, size] of stars) {
    ctx.beginPath();
    ctx.moveTo(sx - size, sy); ctx.lineTo(sx + size, sy);
    ctx.moveTo(sx, sy - size); ctx.lineTo(sx, sy + size);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPill(ctx, x, y, w, h, label, color, fill = "rgba(255,255,255,0.82)") {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "bold 12px Sans";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function drawStat(ctx, x, y, label, value, color) {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = color;
  ctx.font = "bold 11px Sans";
  ctx.fillText(label.toUpperCase(), x, y);
  ctx.fillStyle = "#292827";
  ctx.font = "bold 17px Sans";
  ctx.fillText(String(value), x, y + 22);
}

/**
 * @param {object} data
 * @param {string} data.username          Economy registration name.
 * @param {string} data.tag               WhatsApp number/tag.
 * @param {string} data.role              Staff/premium/member role.
 * @param {number} data.level
 * @param {number} data.xp
 * @param {number} data.xpTarget
 * @param {number} data.reach             Activity/account reach value.
 * @param {number} data.wallet
 * @param {number} data.bank
 * @param {string} [data.profileImage]
 * @param {string} [data.profileBackground]
 * @param {{ name, emoji, color }} [data.levelRole]
 */
export async function generateProfileImage(data) {
  const { createCanvas } = await getCanvasModule();
  const W = 900;
  const H = 600;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f7f5f2";
  ctx.fillRect(0, 0, W, H);

  const bannerX = 28;
  const bannerY = 24;
  const bannerW = W - 56;
  const bannerH = 264;

  ctx.save();
  ctx.shadowColor = "rgba(38, 35, 32, 0.22)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, bannerX, bannerY, bannerW, bannerH, 26);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, bannerX, bannerY, bannerW, bannerH, 26);
  ctx.clip();
  const customBackground = await loadImageSafe(data.profileBackground || null);
  if (customBackground) {
    drawImageCover(ctx, customBackground, bannerX, bannerY, bannerW, bannerH);
    const shade = ctx.createLinearGradient(0, bannerY, 0, bannerY + bannerH);
    shade.addColorStop(0, "rgba(255,255,255,0.05)");
    shade.addColorStop(1, "rgba(20,20,20,0.26)");
    ctx.fillStyle = shade;
    ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
  } else {
    drawDefaultBanner(ctx, bannerX, bannerY, bannerW, bannerH);
  }
  ctx.restore();

  // Small signature at the top of the reference-style banner.
  ctx.fillStyle = customBackground ? "rgba(255,255,255,0.86)" : "#3b3937";
  ctx.font = "italic 21px Sans";
  ctx.textAlign = "center";
  ctx.fillText("KELIN", W / 2, bannerY + 34);

  const avatarRadius = 88;
  const avatarX = W / 2;
  const avatarY = 287;
  ctx.save();
  ctx.shadowColor = "rgba(24, 21, 20, 0.34)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
  ctx.clip();
  const avatar = await loadImageSafe(data.profileImage || null);
  if (avatar) {
    drawImageCover(ctx, avatar, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
  } else {
    const fallback = ctx.createLinearGradient(
      avatarX - avatarRadius, avatarY - avatarRadius,
      avatarX + avatarRadius, avatarY + avatarRadius
    );
    fallback.addColorStop(0, "#d8d4d1");
    fallback.addColorStop(1, "#797674");
    ctx.fillStyle = fallback;
    ctx.fillRect(avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px Sans";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((data.username || "?")[0].toUpperCase(), avatarX, avatarY);
  }
  ctx.restore();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 3, 0, Math.PI * 2);
  ctx.stroke();

  const username = String(data.username || "User").trim() || "User";
  ctx.fillStyle = "#252321";
  ctx.font = "bold 28px Sans";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(username, W / 2, 402);

  ctx.fillStyle = "#78736f";
  ctx.font = "14px Sans";
  ctx.fillText(`@${data.tag || "user"}`, W / 2, 424);

  const roleText = String(data.role || "Member").toUpperCase();
  const levelRoleText = data.levelRole
    ? `${data.levelRole.emoji || ""} ${data.levelRole.name}`.trim()
    : "Newcomer";
  const roleWidth = Math.max(100, ctx.measureText(roleText).width + 30);
  const levelRoleWidth = Math.max(120, ctx.measureText(levelRoleText).width + 30);
  drawPill(ctx, W / 2 - roleWidth - 7, 438, roleWidth, 25, roleText, "#8a5f45");
  drawPill(ctx, W / 2 + 7, 438, levelRoleWidth, 25, levelRoleText, data.levelRole?.color || "#6c7b84");

  const currentXp = Math.max(0, Number(data.xp) || 0);
  const targetXp = Math.max(1, Number(data.xpTarget) || 100);
  const progress = Math.min(currentXp / targetXp, 1);
  const barX = 156;
  const barY = 490;
  const barW = W - 312;
  const barH = 15;
  ctx.textAlign = "left";
  ctx.fillStyle = "#4c4845";
  ctx.font = "bold 12px Sans";
  ctx.fillText(`LEVEL ${data.level || 1}  •  XP ${currentXp.toLocaleString()} / ${targetXp.toLocaleString()}`, barX, barY - 10);
  ctx.fillStyle = "#e2dfdc";
  roundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();
  if (progress > 0) {
    const xpGradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    xpGradient.addColorStop(0, "#6f8f9d");
    xpGradient.addColorStop(1, "#c28d72");
    ctx.fillStyle = xpGradient;
    roundRect(ctx, barX, barY, Math.max(barH, barW * progress), barH, barH / 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#ded9d5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(86, 541);
  ctx.lineTo(W - 86, 541);
  ctx.stroke();

  const reach = Number.isFinite(Number(data.reach)) ? Number(data.reach) : 0;
  drawStat(ctx, 225, 565, "Reach", reach.toLocaleString(), "#8a5f45");
  drawStat(ctx, 450, 565, "Wallet", `$${Number(data.wallet || 0).toLocaleString()}`, "#6c7b84");
  drawStat(ctx, 675, 565, "Bank", `$${Number(data.bank || 0).toLocaleString()}`, "#9a7a54");

  return canvas.toBuffer("image/jpeg", { quality: 0.92 });
}

/**
 * Fetch the WhatsApp profile picture for a JID, returning null when hidden.
 */
export async function getProfilePic(sock, jid) {
  try {
    return await sock.profilePictureUrl(jid, "image");
  } catch {
    return null;
  }
}

/**
 * Resolve the account/staff role shown on the profile card.
 */
export function resolveRole({ isOwner, isMod, isStaff, isPremium, staffLevel = 0 }) {
  if (isOwner) return "Owner";
  if (isMod || staffLevel >= 3) return "Moderator";
  if (isStaff || staffLevel >= 2) return "Staff";
  if (isPremium) return "Premium";
  return "Member";
}