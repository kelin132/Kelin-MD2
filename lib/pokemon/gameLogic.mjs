/**
 * KELIN MD — Pokémon game logic
 * Battle calculations, catch rates, moves, type effectiveness
 */

// ── Move pools by type (8 moves each: first 6 are starter moves, 7-8 are level-up learnable) ─────
export const TYPE_MOVES = {
  fire: [
    { name:"Ember",         pp:25, power:40,  type:"fire",     desc:"A weak flaming attack. May leave the foe with a burn." },
    { name:"Flame Wheel",   pp:25, power:60,  type:"fire",     desc:"The user rolls wrapped in flames, crashing into the foe." },
    { name:"Fire Spin",     pp:15, power:35,  type:"fire",     desc:"Traps the foe inside a whirling vortex of fire for 2–5 turns." },
    { name:"Flamethrower",  pp:15, power:95,  type:"fire",     desc:"A powerful stream of fire that may inflict a burn." },
    { name:"Heat Wave",     pp:10, power:95,  type:"fire",     desc:"Scorching hot air is blasted at the foe. May leave a burn." },
    { name:"Fire Blast",    pp:5,  power:120, type:"fire",     desc:"A massive explosion of fire. High chance of leaving a burn." },
    { name:"Overheat",      pp:5,  power:130, type:"fire",     desc:"An overwhelming heat attack. Sharply lowers Sp. Atk after." },
    { name:"Blast Burn",    pp:5,  power:150, type:"fire",     desc:"The ultimate fire move. The user must rest after using it." },
  ],
  water: [
    { name:"Water Gun",     pp:25, power:40,  type:"water",    desc:"The foe is attacked with a jet of water." },
    { name:"Bubble Beam",   pp:20, power:65,  type:"water",    desc:"A spray of bubbles that may lower the foe's Speed." },
    { name:"Aqua Tail",     pp:10, power:90,  type:"water",    desc:"The user attacks by swinging its tail like a huge wave." },
    { name:"Surf",          pp:15, power:95,  type:"water",    desc:"A huge wave crashes over the foe. Hits all adjacent foes." },
    { name:"Hydro Pump",    pp:5,  power:120, type:"water",    desc:"Blasts water at high pressure. Very powerful but less accurate." },
    { name:"Aqua Jet",      pp:20, power:40,  type:"water",    desc:"The user lunges at the foe at a speed that defies space, always strikes first." },
    { name:"Waterfall",     pp:15, power:80,  type:"water",    desc:"The user charges at the foe with great force. May cause flinching." },
    { name:"Origin Pulse",  pp:10, power:110, type:"water",    desc:"Legendary water pulses that attack all adjacent foes at once." },
  ],
  electric: [
    { name:"Thunder Shock", pp:30, power:40,  type:"electric", desc:"A jolt of electricity that may paralyze the foe." },
    { name:"Spark",         pp:20, power:65,  type:"electric", desc:"A flare of electricity that may paralyze the foe." },
    { name:"Thunderbolt",   pp:15, power:95,  type:"electric", desc:"A strong electric blast. May leave the foe paralyzed." },
    { name:"Discharge",     pp:15, power:80,  type:"electric", desc:"A burst of electrical energy that hits all nearby foes." },
    { name:"Thunder",       pp:10, power:120, type:"electric", desc:"A massive lightning strike. May cause paralysis." },
    { name:"Volt Tackle",   pp:15, power:120, type:"electric", desc:"A reckless full-body charge. The user takes some recoil damage." },
    { name:"Thunder Wave",  pp:20, power:0,   type:"electric", desc:"A weak electric charge paralyzes the foe, halving its speed." },
    { name:"Bolt Strike",   pp:5,  power:130, type:"electric", desc:"An overwhelming lightning strike with possible paralysis." },
  ],
  grass: [
    { name:"Vine Whip",     pp:25, power:45,  type:"grass",    desc:"The foe is struck with slender, whip-like vines." },
    { name:"Razor Leaf",    pp:25, power:55,  type:"grass",    desc:"Sharp leaves are fired in a hail storm. High critical-hit ratio." },
    { name:"Giga Drain",    pp:10, power:75,  type:"grass",    desc:"A powerful draining move. Restores half the HP inflicted." },
    { name:"Energy Ball",   pp:10, power:90,  type:"grass",    desc:"A ball of nature's energy. May lower the foe's Sp. Def." },
    { name:"Solar Beam",    pp:10, power:120, type:"grass",    desc:"Absorbs light one turn, then fires a powerful beam the next." },
    { name:"Leaf Storm",    pp:5,  power:130, type:"grass",    desc:"Razor-sharp leaves are hurled. Sharply lowers Sp. Atk after." },
    { name:"Petal Blizzard",pp:15, power:90,  type:"grass",    desc:"Stirring up a storm of petals, the user attacks." },
    { name:"Frenzy Plant",  pp:5,  power:150, type:"grass",    desc:"The ultimate grass move. The user must rest after using it." },
  ],
  ice: [
    { name:"Ice Shard",     pp:30, power:40,  type:"ice",      desc:"The user shoots a chunk of ice extremely fast. Always strikes first." },
    { name:"Frost Breath",  pp:10, power:60,  type:"ice",      desc:"Cold air is exhaled at the foe. Always results in a critical hit." },
    { name:"Ice Beam",      pp:10, power:95,  type:"ice",      desc:"A freezing beam of ice crystals. May freeze the foe." },
    { name:"Aurora Beam",   pp:20, power:65,  type:"ice",      desc:"The foe is hit with a rainbow-colored beam. May lower Attack." },
    { name:"Blizzard",      pp:5,  power:120, type:"ice",      desc:"A howling blizzard is summoned. May freeze the foe." },
    { name:"Sheer Cold",    pp:5,  power:0,   type:"ice",      desc:"An absolute-zero attack that may cause the foe to faint outright." },
    { name:"Freeze-Dry",    pp:20, power:70,  type:"ice",      desc:"Very effective against Water types. May freeze the foe." },
    { name:"Glaciate",      pp:10, power:65,  type:"ice",      desc:"The user attacks by blowing high-powered freezing air at the foe." },
  ],
  fighting: [
    { name:"Karate Chop",   pp:25, power:50,  type:"fighting", desc:"A sharp chop. High critical-hit ratio." },
    { name:"Low Kick",      pp:20, power:50,  type:"fighting", desc:"A swift kick that makes the foe fall. Heavier foes take more damage." },
    { name:"Brick Break",   pp:15, power:75,  type:"fighting", desc:"A hard punch that smashes barriers and inflicts damage." },
    { name:"Drain Punch",   pp:10, power:75,  type:"fighting", desc:"An energy-draining punch. The user restores half the HP inflicted." },
    { name:"Close Combat",  pp:5,  power:120, type:"fighting", desc:"The user fights the foe in a close range. Lowers Defense and Sp. Def." },
    { name:"Superpower",    pp:5,  power:120, type:"fighting", desc:"The user attacks with great power. Lowers Attack and Defense." },
    { name:"Focus Blast",   pp:5,  power:120, type:"fighting", desc:"A blast of power from the user. May lower the foe's Sp. Def." },
    { name:"Sky Uppercut",  pp:15, power:85,  type:"fighting", desc:"The user attacks with an uppercut that even hits airborne foes." },
  ],
  poison: [
    { name:"Poison Sting",  pp:35, power:15,  type:"poison",   desc:"The foe is stabbed with a toxic barb. May poison the foe." },
    { name:"Acid",          pp:30, power:40,  type:"poison",   desc:"The foe is attacked with a spray of harsh acid. May lower Sp. Def." },
    { name:"Venoshock",     pp:10, power:65,  type:"poison",   desc:"Drenches the foe in a special liquid. Double power if foe is poisoned." },
    { name:"Sludge Bomb",   pp:10, power:90,  type:"poison",   desc:"Unsanitary sludge is hurled at the foe. May also poison the foe." },
    { name:"Gunk Shot",     pp:5,  power:120, type:"poison",   desc:"Filthy garbage is hurled at the foe. May also poison the foe." },
    { name:"Cross Poison",  pp:20, power:70,  type:"poison",   desc:"A slashing attack that may poison the foe. High critical-hit ratio." },
    { name:"Poison Jab",    pp:20, power:80,  type:"poison",   desc:"The foe is stabbed with a tentacle. May also poison the foe." },
    { name:"Belch",         pp:10, power:120, type:"poison",   desc:"The user lets out a damaging belch. Must have eaten a Berry first." },
  ],
  ground: [
    { name:"Mud Slap",      pp:10, power:20,  type:"ground",   desc:"Hurls mud in the foe's face to lower its accuracy." },
    { name:"Dig",           pp:10, power:80,  type:"ground",   desc:"Digs underground the first turn, then attacks the second turn." },
    { name:"Earth Power",   pp:10, power:90,  type:"ground",   desc:"The user makes the ground erupt with power. May lower Sp. Def." },
    { name:"Earthquake",    pp:10, power:100, type:"ground",   desc:"Powerful quakes that hit all foes on the ground." },
    { name:"Bulldoze",      pp:20, power:60,  type:"ground",   desc:"The user stomps down on the ground. Lowers Speed of everyone hit." },
    { name:"Fissure",       pp:5,  power:0,   type:"ground",   desc:"An absolute-split attack that may cause the foe to faint outright." },
    { name:"High Horsepower",pp:10,power:95,  type:"ground",   desc:"The user attacks the foe with great force." },
    { name:"Precipice Blades",pp:10,power:120,type:"ground",   desc:"The user attacks using sharp blades of stone from the ground." },
  ],
  flying: [
    { name:"Gust",          pp:35, power:40,  type:"flying",   desc:"Strikes the foe with a gust of wind." },
    { name:"Wing Attack",   pp:35, power:60,  type:"flying",   desc:"The foe is struck with large, clashing wings." },
    { name:"Aerial Ace",    pp:20, power:60,  type:"flying",   desc:"An extremely fast attack that cannot be evaded." },
    { name:"Air Slash",     pp:15, power:75,  type:"flying",   desc:"An attack with a blade of air that may cause flinching." },
    { name:"Brave Bird",    pp:15, power:120, type:"flying",   desc:"A reckless, full-power rush that also hurts the user." },
    { name:"Sky Attack",    pp:5,  power:140, type:"flying",   desc:"A powerful sky attack that may cause flinching." },
    { name:"Hurricane",     pp:10, power:110, type:"flying",   desc:"Powerful winds that may confuse the foe." },
    { name:"Oblivion Wing", pp:10, power:80,  type:"flying",   desc:"The user absorbs the foe's energy, restoring HP equal to ¾ dealt." },
  ],
  psychic: [
    { name:"Confusion",     pp:25, power:50,  type:"psychic",  desc:"A telepathic attack that may cause confusion." },
    { name:"Psybeam",       pp:20, power:65,  type:"psychic",  desc:"The foe is attacked with a peculiar ray. May cause confusion." },
    { name:"Psychic",       pp:10, power:90,  type:"psychic",  desc:"The foe is hit by a strong telekinetic force. May lower Sp. Def." },
    { name:"Psystrike",     pp:10, power:100, type:"psychic",  desc:"Creates a peculiar pulse that attacks the foe's physical side." },
    { name:"Future Sight",  pp:10, power:120, type:"psychic",  desc:"Two turns after this move, the foe takes psychic damage." },
    { name:"Zen Headbutt",  pp:15, power:80,  type:"psychic",  desc:"The user focuses its willpower and rams the foe. May cause flinching." },
    { name:"Psycho Boost",  pp:5,  power:140, type:"psychic",  desc:"An overwhelming psychic blast. Sharply lowers Sp. Atk after." },
    { name:"Dream Eater",   pp:15, power:100, type:"psychic",  desc:"Eats the dreams of a sleeping foe. Restores HP equal to ½ damage." },
  ],
  bug: [
    { name:"Bug Bite",      pp:20, power:60,  type:"bug",      desc:"The user bites the foe. If the foe holds a Berry, the user eats it." },
    { name:"Leech Life",    pp:10, power:80,  type:"bug",      desc:"The user drains the foe's blood. The user's HP is restored by half the damage dealt." },
    { name:"Signal Beam",   pp:15, power:75,  type:"bug",      desc:"The user attacks with a sinister beam. May cause confusion." },
    { name:"X-Scissor",     pp:15, power:80,  type:"bug",      desc:"The user slashes at the foe by crossing its scythes or claws." },
    { name:"Bug Buzz",      pp:10, power:90,  type:"bug",      desc:"The user generates a damaging sound wave. May lower Sp. Def." },
    { name:"Megahorn",      pp:10, power:120, type:"bug",      desc:"A brutal headbutt using a long, hard horn. Very powerful." },
    { name:"First Impression",pp:10,power:90, type:"bug",      desc:"Very high priority. Only works on the first turn after switching in." },
    { name:"Lunge",         pp:15, power:80,  type:"bug",      desc:"The user makes a lunge at the foe, lowering the foe's Attack stat." },
  ],
  rock: [
    { name:"Rock Throw",    pp:15, power:50,  type:"rock",     desc:"The user picks up and throws a small boulder at the foe." },
    { name:"Rock Slide",    pp:10, power:75,  type:"rock",     desc:"Large boulders are hurled. May cause the foe to flinch." },
    { name:"Power Gem",     pp:20, power:80,  type:"rock",     desc:"The user attacks with a ray of light that sparkles as if it were made of gemstones." },
    { name:"Stone Edge",    pp:5,  power:100, type:"rock",     desc:"Stabs the foe with a sharp stone. High critical-hit ratio." },
    { name:"Rock Wrecker",  pp:5,  power:150, type:"rock",     desc:"The user launches a huge boulder at the foe. Must rest after." },
    { name:"Head Smash",    pp:5,  power:150, type:"rock",     desc:"A reckless, life-risking tackle. The user also takes heavy recoil." },
    { name:"Smack Down",    pp:15, power:50,  type:"rock",     desc:"Throws a stone to knock the foe down to the ground." },
    { name:"Ancient Power", pp:5,  power:60,  type:"rock",     desc:"An attack using primitive power. May raise all the user's stats." },
  ],
  ghost: [
    { name:"Shadow Sneak",  pp:30, power:40,  type:"ghost",    desc:"The user extends its shadow and attacks at increased priority." },
    { name:"Hex",           pp:10, power:65,  type:"ghost",    desc:"This move inflicts double damage on a foe with a status problem." },
    { name:"Night Shade",   pp:15, power:0,   type:"ghost",    desc:"The user makes the foe see a frightening mirage. Deals damage equal to the user's level." },
    { name:"Shadow Ball",   pp:15, power:80,  type:"ghost",    desc:"A sinister shadow ball is hurled. May lower the foe's Sp. Def." },
    { name:"Shadow Force",  pp:5,  power:120, type:"ghost",    desc:"Vanishes the first turn, then strikes the second. Bypasses Protect." },
    { name:"Spectral Thief",pp:10, power:90,  type:"ghost",    desc:"The user lurks in the foe's shadow and steals the foe's stat boosts." },
    { name:"Phantom Force", pp:10, power:90,  type:"ghost",    desc:"Disappears first turn, strikes second. Bypasses Protect and Detect." },
    { name:"Never-Ending Nightmare",pp:5,power:140,type:"ghost",desc:"Deep, abyssal darkness envelops the foe." },
  ],
  dragon: [
    { name:"Dragon Breath", pp:20, power:60,  type:"dragon",   desc:"Exhales a damaging breath. May paralyze the foe." },
    { name:"Dragon Claw",   pp:15, power:80,  type:"dragon",   desc:"The user slashes at the foe with sharp claws." },
    { name:"Dragon Pulse",  pp:10, power:85,  type:"dragon",   desc:"A powerful pulse of draconic energy. Never misses." },
    { name:"Outrage",       pp:10, power:120, type:"dragon",   desc:"A rampage of 2–3 turns. The user gets confused afterward." },
    { name:"Dragon Rush",   pp:10, power:100, type:"dragon",   desc:"The user tackles the foe while exhibiting overwhelming menace." },
    { name:"Draco Meteor",  pp:5,  power:130, type:"dragon",   desc:"Comets are summoned from the sky. Sharply lowers Sp. Atk after." },
    { name:"Spacial Rend",  pp:5,  power:100, type:"dragon",   desc:"Tears the foe apart with special power. High critical-hit ratio." },
    { name:"Roar of Time",  pp:5,  power:150, type:"dragon",   desc:"The ultimate dragon move. The user must rest after." },
  ],
  dark: [
    { name:"Bite",          pp:25, power:60,  type:"dark",     desc:"The foe is bitten with viciously sharp fangs. May cause flinching." },
    { name:"Feint Attack",  pp:20, power:60,  type:"dark",     desc:"The user approaches the foe with a feint. Never misses." },
    { name:"Dark Pulse",    pp:15, power:80,  type:"dark",     desc:"Releases a horrible aura imbued with dark thoughts. May cause flinching." },
    { name:"Crunch",        pp:15, power:80,  type:"dark",     desc:"The user crunches up the foe with sharp fangs. May lower Defense." },
    { name:"Night Daze",    pp:10, power:85,  type:"dark",     desc:"The user lets loose a pitch-black shock wave. May lower Accuracy." },
    { name:"Foul Play",     pp:15, power:95,  type:"dark",     desc:"Turns the foe's strength against it. Uses foe's Attack stat." },
    { name:"Payback",       pp:10, power:50,  type:"dark",     desc:"If the user moves after the foe, this attack's power is doubled." },
    { name:"Hyperspace Fury",pp:5, power:100, type:"dark",     desc:"Unleashes a barrage of attacks. Lowers user's Defense." },
  ],
  steel: [
    { name:"Metal Claw",    pp:35, power:50,  type:"steel",    desc:"The foe is raked with steel claws. May raise the user's Attack." },
    { name:"Iron Head",     pp:15, power:80,  type:"steel",    desc:"The user rams the foe with its steel-hard head. May cause flinching." },
    { name:"Flash Cannon",  pp:10, power:80,  type:"steel",    desc:"Gathers all light and releases it at once. May lower Sp. Def." },
    { name:"Iron Tail",     pp:15, power:100, type:"steel",    desc:"A steel-hard tail is slammed against the foe. May lower Defense." },
    { name:"Steel Beam",    pp:5,  power:140, type:"steel",    desc:"The user fires a beam of steel. The user loses half their HP." },
    { name:"Meteor Mash",   pp:10, power:90,  type:"steel",    desc:"A ramming attack similar to a comet. May raise Attack." },
    { name:"Gyro Ball",     pp:5,  power:0,   type:"steel",    desc:"A gyrating tackle that does more damage the slower the user is." },
    { name:"Doom Desire",   pp:5,  power:140, type:"steel",    desc:"Two turns later, a concentrated bundle of light blasts the foe." },
  ],
  fairy: [
    { name:"Fairy Wind",    pp:30, power:40,  type:"fairy",    desc:"The user stirs up a fairy wind and attacks the foe with it." },
    { name:"Disarming Voice",pp:15,power:40,  type:"fairy",    desc:"Lets out a charming cry that never misses." },
    { name:"Dazzling Gleam",pp:10, power:80,  type:"fairy",    desc:"A powerful flash of light that hits all foes at once." },
    { name:"Play Rough",    pp:10, power:90,  type:"fairy",    desc:"Plays rough with the foe. May lower Attack." },
    { name:"Moonblast",     pp:15, power:95,  type:"fairy",    desc:"Borrowing the power of the moon, the user attacks. May lower Sp. Atk." },
    { name:"Light of Ruin", pp:5,  power:140, type:"fairy",    desc:"Drawing power from the Eternal Flower, the user fires an energy beam." },
    { name:"Sparkling Aria",pp:10, power:90,  type:"fairy",    desc:"The user bursts into song, showering the foe with notes." },
    { name:"Misty Explosion",pp:5, power:100, type:"fairy",    desc:"The user explodes with all the power of Misty Terrain." },
  ],
  normal: [
    { name:"Tackle",        pp:35, power:40,  type:"normal",   desc:"A physical attack that charges the foe with full-body contact." },
    { name:"Quick Attack",  pp:30, power:40,  type:"normal",   desc:"A lightning-fast move that always strikes first." },
    { name:"Body Slam",     pp:15, power:85,  type:"normal",   desc:"A full-body tackle. May paralyze the foe." },
    { name:"Hyper Voice",   pp:10, power:90,  type:"normal",   desc:"A loud, forceful attack using powerful sound waves." },
    { name:"Hyper Beam",    pp:5,  power:150, type:"normal",   desc:"The most powerful normal attack. The user must rest after." },
    { name:"Facade",        pp:20, power:70,  type:"normal",   desc:"A powerful attack that does double damage when user has a status problem." },
    { name:"Extreme Speed", pp:5,  power:80,  type:"normal",   desc:"An extremely fast and powerful attack. Always goes first." },
    { name:"Boomburst",     pp:10, power:140, type:"normal",   desc:"The user attacks everything with an explosive sound wave." },
  ],
};

/**
 * Returns the 6 starter moves for a Pokémon given its primary type.
 */
export function getMovesForType(primaryType, allTypes = []) {
  const pool = TYPE_MOVES[primaryType] || TYPE_MOVES.normal;
  return pool.slice(0, 6);
}

/**
 * Returns a new learnable move at certain level milestones.
 * Returns null if no new move is available.
 */
export function getLearnableMoveAtLevel(primaryType, level, currentMoves = []) {
  const milestones = [10, 15, 20, 25, 30, 35, 40, 50, 60, 75, 100];
  if (!milestones.includes(level)) return null;

  const pool = TYPE_MOVES[primaryType] || TYPE_MOVES.normal;
  const currentNames = new Set(currentMoves.map((m) => m.name));
  // Level-up candidates are moves 7-8 (index 6-7) plus any from the pool the pokemon doesn't have
  const candidates = pool.filter((m) => !currentNames.has(m.name));

  if (candidates.length === 0) return null;

  // Pick based on level: higher levels give stronger moves
  const sorted = [...candidates].sort((a, b) => (b.power || 0) - (a.power || 0));
  const idx = level >= 40 ? 0 : level >= 20 ? Math.floor(sorted.length / 2) : sorted.length - 1;
  return sorted[Math.min(idx, sorted.length - 1)];
}

// ── Type emoji map ────────────────────────────────────────────────────────────
export const TYPE_EMOJIS = {
  fire:"🔥", water:"💧", grass:"🍃", electric:"⚡", psychic:"🔮",
  normal:"⭐", flying:"🌤️", bug:"🐛", poison:"☠️", rock:"🪨", ground:"🌍",
  ice:"❄️", fighting:"🥊", ghost:"👻", dragon:"🐉", dark:"🌑", steel:"⚙️", fairy:"🌸",
};

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
  quickball:   0.50,
  duskball:    0.40,
  nestball:    0.35,
  healball:    0.30,
  timerball:   0.45,
  luxuryball:  0.30,
};

export function tryCatch(ballType, wildPokemon) {
  const rate = POKEBALL_CATCH_RATES[ballType] || 0.30;
  const hpFactor = wildPokemon.hp / wildPokemon.maxHp;
  const catchRate = rate * (1 - hpFactor * 0.5);
  const roll = Math.random();
  return { success: roll < catchRate, roll, catchRate };
}

// ── XP reward from battle ─────────────────────────────────────────────────────
export function xpReward(opponentPokemon) {
  return Math.floor(opponentPokemon.level * 30 + Math.random() * 20);
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
