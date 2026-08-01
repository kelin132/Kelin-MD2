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

// ── Guild profile card ────────────────────────────────────────────────────────

/**
 * Generate an 800×800 guild profile card.
 *
 * @param {{ name: string, icon?: string }} guild
 * @param {{ name: string, profilePic?: string, jid?: string }} user
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateGuildProfile(guild, user) {
  try {
    const { createCanvas } = await getCanvasModule();
    const width = 800;
    const height = 800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const fitText = (text, maxWidth) => {
      if (ctx.measureText(text).width <= maxWidth) return text;
      let t = text;
      while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
        t = t.slice(0, -1);
      }
      return t + "…";
    };

    const roundedRectPath = (x, y, size, radius) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + size - radius, y);
      ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
      ctx.lineTo(x + size, y + size - radius);
      ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
      ctx.lineTo(x + radius, y + size);
      ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

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

    // Dark overlay across the whole canvas so the centered image + text stay legible
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, width, height);

    // 2. PROFILE BOX (owner profile pic) — centered on the card
    const profile = await loadImageSafe(user.profilePic || null);

    const pSize = 380, pRadius = 40;
    const px = (width - pSize) / 2;
    const py = 110; // top-anchored, leaves room below for text

    // Shadow
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 35;
    roundedRectPath(px, py, pSize, pRadius);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.restore();

    // Clip + draw profile image
    ctx.save();
    roundedRectPath(px, py, pSize, pRadius);
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
    } else {
      ctx.fillStyle = "#2b2b2b";
      ctx.fillRect(px, py, pSize, pSize);
    }
    ctx.restore();

    // Border around the profile box
    ctx.save();
    roundedRectPath(px, py, pSize, pRadius);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.stroke();
    ctx.restore();

    // 3. TEXTS — centered below the image
    const centerX = width / 2;
    const maxTextWidth = width - 80;

    // Guild name (white, bold)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px Sans";
    ctx.textAlign = "center";
    ctx.fillText(fitText((guild.name || "Unknown").toUpperCase(), maxTextWidth), centerX, py + pSize + 80);

    // Owner name (cyan, italic)
    ctx.fillStyle = "#00ffff";
    ctx.font = "italic 38px Sans";
    ctx.fillText(fitText(user.name || "Unknown", maxTextWidth), centerX, py + pSize + 130);

    // Owner JID (muted gray, smaller, monospace-style)
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "26px monospace";
    ctx.fillText(fitText(user.jid || "", maxTextWidth), centerX, py + pSize + 168);

    // Footer
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "22px Sans";
    ctx.textAlign = "right";
    ctx.fillText("AKIRA GUILDS", 760, 770);

    return canvas.toBuffer("image/png");
  } catch (err) {
    console.error("[guildGen] Generation error:", err);
    try {
      const { createCanvas } = await getCanvasModule();
      const c = createCanvas(100, 100);
      return c.toBuffer("image/png");
    } catch {
      throw err;
    }
  }
}