import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data/ptcg");
const cards = JSON.parse(readFileSync(path.join(DATA_DIR, "cards.json"), "utf8"));
const setsBySeries = JSON.parse(readFileSync(path.join(DATA_DIR, "sets.json"), "utf8"));
const pullRates = JSON.parse(readFileSync(path.join(DATA_DIR, "pullRates.json"), "utf8"));
const rarities = Object.fromEntries(
  Object.entries(JSON.parse(readFileSync(path.join(DATA_DIR, "rarities.json"), "utf8"))),
);

export const RARITY_INFO = rarities;
export const SETS = Object.values(setsBySeries).flat();

const RARITY_ORDER = ["C", "U", "R", "RR", "AR", "SR", "SAR", "S", "SSR", "IM", "UR"];
const RARITY_EMOJI = {
  C: "⚪", U: "⚪", R: "🔵", RR: "🟣", SR: "🌟",
  AR: "✨", SAR: "💎", S: "🌠", SSR: "💠", IM: "👑", UR: "🏆",
};
const RARITY_VALUE = {
  C: 100, U: 150, R: 300, RR: 600, SR: 1000,
  AR: 1600, SAR: 3000, S: 1800, SSR: 4500, IM: 6000, UR: 12000,
};

export const PACK_PRICE = 20_000_000;
export const PACK_COOLDOWN_MS = 60 * 1000;
export const IMAGE_BASE =
  "https://raw.githubusercontent.com/flibustier/pokemon-tcg-exchange/main/public/images/cards-by-set";

export function cardKey(card) {
  return `${card.set}-${card.number}`;
}

export function imageUrl(card) {
  return `${IMAGE_BASE}/${encodeURIComponent(card.set)}/${card.number}.webp`;
}

export function rarityLabel(code) {
  return RARITY_INFO[code]?.label || code || "Unknown";
}

export function rarityEmoji(code) {
  return RARITY_EMOJI[code] || "⭐";
}

export function cardValue(card) {
  return RARITY_VALUE[card.rarity] || 100;
}

export function setByCode(code) {
  const value = String(code || "").trim().toUpperCase();
  return SETS.find((set) => set.code.toUpperCase() === value) || null;
}

export function setName(code) {
  const set = setByCode(code);
  return set?.name?.en || set?.name?.[Object.keys(set.name || {})[0]] || code;
}

export function allCards() {
  return cards;
}

export function findCardByKey(key) {
  const match = String(key || "").trim().toUpperCase().match(/^(.+?)[-:]([0-9]+)$/);
  if (!match) return null;
  return cards.find(
    (card) => card.set.toUpperCase() === match[1] && Number(card.number) === Number(match[2]),
  ) || null;
}

export function searchCards(query, limit = 15) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return [];
  return cards
    .filter((card) =>
      card.name.toLowerCase().includes(needle)
      || cardKey(card).toLowerCase() === needle
      || card.set.toLowerCase() === needle,
    )
    .slice(0, limit);
}

function weightedPick(entries) {
  const usable = Object.entries(entries || {}).filter(([, weight]) => Number(weight) > 0);
  if (!usable.length) return null;
  const total = usable.reduce((sum, [, weight]) => sum + Number(weight), 0);
  let roll = Math.random() * total;
  for (const [key, weight] of usable) {
    roll -= Number(weight);
    if (roll <= 0) return key;
  }
  return usable[usable.length - 1][0];
}

function fallbackRarity(slot) {
  if (slot <= 3) return "C";
  return weightedPick({ U: 60, R: 24, RR: 10, AR: 5, SR: 1 }) || "U";
}

// The anime card system makes common cards frequent and high-rarity cards
// genuinely scarce. These weights are used for group spawns, not booster
// packs, so a complete collection cannot be farmed by repeatedly spawning.
const SPAWN_RARITY_WEIGHTS = [
  { codes: ["C"], weight: 38 },
  { codes: ["U"], weight: 24 },
  { codes: ["R"], weight: 17 },
  { codes: ["RR"], weight: 10 },
  { codes: ["AR", "S"], weight: 6 },
  { codes: ["SR", "SSR"], weight: 4 },
  { codes: ["SAR"], weight: 1 },
  { codes: ["IM", "UR"], weight: 0.5 },
];

export function pickSpawnCard(setCode = null) {
  const set = setCode ? setByCode(setCode) : null;
  if (setCode && !set) return null;

  const pool = cards.filter((card) => !set || card.set === set.code);
  if (!pool.length) return null;

  const available = SPAWN_RARITY_WEIGHTS
    .map((entry) => ({
      ...entry,
      cards: pool.filter((card) => entry.codes.includes(card.rarity)),
    }))
    .filter((entry) => entry.cards.length);
  const pickedRarity = weightedPick(
    Object.fromEntries(available.map((entry, index) => [String(index), entry.weight])),
  );
  const rarityPool = available[Number(pickedRarity)]?.cards || pool;
  return toPublicCard(rarityPool[Math.floor(Math.random() * rarityPool.length)]);
}

export function drawPack(setCode) {
  const set = setByCode(setCode);
  if (!set) return null;
  const code = set.code;
  const regular = pullRates[code]?.["Regular Pack"];
  const result = [];

  for (let slot = 1; slot <= 5; slot++) {
    const rates = regular?.slots?.[String(slot)];
    const rarity = weightedPick(rates) || fallbackRarity(slot);
    const pool = cards.filter((card) => card.set === code && card.rarity === rarity);
    const fallbackPool = cards.filter((card) => card.set === code);
    const source = pool.length ? pool : fallbackPool;
    const picked = source[Math.floor(Math.random() * source.length)];
    if (picked) result.push(toPublicCard(picked));
  }
  return result;
}

export function toPublicCard(card) {
  return {
    key: cardKey(card),
    set: card.set,
    number: card.number,
    name: card.name,
    rarity: card.rarity,
    rarityLabel: rarityLabel(card.rarity),
    imageUrl: imageUrl(card),
    value: cardValue(card),
  };
}

export function listSetPacks() {
  return SETS.map((set) => ({
    code: set.code,
    name: set.name?.en || set.name?.[Object.keys(set.name || {})[0]] || set.code,
    count: set.count,
    packs: set.packs || [],
  }));
}

export function formatCard(card) {
  return `${rarityEmoji(card.rarity)} *${card.name}* — \`${card.key || cardKey(card)}\` (${rarityLabel(card.rarity)})`;
}

export const rarityOrder = RARITY_ORDER;