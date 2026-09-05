// lib/naruto/missions.js

export default [
  // D Rank
  {
    id: "find_cat",
    name: "Find the Lost Cat",
    rank: "D",
    minLevel: 1,
    xp: 30,
    ryo: 100,
    duration: 60,
    enemies: []
  },

  {
    id: "deliver_scroll",
    name: "Deliver a Secret Scroll",
    rank: "D",
    minLevel: 2,
    xp: 40,
    ryo: 150,
    duration: 60,
    enemies: ["bandit"]
  },

  // C Rank
  {
    id: "escort_merchant",
    name: "Escort the Merchant",
    rank: "C",
    minLevel: 5,
    xp: 80,
    ryo: 300,
    duration: 120,
    enemies: ["bandit", "rogue_ninja"]
  },

  // B Rank
  {
    id: "rogue_hunt",
    name: "Hunt a Rogue Ninja",
    rank: "B",
    minLevel: 15,
    xp: 180,
    ryo: 700,
    duration: 180,
    enemies: ["missing_nin"]
  },

  // A Rank
  {
    id: "protect_village",
    name: "Protect the Village",
    rank: "A",
    minLevel: 30,
    xp: 500,
    ryo: 2000,
    duration: 300,
    enemies: ["zabuza"]
  },

  // S Rank
  {
    id: "akatsuki_assault",
    name: "Stop the Akatsuki Assault",
    rank: "S",
    minLevel: 50,
    xp: 1500,
    ryo: 6000,
    duration: 600,
    enemies: ["itachi", "pain"]
  }
];