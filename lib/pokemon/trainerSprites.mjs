/**
 * FireRed trainer sprite catalog.
 *
 * The battle renderer deliberately chooses a sprite when a battle is created,
 * rather than while an image is being rendered. This keeps every follow-up
 * battle image consistent for the whole match.
 */
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TRAINERS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../graphics/trainers");
const FRONT_DIR = join(TRAINERS_DIR, "front_pics");
const BACK_DIR = join(TRAINERS_DIR, "back_pics");

function pngFiles(directory) {
  try {
    return readdirSync(directory)
      .filter((file) => file.toLowerCase().endsWith(".png"))
      .sort()
      .map((file) => ({
        imagePath: join(directory, file),
        name: file
          .replace(/_front_pic\.png$|_back_pic\.png$/i, "")
          .replace(/_/g, " "),
      }));
  } catch {
    return [];
  }
}

const FRONT_SPRITES = pngFiles(FRONT_DIR);
const BACK_SPRITES = pngFiles(BACK_DIR);

function randomFrom(list, fallbackName) {
  if (!list.length) return { imagePath: null, name: fallbackName };
  return list[Math.floor(Math.random() * list.length)];
}

/** Choose a random front-facing opponent trainer sprite. */
export function randomFrontTrainer() {
  return randomFrom(FRONT_SPRITES, "Opponent");
}

/** Choose a random back-facing local trainer sprite. */
export function randomBackTrainer() {
  return randomFrom(BACK_SPRITES, "Trainer");
}

export function randomTrainerPair() {
  return {
    challenger: randomBackTrainer(),
    opponent: randomFrontTrainer(),
  };
}

export const trainerSpriteCounts = {
  front: FRONT_SPRITES.length,
  back: BACK_SPRITES.length,
};