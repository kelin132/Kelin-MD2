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
  jid
) {
  try {
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
   * HEADER
   * =========================
   */

  ctx.textAlign = "center";
  ctx.textBaseline =
    "alphabetic";

  ctx.fillStyle =
    "#f5afd2";

  ctx.font =
    "bold 30px Sans";

  ctx.fillText(
    "╭━━━〔 PROFILE 〕━━━╮",
    W / 2,
    82
  );

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

  /*
   * Glow
   */

  ctx.save();

  ctx.shadowColor =
    "rgba(245,130,195,0.55)";

  ctx.shadowBlur = 35;

  ctx.fillStyle =
    "#f3a7cd";

  ctx.beginPath();

  ctx.arc(
    avatarX,
    avatarY,
    avatarRadius + 12,
    0,
    Math.PI * 2
  );

  ctx.fill();

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

  /*
   * Avatar border
   */

  ctx.save();

  ctx.strokeStyle =
    "#f5afd2";

  ctx.lineWidth = 8;

  ctx.beginPath();

  ctx.arc(
    avatarX,
    avatarY,
    avatarRadius + 4,
    0,
    Math.PI * 2
  );

  ctx.stroke();

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
  ctx.fillText(`${roleLabel}  •  ${data.levelRole?.emoji || "🌱"} ${data.levelRole?.name || "Newcomer"}`, W / 2, 555);

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
  ctx.fillText(`⭐ Lv.${level}   •   📚 ${currentXp.toLocaleString()} / ${targetXp.toLocaleString()} XP`, W / 2, 575);

  const compactMoney = (value) => {
    const amount = Number(value ?? 0);
    const absolute = Math.abs(amount);
    if (absolute >= 1e12) return `$${(amount / 1e12).toFixed(1).replace(/\.0$/, "")}T`;
    if (absolute >= 1e9) return `$${(amount / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
    if (absolute >= 1e6) return `$${(amount / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
    if (absolute >= 1e3) return `$${(amount / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
    return `$${amount.toLocaleString()}`;
  };

  const drawCircleStat = (x, y, icon, label, value) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 54, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(8, 11, 29, 0.56)";
    ctx.fill();
    ctx.strokeStyle = "rgba(245, 175, 210, 0.88)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f6c36b";
    ctx.font = "bold 22px Sans";
    ctx.fillText(icon, x, y - 18);
    ctx.fillStyle = "#fff7fb";
    ctx.font = "bold 16px Sans";
    ctx.fillText(fitText(ctx, String(value ?? "0"), 82), x, y + 17);

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f4f0f2";
    ctx.font = "bold 19px Sans";
    ctx.fillText(label, x, y + 86);
    ctx.restore();
  };

  const statX = [130, 343, 557, 770];
  drawCircleStat(statX[0], 700, "🌟", "Active", data.daysActive ?? data.reach ?? 0);
  drawCircleStat(statX[1], 700, "🃏", "Cards", data.cards ?? 0);
  drawCircleStat(statX[2], 700, "🎮", "Games", data.games ?? 0);
  drawCircleStat(statX[3], 700, "🐾", "Pokémon", data.pokemon ?? 0);

  drawCircleStat(statX[0], 930, "💰", "Wallet", compactMoney(data.wallet));
  drawCircleStat(statX[1], 930, "🏦", "Bank", compactMoney(data.bank));
  drawCircleStat(statX[2], 930, "💎", "Diamonds", Number(data.diamonds ?? 0).toLocaleString());
  drawCircleStat(statX[3], 930, "🎒", "Items", data.items ?? 0);

  ctx.textAlign = "left";
  ctx.font = "bold 21px Sans";
  ctx.fillStyle = "#f4f0f2";
  ctx.fillText(`📝 ${fitText(ctx, data.bio || "None", 690)}`, 98, 1075);
  ctx.fillText(`🏰 Guild: ${fitText(ctx, data.guild || "None", 610)}`, 98, 1112);
  ctx.fillStyle = "#dfb8cc";
  ctx.font = "20px Sans";
  ctx.fillText(`📅 Joined: ${fitText(ctx, data.joined || "Unknown", 600)}`, 98, 1149);

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