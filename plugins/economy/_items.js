/**
 * Shared item catalogue — Anime RPG Edition
 * Used by shop.js, use.js, sell.js and dig/fish loot tables.
 *
 * Price fields:
 *   price    = Coins (🪙)
 *   orbCost  = Orbs  (🔮)  — 0 means free / not required
 *   gemCost  = Diamonds (💎) — 0 means free / not required
 */

export const SHOP_ITEMS = {

  // ── ⚔️  WEAPONS & COMBAT GEAR ───────────────────────────────────────────────
  wooden_training_sword: {
    price: 2_500,   orbCost: 2,   gemCost: 0,
    emoji: "🗡️",   rarity: "common",    xpBonus: 15,  sellPct: 0.4,
    category: "weapons",
    description: "Basic weapon for beginners (+5 ATK).",
    useEffect: "atk+5",
  },
  iron_broadsword: {
    price: 15_000,  orbCost: 15,  gemCost: 1,
    emoji: "⚔️",   rarity: "common",    xpBonus: 50,  sellPct: 0.4,
    category: "weapons",
    description: "Sturdy blade that hits harder (+20 ATK).",
    useEffect: "atk+20",
  },
  vampiric_dagger: {
    price: 60_000,  orbCost: 60,  gemCost: 6,
    emoji: "🩸",   rarity: "rare",      xpBonus: 120, sellPct: 0.5,
    category: "weapons",
    description: "Heals 10% of damage dealt to enemies (+35 ATK).",
    useEffect: "atk+35,heal:10",
  },
  excalibur: {
    price: 250_000, orbCost: 250, gemCost: 25,
    emoji: "✨",   rarity: "legendary", xpBonus: 500, sellPct: 0.6,
    category: "weapons",
    description: "Legendary holy sword with massive critical hit chance (+100 ATK).",
    useEffect: "atk+100,crit+20",
  },

  // ── 🛡️  ARMOR & ACCESSORIES ─────────────────────────────────────────────────
  leather_armor: {
    price: 3_000,   orbCost: 3,   gemCost: 0,
    emoji: "🧥",   rarity: "common",    xpBonus: 15,  sellPct: 0.4,
    category: "armor",
    description: "Provides basic protection against early monsters (+10 DEF).",
    useEffect: "def+10",
  },
  knights_plate_armor: {
    price: 45_000,  orbCost: 45,  gemCost: 4,
    emoji: "🛡️",   rarity: "rare",      xpBonus: 100, sellPct: 0.5,
    category: "armor",
    description: "Heavy armor that significantly reduces damage (+50 DEF).",
    useEffect: "def+50",
  },
  ring_of_fortune: {
    price: 35_000,  orbCost: 35,  gemCost: 3,
    emoji: "💍",   rarity: "rare",      xpBonus: 80,  sellPct: 0.5,
    category: "armor",
    description: "Increases coin drops from battles by 15%.",
    useEffect: "coinboost:15",
  },
  amulet_of_immortality: {
    price: 150_000, orbCost: 150, gemCost: 15,
    emoji: "🔮",   rarity: "legendary", xpBonus: 300, sellPct: 0.6,
    category: "armor",
    description: "Prevents death once per day and restores 50% HP.",
    useEffect: "death_prevent:86400000,heal:50",
  },

  // ── 🐾  PETS & COMPANIONS ────────────────────────────────────────────────────
  stray_cat: {
    price: 8_000,   orbCost: 8,   gemCost: 0,
    emoji: "🐱",   rarity: "common",    xpBonus: 25,  sellPct: 0.3,
    category: "pets",
    description: "Gathers 500 extra coins every 12 hours.",
    useEffect: "passive_coins:500",
  },
  guard_dog: {
    price: 20_000,  orbCost: 20,  gemCost: 2,
    emoji: "🐶",   rarity: "common",    xpBonus: 50,  sellPct: 0.3,
    category: "pets",
    description: "Protects your coins from being stolen by other players.",
    useEffect: "rob_shield:86400000",
  },
  baby_dragon: {
    price: 100_000, orbCost: 100, gemCost: 10,
    emoji: "🐉",   rarity: "rare",      xpBonus: 200, sellPct: 0.5,
    category: "pets",
    description: "Helps in battles by dealing extra burn damage.",
    useEffect: "burn_dmg:15",
  },
  phoenix: {
    price: 500_000, orbCost: 500, gemCost: 50,
    emoji: "🦅",   rarity: "legendary", xpBonus: 1000, sellPct: 0.6,
    category: "pets",
    description: "Auto-revives you in battles and boosts XP gains by 25%.",
    useEffect: "auto_revive,xp_boost:25",
  },

  // ── 🏡  BASES & UPGRADES ─────────────────────────────────────────────────────
  wooden_cabin: {
    price: 50_000,   orbCost: 50,   gemCost: 5,
    emoji: "🏕️",   rarity: "common",    xpBonus: 100, sellPct: 0.4,
    category: "bases",
    description: "Increases daily reward claim by +50%.",
    useEffect: "daily_boost:50",
  },
  vault_upgrade: {
    price: 75_000,   orbCost: 75,   gemCost: 7,
    emoji: "🏦",   rarity: "rare",      xpBonus: 150, sellPct: 0.4,
    category: "bases",
    description: "Expands max coin storage capacity by +100,000.",
    useEffect: "vault+100000",
  },
  luxury_mansion: {
    price: 1_000_000, orbCost: 1000, gemCost: 100,
    emoji: "🏰",   rarity: "legendary", xpBonus: 2000, sellPct: 0.6,
    category: "bases",
    description: "Increases daily reward claim by +200% and unlocks VIP status.",
    useEffect: "daily_boost:200,vip:true",
  },

  // ── 📦  MYSTERY BOXES & GACHA ────────────────────────────────────────────────
  common_lootbox: {
    price: 3_000,   orbCost: 3,   gemCost: 0,
    emoji: "📦",   rarity: "common",    xpBonus: 20,  sellPct: 0.2,
    category: "gacha",
    description: "Contains basic consumables or up to 5,000 Coins.",
    useEffect: "loot:common",
  },
  rare_lootbox: {
    price: 15_000,  orbCost: 15,  gemCost: 1,
    emoji: "🎁",   rarity: "rare",      xpBonus: 60,  sellPct: 0.3,
    category: "gacha",
    description: "Contains rare consumables, equipment, or up to 25,000 Coins.",
    useEffect: "loot:rare",
  },
  legendary_chest: {
    price: 80_000,  orbCost: 80,  gemCost: 8,
    emoji: "🏆",   rarity: "legendary", xpBonus: 300, sellPct: 0.4,
    category: "gacha",
    description: "Guarantees a high-tier item, pet, or up to 200,000 Coins.",
    useEffect: "loot:legendary",
  },

  // ── 👑  COSMETICS & TITLES ────────────────────────────────────────────────────
  title_the_wealthy: {
    price: 50_000,   orbCost: 50,   gemCost: 5,
    emoji: "💰",   rarity: "rare",      xpBonus: 100, sellPct: 0.2,
    category: "cosmetics",
    description: "Displays a shiny badge next to your profile name.",
    useEffect: "title:The Wealthy",
  },
  title_overlord: {
    price: 500_000,  orbCost: 500,  gemCost: 50,
    emoji: "👑",   rarity: "legendary", xpBonus: 1000, sellPct: 0.2,
    category: "cosmetics",
    description: "Exclusive title reserved for top bot players.",
    useEffect: "title:Overlord",
  },
  dark_gold_theme: {
    price: 100_000,  orbCost: 100,  gemCost: 10,
    emoji: "🎨",   rarity: "rare",      xpBonus: 200, sellPct: 0.2,
    category: "cosmetics",
    description: "Changes your command background style to Dark Gold.",
    useEffect: "theme:dark_gold",
  },

  // ── 🎣  EQUIPMENT & TOOLS ────────────────────────────────────────────────────
  basic_fishing_rod: {
    price: 1_000,   orbCost: 1,   gemCost: 0,
    emoji: "🎣",   rarity: "common",    xpBonus: 5,   sellPct: 0.3,
    category: "tools",
    description: "Allows you to catch standard fish and small coin payouts.",
    useEffect: "xp+20",
  },
  golden_fishing_rod: {
    price: 25_000,  orbCost: 25,  gemCost: 2,
    emoji: "🏅",   rarity: "rare",      xpBonus: 80,  sellPct: 0.4,
    category: "tools",
    description: "Increases rare fish catch rates by 50%.",
    useEffect: "fish_boost:50",
  },
  mining_pickaxe: {
    price: 5_000,   orbCost: 5,   gemCost: 0,
    emoji: "⛏️",   rarity: "common",    xpBonus: 20,  sellPct: 0.3,
    category: "tools",
    description: "Unlocks the mineral cave to mine ores and gems.",
    useEffect: "xp+25",
  },
  diamond_shovel: {
    price: 75_000,  orbCost: 75,  gemCost: 5,
    emoji: "🪏",   rarity: "rare",      xpBonus: 100, sellPct: 0.4,
    category: "tools",
    description: "A lucky shovel that doubles your chance of finding Diamonds while digging.",
  },
  treasure_radar: {
    price: 15_000,  orbCost: 15,  gemCost: 1,
    emoji: "📡",   rarity: "rare",      xpBonus: 50,  sellPct: 0.4,
    category: "tools",
    description: "Detects hidden treasure chests in adventure mode.",
    useEffect: "loot_boost:2",
  },

  // ── 🎟️  CONSUMABLES & TICKETS ────────────────────────────────────────────────
  lottery_ticket: {
    price: 2_000,   orbCost: 2,   gemCost: 0,
    emoji: "🎟️",   rarity: "common",    xpBonus: 5,   sellPct: 0.1,
    category: "consumables",
    description: "A chance to win the daily jackpot.",
    useEffect: "lottery+1",
  },
  double_xp_booster: {
    price: 10_000,  orbCost: 10,  gemCost: 1,
    emoji: "⚡",   rarity: "rare",      xpBonus: 0,   sellPct: 0.2,
    category: "consumables",
    description: "Doubles all experience earned for 1 hour.",
    useEffect: "xp_boost:2:3600000",
  },
  coin_doubler: {
    price: 20_000,  orbCost: 20,  gemCost: 2,
    emoji: "💫",   rarity: "rare",      xpBonus: 0,   sellPct: 0.2,
    category: "consumables",
    description: "Doubles all coin rewards earned from commands.",
    useEffect: "coin_boost:2:1800000",
  },
  mystery_key: {
    price: 5_000,   orbCost: 5,   gemCost: 0,
    emoji: "🗝️",   rarity: "common",    xpBonus: 10,  sellPct: 0.3,
    category: "consumables",
    description: "Unlocks standard loot boxes.",
    useEffect: "loot:standard",
  },

  // ── 🧪  POTIONS & RECOVERY ───────────────────────────────────────────────────
  small_health_potion: {
    price: 1_500,   orbCost: 1,   gemCost: 0,
    emoji: "🍶",   rarity: "common",    xpBonus: 5,   sellPct: 0.4,
    category: "potions",
    description: "Restores 25% HP.",
    useEffect: "hp+25",
  },
  full_heal: {
    price: 10_000,  orbCost: 10,  gemCost: 1,
    emoji: "💊",   rarity: "rare",      xpBonus: 30,  sellPct: 0.4,
    category: "potions",
    description: "Cures any status ailment.",
    useEffect: "cure_all",
  },
  full_restore: {
    price: 30_000,  orbCost: 30,  gemCost: 3,
    emoji: "✨",   rarity: "rare",      xpBonus: 60,  sellPct: 0.4,
    category: "potions",
    description: "Fully restores HP and cures all status ailments.",
    useEffect: "hp+100,cure_all",
  },
  revive: {
    price: 12_000,  orbCost: 12,  gemCost: 1,
    emoji: "💖",   rarity: "rare",      xpBonus: 40,  sellPct: 0.4,
    category: "potions",
    description: "Brings a fallen pet/character back to life with 50% HP.",
    useEffect: "revive:50",
  },
  max_elixir: {
    price: 15_000,  orbCost: 15,  gemCost: 1,
    emoji: "🧪",   rarity: "rare",      xpBonus: 50,  sellPct: 0.4,
    category: "potions",
    description: "Completely restores MP/Energy.",
    useEffect: "mp+100",
  },

  // ── 📜  SCROLLS & SPECIAL ITEMS ─────────────────────────────────────────────
  rename_scroll: {
    price: 8_000,   orbCost: 8,   gemCost: 0,
    emoji: "📜",   rarity: "common",    xpBonus: 20,  sellPct: 0.3,
    category: "scrolls",
    description: "Allows you to rename your bot profile or pet.",
    useEffect: "rename:1",
  },
  stat_reset_scroll: {
    price: 50_000,  orbCost: 50,  gemCost: 5,
    emoji: "📋",   rarity: "rare",      xpBonus: 100, sellPct: 0.3,
    category: "scrolls",
    description: "Resets skill points to redistribute them.",
    useEffect: "reset_stats",
  },
  clan_banner: {
    price: 100_000, orbCost: 100, gemCost: 10,
    emoji: "🏴",   rarity: "legendary", xpBonus: 250, sellPct: 0.3,
    category: "scrolls",
    description: "Allows creation of a clan or guild.",
    useEffect: "create_clan",
  },

  // ── 💎  CURRENCY EXCHANGE ────────────────────────────────────────────────────
  coin_pouch: {
    price: 0,       orbCost: 0,   gemCost: 1,
    emoji: "👛",   rarity: "common",    xpBonus: 0,   sellPct: 0,
    category: "exchange",
    description: "Exchange 1 Diamond for 10,000 Coins.",
    useEffect: "cash+10000",
  },
  coin_chest: {
    price: 0,       orbCost: 0,   gemCost: 5,
    emoji: "💰",   rarity: "rare",      xpBonus: 0,   sellPct: 0,
    category: "exchange",
    description: "Exchange 5 Diamonds for 50,000 Coins.",
    useEffect: "cash+50000",
  },
  orb_pack: {
    price: 0,       orbCost: 0,   gemCost: 1,
    emoji: "🔮",   rarity: "common",    xpBonus: 0,   sellPct: 0,
    category: "exchange",
    description: "Exchange 1 Diamond for 10 Orbs.",
    useEffect: "orbs+10",
  },
  orb_vault: {
    price: 0,       orbCost: 0,   gemCost: 10,
    emoji: "🌀",   rarity: "rare",      xpBonus: 0,   sellPct: 0,
    category: "exchange",
    description: "Exchange 10 Diamonds for 100 Orbs.",
    useEffect: "orbs+100",
  },

  // ── Legacy items (kept for backward compatibility) ───────────────────────────
  potion:  { price: 500,   orbCost: 0, gemCost: 0, emoji: "🧪", rarity: "common",    xpBonus: 5,   sellPct: 0.5, category: "potions",     useEffect: "xp+50" },
  scroll:  { price: 2000,  orbCost: 0, gemCost: 0, emoji: "📜", rarity: "common",    xpBonus: 8,   sellPct: 0.4, category: "scrolls",     useEffect: "xp+30,cash+100" },
  elixir:  { price: 1000,  orbCost: 0, gemCost: 0, emoji: "🍶", rarity: "common",    xpBonus: 10,  sellPct: 0.4, category: "potions",     useEffect: "xp+100,cash+200" },
  orb:     { price: 2000,  orbCost: 0, gemCost: 0, emoji: "🔮", rarity: "rare",      xpBonus: 50,  sellPct: 0.5, category: "consumables", useEffect: "orbs+5" },
  rod:     { price: 1500,  orbCost: 0, gemCost: 0, emoji: "🎣", rarity: "common",    xpBonus: 5,   sellPct: 0.3, category: "tools",       useEffect: "xp+20" },
  pickaxe: { price: 2500,  orbCost: 0, gemCost: 0, emoji: "⛏️", rarity: "common",    xpBonus: 8,   sellPct: 0.3, category: "tools",       useEffect: "xp+25" },
  boots:   { price: 3500,  orbCost: 0, gemCost: 0, emoji: "👢", rarity: "common",    xpBonus: 12,  sellPct: 0.4, category: "armor",       description: "Basic boots." },
  sword:   { price: 5000,  orbCost: 0, gemCost: 0, emoji: "⚔️", rarity: "common",    xpBonus: 20,  sellPct: 0.4, category: "weapons",     description: "Standard sword." },
  shield:  { price: 4000,  orbCost: 0, gemCost: 0, emoji: "🛡️", rarity: "common",    xpBonus: 15,  sellPct: 0.4, category: "armor",       description: "Standard shield." },
  ring:    { price: 3000,  orbCost: 0, gemCost: 0, emoji: "💍", rarity: "common",    xpBonus: 10,  sellPct: 0.4, category: "armor" },
  axe:     { price: 7000,  orbCost: 0, gemCost: 0, emoji: "🪓", rarity: "rare",      xpBonus: 35,  sellPct: 0.5, category: "weapons" },
  gun:     { price: 8000,  orbCost: 0, gemCost: 0, emoji: "🔫", rarity: "rare",      xpBonus: 40,  sellPct: 0.5, category: "weapons" },
  armor:   { price: 6000,  orbCost: 0, gemCost: 0, emoji: "🦾", rarity: "rare",      xpBonus: 30,  sellPct: 0.5, category: "armor" },

  // Charms (kept)
  rob_charm:    { price: 75_000,  orbCost: 0, gemCost: 0, emoji: "🧿", rarity: "rare",    xpBonus: 0, sellPct: 0.3, category: "consumables", useEffect: "rob_shield:86400000",  description: "Shields you from being robbed for 1 day." },
  stealth_hood: { price: 40_000,  orbCost: 0, gemCost: 0, emoji: "🪄", rarity: "common",  xpBonus: 0, sellPct: 0.3, category: "consumables", useEffect: "stealth:3600000",      description: "Halves your fine if caught robbing for 1 hour." },
  vault_guard:  { price: 100_000, orbCost: 0, gemCost: 0, emoji: "🔒", rarity: "rare",    xpBonus: 0, sellPct: 0.3, category: "consumables", useEffect: "vault_shield:7200000", description: "Locks your vault against forced withdrawals for 2 hours." },
  xp_bomb:      { price: 30_000,  orbCost: 0, gemCost: 0, emoji: "💥", rarity: "common",  xpBonus: 0, sellPct: 0.4, category: "consumables", useEffect: "xp+500",               description: "Instantly grants 500 XP." },
};

export const RARITY_COLORS = { common: "⚪", rare: "🔵", legendary: "🟡" };

export const SHOP_CATEGORIES = {
  weapons:     { emoji: "🗡️",  label: "Weapons & Combat Gear" },
  armor:       { emoji: "🛡️",  label: "Armor & Accessories" },
  pets:        { emoji: "🐾",  label: "Pets & Companions" },
  bases:       { emoji: "🏡",  label: "Bases & Upgrades" },
  gacha:       { emoji: "📦",  label: "Mystery Boxes & Gacha" },
  cosmetics:   { emoji: "👑",  label: "Cosmetics & Titles" },
  tools:       { emoji: "🎣",  label: "Equipment & Tools" },
  consumables: { emoji: "🎟️",  label: "Consumables & Tickets" },
  potions:     { emoji: "🧪",  label: "Potions & Recovery" },
  scrolls:     { emoji: "📜",  label: "Scrolls & Special Items" },
  exchange:    { emoji: "💱",  label: "Currency Exchange" },
};

/** Loot table for .dig */
export const DIG_LOOT = [
  { type: "cash",  min: 50,   max: 400,  weight: 50, label: "💰 Cash" },
  { type: "cash",  min: 400,  max: 1200, weight: 15, label: "💰 Cash" },
  { type: "item",  name: "potion",             weight: 12 },
  { type: "item",  name: "scroll",             weight: 8  },
  { type: "item",  name: "pickaxe",            weight: 5  },
  { type: "orbs",  min: 1, max: 5,             weight: 7  },
  { type: "item",  name: "small_health_potion", weight: 1  },
  { type: "nothing",                           weight: 2  },
];

/** Loot table for .fish */
export const FISH_LOOT = [
  { type: "cash",  min: 30,  max: 300,  weight: 50, label: "💰 Cash" },
  { type: "item",  name: "boots",               weight: 15 },
  { type: "item",  name: "basic_fishing_rod",   weight: 12 },
  { type: "item",  name: "scroll",              weight: 8  },
  { type: "orbs",  min: 1, max: 3,              weight: 10 },
  { type: "item",  name: "elixir",              weight: 4  },
  { type: "nothing",                            weight: 1  },
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
