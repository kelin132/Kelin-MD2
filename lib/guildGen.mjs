/**
 * KELIN MD — Guild card image generator
 * ESM port of guildGen.js — uses the `canvas` package (^3.2.3)
 */
import { createCanvas, loadImage } from "canvas";

async function loadImageSafe(url) {
  try {
    if (!url) return null;
    return await loadImage(url);
  } catch (e) {
    console.error("[guildGen] Image load failed:", url, e.message);
    return null;
  }
}

/**
 * Generate an 800×800 guild profile card.
 *
 * @param {{ name: string, icon?: string }} guild
 * @param {{ name: string, profilePic?: string }} user
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateGuildProfile(guild, user) {
  try {
    const width = 800;
    const height = 800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 1. BACKGROUND (guild icon / owner pic as backdrop)
    const bg = await loadImageSafe(guild.icon || user.profilePic || null);

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
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, width, height);
    }

    // 2. SEMI-TRANSPARENT OVERLAY (bottom section)
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 500, width, 300);

    // 3. PROFILE BOX (owner profile pic)
    const profile = await loadImageSafe(user.profilePic || null);

    const px = 50, py = 300, pSize = 350, pRadius = 50;

    // Shadow
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 30;

    // Rounded rect
    ctx.beginPath();
    ctx.moveTo(px + pRadius, py);
    ctx.lineTo(px + pSize - pRadius, py);
    ctx.quadraticCurveTo(px + pSize, py, px + pSize, py + pRadius);
    ctx.lineTo(px + pSize, py + pSize - pRadius);
    ctx.quadraticCurveTo(px + pSize, py + pSize, px + pSize - pRadius, py + pSize);
    ctx.lineTo(px + pRadius, py + pSize);
    ctx.quadraticCurveTo(px, py + pSize, px, py + pSize - pRadius);
    ctx.lineTo(px, py + pRadius);
    ctx.quadraticCurveTo(px, py, px + pRadius, py);
    ctx.closePath();
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.restore();

    // Clip + draw profile image
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(px + pRadius, py);
    ctx.lineTo(px + pSize - pRadius, py);
    ctx.quadraticCurveTo(px + pSize, py, px + pSize, py + pRadius);
    ctx.lineTo(px + pSize, py + pSize - pRadius);
    ctx.quadraticCurveTo(px + pSize, py + pSize, px + pSize - pRadius, py + pSize);
    ctx.lineTo(px + pRadius, py + pSize);
    ctx.quadraticCurveTo(px, py + pSize, px, py + pSize - pRadius);
    ctx.lineTo(px, py + pRadius);
    ctx.quadraticCurveTo(px, py, px + pRadius, py);
    ctx.closePath();
    ctx.clip();

    if (profile) {
      const pAspect = profile.width / profile.height;
      let pdw, pdh, pdx, pdy;
      if (pAspect > 1) {
        pdh = pSize; pdw = pdh * pAspect;
        pdx = px + (pSize - pdw) / 2; pdy = py;
      } else {
        pdw = pSize; pdh = pdw / pAspect;
        pdx = px; pdy = py + (pSize - pdh) / 2;
      }
      ctx.drawImage(profile, pdx, pdy, pdw, pdh);
    }
    ctx.restore();

    // 4. TEXTS
    // Guild name (white, bold)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 70px Sans";
    ctx.textAlign = "left";
    ctx.fillText((guild.name || "Unknown").toUpperCase(), 50, 710);

    // Owner name (cyan, italic)
    ctx.fillStyle = "#00ffff";
    ctx.font = "italic 45px Sans";
    ctx.fillText(user.name || "Unknown", 50, 780);

    // Footer
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "24px Sans";
    ctx.textAlign = "right";
    ctx.fillText("AKIRA GUILDS", 780, 780);

    return canvas.toBuffer("image/png");
  } catch (err) {
    console.error("[guildGen] Generation error:", err);
    // Return a minimal blank canvas so callers never crash
    const c = createCanvas(100, 100);
    return c.toBuffer("image/png");
  }
}

/**
 * Safely fetch a WhatsApp profile picture URL via the Baileys socket.
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
 * Resolve the best display name for a JID.
 * Tries sock.contacts first, then falls back to the formatted number.
 */
export function getContactName(sock, jid) {
  const num = jid.split("@")[0].split(":")[0];
  const c = sock.contacts?.[jid] ?? sock.contacts?.[`${num}@s.whatsapp.net`] ?? {};
  return c.notify || c.verifiedName || c.name || `+${num}`;
}
