// lib/dragonball/shopItems.js — DBZ shop catalogue
// Purchased with Zeni. useEffect is applied by dbzuse.js.

export const DBZ_SHOP_CATEGORIES = {
  potions:   { label: "Recovery Items", emoji: "🧪" },
  scrolls:   { label: "Skill Scrolls",  emoji: "📜" },
  gear:      { label: "Battle Gear",    emoji: "⚔️" },
  boosts:    { label: "Power Boosts",   emoji: "⚡" },
  beans:     { label: "Senzu Beans",    emoji: "🫘" },
};

export const DBZ_SHOP_ITEMS = {
  // ── 🫘 SENZU BEANS ──────────────────────────────────────────────────────────
  small_senzu_bean: {
    price: 50, emoji: "🫘", rarity: "common", category: "beans",
    description: "Restore 30% HP instantly.",
    useEffect: "hp_pct:30",
  },
  senzu_bean: {
    price: 150, emoji: "🫘", rarity: "common", category: "beans",
    description: "Fully restore HP and KI.",
    useEffect: "hp_full,ki_full",
  },

  // ── 🧪 POTIONS & RECOVERY ──────────────────────────────────────────────────
  ki_potion: {
    price: 80, emoji: "💠", rarity: "common", category: "potions",
    description: "Restore 50% KI instantly.",
    useEffect: "ki_pct:50",
  },
  full_restore: {
    price: 300, emoji: "✨", rarity: "rare", category: "potions",
    description: "Fully restore HP, KI, and cure all cooldowns.",
    useEffect: "hp_full,ki_full,clear_cd",
  },
  healing_capsule: {
    price: 120, emoji: "💊", rarity: "common", category: "potions",
    description: "Restore 50% HP.",
    useEffect: "hp_pct:50",
  },

  // ── 📜 SKILL SCROLLS (learn techniques) ────────────────────────────────────
  scroll_destructo_disc: {
    price: 500, emoji: "📜", rarity: "rare", category: "scrolls",
    description: "Learn Destructo Disc (65 dmg, 18 KI).",
    useEffect: "learn:destructo_disc",
  },
  scroll_kamehameha: {
    price: 800, emoji: "📜", rarity: "rare", category: "scrolls",
    description: "Learn Kamehameha (75 dmg, 25 KI).",
    useEffect: "learn:kamehameha",
  },
  scroll_solar_flare: {
    price: 300, emoji: "📜", rarity: "common", category: "scrolls",
    description: "Learn Solar Flare (support, 12 KI).",
    useEffect: "learn:solar_flare",
  },
  scroll_energy_shield: {
    price: 400, emoji: "📜", rarity: "common", category: "scrolls",
    description: "Learn Energy Shield (defense boost, 20 KI).",
    useEffect: "learn:energy_shield",
  },
  scroll_big_bang: {
    price: 2000, emoji: "📜", rarity: "legendary", category: "scrolls",
    description: "Learn Big Bang Attack (95 dmg, 44 KI).",
    useEffect: "learn:big_bang_attack",
  },
  scroll_final_flash: {
    price: 3500, emoji: "📜", rarity: "legendary", category: "scrolls",
    description: "Learn Final Flash (110 dmg, 52 KI).",
    useEffect: "learn:final_flash",
  },

  // ── ⚔️ BATTLE GEAR (permanent stat boosts, consumed on use) ─────────────────
  weighted_clothing: {
    price: 200, emoji: "🏋️", rarity: "common", category: "gear",
    description: "+3 Attack permanently.",
    useEffect: "stat:attack:3",
  },
  saiyan_armor: {
    price: 350, emoji: "🦺", rarity: "common", category: "gear",
    description: "+3 Defense permanently.",
    useEffect: "stat:defense:3",
  },
  gravity_boots: {
    price: 250, emoji: "👢", rarity: "common", category: "gear",
    description: "+3 Speed permanently.",
    useEffect: "stat:speed:3",
  },
  scouter: {
    price: 600, emoji: "🥽", rarity: "rare", category: "gear",
    description: "+5 Attack and +2 Speed permanently.",
    useEffect: "stat:attack:5,stat:speed:2",
  },
  z_sword: {
    price: 1500, emoji: "🗡️", rarity: "rare", category: "gear",
    description: "+10 Attack permanently.",
    useEffect: "stat:attack:10",
  },
  elder_kai_wisdom: {
    price: 5000, emoji: "🧙", rarity: "legendary", category: "gear",
    description: "+5 to all stats permanently.",
    useEffect: "stat:attack:5,stat:defense:5,stat:speed:5",
  },

  // ── ⚡ POWER BOOSTS (temporary, expire after battle) ────────────────────────
  kaioken_x4: {
    price: 100, emoji: "🔥", rarity: "common", category: "boosts",
    description: "+50% attack for your next battle.",
    useEffect: "buff:attack:50",
  },
  kaioken_x20: {
    price: 300, emoji: "💢", rarity: "rare", category: "boosts",
    description: "+100% attack for your next battle.",
    useEffect: "buff:attack:100",
  },
  rage_boost: {
    price: 200, emoji: "⚡", rarity: "common", category: "boosts",
    description: "+50% defense for your next battle.",
    useEffect: "buff:defense:50",
  },
};
