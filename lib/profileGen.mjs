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

    // Dark anime overlay
    ctx.fillStyle =
      "rgba(8, 10, 25, 0.48)";

    ctx.fillRect(
      0,
      0,
      W,
      H
    );
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

  const avatarRadius = 190;

  const avatarX =
    W / 2;

  const avatarY =
    290;

  /* Ornate bronze-gold glow behind the portrait frame. */
  ctx.save();
  ctx.shadowColor = "rgba(234, 177, 92, 0.52)";
  ctx.shadowBlur = 32;
  ctx.strokeStyle = "rgba(104, 63, 39, 0.95)";
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#d9a85d";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#70482f";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 28, 0, Math.PI * 2);
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

  /* Decorative jewels and side flourishes complete the reference-style frame. */
  ctx.save();
  const ornamentColor = "#d9a85d";
  const darkOrnament = "#70482f";
  for (const angle of [-Math.PI / 2, 0, Math.PI / 2, Math.PI]) {
    const ox = avatarX + Math.cos(angle) * (avatarRadius + 28);
    const oy = avatarY + Math.sin(angle) * (avatarRadius + 28);
    ctx.translate(ox, oy);
    ctx.rotate(angle + Math.PI / 4);
    ctx.fillStyle = darkOrnament;
    ctx.fillRect(-18, -18, 36, 36);
    ctx.fillStyle = ornamentColor;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.strokeStyle = darkOrnament;
  ctx.lineWidth = 7;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(avatarX + side * (avatarRadius + 20), avatarY, 42, Math.PI / 2, Math.PI * 1.5, side < 0);
    ctx.stroke();
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

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f5afd2";
  ctx.font = "bold 34px Sans";
  ctx.fillText(fitText(ctx, username.toUpperCase(), 650), W / 2, 520);

  const roleText = String(data.role || "Member").toUpperCase();
  const roleLabel = roleText === "MODERATOR" ? "MOD" : roleText;
  const level = Math.max(1, Number(data.level) || 1);
  const currentXp = Math.max(0, Number(data.xp) || 0);
  const targetXp = Math.max(1, Number(data.xpTarget) || 100);
  const progress = Math.min(currentXp / targetXp, 1);

  ctx.fillStyle = "#f5afd2";
  ctx.font = "bold 23px Sans";
  ctx.fillText(`${roleLabel}  •  ${data.levelRole?.emoji || "~"} ${data.levelRole?.name || "Newcomer"}`, W / 2, 555);

  const barX = 140;
  const barY = 590;
  const barW = W - 280;
  const barH = 16;
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
  ctx.fillStyle = "#dfb8cc";
  ctx.font = "bold 18px Sans";
  ctx.fillText(` Lv.${level}   •   ${currentXp.toLocaleString()} / ${targetXp.toLocaleString()} XP`, W / 2, 575);

  const guildName = String(data.guild || "No guild").trim() || "No guild";
  const joinedDate = String(data.joined || "Unknown").trim() || "Unknown";

  ctx.textAlign = "center";
  ctx.fillStyle = "#f4b8d2";
  ctx.font = "bold italic 28px Sans";
  ctx.fillText(`♜ ${fitText(ctx, guildName, 700)} ♜`, W / 2, 715);

  ctx.fillStyle = "#f9d9e8";
  ctx.font = "italic 22px Sans";
  ctx.fillText(`✦ Joined ${fitText(ctx, joinedDate, 650)} ✦`, W / 2, 760);

  ctx.fillStyle = "#f4f0f2";
  ctx.font = "bold italic 23px Sans";
  ctx.fillText(`“${fitText(ctx, data.bio || "No bio set.", 700)}”`, W / 2, 825);

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