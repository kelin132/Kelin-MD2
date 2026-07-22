/**
 * KELIN MD — Pokémon game logic
 * Battle calculations, catch rates, moves, type effectiveness
 */

// ── Move pools by type ─────────────────────────────────────────────────────
export const TYPE_MOVES = {
  fire:     [{ name:"Ember",pp:25,power:40 }, { name:"Flamethrower",pp:15,power:95 }, { name:"Fire Spin",pp:15,power:35 }, { name:"Flame Wheel",pp:25,power:60 }],
  water:    [{ name:"Water Gun",pp:25,power:40 }, { name:"Surf",pp:15,power:95 }, { name:"Bubble Beam",pp:20,power:65 }, { name:"Aqua Tail",pp:10,power:90 }],
  electric: [{ name:"Thunder Shock",pp:30,power:40 }, { name:"Thunderbolt",pp:15,power:95 }, { name:"Thunder Wave",pp:20,power:0 }, { name:"Spark",pp:20,power:65 }],
  grass:    [{ name:"Vine Whip",pp:25,power:45 }, { name:"Razor Leaf",pp:25,power:55 }, { name:"Solar Beam",pp:10,power:120 }, { name:"Leaf Storm",pp:5,power:130 }],
  ice:      [{ name:"Ice Shard",pp:30,power:40 }, { name:"Ice Beam",pp:10,power:95 }, { name:"Blizzard",pp:5,power:120 }, { name:"Frost Breath",pp:10,power:60 }],
  fighting: [{ name:"Karate Chop",pp:25,power:50 }, { name:"Low Kick",pp:20,power:50 }, { name:"Close Combat",pp:5,power:120 }, { name:"Brick Break",pp:15,power:75 }],
  poison:   [{ name:"Poison Sting",pp:35,power:15 }, { name:"Sludge Bomb",pp:10,power:90 }, { name:"Acid",pp:30,power:40 }, { name:"Venoshock",pp:10,power:65 }],
  ground:   [{ name:"Mud Slap",pp:10,power:20 }, { name:"Earthquake",pp:10,power:100 }, { name:"Dig",pp:10,power:80 }, { name:"Earth Power",pp:10,power:90 }],
  flying:   [{ name:"Gust",pp:35,power:40 }, { name:"Wing Attack",pp:35,power:60 }, { name:"Aerial Ace",pp:20,power:60 }, { name:"Air Slash",pp:15,power:75 }],
  psychic:  [{ name:"Confusion",pp:25,power:50 }, { name:"Psybeam",pp:20,power:65 }, { name:"Psychic",pp:10,power:90 }, { name:"Psystrike",pp:10,power:100 }],
  bug:      [{ name:"Bug Bite",pp:20,power:60 }, { name:"X-Scissor",pp:15,power:80 }, { name:"Signal Beam",pp:15,power:75 }, { name:"Leech Life",pp:10,power:80 }],
  rock:     [{ name:"Rock Throw",pp:15,power:50 }, { name:"Rock Slide",pp:10,power:75 }, { name:"Stone Edge",pp:5,power:100 }, { name:"Power Gem",pp:20,power:80 }],
  ghost:    [{ name:"Shadow Ball",pp:15,power:80 }, { name:"Hex",pp:10,power:65 }, { name:"Night Shade",pp:15,power:0 }, { name:"Shadow Sneak",pp:30,power:40 }],
  dragon:   [{ name:"Dragon Breath",pp:20,power:60 }, { name:"Dragon Claw",pp:15,power:80 }, { name:"Outrage",pp:10,power:120 }, { name:"Draco Meteor",pp:5,power:130 }],
  dark:     [{ name:"Bite",pp:25,power:60 }, { name:"Crunch",pp:15,power:80 }, { name:"Dark Pulse",pp:15,power:80 }, { name:"Feint Attack",pp:20,power:60 }],
  steel:    [{ name:"Metal Claw",pp:35,power:50 }, { name:"Iron Head",pp:15,power:80 }, { name:"Flash Cannon",pp:10,power:80 }, { name:"Gyro Ball",pp:5,power:0 }],
  fairy:    [{ name:"Fairy Wind",pp:30,power:40 }, { name:"Moonblast",pp:15,power:95 }, { name:"Dazzling Gleam",pp:10,power:80 }, { name:"Play Rough",pp:10,power:90 }],
  normal:   [{ name:"Tackle",pp:35,power:40 }, { name:"Body Slam",pp:15,power:85 }, { name:"Hyper Beam",pp:5,power:150 }, { name:"Quick Attack",pp:30,power:40 }],
};

export function getMovesForType(primaryType, allTypes = []) {
  const base = TYPE_MOVES[primaryType] || TYPE_MOVES.normal;
  // Try to add one move from secondary type if different
  const secondary = allTypes.find((t) => t !== primaryType);
  if (secondary && TYPE_MOVES[secondary]) {
    const secMoves = TYPE_MOVES[secondary];
    const extra = secMoves[Math.floor(Math.random() * secMoves.length)];
    const pool = [...base];
    pool[3] = extra; // replace last move with secondary type move
    return pool;
  }
  return base;
}

// ── Damage formula (simplified Gen 3 style) ──────────────────────────────────
export function calcDamage(attacker, defender, move) {
  if (!move.power || move.power === 0) return 0;
  const level = attacker.level || 5;
  const atk = attacker.attack || 10;
  const def = defender.defense || 10;
  const power = move.power;
  const base = ((2 * level / 5 + 2) * power * atk / def) / 50 + 2;
  const roll = 0.85 + Math.random() * 0.15;
  const stab = (attacker.types || []).includes(move.type) ? 1.5 : 1;
  return Math.max(1, Math.floor(base * roll * stab));
}

// ── Catch rates ───────────────────────────────────────────────────────────────
export const POKEBALL_CATCH_RATES = {
  pokeball:    0.30,
  greatball:   0.45,
  ultraball:   0.60,
  masterball:  0.80,
  premierball: 0.35,
  healball:    0.40,
  duskball:    0.50,
  netball:     0.45,
  luxuryball:  0.40,
  quickball:   0.55,
};

export function tryCatch(ballType, pokemon) {
  const base = POKEBALL_CATCH_RATES[ballType] || 0.30;
  // HP factor: lower HP = up to +30% bonus
  const hpPct = pokemon.hp / pokemon.maxHp;
  const hpBonus = (1 - hpPct) * 0.30;
  const rate = Math.min(0.97, base + hpBonus);
  return { success: Math.random() < rate, rate: Math.round(rate * 100) };
}

// ── Wild Pokémon level range ──────────────────────────────────────────────────
export function wildLevel(trainerLevel = 1) {
  const min = Math.max(2, trainerLevel - 3);
  const max = trainerLevel + 5;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── XP gained from defeating a Pokémon ───────────────────────────────────────
export function xpReward(defeatedPokemon) {
  return Math.floor(defeatedPokemon.level * 15 * (1 + Math.random() * 0.5));
}

// ── Coin reward from battle ───────────────────────────────────────────────────
export function coinReward(opponentLevel) {
  return Math.floor(opponentLevel * 10 + Math.random() * 20);
}

// ── Stone evolution map ───────────────────────────────────────────────────────
export const STONE_EVOLUTIONS = {
  // [fromName]: { stone: "stonetype", evolvesTo: "pokemon name" }
  pikachu:     { stone: "thunderstone",  evolvesTo: "raichu" },
  eevee:       [
    { stone: "firestone",    evolvesTo: "flareon"   },
    { stone: "waterstone",   evolvesTo: "vaporeon"  },
    { stone: "thunderstone", evolvesTo: "jolteon"   },
    { stone: "icestone",     evolvesTo: "glaceon"   },
    { stone: "shinystone",   evolvesTo: "sylveon"   },
  ],
  vulpix:       { stone: "firestone",   evolvesTo: "ninetales"    },
  growlithe:    { stone: "firestone",   evolvesTo: "arcanine"     },
  poliwhirl:    { stone: "waterstone",  evolvesTo: "poliwrath"    },
  shellder:     { stone: "waterstone",  evolvesTo: "cloyster"     },
  staryu:       { stone: "waterstone",  evolvesTo: "starmie"      },
  clefairy:     { stone: "moonstone",   evolvesTo: "clefable"     },
  jigglypuff:   { stone: "moonstone",   evolvesTo: "wigglytuff"   },
  nidorino:     { stone: "moonstone",   evolvesTo: "nidoking"     },
  nidorina:     { stone: "moonstone",   evolvesTo: "nidoqueen"    },
  gloom:        [
    { stone: "leafstone", evolvesTo: "vileplume" },
    { stone: "sunstone",  evolvesTo: "bellossom" },
  ],
  weepinbell:   { stone: "leafstone",   evolvesTo: "victreebel"   },
  exeggcute:    { stone: "leafstone",   evolvesTo: "exeggutor"    },
  sunkern:      { stone: "sunstone",    evolvesTo: "sunflora"     },
  togetic:      { stone: "shinystone",  evolvesTo: "togekiss"     },
  roselia:      { stone: "shinystone",  evolvesTo: "roserade"     },
  murkrow:      { stone: "duskstone",   evolvesTo: "honchkrow"    },
  misdreavus:   { stone: "duskstone",   evolvesTo: "mismagius"    },
  kirlia:       { stone: "dawnstone",   evolvesTo: "gallade"      },
  snorunt:      { stone: "dawnstone",   evolvesTo: "froslass"     },
};

export function getEvolutionByStone(pokemonName, stone) {
  const key = pokemonName.toLowerCase().trim();
  const evo = STONE_EVOLUTIONS[key];
  if (!evo) return null;
  if (Array.isArray(evo)) {
    const match = evo.find((e) => e.stone === stone.toLowerCase());
    return match ? match.evolvesTo : null;
  }
  return evo.stone === stone.toLowerCase() ? evo.evolvesTo : null;
}
