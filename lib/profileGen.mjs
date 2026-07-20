/**
 * KELIN MD — Profile card image generator
 * ESM port of profileGenerator.js — uses the `canvas` package (^3.2.3)
 */
import { createCanvas, loadImage } from "canvas";

async function loadImageSafe(url) {
  try {
    if (!url) return null;
    return await loadImage(url);
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

/**
 * Generate an 800×800 profile card.
 *
 * @param {object} data
 * @param {string}  data.username       — display name
 * @param {string}  data.role           — e.g. "Owner", "Mod", "Member"
 * @param {number}  data.level
 * @param {number}  data.xp
 * @param {number}  data.xpTarget       — XP needed for next level
 * @param {number}  data.wallet         — wallet balance
 * @param {number}  data.bank           — bank balance
 * @param {string}  [data.bio]          — bio text
 * @param {string}  [data.profileImage] — avatar URL
 * @param {string}  [data.backgroundImage] — background URL
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateProfileImage(data) {
  const width  = 800;
  const height = 800;
  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext("2d");

  // Background
  const bg = await loadImageSafe(data.backgroundImage || data.profileImage || null);
  if (bg) {
    const aspect = bg.width / bg.height;
    let dw, dh, dx, dy;
    if (aspect > 1) {
      dh = height; dw = dh * aspect;
      dx = (width - dw) / 2; dy = 0;
    } else {
      dw = width; dh = dw / aspect;
      dx = 0; dy = (height - dh) / 2;
    }
    ctx.drawImage(bg, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);
  }

  // Glassmorphism overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, width, height);

  // Content box
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  roundRect(ctx, 40, 40, 720, 720, 30);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Square avatar (top-left)
  const avatarSize = 220;
  const avatarX    = 70;
  const avatarY    = 70;
  const avatar = await loadImageSafe(data.profileImage || null);
  if (avatar) {
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  }

  // Cyan border + white outer border
  ctx.strokeStyle = "#00ffff";
  ctx.lineWidth   = 8;
  ctx.strokeRect(avatarX, avatarY, avatarSize, avatarSize);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth   = 2;
  ctx.strokeRect(avatarX - 5, avatarY - 5, avatarSize + 10, avatarSize + 10);

  // Username
  ctx.fillStyle = "#ffffff";
  ctx.font      = "bold 60px Sans";
  ctx.textAlign = "left";
  ctx.fillText((data.username || "User").toUpperCase(), 320, 130);

  // Role badge
  ctx.fillStyle = "#00ffff";
  ctx.font      = "bold 35px Sans";
  ctx.fillText((data.role || "Member").toUpperCase(), 320, 185);

  // Stats section background
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  roundRect(ctx, 70, 320, 660, 320, 20);
  ctx.fill();

  // Level & XP
  ctx.fillStyle = "#ffffff";
  ctx.font      = "bold 30px Sans";
  ctx.fillText("LVL", 100, 370);
  ctx.fillText(String(data.level ?? 1), 200, 370);
  ctx.fillText("XP",  100, 420);
  ctx.fillText(`${data.xp ?? 0} / ${data.xpTarget ?? 100}`, 200, 420);

  // XP progress bar
  const barX = 100, barY = 440, barWidth = 600, barHeight = 15;
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  roundRect(ctx, barX, barY, barWidth, barHeight, 7);
  ctx.fill();
  const progress = Math.min((data.xp ?? 0) / (data.xpTarget ?? 100), 1);
  ctx.fillStyle = "#00ffff";
  roundRect(ctx, barX, barY, barWidth * progress, barHeight, 7);
  ctx.fill();

  // Economy
  ctx.fillStyle  = "#ffcc00";
  ctx.font       = "bold 35px Sans";
  ctx.textAlign  = "left";
  ctx.fillText("WALLET", 100, 520);
  ctx.textAlign  = "right";
  ctx.fillText(`$${(data.wallet ?? 0).toLocaleString()}`, 700, 520);

  ctx.textAlign  = "left";
  ctx.fillText("BANK", 100, 580);
  ctx.textAlign  = "right";
  ctx.fillText(`$${(data.bank ?? 0).toLocaleString()}`, 700, 580);

  // Bio
  ctx.textAlign = "center";
  ctx.fillStyle = "#888888";
  ctx.font      = "italic 24px Sans";
  const bio     = data.bio || "No bio set.";
  const words   = bio.split(" ");
  let line = "", bioY = 680;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > 600) {
      ctx.fillText(line, width / 2, bioY);
      line = word + " ";
      bioY += 30;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, width / 2, bioY);

  // Footer
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.font      = "bold 20px Sans";
  ctx.fillText("AKIRA • PROFILE SYSTEM", width / 2, 760);

  return canvas.toBuffer("image/png");
}

/**
 * Safely fetch a WhatsApp profile picture URL.
 * Returns null if the user has no picture or the fetch fails.
 */
export async function getProfilePic(sock, jid) {
  try {
    return await sock.profilePictureUrl(jid, "image");
  } catch {
    return null;
  }
}

/**
 * Derive a role label from the user's economy data + permission flags.
 */
export function resolveRole({ isOwner, isMod, isStaff, isPremium, staffLevel } = {}) {
  if (isOwner)             return "👑 Owner";
  if (staffLevel >= 3)     return "⚙️ Admin";
  if (staffLevel >= 2 || isStaff) return "🛡️ Staff";
  if (staffLevel >= 1 || isMod)   return "🔰 Mod";
  if (isPremium)           return "💎 Premium";
  return "👤 Member";
}
