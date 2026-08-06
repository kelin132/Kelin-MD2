/**
 * Portrait profile card inspired by the user's WhatsApp reference.
 * The content is intentionally rendered into the image so it stays readable
 * across WhatsApp clients instead of relying on a long caption.
 */
const canvasModulePromise = import("canvas");

async function getCanvasModule() {
  return canvasModulePromise;
}

async function loadImageSafe(url) {
  if (!url) return null;
  try {
    const { loadImage } = await getCanvasModule();
    return await Promise.race([
      loadImage(url),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);
  } catch {
    return null;
  }
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString();
}

function fitText(ctx, text, maxWidth) {
  const value = String(text || "None");
  if (ctx.measureText(value).width <= maxWidth) return value;
  let output = value;
  while (output.length > 3 && ctx.measureText(`${output}…`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}…`;
}

function drawRow(ctx, { x, y, icon, label, value, width }) {
  ctx.font = "bold 25px Sans";
  ctx.fillStyle = "#f5c542";
  ctx.textAlign = "left";
  ctx.fillText(icon, x, y);

  ctx.font = "bold 22px Sans";
  ctx.fillStyle = "#f4f4f4";
  ctx.fillText(label, x + 42, y);

  ctx.font = "22px Sans";
  ctx.fillStyle = "#e3e3e3";
  ctx.fillText(fitText(ctx, value, width - 42), x + 42 + ctx.measureText(label).width + 12, y);
}

export async function generateWhatsappProfileCard(data) {
  const { createCanvas } = await getCanvasModule();
  const W = 720;
  const H = 1120;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const background = ctx.createLinearGradient(0, 0, W, H);
  background.addColorStop(0, "#171918");
  background.addColorStop(0.45, "#252827");
  background.addColorStop(1, "#111312");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);

  // Subtle WhatsApp-like texture without distracting from the profile.
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = "#a9b4aa";
  ctx.lineWidth = 2;
  for (let y = -80; y < H + 100; y += 95) {
    for (let x = -60; x < W + 80; x += 130) {
      ctx.beginPath();
      ctx.arc(x + ((y / 95) % 2) * 35, y, 22, 0.4, 2.8);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  const margin = 26;
  const panelY = 28;
  const panelH = H - 56;
  ctx.fillStyle = "#252827";
  roundedRect(ctx, margin, panelY, W - margin * 2, panelH, 28);
  ctx.fill();

  const avatarSize = 310;
  const avatarX = (W - avatarSize) / 2;
  const avatarY = 0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(avatarX, avatarY, avatarSize, avatarSize);
  ctx.clip();
  const avatar = await loadImageSafe(data.profileImage);
  if (avatar) {
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  } else {
    const fallback = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    fallback.addColorStop(0, "#5e214c");
    fallback.addColorStop(1, "#1d4960");
    ctx.fillStyle = fallback;
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = "#f5c542";
    ctx.font = "bold 150px Sans";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(data.username || "?")[0].toUpperCase(), W / 2, avatarSize / 2);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  let y = avatarSize + 45;
  ctx.textAlign = "left";
  ctx.fillStyle = "#f4f4f4";
  ctx.font = "bold 26px Sans";
  ctx.fillText(`✨ Profile : @${data.tag || "user"}`, 48, y);
  y += 58;

  ctx.font = "bold 23px Sans";
  ctx.fillStyle = "#eeeeee";
  ctx.fillText("🏅 Achievements 🏅", 48, y);
  y += 44;
  ctx.font = "22px Sans";
  ctx.fillStyle = "#dedede";
  ctx.fillText(
    `🌟 ${data.daysActive ?? 0} days  |  🃏 ${data.cards ?? 0} Cards`,
    48,
    y,
  );
  y += 37;
  ctx.fillText(
    `🎮 ${data.games ?? 0} Games  |  💸 ${data.casino ?? 0} casino`,
    48,
    y,
  );
  y += 64;

  drawRow(ctx, { x: 48, y, icon: "⭐", label: "Level:", value: data.level ?? 1, width: W - 96 });
  y += 43;
  drawRow(ctx, {
    x: 48,
    y,
    icon: "📚",
    label: "XP:",
    value: `${formatMoney(data.xp)} / ${formatMoney(data.xpTarget)} (${data.roleLabel || "Adventurer"})`,
    width: W - 96,
  });
  y += 56;
  drawRow(ctx, {
    x: 48,
    y,
    icon: "💰",
    label: "Wallet:",
    value: formatMoney(data.wallet),
    width: W - 96,
  });
  y += 42;
  drawRow(ctx, {
    x: 48,
    y,
    icon: "🏦",
    label: "Bank:",
    value: formatMoney(data.bank),
    width: W - 96,
  });
  y += 42;
  drawRow(ctx, {
    x: 48,
    y,
    icon: "💎",
    label: "Diamonds:",
    value: formatMoney(data.diamonds),
    width: W - 96,
  });
  y += 42;
  drawRow(ctx, {
    x: 48,
    y,
    icon: "🎒",
    label: "Items:",
    value: data.items ?? 0,
    width: W - 96,
  });
  y += 65;

  ctx.font = "bold 23px Sans";
  ctx.fillStyle = "#f4f4f4";
  ctx.fillText("📝 Bio:", 48, y);
  y += 35;
  ctx.font = "21px Sans";
  ctx.fillStyle = "#dedede";
  const bio = fitText(ctx, data.bio || "No bio set.", W - 96);
  ctx.fillText(bio, 48, y);
  y += 52;
  ctx.font = "22px Sans";
  ctx.fillText(`⚜️ Clan: ${fitText(ctx, data.guild || "None", W - 145)}`, 48, y);
  y += 48;
  ctx.fillStyle = "#9c9c9c";
  ctx.font = "18px Sans";
  ctx.fillText(`Role: ${data.role || "Member"}  •  Joined: ${data.joined || "Unknown"}`, 48, y);

  return canvas.toBuffer("image/png");
}