/**
 * KELIN MD — Simple JSON data store
 * Persists data to data/<name>.json files.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

const DATA_DIR = path.resolve("data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function getPath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

export function readData(name, defaultValue = {}) {
  const p = getPath(name);
  if (!existsSync(p)) return defaultValue;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return defaultValue;
  }
}

export function writeData(name, data) {
  writeFileSync(getPath(name), JSON.stringify(data, null, 2), "utf8");
}

export function mergeData(name, updates, defaultValue = {}) {
  const current = readData(name, defaultValue);
  const next = { ...current, ...updates };
  writeData(name, next);
  return next;
}
