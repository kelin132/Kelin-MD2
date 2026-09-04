export type GymDefinition = {
  id: string;
  name: string;
  type: string;
  leader: string;
  badge: string;
  description: string;
  theme: string;
  accent: string;
  background: string;
  music: string;
  rewardCoins: number;
  rewardXp: number;
  unlockAfter?: string;
  team: GymPokemonDefinition[];
};

export type GymPokemonDefinition = {
  name: string;
  pokedexId: number;
  level: number;
  types: string[];
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  moves: Array<{ name: string; type: string; power: number; accuracy: number; pp: number }>;
};

const animated = (id: number, side: "front" | "back" = "front") =>
  side === "back"
    ? `https://raw.githubusercontent.com/kelin132/animated-pokemon-gifs/master/back/${id}.gif`
    : `https://raw.githubusercontent.com/kelin132/animated-pokemon-gifs/master/${id}.gif`;

const move = (name: string, type: string, power: number) => ({ name, type, power, accuracy: 100, pp: 20 });

export const GYM_DEFINITIONS: GymDefinition[] = [
  {
    id: "tide",
    name: "Tide Gym",
    type: "Water",
    leader: "Mira",
    badge: "Tide Badge",
    description: "A rain-soaked arena where timing beats raw power.",
    theme: "tide",
    accent: "#50d7ff",
    background: "/battle-gym/stadium.webp",
    music: "/battle-music/tide.mp3",
    rewardCoins: 25000,
    rewardXp: 1200,
    team: [
      { name: "Swampert", pokedexId: 260, level: 28, types: ["water", "ground"], maxHp: 180, attack: 92, defense: 88, speed: 65, moves: [move("Water Pulse", "water", 60), move("Mud Shot", "ground", 55)] },
      { name: "Gyarados", pokedexId: 130, level: 30, types: ["water", "flying"], maxHp: 195, attack: 105, defense: 82, speed: 81, moves: [move("Aqua Tail", "water", 90), move("Bite", "dark", 60)] },
      { name: "Lapras", pokedexId: 131, level: 31, types: ["water", "ice"], maxHp: 210, attack: 96, defense: 90, speed: 60, moves: [move("Ice Beam", "ice", 90), move("Water Pulse", "water", 60)] },
      { name: "Kingdra", pokedexId: 230, level: 32, types: ["water", "dragon"], maxHp: 205, attack: 110, defense: 98, speed: 85, moves: [move("Dragon Pulse", "dragon", 85), move("Brine", "water", 65)] },
      { name: "Milotic", pokedexId: 350, level: 33, types: ["water"], maxHp: 225, attack: 102, defense: 105, speed: 86, moves: [move("Surf", "water", 90), move("Ice Beam", "ice", 90)] },
      { name: "Greninja", pokedexId: 658, level: 35, types: ["water", "dark"], maxHp: 215, attack: 120, defense: 86, speed: 122, moves: [move("Water Shuriken", "water", 75), move("Night Slash", "dark", 70)] },
    ],
  },
  {
    id: "ember",
    name: "Ember Gym",
    type: "Fire",
    leader: "Kaida",
    badge: "Ember Badge",
    description: "A volcanic ring where every turn burns brighter.",
    theme: "ember",
    accent: "#ff886c",
    background: "/battle-gym/stadium.webp",
    music: "/battle-music/ember.mp3",
    rewardCoins: 35000,
    rewardXp: 1800,
    unlockAfter: "tide",
    team: [
      { name: "Arcanine", pokedexId: 59, level: 34, types: ["fire"], maxHp: 205, attack: 112, defense: 85, speed: 95, moves: [move("Flame Wheel", "fire", 75), move("Bite", "dark", 60)] },
      { name: "Charizard", pokedexId: 6, level: 36, types: ["fire", "flying"], maxHp: 220, attack: 118, defense: 90, speed: 105, moves: [move("Flamethrower", "fire", 90), move("Dragon Claw", "dragon", 80)] },
      { name: "Ninetales", pokedexId: 38, level: 35, types: ["fire"], maxHp: 190, attack: 104, defense: 86, speed: 100, moves: [move("Fire Blast", "fire", 100), move("Confuse Ray", "ghost", 0)] },
      { name: "Volcarona", pokedexId: 637, level: 37, types: ["bug", "fire"], maxHp: 215, attack: 122, defense: 84, speed: 100, moves: [move("Bug Buzz", "bug", 90), move("Flamethrower", "fire", 90)] },
      { name: "Talonflame", pokedexId: 663, level: 38, types: ["fire", "flying"], maxHp: 200, attack: 126, defense: 78, speed: 126, moves: [move("Brave Bird", "flying", 100), move("Flame Charge", "fire", 50)] },
      { name: "Blaziken", pokedexId: 257, level: 40, types: ["fire", "fighting"], maxHp: 230, attack: 135, defense: 92, speed: 95, moves: [move("Blaze Kick", "fire", 85), move("Brick Break", "fighting", 75)] },
    ],
  },
  {
    id: "voltage",
    name: "Voltage Gym",
    type: "Electric",
    leader: "Volt",
    badge: "Voltage Badge",
    description: "Neon rails, charged platforms, and lightning-fast turns.",
    theme: "voltage",
    accent: "#ffe66d",
    background: "/battle-gym/stadium.webp",
    music: "/battle-music/voltage.mp3",
    rewardCoins: 50000,
    rewardXp: 2400,
    unlockAfter: "ember",
    team: [
      { name: "Luxray", pokedexId: 405, level: 40, types: ["electric"], maxHp: 230, attack: 125, defense: 95, speed: 88, moves: [move("Spark", "electric", 65), move("Crunch", "dark", 80)] },
      { name: "Zeraora", pokedexId: 807, level: 42, types: ["electric"], maxHp: 245, attack: 135, defense: 92, speed: 125, moves: [move("Thunder Punch", "electric", 75), move("Slash", "normal", 70)] },
      { name: "Ampharos", pokedexId: 181, level: 41, types: ["electric"], maxHp: 240, attack: 118, defense: 100, speed: 72, moves: [move("Thunderbolt", "electric", 90), move("Dragon Pulse", "dragon", 85)] },
      { name: "Magnezone", pokedexId: 462, level: 42, types: ["electric", "steel"], maxHp: 250, attack: 125, defense: 128, speed: 60, moves: [move("Flash Cannon", "steel", 80), move("Thunderbolt", "electric", 90)] },
      { name: "Rotom", pokedexId: 479, level: 43, types: ["electric", "ghost"], maxHp: 220, attack: 118, defense: 100, speed: 110, moves: [move("Shock Wave", "electric", 60), move("Shadow Ball", "ghost", 80)] },
      { name: "Electivire", pokedexId: 466, level: 44, types: ["electric"], maxHp: 255, attack: 140, defense: 94, speed: 100, moves: [move("Thunder Punch", "electric", 75), move("Brick Break", "fighting", 75)] },
    ],
  },
  {
    id: "shadow",
    name: "Shadow Gym",
    type: "Ghost",
    leader: "Noctis",
    badge: "Shadow Badge",
    description: "A moonlit ruin filled with illusions and spectral wind.",
    theme: "shadow",
    accent: "#c59bff",
    background: "/battle-gym/stadium.webp",
    music: "/battle-music/shadow.mp3",
    rewardCoins: 75000,
    rewardXp: 3200,
    unlockAfter: "voltage",
    team: [
      { name: "Gengar", pokedexId: 94, level: 46, types: ["ghost", "poison"], maxHp: 235, attack: 120, defense: 85, speed: 118, moves: [move("Shadow Ball", "ghost", 80), move("Sludge Bomb", "poison", 90)] },
      { name: "Dragapult", pokedexId: 887, level: 48, types: ["dragon", "ghost"], maxHp: 250, attack: 140, defense: 92, speed: 142, moves: [move("Dragon Darts", "dragon", 90), move("Phantom Force", "ghost", 100)] },
      { name: "Mimikyu", pokedexId: 778, level: 47, types: ["ghost", "fairy"], maxHp: 220, attack: 126, defense: 98, speed: 105, moves: [move("Shadow Claw", "ghost", 70), move("Play Rough", "fairy", 90)] },
      { name: "Chandelure", pokedexId: 609, level: 48, types: ["ghost", "fire"], maxHp: 235, attack: 135, defense: 92, speed: 100, moves: [move("Shadow Ball", "ghost", 80), move("Flamethrower", "fire", 90)] },
      { name: "Aegislash", pokedexId: 681, level: 49, types: ["steel", "ghost"], maxHp: 255, attack: 145, defense: 135, speed: 60, moves: [move("Iron Head", "steel", 80), move("Shadow Sneak", "ghost", 40)] },
      { name: "Giratina", pokedexId: 487, level: 52, types: ["ghost", "dragon"], maxHp: 290, attack: 152, defense: 140, speed: 90, moves: [move("Shadow Force", "ghost", 100), move("Dragon Claw", "dragon", 80)] },
    ],
  },
  {
    id: "frost",
    name: "Frost Gym",
    type: "Ice",
    leader: "Haku",
    badge: "Frost Badge",
    description: "A crystalline stadium where every mistake becomes a blizzard.",
    theme: "frost",
    accent: "#b8f1ff",
    background: "/battle-gym/stadium.webp",
    music: "/battle-music/frost.mp3",
    rewardCoins: 110000,
    rewardXp: 4800,
    unlockAfter: "shadow",
    team: [
      { name: "Mamoswine", pokedexId: 473, level: 56, types: ["ice", "ground"], maxHp: 310, attack: 168, defense: 125, speed: 80, moves: [move("Icicle Crash", "ice", 95), move("Earthquake", "ground", 100)] },
      { name: "Froslass", pokedexId: 478, level: 57, types: ["ice", "ghost"], maxHp: 245, attack: 150, defense: 105, speed: 125, moves: [move("Ice Beam", "ice", 90), move("Shadow Ball", "ghost", 80)] },
      { name: "Weavile", pokedexId: 461, level: 58, types: ["dark", "ice"], maxHp: 255, attack: 178, defense: 102, speed: 140, moves: [move("Ice Punch", "ice", 75), move("Night Slash", "dark", 70)] },
      { name: "Baxcalibur", pokedexId: 998, level: 60, types: ["dragon", "ice"], maxHp: 330, attack: 185, defense: 140, speed: 98, moves: [move("Icicle Spear", "ice", 85), move("Dragon Claw", "dragon", 80)] },
      { name: "Alolan Ninetales", pokedexId: 38, level: 59, types: ["ice", "fairy"], maxHp: 270, attack: 158, defense: 118, speed: 120, moves: [move("Dazzling Gleam", "fairy", 80), move("Blizzard", "ice", 110)] },
      { name: "Kyurem", pokedexId: 646, level: 62, types: ["dragon", "ice"], maxHp: 360, attack: 205, defense: 158, speed: 105, moves: [move("Glaciate", "ice", 95), move("Dragon Pulse", "dragon", 85)] },
    ],
  },
  {
    id: "dragon",
    name: "Dragon Gym",
    type: "Dragon",
    leader: "Dray",
    badge: "Dragon Badge",
    description: "The final gate before the championship, built for elite trainers only.",
    theme: "dragon",
    accent: "#cf9bff",
    background: "/battle-gym/stadium.webp",
    music: "/battle-music/dragon.mp3",
    rewardCoins: 175000,
    rewardXp: 7200,
    unlockAfter: "frost",
    team: [
      { name: "Dragonite", pokedexId: 149, level: 64, types: ["dragon", "flying"], maxHp: 370, attack: 205, defense: 155, speed: 100, moves: [move("Dragon Claw", "dragon", 80), move("Hurricane", "flying", 95)] },
      { name: "Salamence", pokedexId: 373, level: 65, types: ["dragon", "flying"], maxHp: 360, attack: 215, defense: 145, speed: 125, moves: [move("Dragon Rush", "dragon", 100), move("Fly", "flying", 90)] },
      { name: "Goodra", pokedexId: 706, level: 65, types: ["dragon"], maxHp: 390, attack: 190, defense: 165, speed: 92, moves: [move("Muddy Water", "water", 90), move("Dragon Pulse", "dragon", 85)] },
      { name: "Dragapult", pokedexId: 887, level: 67, types: ["dragon", "ghost"], maxHp: 350, attack: 225, defense: 140, speed: 160, moves: [move("Dragon Darts", "dragon", 90), move("Phantom Force", "ghost", 100)] },
      { name: "Garchomp", pokedexId: 445, level: 68, types: ["dragon", "ground"], maxHp: 380, attack: 230, defense: 165, speed: 125, moves: [move("Earthquake", "ground", 100), move("Dragon Claw", "dragon", 80)] },
      { name: "Rayquaza", pokedexId: 384, level: 72, types: ["dragon", "flying"], maxHp: 450, attack: 260, defense: 190, speed: 145, moves: [move("Dragon Ascent", "flying", 120), move("Outrage", "dragon", 120)] },
    ],
  },
  {
    id: "psychic",
    name: "Psychic Gym",
    type: "Psychic",
    leader: "Selene",
    badge: "Mind Badge",
    description: "A gravity-bending arena where prediction matters more than speed.",
    theme: "psychic",
    accent: "#f08ad8",
    background: "/battle-gym/stadium.webp",
    music: "/battle-music/psychic.mp3",
    rewardCoins: 240000,
    rewardXp: 9800,
    unlockAfter: "dragon",
    team: [
      { name: "Metagross", pokedexId: 376, level: 76, types: ["steel", "psychic"], maxHp: 470, attack: 270, defense: 250, speed: 95, moves: [move("Meteor Mash", "steel", 100), move("Zen Headbutt", "psychic", 80)] },
      { name: "Alakazam", pokedexId: 65, level: 77, types: ["psychic"], maxHp: 330, attack: 285, defense: 115, speed: 180, moves: [move("Psychic", "psychic", 90), move("Focus Blast", "fighting", 120)] },
      { name: "Gardevoir", pokedexId: 282, level: 78, types: ["psychic", "fairy"], maxHp: 390, attack: 260, defense: 155, speed: 125, moves: [move("Moonblast", "fairy", 95), move("Psychic", "psychic", 90)] },
      { name: "Malamar", pokedexId: 687, level: 78, types: ["dark", "psychic"], maxHp: 410, attack: 245, defense: 180, speed: 100, moves: [move("Psycho Cut", "psychic", 70), move("Night Slash", "dark", 70)] },
      { name: "Slowbro", pokedexId: 80, level: 79, types: ["water", "psychic"], maxHp: 520, attack: 220, defense: 270, speed: 45, moves: [move("Psychic", "psychic", 90), move("Scald", "water", 80)] },
      { name: "Mewtwo", pokedexId: 150, level: 82, types: ["psychic"], maxHp: 560, attack: 325, defense: 210, speed: 190, moves: [move("Psystrike", "psychic", 110), move("Aura Sphere", "fighting", 90)] },
    ],
  },
  {
    id: "steel",
    name: "Steel Gym",
    type: "Steel",
    leader: "Forge",
    badge: "Alloy Badge",
    description: "An ironclad trial built to break unprepared teams.",
    theme: "steel",
    accent: "#a9c4d8",
    background: "/battle-gym/stadium.webp",
    music: "/battle-music/steel.mp3",
    rewardCoins: 320000,
    rewardXp: 12500,
    unlockAfter: "psychic",
    team: [
      { name: "Skarmory", pokedexId: 227, level: 83, types: ["steel", "flying"], maxHp: 430, attack: 235, defense: 300, speed: 110, moves: [move("Iron Head", "steel", 80), move("Brave Bird", "flying", 100)] },
      { name: "Excadrill", pokedexId: 530, level: 84, types: ["ground", "steel"], maxHp: 455, attack: 305, defense: 185, speed: 145, moves: [move("Iron Head", "steel", 80), move("Earthquake", "ground", 100)] },
      { name: "Scizor", pokedexId: 212, level: 85, types: ["bug", "steel"], maxHp: 440, attack: 300, defense: 230, speed: 115, moves: [move("Bullet Punch", "steel", 70), move("X-Scissor", "bug", 80)] },
      { name: "Aegislash", pokedexId: 681, level: 86, types: ["steel", "ghost"], maxHp: 470, attack: 310, defense: 290, speed: 80, moves: [move("Iron Head", "steel", 80), move("Shadow Sneak", "ghost", 60)] },
      { name: "Corviknight", pokedexId: 823, level: 87, types: ["flying", "steel"], maxHp: 500, attack: 260, defense: 285, speed: 90, moves: [move("Iron Head", "steel", 80), move("Drill Peck", "flying", 80)] },
      { name: "Melmetal", pokedexId: 809, level: 90, types: ["steel"], maxHp: 650, attack: 360, defense: 320, speed: 55, moves: [move("Double Iron Bash", "steel", 100), move("Rock Slide", "rock", 75)] },
    ],
  },
  {
    id: "apex",
    name: "Apex Gym",
    type: "Champion",
    leader: "Orion",
    badge: "Apex Badge",
    description: "The final gym trial: a mixed team designed for championship contenders.",
    theme: "apex",
    accent: "#ffd36a",
    background: "/battle-gym/stadium.webp",
    music: "/battle-music/apex.mp3",
    rewardCoins: 500000,
    rewardXp: 20000,
    unlockAfter: "steel",
    team: [
      { name: "Tyranitar", pokedexId: 248, level: 92, types: ["rock", "dark"], maxHp: 610, attack: 350, defense: 300, speed: 95, moves: [move("Stone Edge", "rock", 100), move("Crunch", "dark", 80)] },
      { name: "Volcarona", pokedexId: 637, level: 93, types: ["bug", "fire"], maxHp: 500, attack: 320, defense: 210, speed: 150, moves: [move("Fiery Dance", "fire", 80), move("Bug Buzz", "bug", 90)] },
      { name: "Garchomp", pokedexId: 445, level: 94, types: ["dragon", "ground"], maxHp: 590, attack: 355, defense: 270, speed: 165, moves: [move("Earthquake", "ground", 100), move("Dragon Claw", "dragon", 80)] },
      { name: "Zacian", pokedexId: 888, level: 95, types: ["fairy", "steel"], maxHp: 570, attack: 380, defense: 250, speed: 190, moves: [move("Behemoth Blade", "steel", 100), move("Play Rough", "fairy", 90)] },
      { name: "Miraidon", pokedexId: 1008, level: 96, types: ["electric", "dragon"], maxHp: 600, attack: 370, defense: 260, speed: 180, moves: [move("Electro Drift", "electric", 100), move("Dragon Pulse", "dragon", 85)] },
      { name: "Arceus", pokedexId: 493, level: 100, types: ["normal"], maxHp: 720, attack: 420, defense: 360, speed: 200, moves: [move("Judgment", "normal", 120), move("Recover", "normal", 0)] },
    ],
  },
  {
    id: "terra",
    name: "Terra Gym",
    type: "Ground",
    leader: "Gaia",
    badge: "Terra Badge",
    description: "A shifting canyon arena where sturdy teams outlast every storm.",
    theme: "terra",
    accent: "#d7a66a",
    background: "/battle-gym/grassy.webp",
    music: "/battle-music/mus_vs_gym_leader.mp3",
    rewardCoins: 600000,
    rewardXp: 24000,
    unlockAfter: "apex",
    team: [
      { name: "Hippowdon", pokedexId: 450, level: 96, types: ["ground"], maxHp: 620, attack: 360, defense: 150, speed: 70, moves: [move("Earthquake", "ground", 100), move("Stone Edge", "rock", 100)] },
      { name: "Gliscor", pokedexId: 472, level: 97, types: ["ground", "flying"], maxHp: 500, attack: 330, defense: 210, speed: 125, moves: [move("Earthquake", "ground", 100), move("Stone Edge", "rock", 100)] },
      { name: "Mamoswine", pokedexId: 473, level: 98, types: ["ice", "ground"], maxHp: 650, attack: 340, defense: 240, speed: 95, moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)] },
      { name: "Excadrill", pokedexId: 530, level: 99, types: ["ground", "steel"], maxHp: 610, attack: 370, defense: 220, speed: 150, moves: [move("Earthquake", "ground", 100), move("Stone Edge", "rock", 100)] },
      { name: "Groudon", pokedexId: 383, level: 100, types: ["ground"], maxHp: 820, attack: 430, defense: 300, speed: 120, moves: [move("Earthquake", "ground", 100), move("Stone Edge", "rock", 100)] },
      { name: "Landorus", pokedexId: 645, level: 102, types: ["ground", "flying"], maxHp: 760, attack: 420, defense: 330, speed: 145, moves: [move("Earthquake", "ground", 100), move("Stone Edge", "rock", 100)] },
    ],
  },
  {
    id: "toxic",
    name: "Toxic Gym",
    type: "Poison",
    leader: "Vesper",
    badge: "Venom Badge",
    description: "A neon laboratory where status effects and patience decide the match.",
    theme: "toxic",
    accent: "#b5f36c",
    background: "/battle-gym/grassy.webp",
    music: "/battle-music/mus_vs_gym_leader.mp3",
    rewardCoins: 720000,
    rewardXp: 29000,
    unlockAfter: "terra",
    team: [
      { name: "Crobat", pokedexId: 169, level: 104, types: ["poison", "flying"], maxHp: 540, attack: 260, defense: 180, speed: 180, moves: [move("Sludge Bomb", "poison", 90), move("Toxic", "poison", 0)] },
      { name: "Toxtricity", pokedexId: 849, level: 105, types: ["electric", "poison"], maxHp: 590, attack: 320, defense: 210, speed: 135, moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)] },
      { name: "Nidoqueen", pokedexId: 31, level: 106, types: ["poison", "ground"], maxHp: 640, attack: 350, defense: 250, speed: 105, moves: [move("Sludge Bomb", "poison", 90), move("Toxic", "poison", 0)] },
      { name: "Salazzle", pokedexId: 758, level: 107, types: ["poison", "fire"], maxHp: 520, attack: 300, defense: 180, speed: 160, moves: [move("Sludge Bomb", "poison", 90), move("Toxic", "poison", 0)] },
      { name: "Overqwil", pokedexId: 904, level: 108, types: ["dark", "poison"], maxHp: 610, attack: 330, defense: 260, speed: 125, moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)] },
      { name: "Eternatus", pokedexId: 890, level: 110, types: ["poison", "dragon"], maxHp: 900, attack: 460, defense: 390, speed: 160, moves: [move("Sludge Bomb", "poison", 90), move("Toxic", "poison", 0)] },
    ],
  },
  {
    id: "fairy",
    name: "Fairy Gym",
    type: "Fairy",
    leader: "Lumi",
    badge: "Radiant Badge",
    description: "A starlit hall where clever charms punish reckless attacks.",
    theme: "fairy",
    accent: "#ff9edb",
    background: "/battle-gym/grassy.webp",
    music: "/battle-music/mus_vs_gym_leader.mp3",
    rewardCoins: 850000,
    rewardXp: 34000,
    unlockAfter: "toxic",
    team: [
      { name: "Mimikyu", pokedexId: 778, level: 112, types: ["ghost", "fairy"], maxHp: 520, attack: 300, defense: 250, speed: 120, moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)] },
      { name: "Togekiss", pokedexId: 468, level: 113, types: ["fairy", "flying"], maxHp: 620, attack: 320, defense: 280, speed: 115, moves: [move("Moonblast", "fairy", 95), move("Play Rough", "fairy", 90)] },
      { name: "Grimmsnarl", pokedexId: 861, level: 114, types: ["dark", "fairy"], maxHp: 680, attack: 380, defense: 300, speed: 95, moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)] },
      { name: "Azumarill", pokedexId: 184, level: 115, types: ["water", "fairy"], maxHp: 700, attack: 350, defense: 330, speed: 80, moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)] },
      { name: "Sylveon", pokedexId: 700, level: 116, types: ["fairy"], maxHp: 650, attack: 340, defense: 300, speed: 120, moves: [move("Moonblast", "fairy", 95), move("Play Rough", "fairy", 90)] },
      { name: "Xerneas", pokedexId: 716, level: 118, types: ["fairy"], maxHp: 900, attack: 460, defense: 380, speed: 150, moves: [move("Moonblast", "fairy", 95), move("Play Rough", "fairy", 90)] },
    ],
  },
  {
    id: "storm",
    name: "Storm Gym",
    type: "Flying",
    leader: "Aeris",
    badge: "Tempest Badge",
    description: "A sky-platform championship test built for the fastest trainers.",
    theme: "storm",
    accent: "#8fd7ff",
    background: "/battle-gym/grassy.webp",
    music: "/battle-music/mus_vs_gym_leader.mp3",
    rewardCoins: 1000000,
    rewardXp: 40000,
    unlockAfter: "fairy",
    team: [
      { name: "Staraptor", pokedexId: 398, level: 120, types: ["normal", "flying"], maxHp: 560, attack: 300, defense: 240, speed: 150, moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)] },
      { name: "Noivern", pokedexId: 715, level: 121, types: ["flying", "dragon"], maxHp: 580, attack: 320, defense: 220, speed: 175, moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)] },
      { name: "Corviknight", pokedexId: 823, level: 122, types: ["flying", "steel"], maxHp: 700, attack: 360, defense: 400, speed: 100, moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)] },
      { name: "Pelipper", pokedexId: 279, level: 123, types: ["water", "flying"], maxHp: 620, attack: 350, defense: 260, speed: 110, moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)] },
      { name: "Talonflame", pokedexId: 663, level: 124, types: ["fire", "flying"], maxHp: 650, attack: 330, defense: 250, speed: 185, moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)] },
      { name: "Lugia", pokedexId: 249, level: 126, types: ["psychic", "flying"], maxHp: 980, attack: 500, defense: 480, speed: 170, moves: [move("Hurricane", "flying", 110), move("Brave Bird", "flying", 100)] },
    ],
  },
];

export function gymById(id: string) {
  return GYM_DEFINITIONS.find((gym) => gym.id === id) ?? null;
}

export function gymSpriteUrls(pokemon: GymPokemonDefinition) {
  const official = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokedexId}.png`;
  return { imageUrl: official, frontSpriteUrl: animated(pokemon.pokedexId, "front"), backSpriteUrl: animated(pokemon.pokedexId, "back") };
}

export function gymBadgeIds(badges: unknown) {
  return Array.isArray(badges)
    ? badges
        .map(String)
        .map((badge) => badge.trim().toLowerCase().replace(/[-_ ]badge$/i, ""))
        .filter(Boolean)
    : [];
}

export function isGymUnlocked(gym: GymDefinition, badges: unknown) {
  const unlocked = new Set(gymBadgeIds(badges));
  return !gym.unlockAfter || unlocked.has(gym.unlockAfter.toLowerCase());
}

export const gymBadgeId = (gymId: string) => `${gymId}-badge`;

export const gymThemeClass = (gymId: string) => `battle-gym-theme-${gymId}`;

export const gymMusicUrl = (gym: GymDefinition) => gym.music;
