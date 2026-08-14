/**
 * KELIN MD — Economy profile card image generator.
 */

const canvasModulePromise = import("canvas");

async function getCanvasModule() {
  return canvasModulePromise;
}

async function loadImageSafe(source, timeoutMs = 10000) {
  if (!source) return null;

  try {
    const { loadImage } = await getCanvasModule();

    if (Buffer.isBuffer(source)) {
      return await loadImage(source);
    }

    if (typeof source === "string" && /^https?:\/\//i.test(source)) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(source, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "image/*,*/*;q=0.8",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        if (!buffer.length) {
          throw new Error("Empty image");
        }

        return await loadImage(buffer);
      } finally {
        clearTimeout(timer);
      }
    }

    return await loadImage(source);
  } catch (error) {
    console.error("[PROFILE IMAGE]", error.message);
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
  if (!image || !image.width || !image.height) return;

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

function fitText(ctx, text, maxWidth) {
  const value = String(text ?? "None");

  if (ctx.measureText(value).width <= maxWidth) {
    return value;
  }

  let output = value;

  while (
    output.length > 3 &&
    ctx.measureText(`${output}…`).width > maxWidth
  ) {
    output = output.slice(0, -1);
  }

  return `${output}…`;
}

function drawSectionTitle(ctx, y, title) {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f4b8d2";
  ctx.font = "bold 24px Sans";
  ctx.fillText(`── ✦ ${title} ✦ ──`, 450, y);
}

function drawProfileLine(
  ctx,
  y,
  icon,
  label,
  value,
  valueColor = "#f6f0f3"
) {
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

  ctx.fillText(
    fitText(
      ctx,
      String(value ?? "None"),
      680 - labelWidth
    ),
    158 + labelWidth,
    y
  );
}

function formatMoney(value) {
  const number = Number(value) || 0;
  return number.toLocaleString();
}

export async function generateProfileImage(data) {
  const { createCanvas } = await getCanvasModule();

  const W = 900;
  const H = 1500;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  /*
   * BACKGROUND
   */
  const page = ctx.createLinearGradient(0, 0, W, H);

  page.addColorStop(0, "#291c35");
  page.addColorStop(0.5, "#101a2f");
  page.addColorStop(1, "#171126");

  ctx.fillStyle = page;
  ctx.fillRect(0, 0, W, H);

  /*
   * PANEL
   */
  const panelX = 30;
  const panelY = 26;
  const panelW = W - 60;
  const panelH = H - 52;

  ctx.save();

  ctx.shadowColor = "rgba(0,0,0,0.42)";
  ctx.shadowBlur = 30;

  ctx.fillStyle = "#121728";

  roundRect(
    ctx,
    panelX,
    panelY,
    panelW,
    panelH,
    38
  );

  ctx.fill();

  ctx.restore();

  ctx.save();

  ctx.strokeStyle = "#d982b4";
  ctx.lineWidth = 3;

  roundRect(
    ctx,
    panelX,
    panelY,
    panelW,
    panelH,
    38
  );

  ctx.stroke();

  ctx.restore();

  /*
   * TITLE
   */
  ctx.textAlign = "center";
  ctx.fillStyle = "#f4b8d2";
  ctx.font = "bold 27px Sans";

  ctx.fillText(
    "╭━━━〔 🌸 𝗣𝗥𝗢𝗙𝗜𝗟𝗘 〕━━━╮",
    W / 2,
    78
  );

  /*
   * AVATAR
   */
  const avatarRadius = 205;
  const avatarX = W / 2;
  const avatarY = 285;

  ctx.save();

  ctx.shadowColor = "rgba(225,120,184,0.34)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;

  ctx.fillStyle = "#f4b8d2";

  ctx.beginPath();
  ctx.arc(
    avatarX,
    avatarY,
    avatarRadius + 11,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.restore();

  /*
   * LOAD PROFILE IMAGE
   */
  const avatar = await loadImageSafe(
    data.profileImage
  );

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
      avatarX - avatarRadius,
      avatarY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2
    );
  } else {
    const fallback = ctx.createLinearGradient(
      avatarX - avatarRadius,
      avatarY - avatarRadius,
      avatarX + avatarRadius,
      avatarY + avatarRadius
    );

    fallback.addColorStop(0, "#d8d4d1");
    fallback.addColorStop(1, "#797674");

    ctx.fillStyle = fallback;

    ctx.fillRect(
      avatarX - avatarRadius,
      avatarY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px Sans";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
      (data.username || "?")[0].toUpperCase(),
      avatarX,
      avatarY
    );
  }

  ctx.restore();

  /*
   * AVATAR BORDER
   */
  ctx.strokeStyle = "#f4b8d2";
  ctx.lineWidth = 8;

  ctx.beginPath();

  ctx.arc(
    avatarX,
    avatarY,
    avatarRadius + 5,
    0,
    Math.PI * 2
  );

  ctx.stroke();

  /*
   * USERNAME
   */
  const username =
    String(data.username || "User").trim() || "User";

  ctx.fillStyle = "#fff7fb";
  ctx.font = "bold 34px Sans";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillText(
    fitText(
      ctx,
      username.toUpperCase(),
      650
    ),
    W / 2,
    520
  );

  /*
   * ROLE
   */
  const roleText =
    String(data.role || "Member").toUpperCase();

  const shortRole = {
    MODERATOR: "MOD",
    MOD: "MOD",
    STAFF: "STAFF",
    OWNER: "OWNER",
    PREMIUM: "PREMIUM",
    MEMBER: "MEMBER",
  }[roleText] || roleText;

  const levelRoleText =
    data.levelRole?.name ||
    data.roleLabel ||
    "Newcomer";

  const levelRoleEmoji =
    data.levelRole?.emoji || "🌱";

  ctx.font = "bold 24px Sans";
  ctx.fillStyle = "#f4b8d2";

  ctx.fillText(
    `${shortRole} • ${levelRoleEmoji} ${levelRoleText}`,
    W / 2,
    550
  );

  /*
   * XP
   */
  const currentXp =
    Math.max(0, Number(data.xp) || 0);

  const targetXp =
    Math.max(1, Number(data.xpTarget) || 100);

  const progress =
    Math.min(currentXp / targetXp, 1);

  const barX = 140;
  const barY = 583;
  const barW = W - 280;
  const barH = 16;

  ctx.textAlign = "center";

  ctx.fillStyle = "#dfb8cc";
  ctx.font = "bold 18px Sans";

  ctx.fillText(
    `⭐ Lv.${data.level || 1} • 📚 ${currentXp.toLocaleString()} / ${targetXp.toLocaleString()} XP`,
    W / 2,
    barY - 14
  );

  ctx.fillStyle = "#2d3651";

  roundRect(
    ctx,
    barX,
    barY,
    barW,
    barH,
    barH / 2
  );

  ctx.fill();

  if (progress > 0) {
    const xpGradient =
      ctx.createLinearGradient(
        barX,
        0,
        barX + barW,
        0
      );

    xpGradient.addColorStop(0, "#cc6d9d");
    xpGradient.addColorStop(1, "#f4c36a");

    ctx.fillStyle = xpGradient;

    roundRect(
      ctx,
      barX,
      barY,
      Math.max(
        barH,
        barW * progress
      ),
      barH,
      barH / 2
    );

    ctx.fill();
  }

  /*
   * STATS
   */
  drawSectionTitle(
    ctx,
    680,
    "𝗦𝗧𝗔𝗧𝗦"
  );

  drawProfileLine(
    ctx,
    728,
    "🌟",
    "Active",
    data.daysActive ?? data.reach ?? 0
  );

  drawProfileLine(
    ctx,
    772,
    "🃏",
    "Cards",
    data.cards ?? 0
  );

  drawProfileLine(
    ctx,
    816,
    "🎮",
    "Games",
    data.games ?? 0
  );

  drawProfileLine(
    ctx,
    860,
    "🐾",
    "Pokémon",
    data.pokemon ?? 0
  );

  /*
   * LEVEL
   */
  drawSectionTitle(
    ctx,
    932,
    "𝗟𝗘𝗩𝗘𝗟"
  );

  drawProfileLine(
    ctx,
    980,
    "⭐",
    "Lv.",
    data.level ?? 1
  );

  drawProfileLine(
    ctx,
    1024,
    "📚",
    "XP",
    `${currentXp.toLocaleString()} / ${targetXp.toLocaleString()}`
  );

  /*
   * WEALTH
   */
  drawSectionTitle(
    ctx,
    1096,
    "𝗪𝗘𝗔𝗟𝗧𝗛"
  );

  drawProfileLine(
    ctx,
    1144,
    "💰",
    "$",
    `$${formatMoney(data.wallet)}`
  );

  drawProfileLine(
    ctx,
    1188,
    "🏦",
    "$",
    `$${formatMoney(data.bank)}`
  );

  drawProfileLine(
    ctx,
    1232,
    "💎",
    "Diamonds",
    formatMoney(data.diamonds)
  );

  drawProfileLine(
    ctx,
    1276,
    "🎒",
    "Items",
    data.items ?? 0
  );

  /*
   * BIO
   */
  ctx.textAlign = "left";
  ctx.font = "bold 23px Sans";
  ctx.fillStyle = "#f4f0f2";

  ctx.fillText(
    `📝 ${fitText(ctx, data.bio || "None", 690)}`,
    98,
    1342
  );

  ctx.fillText(
    `🏰 Guild: ${fitText(ctx, data.guild || "None", 610)}`,
    98,
    1384
  );

  ctx.fillStyle = "#dfb8cc";
  ctx.font = "22px Sans";

  ctx.fillText(
    `📅 Joined: ${fitText(ctx, data.joined || "Unknown", 600)}`,
    98,
    1426
  );

  /*
   * FOOTER
   */
  ctx.textAlign = "center";
  ctx.fillStyle = "#f4b8d2";
  ctx.font = "bold 25px Sans";

  ctx.fillText(
    "╰━━━━━━━━━━━━━━━━━━━━━━╯",
    W / 2,
    1470
  );

  return canvas.toBuffer("image/png");
}

/**
 * Get WhatsApp profile picture.
 */
export async function getProfilePic(sock, jid) {
  try {
    if (!sock || !jid) return null;

    const url = await sock.profilePictureUrl(
      jid,
      "image"
    );

    if (!url) return null;

    console.log(
      `[PROFILE] Picture found for ${jid}`
    );

    return url;
  } catch (error) {
    console.log(
      `[PROFILE] No picture for ${jid}: ${error.message}`
    );

    return null;
  }
}

/**
 * Resolve profile role.
 */
export function resolveRole({
  isOwner,
  isMod,
  isStaff,
  isPremium,
  staffLevel = 0,
}) {
  if (isOwner) return "Owner";

  if (isMod || staffLevel >= 3) {
    return "Moderator";
  }

  if (isStaff || staffLevel >= 2) {
    return "Staff";
  }

  if (isPremium) {
    return "Premium";
  }

  return "Member";
}