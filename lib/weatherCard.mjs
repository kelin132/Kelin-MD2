const canvasModulePromise = import("@napi-rs/canvas");

async function canvas() {
  return canvasModulePromise;
}

function roundRect(ctx, x, y, width, height, radius) {
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

export async function generateWeatherCard(data) {
  const { createCanvas } = await canvas();
  const width = 900;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#09111f");
  background.addColorStop(0.6, "#132b45");
  background.addColorStop(1, "#0b1728");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(96, 165, 250, 0.18)";
  ctx.beginPath();
  ctx.arc(760, 70, 150, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(147, 197, 253, 0.65)";
  ctx.lineWidth = 2;
  roundRect(ctx, 18, 18, width - 36, height - 36, 22);
  ctx.stroke();

  ctx.fillStyle = "#bfdbfe";
  ctx.font = "bold 18px Sans";
  ctx.fillText("WEATHER · LIVE", 52, 66);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px Sans";
  ctx.fillText(String(data.city || "Unknown").slice(0, 24), 52, 130);
  ctx.fillStyle = "rgba(255,255,255,0.68)";
  ctx.font = "20px Sans";
  ctx.fillText([data.region, data.country].filter(Boolean).join(", "), 54, 162);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 96px Sans";
  ctx.fillText(`${data.tempC ?? 0}°`, 52, 290);
  ctx.fillStyle = "#e0f2fe";
  ctx.font = "24px Sans";
  ctx.fillText(`${data.condition || "Unknown conditions"}`, 58, 330);
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "17px Sans";
  ctx.fillText(`Feels like ${data.feelsC ?? 0}°C`, 58, 360);

  const details = [
    ["HUMIDITY", `${data.humidity ?? 0}%`],
    ["WIND", `${data.windKph ?? 0} km/h`],
    ["UV INDEX", `${data.uv ?? 0}`],
    ["LOCAL TIME", data.localTime || "Unknown"],
  ];
  details.forEach(([label, value], index) => {
    const x = 465 + (index % 2) * 190;
    const y = 210 + Math.floor(index / 2) * 115;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    roundRect(ctx, x, y, 170, 82, 14);
    ctx.fill();
    ctx.fillStyle = "#93c5fd";
    ctx.font = "bold 12px Sans";
    ctx.fillText(label, x + 16, y + 26);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Sans";
    ctx.fillText(String(value).slice(0, 17), x + 16, y + 58);
  });

  return canvas.toBuffer("image/png");
}
