const { createCanvas, loadImage } = require("canvas");

/**
 * Tic-Tac-Toe Image Generator
 */
async function drawTTT(board) {
  const canvas = createCanvas(300, 300);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 300, 300);

  // Grid lines
  ctx.strokeStyle = "black";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(100, 0); ctx.lineTo(100, 300);
  ctx.moveTo(200, 0); ctx.lineTo(200, 300);
  ctx.moveTo(0, 100); ctx.lineTo(300, 100);
  ctx.moveTo(0, 200); ctx.lineTo(300, 200);
  ctx.stroke();

  // Draw X and O
  ctx.font = "bold 80px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  board.forEach((cell, i) => {
    if (!cell) return;
    const x = (i % 3) * 100 + 50;
    const y = Math.floor(i / 3) * 100 + 50;
    ctx.fillStyle = cell === "X" ? "red" : "blue";
    ctx.fillText(cell, x, y);
  });

  return canvas.toBuffer();
}

/**
 * Connect 4 Board Generator (using Canvas)
 */
async function drawC4(board) {
  const canvas = createCanvas(700, 600);
  const ctx = canvas.getContext("2d");

  // Background (Blue board)
  ctx.fillStyle = "#0000FF";
  ctx.fillRect(0, 0, 700, 600);

  // Holes
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const cell = board[r][c];
      ctx.beginPath();
      ctx.arc(c * 100 + 50, r * 100 + 50, 40, 0, Math.PI * 2);
      if (cell === "R") ctx.fillStyle = "red";
      else if (cell === "Y") ctx.fillStyle = "yellow";
      else ctx.fillStyle = "white";
      ctx.fill();
    }
  }

  return canvas.toBuffer();
}

/**
 * Basic Word Validator (WCG)
 */
async function isValidWord(word) {
  try {
    const axios = require("axios");
    const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    return res.status === 200;
  } catch {
    return false;
  }
}

module.exports = {
  drawTTT,
  drawC4,
  isValidWord
};