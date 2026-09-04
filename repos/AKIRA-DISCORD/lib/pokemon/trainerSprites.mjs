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
const FULL_BODY_DIR = join(TRAINERS_DIR, "full_body");

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
const FULL_BODY_SPRITES = pngFiles(FULL_BODY_DIR).map((sprite) => ({
  ...sprite,
  fullBody: true,
}));
const BACK_SPRITES = FULL_BODY_SPRITES.length ? FULL_BODY_SPRITES : pngFiles(BACK_DIR);

function randomFrom(list, fallbackName) {
  if (!list.length) return { imagePath: null, name: fallbackName };
  return list[Math.floor(Math.random() * list.length)];
}

/** Choose a random front-facing opponent trainer sprite. */
export function randomFrontTrainer() {
  return randomFrom(FRONT_SPRITES, "Opponent");
}

/**
 * Choose a local trainer sprite with a complete body.
 *
 * The original FireRed back sheets are battle animation strips whose first
 * 64x64 frame stops at the waist. Kelin MD keeps composed full-body versions
 * in graphics/trainers/full_body so the trainer does not appear cropped.
 */
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