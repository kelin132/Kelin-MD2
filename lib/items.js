// lib/naruto/items.js

export default [
  {
    id: "small_hp_potion",
    name: "Small Health Potion",
    type: "consumable",
    price: 150,
    effect: {
      hp: 50
    },
    description: "Restores 50 HP."
  },

  {
    id: "large_hp_potion",
    name: "Large Health Potion",
    type: "consumable",
    price: 400,
    effect: {
      hp: 150
    },
    description: "Restores 150 HP."
  },

  {
    id: "chakra_potion",
    name: "Chakra Potion",
    type: "consumable",
    price: 250,
    effect: {
      chakra: 75
    },
    description: "Restores 75 Chakra."
  },

  {
    id: "soldier_pill",
    name: "Soldier Pill",
    type: "consumable",
    price: 500,
    effect: {
      hp: 100,
      chakra: 100
    },
    description: "Restores both HP and Chakra."
  },

  {
    id: "kunai",
    name: "Kunai",
    type: "weapon",
    price: 200,
    attack: 5,
    description: "A basic ninja weapon."
  },

  {
    id: "shuriken",
    name: "Shuriken",
    type: "weapon",
    price: 300,
    attack: 8,
    description: "A sharp throwing weapon."
  },

  {
    id: "explosive_tag",
    name: "Explosive Tag",
    type: "battle",
    price: 600,
    damage: 100,
    description: "Deals massive battle damage."
  },

  {
    id: "scroll_of_knowledge",
    name: "Scroll of Knowledge",
    type: "special",
    price: 2000,
    xp: 500,
    description: "Instantly grants 500 XP."
  }
];