import { PET_SPECIES, RARITIES } from "./petData.js";

let canvasModulePromise;

function getCanvas() {
  canvasModulePromise ??= import("@napi-rs/canvas")
    .catch(() => import("canvas"))
    .then((module) => ({
      createCanvas: module.createCanvas || module.default?.createCanvas,
    }));
  return canvasModulePromise;
}

const SPRITES = {
  cat: [
    ".....oo....oo...",
    "....ommo..ommo..",
    "...ommmmoommmmo.",
    "...ommmmmmmmmmo.",
    "...ommmeemmmmmo.",
    "...ommmcccmmmmo.",
    "....ommmmmmmmo..",
    ".ooommmmmmmmmooo",
    "ommmmmmmmmmmmmmo",
    "ommmommmmmmmommo",
    ".oo.ommmmmmm.oo.",
    "....ommmmmmm....",
    "...ommmommmmmo...",
    "...ommmommmmmo...",
    "..ooo......ooo...",
    "................",
  ],
  canine: [
    "....oo..........",
    "...ommo.........",
    "..ommmmo........",
    ".ommmmmmo.......",
    ".ommmeemmo......",
    ".ommmcccmmmo....",
    "..ommmmmmmmmoo..",
    "...ommmmmmmmmmmo",
    "....ommmmmmmmmmo",
    "....ommo.ommmmmo.",
    "...ommmmo.ommmmo.",
    "..ommmmmmmommmmo.",
    ".ommmmmmmmmmmmo..",
    ".ommmommmmmommo...",
    "..ooo......ooo....",
    "................",
  ],
  bunny: [
    ".....ommo..ommo..",
    ".....ommo..ommo..",
    ".....ommo..ommo..",
    ".....ommo..ommo..",
    ".....ommo..ommo..",
    ".....ommo..ommo..",
    "....ommmmmmmmmo.",
    "...ommmmmmmmmmmmo",
    "...ommmeemmmmmmo.",
    "...ommmcccmmmmmo.",
    "....ommmmmmmmmmo.",
    "..oommmmmmmmmmmmoo",
    ".ommmmmmmmmmmmmmmmo",
    ".ommmommmmmmmommmmo",
    "..ooo..........ooo.",
    "................",
  ],
  bird: [
    "......oo........",
    ".....ommo.......",
    "....ommmmo......",
    "...ommmmmmo.....",
    "..ommmmmmmmo....",
    "..ommmeemmmmo....",
    "..ommmcccmmmo....",
    "...ommmmmmmmo....",
    "....ommmmmmmmo...",
    "...ommmmmmmmmmmo..",
    "..ommmmmmmmmmmmo...",
    ".ommmommmmmmmmo.....",
    "..oo..ommmmo.........",
    ".......oo..oo........",
    "................",
    "................",
  ],
  fish: [
    "................",
    ".....oooo.......",
    "...oommmmmo.....",
    ".oommmmmmmmo....",
    "ommmmmmmmmmmmo..",
    "ommmmeemmmmmmo..",
    "ommmmmccmmmmmooa",
    "ommmmmmmmmmmmo..",
    ".oommmmmmmmo....",
    "...oommmmmo.....",
    ".....oooo.......",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  slime: [
    "................",
    ".......oo.......",
    "......ommo......",
    ".....ommmmo.....",
    "...oommmmmmmmoo..",
    "..ommmmmmmmmmmmo.",
    ".ommmmeemmmmmmmmo",
    ".ommmmcccmmmmmmmo",
    ".ommmmmmmmmmmmmmo",
    ".ommmmmmmmmmmmmmo",
    "..ommmmmmmmmmmmo.",
    "...oommmmmmmmoo..",
    "......oooooo.....",
    "................",
    "................",
    "................",
  ],
  bear: [
    "...oo......oo...",
    "..ommo....ommo..",
    ".ommmmo..ommmmo.",
    ".ommmmmmmmmmmmo.",
    "ommmmmmmmmmmmmmo",
    "ommmmeemmmmmmmmo",
    "ommmmmcccmmmmmmmo",
    ".ommmmmmmmmmmmmo.",
    "..ommmmmmmmmmmmo.",
    ".oommmmmmmmmmmmoo",
    "ommmmmmmmmmmmmmmmo",
    "ommmommmmmmmommmmo",
    ".oo.ommmmmmm.oo..",
    "....ommmmmmo.....",
    "...ooo....ooo....",
    "................",
  ],
  dragon: [
    ".......oo.......",
    "......ommo......",
    ".....ommmmo.....",
    "...ooommmmmmo...",
    "..ommmmmmmmmmmo..",
    ".ommmmmmmmeemmmmo.",
    ".ommmmmmmmcccmmmoa",
    "..ommmmmmmmmmmmo.",
    "...ommmmmmmmmmo..",
    "..ommmmmmmmmmmmo.",
    ".ommmmmmmmooommmmo",
    "ommmmmmmmo...ommmmo",
    ".ommmommmmo..ommmmo",
    "..oommmmmmo..oommo.",
    "....oo..oo....oo..",
    "................",
  ],
};

const APPEARANCES = {
  cat: { form: "cat", body: "#ef9b9e", shadow: "#ba6577", highlight: "#ffd0bf", accent: "#f7c2d1", room: "rose" },
  dog: { form: "canine", body: "#d9a36b", shadow: "#9b654a", highlight: "#f4ce91", accent: "#f1d6ad", room: "wood" },
  bunny: { form: "bunny", body: "#eee0d4", shadow: "#b9a39f", highlight: "#fff5dd", accent: "#f5abc7", room: "rose" },
  chicken: { form: "bird", body: "#f3d567", shadow: "#d49340", highlight: "#fff3a6", accent: "#f28754", room: "wood" },
  fox: { form: "canine", body: "#ed994f", shadow: "#b95238", highlight: "#ffd18a", accent: "#fff0d0", room: "wood" },
  wolf: { form: "canine", body: "#9da9b4", shadow: "#596579", highlight: "#d9e3e8", accent: "#94d7eb", room: "moon" },
  panda: { form: "bear", body: "#eee8d7", shadow: "#4d5660", highlight: "#ffffff", accent: "#39434d", room: "wood" },
  owl: { form: "bird", body: "#a77b59", shadow: "#674b49", highlight: "#e0bd87", accent: "#f1d873", room: "moon" },
  moon_cat: { form: "cat", body: "#a8d9bf", shadow: "#5a987e", highlight: "#e4ffd2", accent: "#a8fa91", room: "moon" },
  sakura_bunny: { form: "bunny", body: "#e89ab9", shadow: "#a85582", highlight: "#ffd5e3", accent: "#fff0b7", room: "rose" },
  fire_slime: { form: "slime", body: "#f68a42", shadow: "#bd4633", highlight: "#ffd46b", accent: "#ffef9c", room: "ember" },
  tiger: { form: "canine", body: "#e79741", shadow: "#bd4d35", highlight: "#ffe09a", accent: "#402f38", room: "ember" },
  falcon: { form: "bird", body: "#829fc4", shadow: "#4b617e", highlight: "#d8e4f4", accent: "#f1c76f", room: "moon" },
  shark: { form: "fish", body: "#82bfd1", shadow: "#427e9a", highlight: "#d8f5ed", accent: "#f3f1dc", room: "ocean" },
  bear: { form: "bear", body: "#ad7854", shadow: "#704c42", highlight: "#edc28d", accent: "#f6d9a8", room: "wood" },
  spirit_wolf: { form: "canine", body: "#b8d6e7", shadow: "#718cae", highlight: "#f0ffff", accent: "#c7f2ff", room: "moon" },
  thunder_fox: { form: "canine", body: "#edbd4f", shadow: "#b76a36", highlight: "#fff2a2", accent: "#fff77a", room: "ember" },
  frost_wolf: { form: "canine", body: "#c8e6ed", shadow: "#7c9fb3", highlight: "#ffffff", accent: "#8cf1ff", room: "moon" },
  kitsune: { form: "canine", body: "#f0e1cd", shadow: "#b79383", highlight: "#ffffff", accent: "#f5bd6d", room: "moon" },
  phoenix_chick: { form: "bird", body: "#ed7843", shadow: "#ae3d43", highlight: "#ffd16d", accent: "#fff09c", room: "ember" },
  baby_dragon: { form: "dragon", body: "#76bd9a", shadow: "#3b796d", highlight: "#c7f4b8", accent: "#ffe18c", room: "wood" },
  griffin: { form: "dragon", body: "#c68d58", shadow: "#77536b", highlight: "#f6d395", accent: "#e5f2ed", room: "wood" },
  nine_tailed_fox: { form: "canine", body: "#f2e7cc", shadow: "#bca17f", highlight: "#ffffff", accent: "#ffcf66", room: "moon" },
  kirin: { form: "dragon", body: "#e3c568", shadow: "#957343", highlight: "#fff3b0", accent: "#9fe6ca", room: "moon" },
  cerberus: { form: "canine", body: "#776777", shadow: "#423a50", highlight: "#c49c9a", accent: "#ff725c", room: "ember" },
  leviathan: { form: "fish", body: "#568cb9", shadow: "#354f83", highlight: "#a7e1e6", accent: "#8d75cf", room: "ocean" },
  bahamut: { form: "dragon", body: "#d3dce1", shadow: "#79869c", highlight: "#ffffff", accent: "#f8d875", room: "moon" },
  shadow_dragon: { form: "dragon", body: "#75649b", shadow: "#383957", highlight: "#c4a8d8", accent: "#e38be9", room: "moon" },
};

const THEMES = {
  rose: { wall: "#725079", wallShade: "#49345e", floor: "#75687f", floorLight: "#93839a", trim: "#e6b878", glow: "#ffb5ce" },
  wood: { wall: "#675077", wallShade: "#3d3656", floor: "#765d50", floorLight: "#a17c5b", trim: "#e7b873", glow: "#f7d08c" },
  moon: { wall: "#293a5e", wallShade: "#1b2948", floor: "#485873", floorLight: "#6d7e91", trim: "#a7d4e8", glow: "#b9dfff" },
  ember: { wall: "#70465a", wallShade: "#452b49", floor: "#73504c", floorLight: "#a26a54", trim: "#f3b26e", glow: "#ff9a59" },
  ocean: { wall: "#315a70", wallShade: "#213b58", floor: "#476877", floorLight: "#6d8e92", trim: "#b5d9c2", glow: "#8de4e3" },
};

const TOKEN = {
  o: "outline",
  m: "body",
  s: "shadow",
  h: "highlight",
  c: "cream",
  e: "eye",
  a: "accent",
};

const FACE_PIXELS = {
  cat: { eyes: [[6, 5], [9, 5]], nose: [8, 6] },
  canine: { eyes: [[6, 4], [9, 4]], nose: [11, 5] },
  bunny: { eyes: [[6, 8], [9, 8]], nose: [8, 9] },
  bird: { eyes: [[6, 5], [9, 5]], nose: [8, 6] },
  fish: { eyes: [[5, 5]], nose: [11, 6] },
  slime: { eyes: [[6, 6], [9, 6]] },
  bear: { eyes: [[5, 5], [10, 5]], nose: [8, 6] },
  dragon: { eyes: [[10, 5], [13, 5]], nose: [14, 6] },
};

export function getPetAppearance(speciesKey) {
  const key = Object.hasOwn(PET_SPECIES, speciesKey) ? speciesKey : "cat";
  return {
    key,
    form: APPEARANCES[key]?.form || "cat",
    ...APPEARANCES[key],
    colors: {
      outline: "#493746",
      body: APPEARANCES[key]?.body || "#ef9b9e",
      shadow: APPEARANCES[key]?.shadow || "#ba6577",
      highlight: APPEARANCES[key]?.highlight || "#ffd0bf",
      cream: "#fff1d8",
      eye: "#273345",
      accent: APPEARANCES[key]?.accent || "#f7c2d1",
      glow: THEMES[APPEARANCES[key]?.room]?.glow || THEMES.rose.glow,
    },
  };
}

export function getPetMood(pet = {}) {
  const hp = Number(pet.hp ?? pet.maxHp ?? 100);
  const maxHp = Math.max(1, Number(pet.maxHp) || 100);
  const hunger = Math.max(0, Math.min(100, Number(pet.hunger ?? 100)));
  const happiness = Math.max(0, Math.min(100, Number(pet.happiness ?? 100)));
  if (hp / maxHp < 0.25) return "TIRED";
  if (hunger < 25) return "HUNGRY";
  if (happiness < 25) return "LONELY";
  if (hunger > 75 && happiness > 75) return "HAPPY";
  return "LISTLESS";
}

function pixelSprite(ctx, x, y, cellSize, pet) {
  const appearance = getPetAppearance(pet?.species);
  const pattern = SPRITES[appearance.form] || SPRITES.cat;
  const grid = pattern.map((row) => row.padEnd(16, ".").slice(0, 16));
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (["kitsune", "nine_tailed_fox"].includes(appearance.key)) {
    ctx.fillStyle = appearance.colors.accent;
    for (let tail = 0; tail < 5; tail += 1) {
      ctx.fillRect(x + (tail * 5 + 1) * cellSize, y + 9 * cellSize, 3 * cellSize, cellSize);
      ctx.fillRect(x + (tail * 5 + 2) * cellSize, y + (8 - tail % 2) * cellSize, 2 * cellSize, cellSize);
    }
  }

  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      if (grid[row][col] === ".") continue;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const neighborRow = row + dy;
          const neighborCol = col + dx;
          if (neighborRow >= 0 && neighborRow < grid.length
            && neighborCol >= 0 && neighborCol < 16
            && grid[neighborRow][neighborCol] !== ".") continue;
          ctx.fillStyle = appearance.colors.outline;
          ctx.fillRect(
            x + neighborCol * cellSize,
            y + neighborRow * cellSize,
            cellSize,
            cellSize,
          );
        }
      }
    }
  }

  for (let row = 0; row < grid.length; row += 1) {
    const pixels = grid[row];
    for (let col = 0; col < pixels.length; col += 1) {
      const token = pixels[col];
      if (token === ".") continue;
      ctx.fillStyle = token === "c" ? appearance.colors.cream : appearance.colors[TOKEN[token]];
      ctx.fillRect(x + col * cellSize, y + row * cellSize, cellSize, cellSize);
    }
  }

  const face = FACE_PIXELS[appearance.form];
  if (face) {
    ctx.fillStyle = appearance.colors.eye;
    for (const [col, row] of face.eyes) {
      ctx.fillRect(x + col * cellSize, y + row * cellSize, cellSize, cellSize);
      ctx.fillStyle = appearance.colors.cream;
      ctx.fillRect(x + col * cellSize, y + row * cellSize, 1, 1);
      ctx.fillStyle = appearance.colors.eye;
    }
    if (face.nose) {
      ctx.fillStyle = appearance.colors.accent;
      ctx.fillRect(
        x + face.nose[0] * cellSize,
        y + face.nose[1] * cellSize,
        cellSize,
        cellSize,
      );
    }
  }

  if (appearance.form === "cat") {
    ctx.fillStyle = appearance.colors.accent;
    ctx.fillRect(x + 5 * cellSize, y + 2 * cellSize, cellSize, cellSize);
    ctx.fillRect(x + 10 * cellSize, y + 2 * cellSize, cellSize, cellSize);
    ctx.fillStyle = appearance.colors.cream;
    ctx.fillRect(x + 3 * cellSize, y + 7 * cellSize, cellSize, 1);
    ctx.fillRect(x + 12 * cellSize, y + 7 * cellSize, cellSize, 1);
    ctx.fillStyle = appearance.colors.shadow;
    ctx.fillRect(x + 8 * cellSize, y + 7 * cellSize, cellSize, cellSize);
  }

  if (appearance.key === "moon_cat" || appearance.key === "kitsune" || appearance.key === "kirin") {
    ctx.fillStyle = appearance.colors.accent;
    ctx.fillRect(x + 12 * cellSize, y + 1 * cellSize, cellSize, cellSize);
    ctx.fillRect(x + 13 * cellSize, y + 2 * cellSize, cellSize, cellSize);
    ctx.fillRect(x + 11 * cellSize, y + 3 * cellSize, 2 * cellSize, cellSize);
  } else if (appearance.key === "thunder_fox" || appearance.key === "phoenix_chick") {
    ctx.fillStyle = appearance.colors.accent;
    ctx.fillRect(x + 13 * cellSize, y + 1 * cellSize, cellSize, 2 * cellSize);
    ctx.fillRect(x + 12 * cellSize, y + 3 * cellSize, cellSize, cellSize);
  }

  ctx.restore();
}

function drawBar(ctx, x, y, width, value, fill, empty = "#718079") {
  ctx.fillStyle = "#33433d";
  ctx.fillRect(x - 2, y - 2, width + 4, 12);
  ctx.fillStyle = empty;
  ctx.fillRect(x, y, width, 8);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, Math.round(width * Math.max(0, Math.min(1, value))), 8);
}

function drawProfileFrame(ctx, width, height, rarityColor) {
  ctx.fillStyle = "#142b29";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#3e7469";
  ctx.fillRect(3, 3, width - 6, height - 6);
  ctx.fillStyle = "#a6d0b7";
  ctx.fillRect(8, 8, width - 16, height - 16);
  ctx.fillStyle = "#294f49";
  ctx.fillRect(12, 12, width - 24, height - 24);
  ctx.fillStyle = "#e8e0bb";
  ctx.fillRect(17, 17, width - 34, height - 34);
  ctx.fillStyle = "#fff0c9";
  ctx.fillRect(21, 21, width - 42, height - 42);
  ctx.strokeStyle = rarityColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(19, 19, width - 38, height - 38);
}

export async function renderPetProfile(pet = {}) {
  const { createCanvas } = await getCanvas();
  const width = 384;
  const height = 144;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const rarity = RARITIES[pet.rarity] || RARITIES.common;
  const appearance = getPetAppearance(pet.species);

  drawProfileFrame(ctx, width, height, appearance.colors.accent);

  ctx.fillStyle = "#9ec5b1";
  ctx.fillRect(25, 25, 88, 88);
  ctx.fillStyle = "#355c51";
  ctx.fillRect(29, 29, 80, 80);
  ctx.fillStyle = appearance.room === "moon" ? "#263957" : "#a9d7c1";
  ctx.fillRect(32, 32, 74, 74);
  ctx.fillStyle = appearance.colors.glow;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(34, 34, 70, 70);
  ctx.globalAlpha = 1;
  pixelSprite(ctx, 38, 34, 4, pet);

  ctx.fillStyle = "#253630";
  ctx.fillRect(123, 25, 239, 31);
  ctx.fillStyle = "#f3e6bf";
  ctx.fillRect(126, 28, 233, 25);
  ctx.fillStyle = "#242f31";
  ctx.font = "bold 15px monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(`LV: ${String(Math.max(1, Number(pet.level) || 1)).padStart(2, "0")}`, 133, 41);
  const xpPercent = pet.expNeeded > 0
    ? Math.round((Number(pet.exp || 0) / Number(pet.expNeeded)) * 100)
    : 0;
  ctx.fillText(`XP: ${String(xpPercent).padStart(2, "0")}%`, 253, 41);

  ctx.fillStyle = "#986e41";
  ctx.font = "bold 10px monospace";
  ctx.fillText("HP", 128, 69);
  drawBar(ctx, 153, 64, 79, (Number(pet.hp ?? pet.maxHp ?? 100) / Math.max(1, Number(pet.maxHp) || 100)), "#54a873");
  ctx.fillStyle = "#986e41";
  ctx.fillText("JOY", 245, 69);
  drawBar(ctx, 272, 64, 77, Number(pet.happiness ?? 100) / 100, "#db789b");

  ctx.fillStyle = "#986e41";
  ctx.fillText("FOOD", 128, 91);
  drawBar(ctx, 153, 86, 79, Number(pet.hunger ?? 100) / 100, "#eab844");
  ctx.fillStyle = "#986e41";
  ctx.fillText("XP", 245, 91);
  drawBar(ctx, 272, 86, 77, xpPercent / 100, "#65a8ce");

  ctx.fillStyle = "#253630";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  const mood = getPetMood(pet);
  ctx.fillText(`FEELING ${mood}`, 240, 116);
  ctx.textAlign = "left";
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = appearance.colors.shadow;
  const label = String(pet.name || PET_SPECIES[appearance.key]?.name || "PET").toUpperCase().slice(0, 14);
  ctx.fillText(`${label}  ·  ${rarity.label.replace(/[^\w ]/g, "").toUpperCase()}`, 30, 126);

  return canvas.toBuffer("image/png");
}

function polygon(ctx, points, fill, stroke = "#302b3b", lineWidth = 3) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function drawIsometricRoom(ctx, theme) {
  ctx.fillStyle = "#171722";
  ctx.fillRect(0, 0, 320, 320);
  polygon(ctx, [[160, 25], [307, 99], [160, 174], [13, 99]], theme.wall, "#302b3b", 5);
  polygon(ctx, [[13, 99], [160, 174], [160, 258], [13, 181]], theme.wallShade, "#302b3b", 5);
  polygon(ctx, [[307, 99], [160, 174], [160, 258], [307, 181]], theme.wall, "#302b3b", 5);
  polygon(ctx, [[14, 172], [160, 247], [306, 172], [160, 97]], theme.floor, "#302b3b", 4);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(14, 172);
  ctx.lineTo(160, 97);
  ctx.lineTo(306, 172);
  ctx.lineTo(160, 247);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = theme.floorLight;
  ctx.lineWidth = 2;
  for (let i = -4; i <= 12; i += 1) {
    ctx.beginPath();
    ctx.moveTo(14 + i * 32, 105);
    ctx.lineTo(160 + i * 32, 248);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(306 - i * 32, 105);
    ctx.lineTo(160 - i * 32, 248);
    ctx.stroke();
  }
  ctx.restore();

  // Window and night sky
  ctx.fillStyle = "#243049";
  ctx.fillRect(236, 67, 39, 40);
  ctx.strokeStyle = theme.trim;
  ctx.lineWidth = 3;
  ctx.strokeRect(236, 67, 39, 40);
  ctx.beginPath();
  ctx.moveTo(255, 68);
  ctx.lineTo(255, 106);
  ctx.moveTo(237, 87);
  ctx.lineTo(274, 87);
  ctx.stroke();
  ctx.fillStyle = "#fff0a5";
  ctx.fillRect(245, 75, 3, 3);
  ctx.fillRect(264, 96, 3, 3);
  ctx.fillRect(266, 75, 3, 3);

  // Bed
  polygon(ctx, [[27, 140], [81, 113], [131, 139], [77, 168]], "#574f68", "#302b3b", 3);
  polygon(ctx, [[27, 140], [77, 168], [77, 191], [27, 163]], "#443d58", "#302b3b", 3);
  polygon(ctx, [[77, 168], [131, 139], [131, 162], [77, 191]], "#74627b", "#302b3b", 3);
  polygon(ctx, [[37, 140], [81, 118], [120, 139], [77, 161]], "#c18eb5", "#51425c", 2);
  polygon(ctx, [[37, 140], [77, 161], [77, 172], [37, 151]], "#e4c1d5", "#51425c", 2);
  polygon(ctx, [[45, 136], [67, 125], [82, 133], [60, 145]], "#f0dcb9", "#69536a", 1);

  // Rug and food bowl
  polygon(ctx, [[93, 187], [148, 159], [207, 188], [152, 217]], "#493e53", "#332d3d", 2);
  polygon(ctx, [[106, 187], [150, 165], [193, 187], [151, 209]], theme.glow, "#443648", 2);
  ctx.fillStyle = "#a96540";
  ctx.beginPath();
  ctx.ellipse(237, 192, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e9a156";
  ctx.beginPath();
  ctx.ellipse(237, 189, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Small wardrobe and a candle lamp
  polygon(ctx, [[183, 104], [213, 89], [231, 98], [201, 114]], "#493d57", "#302b3b", 2);
  polygon(ctx, [[183, 104], [201, 114], [201, 144], [183, 134]], "#302d46", "#302b3b", 2);
  polygon(ctx, [[201, 114], [231, 98], [231, 128], [201, 144]], "#5a4764", "#302b3b", 2);
  ctx.fillStyle = theme.trim;
  ctx.fillRect(216, 117, 3, 5);
  ctx.fillStyle = "#e6a65e";
  ctx.fillRect(147, 68, 4, 21);
  ctx.fillStyle = "#fff0a2";
  ctx.fillRect(144, 60, 10, 11);
  ctx.fillStyle = "#f5b45f";
  ctx.fillRect(146, 56, 6, 5);
  ctx.fillStyle = "#bd7054";
  ctx.fillRect(143, 88, 12, 3);

  // Pixel stars and wall trim
  ctx.fillStyle = theme.trim;
  ctx.fillRect(50, 76, 3, 3);
  ctx.fillRect(91, 55, 3, 3);
  ctx.fillRect(184, 64, 3, 3);
  ctx.fillRect(111, 92, 3, 3);
  ctx.strokeStyle = "#d7b477";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(13, 99);
  ctx.lineTo(160, 174);
  ctx.lineTo(307, 99);
  ctx.stroke();
}

export async function renderPetRoom(pet = {}) {
  const { createCanvas } = await getCanvas();
  const canvas = createCanvas(320, 320);
  const ctx = canvas.getContext("2d");
  const appearance = getPetAppearance(pet.species);
  const theme = THEMES[appearance.room] || THEMES.rose;

  drawIsometricRoom(ctx, theme);
  ctx.save();
  ctx.shadowColor = appearance.colors.glow;
  ctx.shadowBlur = 10;
  pixelSprite(ctx, 200, 150, 5, pet);
  ctx.restore();

  const name = String(pet.name || PET_SPECIES[appearance.key]?.name || "Pet").toUpperCase().slice(0, 12);
  const tagWidth = Math.min(145, Math.max(82, name.length * 9 + 28));
  ctx.fillStyle = "#fff0c9";
  ctx.strokeStyle = "#4b394d";
  ctx.lineWidth = 3;
  ctx.fillRect(194, 130, tagWidth, 21);
  ctx.strokeRect(194, 130, tagWidth, 21);
  ctx.fillStyle = "#332f3b";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 194 + tagWidth / 2, 141);
  ctx.textAlign = "left";
  ctx.fillStyle = theme.trim;
  ctx.font = "bold 10px monospace";
  ctx.fillText(`LV ${Math.max(1, Number(pet.level) || 1)}`, 23, 288);
  ctx.fillText(getPetMood(pet), 219, 288);

  return canvas.toBuffer("image/png");
}
