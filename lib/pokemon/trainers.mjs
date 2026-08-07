/**
 * FireRed trainer portrait selection for Pokémon battle scenes.
 *
 * The portraits are sourced from the public FireRed graphics set and kept
 * local so battle images do not depend on a remote CDN being available.
 */
import { readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, basename } from "path";

const TRAINER_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "graphics",
  "trainers",
  "front_pics",
);

const TRAINER_FILES = readdirSync(TRAINER_DIR)
  .filter((file) => file.endsWith("_front_pic.png"))
  .sort();

function displayName(file) {
  return basename(file, "_front_pic.png")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function trainerFromFile(file) {
  return {
    name: displayName(file),
    imagePath: join(TRAINER_DIR, file),
  };
}

/**
 * Pick one trainer portrait for a battle side.
 * A battle state owns the result so every later turn uses the same portrait.
 */
export function randomTrainer() {
  if (TRAINER_FILES.length === 0) return null;
  const file = TRAINER_FILES[Math.floor(Math.random() * TRAINER_FILES.length)];
  return trainerFromFile(file);
}

/**
 * Pick two different portraits for a trainer-vs-trainer battle.
 */
export function randomTrainerPair() {
  if (TRAINER_FILES.length < 2) {
    const trainer = randomTrainer();
    return { challenger: trainer, opponent: trainer };
  }

  const firstIndex = Math.floor(Math.random() * TRAINER_FILES.length);
  let secondIndex = Math.floor(Math.random() * (TRAINER_FILES.length - 1));
  if (secondIndex >= firstIndex) secondIndex += 1;

  return {
    challenger: trainerFromFile(TRAINER_FILES[firstIndex]),
    opponent: trainerFromFile(TRAINER_FILES[secondIndex]),
  };
}