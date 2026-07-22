/**
 * KELIN MD — Pokémon Mart item catalogue
 */

export const MART_ITEMS = {
  // ── Pokéballs ─────────────────────────────────────────────────────────────
  pokeball:    { name: "Poké Ball",       price: 200,   desc: "30% catch rate. The standard Pokéball.",               category: "ball",  emoji: "⚪" },
  greatball:   { name: "Great Ball",      price: 600,   desc: "45% catch rate. More reliable than a Poké Ball.",      category: "ball",  emoji: "🔵" },
  ultraball:   { name: "Ultra Ball",      price: 1200,  desc: "60% catch rate. A highly effective throwing Pokéball.", category: "ball",  emoji: "⚫" },
  masterball:  { name: "Master Ball",     price: 9999,  desc: "80% catch rate. Almost guaranteed to catch.",          category: "ball",  emoji: "🟣" },
  premierball: { name: "Premier Ball",    price: 200,   desc: "35% catch rate. A rare Pokéball.",                     category: "ball",  emoji: "⚪" },
  healball:    { name: "Heal Ball",       price: 300,   desc: "40% catch rate. Heals the Pokémon upon capture.",      category: "ball",  emoji: "🩷" },
  duskball:    { name: "Dusk Ball",       price: 1000,  desc: "50% catch rate. More effective in dark conditions.",   category: "ball",  emoji: "🌑" },
  netball:     { name: "Net Ball",        price: 1000,  desc: "45% catch rate. Better for Water/Bug Pokémon.",        category: "ball",  emoji: "🟩" },
  luxuryball:  { name: "Luxury Ball",     price: 1000,  desc: "40% catch rate. Raises caught Pokémon's friendliness.", category: "ball", emoji: "🟠" },
  quickball:   { name: "Quick Ball",      price: 1000,  desc: "55% catch rate. Most effective on first turn.",        category: "ball",  emoji: "🟡" },

  // ── Healing Items ─────────────────────────────────────────────────────────
  potion:      { name: "Potion",          price: 300,   desc: "Restores 20 HP to one Pokémon.",                       category: "heal",  emoji: "🩹" },
  superpotion: { name: "Super Potion",    price: 700,   desc: "Restores 50 HP to one Pokémon.",                       category: "heal",  emoji: "💊" },
  hyperpotion: { name: "Hyper Potion",    price: 1500,  desc: "Restores 200 HP to one Pokémon.",                      category: "heal",  emoji: "💉" },
  fullrestore: { name: "Full Restore",    price: 3000,  desc: "Fully restores HP and cures status of one Pokémon.",   category: "heal",  emoji: "✨" },
  revive:      { name: "Revive",          price: 1500,  desc: "Revives a fainted Pokémon to half HP.",                category: "heal",  emoji: "💫" },
  maxrevive:   { name: "Max Revive",      price: 4000,  desc: "Revives a fainted Pokémon to full HP.",                category: "heal",  emoji: "⭐" },

  // ── Battle Items ──────────────────────────────────────────────────────────
  xattack:     { name: "X Attack",        price: 500,   desc: "Raises one Pokémon's Attack by 50% for the battle.",   category: "battle", emoji: "⚔️" },
  xdefense:    { name: "X Defense",       price: 550,   desc: "Raises one Pokémon's Defense by 50% for the battle.",  category: "battle", emoji: "🛡️" },
  xspeed:      { name: "X Speed",         price: 350,   desc: "Raises one Pokémon's Speed by 50% for the battle.",    category: "battle", emoji: "💨" },

  // ── Evolution Stones ──────────────────────────────────────────────────────
  firestone:    { name: "Fire Stone",     price: 3000,  desc: "Makes certain Pokémon evolve. (e.g. Eevee → Flareon)", category: "stone", emoji: "🔥" },
  waterstone:   { name: "Water Stone",    price: 3000,  desc: "Makes certain Pokémon evolve. (e.g. Eevee → Vaporeon)",category: "stone", emoji: "💧" },
  thunderstone: { name: "Thunder Stone",  price: 3000,  desc: "Makes certain Pokémon evolve. (e.g. Pikachu → Raichu)",category: "stone", emoji: "⚡" },
  leafstone:    { name: "Leaf Stone",     price: 3000,  desc: "Makes certain Pokémon evolve. (e.g. Gloom → Vileplume)",category: "stone", emoji: "🍃" },
  moonstone:    { name: "Moon Stone",     price: 3000,  desc: "Makes certain Pokémon evolve. (e.g. Clefairy → Clefable)",category:"stone",emoji: "🌙" },
  sunstone:     { name: "Sun Stone",      price: 3000,  desc: "Makes certain Pokémon evolve. (e.g. Sunkern → Sunflora)",category:"stone", emoji: "☀️" },
  icestone:     { name: "Ice Stone",      price: 3000,  desc: "Makes certain Pokémon evolve. (e.g. Eevee → Glaceon)", category: "stone", emoji: "🧊" },
  shinystone:   { name: "Shiny Stone",    price: 4000,  desc: "Makes certain Pokémon evolve. (e.g. Togetic → Togekiss)",category:"stone",emoji: "✨" },
  dawnstone:    { name: "Dawn Stone",     price: 4000,  desc: "Makes certain Pokémon evolve. (e.g. Kirlia → Gallade)", category: "stone", emoji: "🌅" },
  duskstone:    { name: "Dusk Stone",     price: 4000,  desc: "Makes certain Pokémon evolve. (e.g. Murkrow → Honchkrow)",category:"stone",emoji:"🌆" },

  // ── Key Items ─────────────────────────────────────────────────────────────
  keystone:     { name: "Key Stone",      price: 15000, desc: "Required for Mega Evolution during battle.",            category: "key",   emoji: "💎" },
};

export const CATEGORIES = {
  ball:   { name: "🎾 Pokéballs",       items: [] },
  heal:   { name: "💊 Healing Items",   items: [] },
  battle: { name: "⚔️  Battle Items",   items: [] },
  stone:  { name: "🪨 Evolution Stones",items: [] },
  key:    { name: "🔑 Key Items",        items: [] },
};

// Pre-group items
for (const [id, item] of Object.entries(MART_ITEMS)) {
  if (CATEGORIES[item.category]) CATEGORIES[item.category].items.push({ id, ...item });
}

export function getItem(id) { return MART_ITEMS[id] || null; }

export function getMartMenu() {
  return Object.values(CATEGORIES).map((cat) => {
    const lines = cat.items.map((it) => `  ${it.emoji} *${it.name}* — ${it.price} coins\n    ↳ \`${it.id}\``).join("\n");
    return `*${cat.name}*\n${lines}`;
  }).join("\n\n");
}

export function getHealAmount(item) {
  const heals = { potion: 20, superpotion: 50, hyperpotion: 200, fullrestore: 9999 };
  return heals[item] ?? 0;
}
