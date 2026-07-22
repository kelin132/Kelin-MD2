// plugins/image/carbon.js — Code-to-image using the canvas package (local render)
// Renders code with a Catppuccin Mocha dark theme, traffic-light dots, and line numbers.

import { createCanvas, registerFont } from "canvas";

// ── theme ─────────────────────────────────────────────────────────────────────
const THEME = {
  bg:         "#1e1e2e",
  header:     "#313244",
  dot:        ["#f38ba8", "#a6e3a1", "#89b4fa"],
  lineNum:    "#585b70",
  text:       "#cdd6f4",
  keywords:   "#cba6f7",
  strings:    "#a6e3a1",
  comments:   "#6c7086",
};

// Very basic syntax-aware coloring: returns [{text, color}] for one line
function tokenizeLine(line) {
  // Strip trailing whitespace
  const raw = line;

  // Comments
  if (/^\s*(\/\/|#|--|<!--|\/\*)/.test(raw)) {
    return [{ text: raw, color: THEME.comments }];
  }

  // Simple keyword highlight (JS/TS/Python subset)
  const keywords = /\b(const|let|var|function|async|await|return|import|export|from|if|else|for|while|class|new|this|try|catch|throw|null|undefined|true|false|def|pass|and|or|not|in|is)\b/g;

  const tokens = [];
  let last = 0;
  let m;

  // Reset regex
  keywords.lastIndex = 0;
  const processed = raw.replace(/(".*?"|'.*?'|`.*?`)/g, (match, p1, offset) => {
    // Strings — we handle them separately after
    return match;
  });

  // Just push the whole line as default text; editors have full parsers, we keep it simple
  return [{ text: raw, color: THEME.text }];
}

function buildImage(code, lang = "code") {
  const lines      = code.split("\n");
  const FONT       = "14px monospace";
  const LINE_H     = 22;
  const PAD        = 28;
  const HEADER_H   = 44;
  const LN_WIDTH   = 36; // line-number gutter

  // Measure approximate width per char (monospace ≈ 8.4px at 14px)
  const CHAR_W     = 8.4;
  const maxLineLen = Math.max(...lines.map(l => l.length));
  const width      = Math.max(560, Math.ceil(maxLineLen * CHAR_W) + PAD * 2 + LN_WIDTH + 20);
  const height     = HEADER_H + lines.length * LINE_H + PAD * 2;

  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext("2d");

  // ── background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, width, height);

  // ── header bar ──────────────────────────────────────────────────────────────
  ctx.fillStyle = THEME.header;
  ctx.fillRect(0, 0, width, HEADER_H);

  // traffic lights
  THEME.dot.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(18 + i * 22, HEADER_H / 2, 7, 0, Math.PI * 2);
    ctx.fill();
  });

  // filename label
  ctx.fillStyle = THEME.lineNum;
  ctx.font      = "12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(lang, width / 2, HEADER_H / 2 + 4);
  ctx.textAlign = "left";

  // ── code lines ──────────────────────────────────────────────────────────────
  ctx.font = FONT;
  lines.forEach((line, i) => {
    const y = HEADER_H + PAD + i * LINE_H;

    // Line number
    ctx.fillStyle = THEME.lineNum;
    const num = String(i + 1);
    ctx.fillText(num, PAD, y);

    // Code text (flat color — no per-token coloring for reliability)
    const isComment = /^\s*(\/\/|#|--|<!--|\/\*)/.test(line);
    ctx.fillStyle   = isComment ? THEME.comments : THEME.text;
    ctx.fillText(line, PAD + LN_WIDTH, y);
  });

  // ── rounded-corner shadow clip (cosmetic) ───────────────────────────────────
  // Not possible without clip path, skip for simplicity

  return canvas.toBuffer("image/png");
}

export default {
  name: "carbon",
  aliases: ["code2img", "codeimg"],
  description: "Turn code into a beautiful carbon-style image",
  category: "image",
  usage: ".carbon <code>  (or reply to a code message)",
  cooldown: 5,

  async run({ sock, msg, text, args }) {
    const jid = msg.key.remoteJid;

    // Resolve code text
    const ctx         = msg.message?.extendedTextMessage?.contextInfo;
    const quotedText  =
      ctx?.quotedMessage?.conversation ||
      ctx?.quotedMessage?.extendedTextMessage?.text;
    const codeText = (quotedText || text || "").trim();

    if (!codeText) {
      return sock.sendMessage(jid, {
        text: "❌ Provide code or reply to a code message.\n\nExample: *.carbon console.log('Hello!')*",
      }, { quoted: msg });
    }

    // Detect a simple language hint from first line (e.g. "js" or "python")
    const lines    = codeText.split("\n");
    let lang       = "code";
    let actualCode = codeText;

    if (/^(js|javascript|ts|typescript|python|py|bash|sh|java|cpp|c|html|css|json|yaml|go|rust)$/i.test(lines[0].trim())) {
      lang       = lines[0].trim().toLowerCase();
      actualCode = lines.slice(1).join("\n").trim();
    }

    if (!actualCode) {
      return sock.sendMessage(jid, { text: "❌ No code found after the language tag." }, { quoted: msg });
    }

    // Clamp to 40 lines to keep the image manageable
    const codeLines = actualCode.split("\n").slice(0, 40);
    if (actualCode.split("\n").length > 40) {
      codeLines.push("... (truncated to 40 lines)");
    }

    try {
      const buffer = buildImage(codeLines.join("\n"), lang);
      await sock.sendMessage(jid, {
        image:   buffer,
        caption: `💻 *Code image* — ${lang}`,
        mimetype: "image/png",
      }, { quoted: msg });
    } catch (err) {
      console.error("CARBON ERROR:", err);
      await sock.sendMessage(jid, { text: "❌ Failed to create code image. Try again!" }, { quoted: msg });
    }
  },
};
