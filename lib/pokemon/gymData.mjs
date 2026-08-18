export const GYMS = [
  {
    id: "tide",
    name: "Tide Gym",
    type: "Water",
    leader: "Mira",
    badge: "Tide Badge",
    description: "A rain-soaked arena where timing beats raw power.",
    theme: "tide",
    accent: "#50d7ff",
    background: "/battle-gym/tide.webp",
    music: "/battle-music/tide.mp3",
    rewardCoins: 25000,
    rewardXp: 1200,
    team: [
      { name: "swampert", pokedexId: 260, level: 28, types: ["water", "ground"], maxHp: 180, attack: 92, defense: 88, speed: 65, moves: [{ name: "Water Pulse", type: "water", power: 60, accuracy: 100, pp: 20 }, { name: "Mud Shot", type: "ground", power: 55, accuracy: 100, pp: 20 }] },
      { name: "gyarados", pokedexId: 130, level: 30, types: ["water", "flying"], maxHp: 195, attack: 105, defense: 82, speed: 81, moves: [{ name: "Aqua Tail", type: "water", power: 90, accuracy: 100, pp: 20 }, { name: "Bite", type: "dark", power: 60, accuracy: 100, pp: 20 }] },
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
    background: "/battle-gym/ember.webp",
    music: "/battle-music/ember.mp3",
    rewardCoins: 35000,
    rewardXp: 1800,
    unlockAfter: "tide",
    team: [
      { name: "arcanine", pokedexId: 59, level: 34, types: ["fire"], maxHp: 205, attack: 112, defense: 85, speed: 95, moves: [{ name: "Flame Wheel", type: "fire", power: 75, accuracy: 100, pp: 20 }, { name: "Bite", type: "dark", power: 60, accuracy: 100, pp: 20 }] },
      { name: "charizard", pokedexId: 6, level: 36, types: ["fire", "flying"], maxHp: 220, attack: 118, defense: 90, speed: 105, moves: [{ name: "Flamethrower", type: "fire", power: 90, accuracy: 100, pp: 20 }, { name: "Dragon Claw", type: "dragon", power: 80, accuracy: 100, pp: 20 }] },
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
    background: "/battle-gym/voltage.webp",
    music: "/battle-music/voltage.mp3",
    rewardCoins: 50000,
    rewardXp: 2400,
    unlockAfter: "ember",
    team: [
      { name: "luxray", pokedexId: 405, level: 40, types: ["electric"], maxHp: 230, attack: 125, defense: 95, speed: 88, moves: [{ name: "Spark", type: "electric", power: 65, accuracy: 100, pp: 20 }, { name: "Crunch", type: "dark", power: 80, accuracy: 100, pp: 20 }] },
      { name: "zeraora", pokedexId: 807, level: 42, types: ["electric"], maxHp: 245, attack: 135, defense: 92, speed: 125, moves: [{ name: "Thunder Punch", type: "electric", power: 75, accuracy: 100, pp: 20 }, { name: "Slash", type: "normal", power: 70, accuracy: 100, pp: 20 }] },
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
    background: "/battle-gym/shadow.webp",
    music: "/battle-music/shadow.mp3",
    rewardCoins: 75000,
    rewardXp: 3200,
    unlockAfter: "voltage",
    team: [
      { name: "gengar", pokedexId: 94, level: 46, types: ["ghost", "poison"], maxHp: 235, attack: 120, defense: 85, speed: 118, moves: [{ name: "Shadow Ball", type: "ghost", power: 80, accuracy: 100, pp: 20 }, { name: "Sludge Bomb", type: "poison", power: 90, accuracy: 100, pp: 20 }] },
      { name: "dragapult", pokedexId: 887, level: 48, types: ["dragon", "ghost"], maxHp: 250, attack: 140, defense: 92, speed: 142, moves: [{ name: "Dragon Darts", type: "dragon", power: 90, accuracy: 100, pp: 20 }, { name: "Phantom Force", type: "ghost", power: 100, accuracy: 100, pp: 20 }] },
    ],
  },
];

export function gymById(id) {
  return GYMS.find((gym) => gym.id === String(id).toLowerCase()) || null;
}

export function gymBadgeId(id) {
  return `${id}-badge`;
}
