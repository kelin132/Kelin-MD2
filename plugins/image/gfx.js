// plugins/image/gfx.js — Canvas-based stylish GFX text images (12 styles)
// Replaces the dead nexoracle API with local canvas rendering.

import { createCanvas } from "canvas";

// ── Style definitions ─────────────────────────────────────────────────────────
const STYLES = {
  1:  { bg: ["#0f0c29","#302b63","#24243e"], text: "#ffffff", glow: "#a78bfa", accent: "#7c3aed" },
  2:  { bg: ["#1a1a2e","#16213e","#0f3460"], text: "#e94560", glow: "#e94560", accent: "#e94560" },
  3:  { bg: ["#134e5e","#71b280"],           text: "#ffffff", glow: "#71b280", accent: "#134e5e" },
  4:  { bg: ["#373b44","#4286f4"],           text: "#ffffff", glow: "#4286f4", accent: "#a8d8f7" },
  5:  { bg: ["#1f1c2c","#928dab"],           text: "#f8f8f2", glow: "#928dab", accent: "#ff79c6" },
  6:  { bg: ["#0f2027","#203a43","#2c5364"], text: "#00d2ff", glow: "#00d2ff", accent: "#00d2ff" },
  7:  { bg: ["#4b6cb7","#182848"],           text: "#ffffff", glow: "#81ecec", accent: "#74b9ff" },
  8:  { bg: ["#c94b4b","#4b134f"],           text: "#ffffff", glow: "#fd79a8", accent: "#e84393" },
  9:  { bg: ["#141e30","#243b55"],           text: "#f9ca24", glow: "#f9ca24", accent: "#e55039" },
  10: { bg: ["#005c97","#363795"],           text: "#ffffff", glow: "#a29bfe", accent: "#74b9ff" },
  11: { bg: ["#0d0d0d","#1a1a1a"],           text: "#00ff88", glow: "#00ff88", accent: "#00cec9" },
  12: { bg: ["#fc4a1a","#f7b733"],           text: "#1a1a1a", glow: "#ffffff", accent: "#2d3436" },
};

/** Draw a linear gradient background */
function drawGradientBg(ctx, width, height, colors) {
  const grad = ctx.createLinearGradient(0, 0, width, height);
  if (colors.length === 1) {
    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, width, height);
    return;
  }
  colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

/** Measure text width (approximate) */
function tw(ctx, text) { return ctx.measureText(text).width; }

/** Build a GFX image buffer */
function buildGfx(style, texts) {
  const W = 720, H = 340;
  const s = STYLES[style] || STYLES[1];

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // Background
  drawGradientBg(ctx, W, H, s.bg);

  // Decorative border
  ctx.strokeStyle = s.accent;
  ctx.lineWidth   = 3;
  ctx.strokeRect(12, 12, W - 24, H - 24);

  // Inner glow border
  ctx.strokeStyle = s.glow + "55";
  ctx.lineWidth   = 1;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  // Corner accents
  const CL = 24;
  ctx.strokeStyle = s.accent;
  ctx.lineWidth   = 4;
  [[12,12],[W-12,12],[12,H-12],[W-12,H-12]].forEach(([cx, cy]) => {
    const sx = cx === 12 ? 1 : -1, sy = cy === 12 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * CL);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * CL, cy);
    ctx.stroke();
  });

  // Style number badge (top right)
  ctx.fillStyle = s.accent + "aa";
  ctx.fillRect(W - 60, 0, 60, 32);
  ctx.fillStyle = s.text;
  ctx.font      = "bold 14px monospace";
  ctx.fillText(`GFX ${style}`, W - 52, 20);

  // Text rendering
  const [t1, t2, t3] = texts;

  if (texts.length === 1) {
    // Single large centred text
    ctx.font      = "bold 72px monospace";
    ctx.fillStyle = s.glow;
    ctx.shadowColor = s.glow;
    ctx.shadowBlur  = 20;
    ctx.textAlign   = "center";
    ctx.fillText(t1.toUpperCase(), W / 2, H / 2 + 26);
    ctx.shadowBlur  = 0;

  } else if (texts.length === 2) {
    // Two lines: large primary + smaller secondary
    ctx.textAlign   = "center";
    ctx.shadowColor = s.glow;
    ctx.shadowBlur  = 16;

    // Primary
    ctx.font      = "bold 68px monospace";
    ctx.fillStyle = s.text;
    ctx.fillText(t1.toUpperCase(), W / 2, H / 2 - 10);

    // Divider
    ctx.shadowBlur  = 0;
    ctx.strokeStyle = s.accent;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(W * 0.2, H / 2 + 10);
    ctx.lineTo(W * 0.8, H / 2 + 10);
    ctx.stroke();

    // Secondary
    ctx.shadowColor = s.glow;
    ctx.shadowBlur  = 10;
    ctx.font        = "bold 34px monospace";
    ctx.fillStyle   = s.glow;
    ctx.fillText(t2.toUpperCase(), W / 2, H / 2 + 56);
    ctx.shadowBlur  = 0;

  } else {
    // Three lines
    ctx.textAlign   = "center";
    ctx.shadowColor = s.glow;

    ctx.shadowBlur  = 14;
    ctx.font        = "bold 30px monospace";
    ctx.fillStyle   = s.accent;
    ctx.fillText(t1.toUpperCase(), W / 2, H / 2 - 60);

    ctx.shadowBlur  = 18;
    ctx.font        = "bold 54px monospace";
    ctx.fillStyle   = s.text;
    ctx.fillText(t2.toUpperCase(), W / 2, H / 2 + 10);

    ctx.shadowBlur  = 10;
    ctx.font        = "bold 28px monospace";
    ctx.fillStyle   = s.glow;
    ctx.fillText(t3.toUpperCase(), W / 2, H / 2 + 68);

    ctx.shadowBlur  = 0;
  }

  ctx.textAlign = "left";
  return canvas.toBuffer("image/png");
}

// ── Style meta map ─────────────────────────────────────────────────────────────
const GFX_META = {
  gfx:   { style: 1, parts: 2, label: "GFX 1" },
  gfx1:  { style: 1, parts: 2, label: "GFX 1" },
  gfx2:  { style: 2, parts: 2, label: "GFX 2" },
  gfx3:  { style: 3, parts: 2, label: "GFX 3" },
  gfx4:  { style: 4, parts: 2, label: "GFX 4" },
  gfx5:  { style: 5, parts: 3, label: "GFX 5" },
  gfx6:  { style: 6, parts: 3, label: "GFX 6" },
  gfx7:  { style: 7, parts: 2, label: "GFX 7" },
  gfx8:  { style: 8, parts: 2, label: "GFX 8" },
  gfx9:  { style: 9, parts: 1, label: "GFX 9"  },
  gfx10: { style: 10, parts: 1, label: "GFX 10" },
  gfx11: { style: 11, parts: 1, label: "GFX 11" },
  gfx12: { style: 12, parts: 1, label: "GFX 12" },
};

export default {
  name: "gfx",
  aliases: ["gfx1","gfx2","gfx3","gfx4","gfx5","gfx6","gfx7","gfx8","gfx9","gfx10","gfx11","gfx12"],
  description: "Create stylish GFX text images. Use gfx1–gfx12 for 12 different colour styles.",
  category: "image",
  usage: ".gfx1 Text1;Text2 | .gfx5 Text1;Text2;Text3 | .gfx9 YourText",
  cooldown: 5,

  async run({ sock, msg, cmd, text }) {
    const jid  = msg.key.remoteJid;
    const meta = GFX_META[cmd] || GFX_META["gfx"];

    if (!text) {
      const ex = meta.parts === 3 ? `${cmd} Hello;World;Bot`
               : meta.parts === 2 ? `${cmd} Hello;World`
               :                    `${cmd} KelinMD`;
      return sock.sendMessage(jid, {
        text: `❌ Provide text.\n\nExample: *.${ex}*`,
      }, { quoted: msg });
    }

    const parts = text.split(";").map(p => p.trim()).filter(Boolean);

    if (parts.length < meta.parts) {
      const sep = meta.parts === 3 ? "three parts (Text1;Text2;Text3)"
                : meta.parts === 2 ? "two parts (Text1;Text2)"
                :                    "your text";
      return sock.sendMessage(jid, {
        text: `❌ ${meta.label} needs ${sep} separated by *;*`,
      }, { quoted: msg });
    }

    try {
      const buffer = buildGfx(meta.style, parts.slice(0, meta.parts));
      await sock.sendMessage(jid, {
        image:    buffer,
        caption:  `✨ *${meta.label}* created!`,
        mimetype: "image/png",
      }, { quoted: msg });
    } catch (err) {
      console.error("GFX ERROR:", err);
      await sock.sendMessage(jid, {
        text: `❌ Failed to create ${meta.label} image. Try again!`,
      }, { quoted: msg });
    }
  },
};
