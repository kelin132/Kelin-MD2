/**
 * KELIN MD — Economy profile card image generator.
 *
 * The profile is rendered as a portrait card so the image and the caption
 * share the same hierarchy: a large circular avatar, identity, stats, level,
 * wealth, and the user's personal details.
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

function drawSectionTitle(ctx, y, title) {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f4b8d2";
  ctx.font = "bold 24px Sans";
  ctx.fillText(`── ✦ ${title} ✦ ──`, 450, y);
}

function drawProfileLine(ctx, y, icon, label, value, valueColor = "#f6f0f3") {
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "bold 28px Sans";
  ctx.fillStyle = "#f6c36b";
  ctx.fillText(icon, 98, y);
  ctx.font = "bold 25px Sans";
  ctx.fillStyle = "#f4f0f2";
  ctx.fillText(label, 146, y);
  ctx.font = "25px Sans";
  ctx.fillStyle = valueColor;
  const labelWidth = ctx.measureText(label).width;
  ctx.fillText(fitText(ctx, String(value ?? "None"), 680 - labelWidth), 158 + labelWidth, y);
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
  const H = 1500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const customBackground = await loadImageSafe(data.profileBackground || null);
  if (customBackground) {
    // A saved background is the profile's backdrop, not just a panel texture.
    // Cover the complete canvas so there are no gradient borders around it.
    drawImageCover(ctx, customBackground, 0, 0, W, H);
    ctx.fillStyle = "rgba(12, 15, 30, 0.42)";
    ctx.fillRect(0, 0, W, H);
  } else {
    const page = ctx.createLinearGradient(0, 0, W, H);
    page.addColorStop(0, "#291c35");
    page.addColorStop(0.5, "#101a2f");
    page.addColorStop(1, "#171126");
    ctx.fillStyle = page;
    ctx.fillRect(0, 0, W, H);
  }

  const panelX = 30;
  const panelY = 26;
  const panelW = W - 60;
  const panelH = H - 52;
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
  ctx.shadowBlur = 30;
   ctx.fillStyle = customBackground ? "rgba(18, 23, 40, 0.72)" : "#121728";
  roundRect(ctx, panelX, panelY, panelW, panelH, 38);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#d982b4";
  ctx.lineWidth = 3;
  roundRect(ctx, panelX, panelY, panelW, panelH, 38);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = "#f4b8d2";
  ctx.font = "bold 27px Sans";
  ctx.fillText("╭━━━〔 🌸 𝗣𝗥𝗢𝗙𝗜𝗟𝗘 〕━━━╮", W / 2, 78);

  const avatarRadius = 205;
  const avatarX = W / 2;
  const avatarY = 285;
  ctx.save();
  ctx.shadowColor = "rgba(225, 120, 184, 0.34)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#f4b8d2";
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 11, 0, Math.PI * 2);
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

  ctx.strokeStyle = "#f4b8d2";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 5, 0, Math.PI * 2);
  ctx.stroke();

  const username = String(data.username || "User").trim() || "User";
  ctx.fillStyle = "#fff7fb";
  ctx.font = "bold 34px Sans";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(fitText(ctx, username.toUpperCase(), 650), W / 2, 520);

  const roleText = String(data.role || "Member").toUpperCase();
  const shortRole = {
    MODERATOR: "MOD",
    MOD: "MOD",
    STAFF: "STAFF",
    OWNER: "OWNER",
    PREMIUM: "PREMIUM",
    MEMBER: "MEMBER",
  }[roleText] || roleText;
  const levelRoleText = data.levelRole?.name || data.roleLabel || "Newcomer";
  const levelRoleEmoji = data.levelRole?.emoji || "🌱";

  ctx.font = "bold 24px Sans";
  ctx.fillStyle = "#f4b8d2";
  ctx.fillText(`${shortRole}  •  ${levelRoleEmoji} ${levelRoleText}`, W / 2, 550);

  const currentXp = Math.max(0, Number(data.xp) || 0);
  const targetXp = Math.max(1, Number(data.xpTarget) || 100);
  const progress = Math.min(currentXp / targetXp, 1);
  const barX = 140;
  const barY = 583;
  const barW = W - 280;
  const barH = 16;
  ctx.textAlign = "center";
  ctx.fillStyle = "#dfb8cc";
  ctx.font = "bold 18px Sans";
  ctx.fillText(`⭐ Lv.${data.level || 1}   •   📚 ${currentXp.toLocaleString()} / ${targetXp.toLocaleString()} XP`, W / 2, barY - 14);
  ctx.fillStyle = "#2d3651";
  roundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();
  if (progress > 0) {
    const xpGradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    xpGradient.addColorStop(0, "#cc6d9d");
    xpGradient.addColorStop(1, "#f4c36a");
    ctx.fillStyle = xpGradient;
    roundRect(ctx, barX, barY, Math.max(barH, barW * progress), barH, barH / 2);
    ctx.fill();
  }

  drawSectionTitle(ctx, 680, "𝗦𝗧𝗔𝗧𝗦");
  drawProfileLine(ctx, 728, "🌟", "Active", data.daysActive ?? data.reach ?? 0);
  drawProfileLine(ctx, 772, "🃏", "Cards", data.cards ?? 0);
  drawProfileLine(ctx, 816, "🎮", "Games", data.games ?? 0);
  drawProfileLine(ctx, 860, "🐾", "Pokémon", data.pokemon ?? 0);

  drawSectionTitle(ctx, 932, "𝗟𝗘𝗩𝗘𝗟");
  drawProfileLine(ctx, 980, "⭐", "Lv.", data.level ?? 1);
  drawProfileLine(ctx, 1024, "📚", "XP", `${currentXp.toLocaleString()} / ${targetXp.toLocaleString()}`);

  drawSectionTitle(ctx, 1096, "𝗪𝗘𝗔𝗟𝗧𝗛");
  drawProfileLine(ctx, 1144, "💰", "$", `$${formatMoney(data.wallet)}`);
  drawProfileLine(ctx, 1188, "🏦", "$", `$${formatMoney(data.bank)}`);
  drawProfileLine(ctx, 1232, "💎", "Diamonds", formatMoney(data.diamonds));
  drawProfileLine(ctx, 1276, "🎒", "Items", data.items ?? 0);

  ctx.textAlign = "left";
  ctx.font = "bold 23px Sans";
  ctx.fillStyle = "#f4f0f2";
  ctx.fillText(`📝 ${fitText(ctx, data.bio || "None", 690)}`, 98, 1342);
  ctx.fillText(`🏰 Guild: ${fitText(ctx, data.guild || "None", 610)}`, 98, 1384);
  ctx.fillStyle = "#dfb8cc";
  ctx.font = "22px Sans";
  ctx.fillText(`📅 Joined: ${fitText(ctx, data.joined || "Unknown", 600)}`, 98, 1426);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f4b8d2";
  ctx.font = "bold 25px Sans";
  ctx.fillText("╰━━━━━━━━━━━━━━━━━━━━━━╯", W / 2, 1470);

  return canvas.toBuffer("image/png");
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