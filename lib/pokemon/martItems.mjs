/**
 * KELIN MD — Pokémon Mart item catalogue (7 pages)
 */

export const MART_ITEMS = {
  // ── PAGE 1: Pokéballs ──────────────────────────────────────────────────────
  pokeball:    { name: "Poké Ball",       price: 200,   desc: "30% catch rate. The standard Pokéball.",                     category: "ball",    emoji: "⚪", page: 1 },
  greatball:   { name: "Great Ball",      price: 600,   desc: "45% catch rate. More reliable than a Poké Ball.",            category: "ball",    emoji: "🔵", page: 1 },
  ultraball:   { name: "Ultra Ball",      price: 1200,  desc: "60% catch rate. A highly effective throwing Pokéball.",      category: "ball",    emoji: "⚫", page: 1 },
  masterball:  { name: "Master Ball",     price: 9999,  desc: "80% catch rate. Almost guaranteed to catch.",                category: "ball",    emoji: "🟣", page: 1 },
  premierball: { name: "Premier Ball",    price: 200,   desc: "35% catch rate. A commemorative Pokéball.",                  category: "ball",    emoji: "⚪", page: 1 },
  healball:    { name: "Heal Ball",       price: 300,   desc: "40% catch rate. Heals the Pokémon upon capture.",            category: "ball",    emoji: "🩷", page: 1 },
  duskball:    { name: "Dusk Ball",       price: 1000,  desc: "50% catch rate. More effective at night or in caves.",       category: "ball",    emoji: "🌑", page: 1 },
  netball:     { name: "Net Ball",        price: 1000,  desc: "45% catch rate. Better for Water and Bug Pokémon.",          category: "ball",    emoji: "🟩", page: 1 },
  luxuryball:  { name: "Luxury Ball",     price: 1000,  desc: "40% catch rate. Raises caught Pokémon friendliness.",        category: "ball",    emoji: "🟠", page: 1 },
  quickball:   { name: "Quick Ball",      price: 1000,  desc: "55% catch rate. Most effective on the first turn.",          category: "ball",    emoji: "🟡", page: 1 },

  // ── PAGE 2: Healing Items ─────────────────────────────────────────────────
  potion:        { name: "Potion",          price: 300,   desc: "Restores 20 HP to one Pokémon.",                           category: "heal",    emoji: "🩹", page: 2 },
  superpotion:   { name: "Super Potion",    price: 700,   desc: "Restores 50 HP to one Pokémon.",                           category: "heal",    emoji: "💊", page: 2 },
  hyperpotion:   { name: "Hyper Potion",    price: 1500,  desc: "Restores 200 HP to one Pokémon.",                          category: "heal",    emoji: "💉", page: 2 },
  fullrestore:   { name: "Full Restore",    price: 3000,  desc: "Fully restores HP and status of one Pokémon.",             category: "heal",    emoji: "✨", page: 2 },
  revive:        { name: "Revive",          price: 1500,  desc: "Revives a fainted Pokémon to half HP.",                    category: "heal",    emoji: "💫", page: 2 },
  maxrevive:     { name: "Max Revive",      price: 4000,  desc: "Revives a fainted Pokémon to full HP.",                    category: "heal",    emoji: "⭐", page: 2 },
  freshwater:    { name: "Fresh Water",     price: 200,   desc: "Restores 50 HP to one Pokémon.",                           category: "heal",    emoji: "💧", page: 2 },
  sodapop:       { name: "Soda Pop",        price: 300,   desc: "Restores 60 HP to one Pokémon.",                           category: "heal",    emoji: "🥤", page: 2 },
  lemonade:      { name: "Lemonade",        price: 350,   desc: "Restores 80 HP to one Pokémon.",                           category: "heal",    emoji: "🍋", page: 2 },
  moomoomilk:    { name: "Moomoo Milk",     price: 500,   desc: "Restores 100 HP to one Pokémon.",                          category: "heal",    emoji: "🥛", page: 2 },
  energypowder:  { name: "Energy Powder",   price: 400,   desc: "Restores 60 HP but lowers friendliness.",                  category: "heal",    emoji: "🌿", page: 2 },
  energyroot:    { name: "Energy Root",     price: 800,   desc: "Restores 120 HP but lowers friendliness.",                 category: "heal",    emoji: "🌱", page: 2 },

  // ── PAGE 3: Battle Items ──────────────────────────────────────────────────
  xattack:       { name: "X Attack",        price: 500,   desc: "Raises one Pokémon's Attack by 50% for the battle.",       category: "battle",  emoji: "⚔️",  page: 3 },
  xdefense:      { name: "X Defense",       price: 550,   desc: "Raises one Pokémon's Defense by 50% for the battle.",      category: "battle",  emoji: "🛡️",  page: 3 },
  xspeed:        { name: "X Speed",         price: 350,   desc: "Raises one Pokémon's Speed by 50% for the battle.",        category: "battle",  emoji: "💨",  page: 3 },
  xspatk:        { name: "X Sp. Atk",       price: 500,   desc: "Raises one Pokémon's Sp. Atk by 50% for the battle.",      category: "battle",  emoji: "🔮",  page: 3 },
  xspdef:        { name: "X Sp. Def",       price: 550,   desc: "Raises one Pokémon's Sp. Def by 50% for the battle.",      category: "battle",  emoji: "🔵",  page: 3 },
  xaccuracy:     { name: "X Accuracy",      price: 400,   desc: "Raises one Pokémon's Accuracy for the battle.",            category: "battle",  emoji: "🎯",  page: 3 },
  guardspec:     { name: "Guard Spec.",      price: 700,   desc: "Prevents stat reduction for your team for 5 turns.",       category: "battle",  emoji: "🔒",  page: 3 },
  direhit:       { name: "Dire Hit",         price: 650,   desc: "Raises critical-hit ratio for one Pokémon for the battle.", category: "battle", emoji: "💥",  page: 3 },

  // ── PAGE 4: Evolution Stones ──────────────────────────────────────────────
  firestone:     { name: "Fire Stone",       price: 3000,  desc: "Evolves certain Fire-type Pokémon. (e.g. Eevee → Flareon)",    category: "stone", emoji: "🔥", page: 4 },
  waterstone:    { name: "Water Stone",      price: 3000,  desc: "Evolves certain Water-type Pokémon. (e.g. Eevee → Vaporeon)",  category: "stone", emoji: "💧", page: 4 },
  thunderstone:  { name: "Thunder Stone",    price: 3000,  desc: "Evolves certain Electric Pokémon. (e.g. Pikachu → Raichu)",   category: "stone", emoji: "⚡", page: 4 },
  leafstone:     { name: "Leaf Stone",       price: 3000,  desc: "Evolves certain Grass-type Pokémon. (e.g. Gloom → Vileplume)", category: "stone", emoji: "🍃", page: 4 },
  moonstone:     { name: "Moon Stone",       price: 3000,  desc: "Evolves certain Pokémon. (e.g. Clefairy → Clefable)",         category: "stone", emoji: "🌙", page: 4 },
  sunstone:      { name: "Sun Stone",        price: 3000,  desc: "Evolves certain Pokémon. (e.g. Sunkern → Sunflora)",          category: "stone", emoji: "☀️", page: 4 },
  icestone:      { name: "Ice Stone",        price: 3000,  desc: "Evolves certain Ice-type Pokémon. (e.g. Eevee → Glaceon)",    category: "stone", emoji: "🧊", page: 4 },
  shinystone:    { name: "Shiny Stone",      price: 4000,  desc: "Evolves certain Pokémon. (e.g. Togetic → Togekiss)",          category: "stone", emoji: "✨", page: 4 },
  dawnstone:     { name: "Dawn Stone",       price: 4000,  desc: "Evolves certain Pokémon. (e.g. Kirlia → Gallade)",            category: "stone", emoji: "🌅", page: 4 },
  duskstone:     { name: "Dusk Stone",       price: 4000,  desc: "Evolves certain Pokémon. (e.g. Murkrow → Honchkrow)",         category: "stone", emoji: "🌆", page: 4 },

  // ── PAGE 5: Status Cures ──────────────────────────────────────────────────
  antidote:      { name: "Antidote",         price: 100,   desc: "Cures a Pokémon of poison.",                               category: "cure",  emoji: "🟢", page: 5 },
  paralyzeheal:  { name: "Paralyze Heal",    price: 200,   desc: "Cures a Pokémon of paralysis.",                            category: "cure",  emoji: "⚡", page: 5 },
  awakening:     { name: "Awakening",        price: 250,   desc: "Rouses a Pokémon from sleep.",                             category: "cure",  emoji: "☀️", page: 5 },
  burnheal:      { name: "Burn Heal",        price: 250,   desc: "Cures a Pokémon of a burn.",                               category: "cure",  emoji: "🔥", page: 5 },
  iceheal:       { name: "Ice Heal",         price: 250,   desc: "Cures a Pokémon of being frozen.",                         category: "cure",  emoji: "🧊", page: 5 },
  fullheal:      { name: "Full Heal",        price: 600,   desc: "Cures a Pokémon of all status conditions.",                category: "cure",  emoji: "💚", page: 5 },
  berryjuice:    { name: "Berry Juice",      price: 100,   desc: "Restores 20 HP and cures confusion.",                      category: "cure",  emoji: "🍒", page: 5 },
  ragecandybar:  { name: "Rage Candy Bar",   price: 350,   desc: "Cures all status conditions including confusion.",         category: "cure",  emoji: "🍫", page: 5 },

  // ── PAGE 6: Vitamins & EV Boosters ───────────────────────────────────────
  hpup:          { name: "HP Up",            price: 5000,  desc: "Raises max HP base stat permanently by 5.",                category: "vitamin", emoji: "❤️",  page: 6 },
  protein:       { name: "Protein",          price: 5000,  desc: "Raises Attack base stat permanently by 5.",                category: "vitamin", emoji: "💪",  page: 6 },
  iron:          { name: "Iron",             price: 5000,  desc: "Raises Defense base stat permanently by 5.",               category: "vitamin", emoji: "🛡️",  page: 6 },
  calcium:       { name: "Calcium",          price: 5000,  desc: "Raises Sp. Atk base stat permanently by 5.",              category: "vitamin", emoji: "🔮",  page: 6 },
  zinc:          { name: "Zinc",             price: 5000,  desc: "Raises Sp. Def base stat permanently by 5.",              category: "vitamin", emoji: "🔵",  page: 6 },
  carbos:        { name: "Carbos",           price: 5000,  desc: "Raises Speed base stat permanently by 5.",                category: "vitamin", emoji: "💨",  page: 6 },
  ppup:          { name: "PP Up",            price: 3000,  desc: "Raises the max PP of one move by 20%.",                   category: "vitamin", emoji: "🔋",  page: 6 },
  ppmax:         { name: "PP Max",           price: 9800,  desc: "Raises the max PP of one move to the maximum.",           category: "vitamin", emoji: "⚡",  page: 6 },

  // ── PAGE 7: Key Items & Special ──────────────────────────────────────────
  keystone:      { name: "Key Stone",        price: 15000, desc: "Allows Mega Evolution when equipped on a Pokémon. Buy once only.", category: "key", emoji: "💎", page: 7 },
  repel:         { name: "Repel",            price: 350,   desc: "Keeps away weak wild Pokémon for 100 steps.",             category: "key",   emoji: "🌿", page: 7 },
  superrepel:    { name: "Super Repel",      price: 500,   desc: "Keeps away weak wild Pokémon for 200 steps.",             category: "key",   emoji: "🌲", page: 7 },
  maxrepel:      { name: "Max Repel",        price: 700,   desc: "Keeps away weak wild Pokémon for 250 steps.",             category: "key",   emoji: "🌳", page: 7 },
  escaperope:    { name: "Escape Rope",      price: 550,   desc: "Instantly flee from a wild battle.",                      category: "key",   emoji: "🪢", page: 7 },
  rarecandy:     { name: "Rare Candy",       price: 4800,  desc: "Raises the level of one Pokémon by 1.",                   category: "key",   emoji: "🍬", page: 7 },
};

// Build page groups (1–7)
export const PAGES = {};
for (const [id, item] of Object.entries(MART_ITEMS)) {
  const p = item.page || 1;
  if (!PAGES[p]) PAGES[p] = [];
  PAGES[p].push({ id, ...item });
}

export const PAGE_LABELS = {
  1: "🎾 POKÉBALLS",
  2: "💊 HEALING ITEMS",
  3: "⚔️  BATTLE ITEMS",
  4: "🪨 EVOLUTION STONES",
  5: "🩹 STATUS CURES",
  6: "💊 VITAMINS & BOOSTERS",
  7: "💎 KEY ITEMS & SPECIAL",
};

export const TOTAL_PAGES = Object.keys(PAGES).length;

export function getItem(id) { return MART_ITEMS[id] || null; }

export function getMartPage(pageNum) {
  const items = PAGES[pageNum];
  if (!items || items.length === 0) return null;
  const label = PAGE_LABELS[pageNum] || `Page ${pageNum}`;
  const lines  = items.map(it => `  ${it.emoji} *${it.name}* — ${it.price.toLocaleString()} coins\n    ↳ ${it.desc}\n    ↳ Buy: \`.mart buy ${it.id}\``).join("\n\n");
  return `*${label}*\n\n${lines}`;
}

export function getHealAmount(item) {
  const heals = {
    potion: 20, superpotion: 50, hyperpotion: 200, fullrestore: 9999,
    freshwater: 50, sodapop: 60, lemonade: 80, moomoomilk: 100,
    energypowder: 60, energyroot: 120, berryjuice: 20, ragecandybar: 999,
  };
  return heals[item] ?? 0;
}
