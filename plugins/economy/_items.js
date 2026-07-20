/**
 * Shared item catalogue used by shop.js, use.js, sell.js and dig/fish loot tables.
 */

export const SHOP_ITEMS = {
  sword:   { price: 5000,  emoji: "⚔️",  rarity: "common",    xpBonus: 20, sellPct: 0.4 },
  shield:  { price: 4000,  emoji: "🛡️",  rarity: "common",    xpBonus: 15, sellPct: 0.4 },
  gun:     { price: 8000,  emoji: "🔫",  rarity: "rare",      xpBonus: 40, sellPct: 0.5 },
  armor:   { price: 6000,  emoji: "🦾",  rarity: "rare",      xpBonus: 30, sellPct: 0.5 },
  potion:  { price: 500,   emoji: "🧪",  rarity: "common",    xpBonus: 5,  sellPct: 0.5,  useEffect: "xp+50" },
  diamond: { price: 15000, emoji: "💎",  rarity: "legendary", xpBonus: 100, sellPct: 0.6 },
  ring:    { price: 3000,  emoji: "💍",  rarity: "common",    xpBonus: 10, sellPct: 0.4 },
  scroll:  { price: 2000,  emoji: "📜",  rarity: "common",    xpBonus: 8,  sellPct: 0.4,  useEffect: "xp+30,cash+100" },
  axe:     { price: 7000,  emoji: "🪓",  rarity: "rare",      xpBonus: 35, sellPct: 0.5 },
  boots:   { price: 3500,  emoji: "👢",  rarity: "common",    xpBonus: 12, sellPct: 0.4 },
  rod:     { price: 1500,  emoji: "🎣",  rarity: "common",    xpBonus: 5,  sellPct: 0.3,  useEffect: "xp+20" },
  pickaxe: { price: 2500,  emoji: "⛏️",  rarity: "common",    xpBonus: 8,  sellPct: 0.3,  useEffect: "xp+25" },
  elixir:  { price: 1000,  emoji: "🍶",  rarity: "common",    xpBonus: 10, sellPct: 0.4,  useEffect: "xp+100,cash+200" },
  orb:     { price: 2000,  emoji: "🔮",  rarity: "rare",      xpBonus: 50, sellPct: 0.5,  useEffect: "orbs+5" },
};

export const RARITY_COLORS = { common: "⚪", rare: "🔵", legendary: "🟡" };

/** Loot table for .dig */
export const DIG_LOOT = [
  { type: "cash",  min: 50,   max: 400,  weight: 50, label: "💰 Cash" },
  { type: "cash",  min: 400,  max: 1200, weight: 15, label: "💰 Cash" },
  { type: "item",  name: "potion",  weight: 12 },
  { type: "item",  name: "scroll",  weight: 8  },
  { type: "item",  name: "pickaxe", weight: 5  },
  { type: "orbs",  min: 1, max: 5,   weight: 7  },
  { type: "item",  name: "diamond", weight: 1  },
  { type: "nothing",               weight: 2  },
];

/** Loot table for .fish */
export const FISH_LOOT = [
  { type: "cash",  min: 30,  max: 300,  weight: 50, label: "💰 Cash" },
  { type: "item",  name: "boots",      weight: 15 },
  { type: "item",  name: "rod",        weight: 12 },
  { type: "item",  name: "scroll",     weight: 8  },
  { type: "orbs",  min: 1, max: 3,     weight: 10 },
  { type: "item",  name: "elixir",     weight: 4  },
  { type: "nothing",                   weight: 1  },
];

/** Weighted random pick from a loot table */
export function rollLoot(table) {
  const total = table.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return table[table.length - 1];
}
