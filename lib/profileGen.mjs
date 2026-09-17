/**
 * KELIN MD — Anime Aesthetic Profile Card
 */

let canvasModulePromise;

function getCanvasModule() {
  if (!canvasModulePromise) {
    canvasModulePromise = import("canvas").catch(async (canvasError) => {
      // Some panel hosts cannot build the native canvas package. The N-API
      // build exposes the same createCanvas/loadImage API without compilation.
      try {
        return await import("@napi-rs/canvas");
      } catch {
        throw canvasError;
      }
    });
  }
  return canvasModulePromise;
}

/**
 * Safely load remote/local images.
 */
async function loadImageSafe(source, timeoutMs = 10000) {
  if (!source) return null;

  try {
    const { loadImage } = await getCanvasModule();

    // Buffer
    if (Buffer.isBuffer(source)) {
      return await loadImage(source);
    }

    // Remote URL
    if (
      typeof source === "string" &&
      /^https?:\/\//i.test(source)
    ) {
      const controller = new AbortController();

      const timer = setTimeout(
        () => controller.abort(),
        timeoutMs
      );

      try {
        const response = await fetch(source, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept":
              "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Image request failed: ${response.status}`
          );
        }

        const buffer = Buffer.from(
          await response.arrayBuffer()
        );

        if (!buffer.length) {
          throw new Error("Empty image response");
        }

        return await loadImage(buffer);
      } finally {
        clearTimeout(timer);
      }
    }

    return await loadImage(source);
  } catch (error) {
    console.error(
      "[PROFILE IMAGE]",
      error.message
    );

    return null;
  }
}

/**
 * Draw image while covering the entire area.
 */
function drawImageCover(
  ctx,
  image,
  x,
  y,
  w,
  h
) {
  if (!image || !image.width || !image.height) {
    return;
  }

  const scale = Math.max(
    w / image.width,
    h / image.height
  );

  const width = image.width * scale;
  const height = image.height * scale;

  ctx.drawImage(
    image,
    x + (w - width) / 2,
    y + (h - height) / 2,
    width,
    height
  );
}

/**
 * Rounded rectangle.
 */
function roundRect(
  ctx,
  x,
  y,
  w,
  h,
  radius
) {
  const r = Math.min(
    radius,
    w / 2,
    h / 2
  );

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(
    x + w,
    y,
    x + w,
    y + h,
    r
  );
  ctx.arcTo(
    x + w,
    y + h,
    x,
    y + h,
    r
  );
  ctx.arcTo(
    x,
    y + h,
    x,
    y,
    r
  );
  ctx.arcTo(
    x,
    y,
    x + w,
    y,
    r
  );
  ctx.closePath();
}

/**
 * Text fitting.
 */
function fitText(
  ctx,
  text,
  maxWidth
) {
  const value =
    String(text ?? "None");

  if (
    ctx.measureText(value).width <=
    maxWidth
  ) {
    return value;
  }

  let output = value;

  while (
    output.length > 3 &&
    ctx.measureText(
      `${output}…`
    ).width > maxWidth
  ) {
    output = output.slice(0, -1);
  }

  return `${output}…`;
}

/**
 * Generate anime aesthetic background
 * when no custom background is available.
 */
function drawAnimeBackground(
  ctx,
  W,
  H
) {
  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      W,
      H
    );

  gradient.addColorStop(
    0,
    "#291333"
  );

  gradient.addColorStop(
    0.35,
    "#18244a"
  );

  gradient.addColorStop(
    0.7,
    "#10172e"
  );

  gradient.addColorStop(
    1,
    "#26132f"
  );

  ctx.fillStyle = gradient;
  ctx.fillRect(
    0,
    0,
    W,
    H
  );

  /*
   * Anime-style moon glow
   */
  const moon =
    ctx.createRadialGradient(
      720,
      180,
      10,
      720,
      180,
      330
    );

  moon.addColorStop(
    0,
    "rgba(255,190,225,0.28)"
  );

  moon.addColorStop(
    0.45,
    "rgba(180,150,255,0.10)"
  );

  moon.addColorStop(
    1,
    "rgba(0,0,0,0)"
  );

  ctx.fillStyle = moon;

  ctx.fillRect(
    400,
    0,
    500,
    500
  );

  /*
   * Stars
   */
  ctx.save();

  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#ffd9ef";

  const stars = [
    [75, 130, 2],
    [150, 220, 3],
    [245, 95, 2],
    [360, 170, 2],
    [510, 105, 3],
    [620, 240, 2],
    [770, 95, 3],
    [830, 310, 2],
    [90, 520, 2],
    [780, 580, 3],
    [150, 760, 2],
    [700, 820, 2],
    [820, 980, 3],
    [75, 1110, 2],
    [760, 1280, 2],
  ];

  for (const [
    x,
    y,
    size,
  ] of stars) {
    ctx.beginPath();

    ctx.arc(
      x,
      y,
      size,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.restore();

  /*
   * Soft decorative circles
   */
  ctx.save();

  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = "#f5a9d0";
  ctx.lineWidth = 3;

  for (
    let i = 0;
    i < 5;
    i++
  ) {
    ctx.beginPath();

    ctx.arc(
      100 + i * 210,
      300 + i * 180,
      130,
      0,
      Math.PI * 2
    );

    ctx.stroke();
  }

  ctx.restore();

  /*
   * Bottom mist
   */
  const mist =
    ctx.createLinearGradient(
      0,
      H - 400,
      0,
      H
    );

  mist.addColorStop(
    0,
    "rgba(160,100,180,0)"
  );

  mist.addColorStop(
    1,
    "rgba(120,70,150,0.25)"
  );

  ctx.fillStyle = mist;

  ctx.fillRect(
    0,
    H - 400,
    W,
    400
  );
}

/**
 * Get WhatsApp profile picture.
 */
export async function getProfilePic(
  sock,
  jid,
  preferredImage = null
) {
  try {
    if (preferredImage && typeof preferredImage === "string" && /^https?:\/\//i.test(preferredImage)) {
      console.log(`[PROFILE] Using website-selected PFP for ${jid}`);
      return preferredImage;
    }

    if (!sock || !jid) {
      return null;
    }

    const url =
      await sock.profilePictureUrl(
        jid,
        "image"
      );

    if (!url) {
      return null;
    }

    console.log(
      `[PROFILE] PFP found for ${jid}`
    );

    return url;
  } catch (error) {
    console.log(
      `[PROFILE] No PFP for ${jid}: ${error.message}`
    );

    return null;
  }
}

/**
 * Generate profile image.
 */
export async function generateProfileImage(
  data
) {
  const { createCanvas } =
    await getCanvasModule();

  const W = 900;
  const H = 1250;

  const canvas =
    createCanvas(W, H);

  const ctx =
    canvas.getContext("2d");

  /*
   * =========================
   * BACKGROUND
   * =========================
   */

  const customBackground =
    await loadImageSafe(
      data.profileBackground
    );

  if (customBackground) {
    drawImageCover(
      ctx,
      customBackground,
      0,
      0,
      W,
      H
    );

    // Keep the uploaded background visible across the entire card. A soft
    // tint improves contrast without creating a separate blank lower panel.
    const backgroundTint = ctx.createLinearGradient(0, 0, 0, H);
    backgroundTint.addColorStop(0, "rgba(255, 148, 190, 0.18)");
    backgroundTint.addColorStop(0.45, "rgba(255, 186, 214, 0.12)");
    backgroundTint.addColorStop(1, "rgba(255, 235, 243, 0.22)");
    ctx.fillStyle = backgroundTint;
    ctx.fillRect(0, 0, W, H);
  } else {
    drawAnimeBackground(
      ctx,
      W,
      H
    );
  }

  /*
   * =========================
   * AVATAR
   * =========================
   */

  const avatarRadius = 185;
  const avatarX = W / 2;
  const avatarY = 275;
  const framePadding = 36;
  const frameSize = avatarRadius * 2 + framePadding * 2;
  const frameX = avatarX - frameSize / 2;
  const frameY = avatarY - frameSize / 2;

  /*
   * Reference-style portrait frame. The frame is deliberately measured
   * separately from the text block so the username can never touch it.
   */
  ctx.save();
  ctx.shadowColor = "rgba(100, 35, 72, 0.34)";
  ctx.shadowBlur = 28;
  ctx.fillStyle = "rgba(56, 18, 45, 0.18)";
  roundRect(ctx, frameX, frameY, frameSize, frameSize, 30);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, frameX, frameY, frameSize, frameSize, 30);
  ctx.strokeStyle = "#fff1f7";
  ctx.lineWidth = 8;
  ctx.stroke();
  roundRect(ctx, frameX + 15, frameY + 15, frameSize - 30, frameSize - 30, 22);
  ctx.strokeStyle = "#b85d86";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  /*
   * Get PFP
   */

  const avatar =
    await loadImageSafe(
      data.profileImage
    );

  /*
   * Circular crop
   */

  ctx.save();

  ctx.beginPath();

  ctx.arc(
    avatarX,
    avatarY,
    avatarRadius,
    0,
    Math.PI * 2
  );

  ctx.clip();

  if (avatar) {
    drawImageCover(
      ctx,
      avatar,
      avatarX -
        avatarRadius,
      avatarY -
        avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2
    );
  } else {
    /*
     * Fallback avatar
     */

    const fallback =
      ctx.createLinearGradient(
        avatarX -
          avatarRadius,
        avatarY -
          avatarRadius,
        avatarX +
          avatarRadius,
        avatarY +
          avatarRadius
      );

    fallback.addColorStop(
      0,
      "#5f4a6f"
    );

    fallback.addColorStop(
      1,
      "#1b203c"
    );

    ctx.fillStyle =
      fallback;

    ctx.fillRect(
      avatarX -
        avatarRadius,
      avatarY -
        avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2
    );

    ctx.fillStyle =
      "#ffffff";

    ctx.font =
      "bold 80px Sans";

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.fillText(
      (
        data.username ||
        "?"
      )[0].toUpperCase(),
      avatarX,
      avatarY
    );
  }

  ctx.restore();

  /* Floral corner jewels complete the reference-style frame. */
  ctx.save();
  const corners = [
    [frameX, frameY],
    [frameX + frameSize, frameY],
    [frameX, frameY + frameSize],
    [frameX + frameSize, frameY + frameSize],
  ];
  for (const [ox, oy] of corners) {
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(255, 235, 245, 0.96)";
      ctx.arc(ox + Math.cos(angle) * 18, oy + Math.sin(angle) * 18, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#b85d86";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.fillStyle = "#9d3e6e";
    ctx.arc(ox, oy, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  /*
   * =========================
   * USERNAME
   * =========================
   */

  const username =
    String(
      data.username ||
        "User"
    ).trim() ||
    "User";

  // The content panel begins well below the frame, leaving a fixed visual
  // buffer even when the frame or ornament sizes change.
  const contentTop = frameY + frameSize + 48;
  const panelY = contentTop - 20;
  ctx.save();
  ctx.fillStyle = "rgba(255, 245, 250, 0.84)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
  ctx.lineWidth = 3;
  roundRect(ctx, 42, panelY, W - 84, H - panelY - 42, 42);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#31182f";
  ctx.font = "bold 38px Sans";
  const usernameY = contentTop + 42;
  ctx.fillText(fitText(ctx, username.toUpperCase(), 700), W / 2, usernameY);

  const roleText = String(data.role || "Member").toUpperCase();
  const roleLabel = roleText === "MODERATOR" ? "MOD" : roleText;
  const level = Math.max(1, Number(data.level) || 1);
  const currentXp = Math.max(0, Number(data.xp) || 0);
  const targetXp = Math.max(1, Number(data.xpTarget) || 100);
  const progress = Math.min(currentXp / targetXp, 1);

  ctx.fillStyle = "#4c2847";
  ctx.font = "bold 24px Sans";
  ctx.fillText(
    fitText(ctx, `${roleLabel}  •  ${data.levelRole?.emoji || "~"} ${data.levelRole?.name || "Newcomer"}`, 700),
    W / 2,
    usernameY + 43,
  );

  const barX = 110;
  const barY = usernameY + 83;
  const barW = W - 220;
  const barH = 16;
  ctx.fillStyle = "#392947";
  roundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();
  if (progress > 0) {
    const xpGradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    xpGradient.addColorStop(0, "#9d3e6e");
    xpGradient.addColorStop(1, "#e992b4");
    ctx.fillStyle = xpGradient;
    roundRect(ctx, barX, barY, Math.max(barH, barW * progress), barH, barH / 2);
    ctx.fill();
  }
  ctx.fillStyle = "#4c2847";
  ctx.font = "bold 19px Sans";
  ctx.fillText(
    `Lv.${level}   •   ${currentXp.toLocaleString()} / ${targetXp.toLocaleString()} XP`,
    W / 2,
    barY + 42,
  );

  const guildName = String(data.guild || "No guild").trim() || "No guild";
  const joinedDate = String(data.joined || "Unknown").trim() || "Unknown";

  ctx.textAlign = "center";
  ctx.fillStyle = "#351b34";
  ctx.font = "bold italic 29px Sans";
  ctx.fillText(`♜ ${fitText(ctx, guildName, 700)} ♜`, W / 2, barY + 122);

  ctx.fillStyle = "#5a3154";
  ctx.font = "italic 22px Sans";
  ctx.fillText(`✦ Joined ${fitText(ctx, joinedDate, 650)} ✦`, W / 2, barY + 168);

  ctx.fillStyle = "#351b34";
  ctx.font = "bold italic 23px Sans";
  ctx.fillText(`“${fitText(ctx, data.bio || "No bio set.", 700)}”`, W / 2, barY + 228);

  return canvas.toBuffer("image/png");
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