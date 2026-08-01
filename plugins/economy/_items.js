/**
 * Shared item catalogue used by shop.js, use.js, sell.js and dig/fish loot tables.
 */

export const SHOP_ITEMS = {
  // ── Weapons & Gear ─────────────────────────────────────────────────────────
  sword:   { price: 5000,  emoji: "⚔️",  rarity: "common",    xpBonus: 20,  sellPct: 0.4, category: "gear" },
  shield:  { price: 4000,  emoji: "🛡️",  rarity: "common",    xpBonus: 15,  sellPct: 0.4, category: "gear" },
  gun:     { price: 8000,  emoji: "🔫",  rarity: "rare",      xpBonus: 40,  sellPct: 0.5, category: "gear" },
  armor:   { price: 6000,  emoji: "🦾",  rarity: "rare",      xpBonus: 30,  sellPct: 0.5, category: "gear" },
  potion:  { price: 500,   emoji: "🧪",  rarity: "common",    xpBonus: 5,   sellPct: 0.5, category: "gear", useEffect: "xp+50" },
  ring:    { price: 3000,  emoji: "💍",  rarity: "common",    xpBonus: 10,  sellPct: 0.4, category: "gear" },
  scroll:  { price: 2000,  emoji: "📜",  rarity: "common",    xpBonus: 8,   sellPct: 0.4, category: "gear", useEffect: "xp+30,cash+100" },
  axe:     { price: 7000,  emoji: "🪓",  rarity: "rare",      xpBonus: 35,  sellPct: 0.5, category: "gear" },
  boots:   { price: 3500,  emoji: "👢",  rarity: "common",    xpBonus: 12,  sellPct: 0.4, category: "gear" },
  rod:     { price: 1500,  emoji: "🎣",  rarity: "common",    xpBonus: 5,   sellPct: 0.3, category: "gear", useEffect: "xp+20" },
  pickaxe: { price: 2500,  emoji: "⛏️",  rarity: "common",    xpBonus: 8,   sellPct: 0.3, category: "gear", useEffect: "xp+25" },
  elixir:  { price: 1000,  emoji: "🍶",  rarity: "common",    xpBonus: 10,  sellPct: 0.4, category: "gear", useEffect: "xp+100,cash+200" },
  orb:     { price: 2000,  emoji: "🔮",  rarity: "rare",      xpBonus: 50,  sellPct: 0.5, category: "gear", useEffect: "orbs+5" },

  // ── Clothes ────────────────────────────────────────────────────────────────
  casual_outfit:    { price: 2_000,       emoji: "👕",  rarity: "common",    xpBonus: 5,   sellPct: 0.3, category: "clothes" },
  streetwear:       { price: 15_000,      emoji: "🧥",  rarity: "common",    xpBonus: 10,  sellPct: 0.3, category: "clothes" },
  suit:             { price: 50_000,      emoji: "👔",  rarity: "rare",      xpBonus: 25,  sellPct: 0.4, category: "clothes" },
  designer_outfit:  { price: 200_000,     emoji: "🥻",  rarity: "rare",      xpBonus: 60,  sellPct: 0.5, category: "clothes" },
  luxury_wardrobe:  { price: 1_000_000,   emoji: "👗",  rarity: "legendary", xpBonus: 150, sellPct: 0.6, category: "clothes" },
  diamond_chain:    { price: 5_000_000,   emoji: "📿",  rarity: "legendary", xpBonus: 300, sellPct: 0.6, category: "clothes" },

  // ── Cheap Cars ─────────────────────────────────────────────────────────────
  beat_up_car:   { price: 5_000,      emoji: "🚗",  rarity: "common",    xpBonus: 5,   sellPct: 0.2, category: "cars" },
  rusty_pickup:  { price: 8_000,      emoji: "🛻",  rarity: "common",    xpBonus: 8,   sellPct: 0.2, category: "cars" },
  old_van:       { price: 12_000,     emoji: "🚐",  rarity: "common",    xpBonus: 10,  sellPct: 0.2, category: "cars" },
  used_sedan:    { price: 25_000,     emoji: "🚙",  rarity: "common",    xpBonus: 12,  sellPct: 0.3, category: "cars" },

  // ── Luxury Cars ────────────────────────────────────────────────────────────
  sports_car:    { price: 500_000,    emoji: "🏎️",  rarity: "rare",      xpBonus: 75,  sellPct: 0.5, category: "cars" },
  lamborghini:   { price: 2_000_000,  emoji: "🏎️",  rarity: "legendary", xpBonus: 200, sellPct: 0.6, category: "cars" },
  ferrari:       { price: 3_000_000,  emoji: "🏎️",  rarity: "legendary", xpBonus: 250, sellPct: 0.6, category: "cars" },
  rolls_royce:   { price: 5_000_000,  emoji: "🚘",  rarity: "legendary", xpBonus: 350, sellPct: 0.6, category: "cars" },
  bugatti:       { price: 10_000_000, emoji: "🏎️",  rarity: "legendary", xpBonus: 500, sellPct: 0.6, category: "cars" },

  // ── Jets ───────────────────────────────────────────────────────────────────
  small_plane:   { price: 10_000_000,  emoji: "✈️",  rarity: "legendary", xpBonus: 400,  sellPct: 0.5, category: "jets" },
  private_jet:   { price: 50_000_000,  emoji: "🛩️",  rarity: "legendary", xpBonus: 800,  sellPct: 0.5, category: "jets" },
  luxury_jet:    { price: 150_000_000, emoji: "🛩️",  rarity: "legendary", xpBonus: 1500, sellPct: 0.5, category: "jets" },
  mega_jet:      { price: 300_000_000, emoji: "🛩️",  rarity: "legendary", xpBonus: 3000, sellPct: 0.5, category: "jets" },

  // ── Real Estate (Houses & Mansions) ────────────────────────────────────────
  studio_apartment: { price: 40_000_000,  emoji: "🏠",  rarity: "rare",      xpBonus: 500,   sellPct: 0.6, category: "realestate" },
  apartment:        { price: 80_000_000,  emoji: "🏠",  rarity: "rare",      xpBonus: 800,   sellPct: 0.6, category: "realestate" },
  townhouse:        { price: 120_000_000, emoji: "🏡",  rarity: "rare",      xpBonus: 1000,  sellPct: 0.6, category: "realestate" },
  luxury_house:     { price: 200_000_000, emoji: "🏡",  rarity: "legendary", xpBonus: 1500,  sellPct: 0.6, category: "realestate" },
  mansion:          { price: 300_000_000, emoji: "🏰",  rarity: "legendary", xpBonus: 2500,  sellPct: 0.6, category: "realestate" },
  mega_mansion:     { price: 400_000_000, emoji: "🏰",  rarity: "legendary", xpBonus: 5000,  sellPct: 0.6, category: "realestate" },

  // ── Charms & Boosts ────────────────────────────────────────────────────────
  rob_charm:      { price: 75_000,     emoji: "🧿",  rarity: "rare",      xpBonus: 0,  sellPct: 0.3, category: "charms", useEffect: "rob_shield:86400000",  description: "Shields you from being robbed for 1 day. Consumed on use." },
  stealth_hood:   { price: 40_000,     emoji: "🪄",  rarity: "common",    xpBonus: 0,  sellPct: 0.3, category: "charms", useEffect: "stealth:3600000",      description: "Halves your fine if caught robbing for 1 hour. Consumed on use." },
  vault_guard:    { price: 100_000,    emoji: "🔒",  rarity: "rare",      xpBonus: 0,  sellPct: 0.3, category: "charms", useEffect: "vault_shield:7200000", description: "Locks your vault against forced withdrawals for 2 hours." },
  xp_bomb:        { price: 30_000,     emoji: "💥",  rarity: "common",    xpBonus: 0,  sellPct: 0.4, category: "charms", useEffect: "xp+500",               description: "Instantly grants 500 XP. Consumed on use." },
};

export const RARITY_COLORS = { common: "⚪", rare: "🔵", legendary: "🟡" };

export const SHOP_CATEGORIES = {
  gear:        { emoji: "⚔️",  label: "Weapons & Gear" },
  clothes:     { emoji: "👕",  label: "Clothes & Fashion" },
  cars:        { emoji: "🚗",  label: "Cars" },
  jets:        { emoji: "🛩️",  label: "Private Jets" },
  realestate:  { emoji: "🏠",  label: "Real Estate" },
  charms:      { emoji: "🧿",  label: "Charms & Boosts" },
};

/** Loot table for .dig */
export const DIG_LOOT = [
  { type: "cash",  min: 50,   max: 400,  weight: 50, label: "💰 Cash" },
  { type: "cash",  min: 400,  max: 1200, weight: 15, label: "💰 Cash" },
  { type: "item",  name: "potion",  weight: 12 },
  { type: "item",  name: "scroll",  weight: 8  },
  { type: "item",  name: "pickaxe", weight: 5  },
  { type: "orbs",  min: 1, max: 5,   weight: 7  },
  { type: "item",  name: "diamond", weight: 0.2 },
  { type: "nothing",               weight: 2.8 },
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
