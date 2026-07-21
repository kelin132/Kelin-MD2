// plugins/pets/adopt.js
// .adopt — Get your first pet (free starter, one-time)
import { getAllPets, createPet } from "../../lib/petDatabase.js";
import { PET_SPECIES, RARITIES } from "../../lib/petData.js";

const STARTER_SPECIES = ["cat", "dog", "bunny", "fox", "moon_cat", "sakura_bunny", "fire_slime"];

export default {
  name: "adopt",
  description: "Get your first pet for free",
  category: "pets",
  usage: ".adopt <species>",
  aliases: ["getpet"],
  checkJail: true,

  async run({ sock, msg, text }) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const existing = await getAllPets(sender);
    if (existing.length > 0) {
      return sock.sendMessage(jid, {
        text: `🐾 You already have a pet!\n\nUse *.pets* to see your pets or *.hatch* to get more.`,
      }, { quoted: msg });
    }

    const choice = (text || "").trim().toLowerCase().replace(/\s+/g, "_");

    if (!choice || !STARTER_SPECIES.includes(choice)) {
      const list = STARTER_SPECIES.map(s => {
        const sp = PET_SPECIES[s];
        return `• *${s}* — ${sp.name} (${RARITIES[sp.rarity].label})`;
      }).join("\n");
      return sock.sendMessage(jid, {
        text: `🐾 *PET ADOPTION*\n\nChoose your starter companion:\n\n${list}\n\nUsage: *.adopt <name>*\nExample: *.adopt cat*`,
      }, { quoted: msg });
    }

    const sp  = PET_SPECIES[choice];
    const pet = await createPet(sender, choice, "", true);
    const rarity = RARITIES[pet.rarity];

    return sock.sendMessage(jid, {
      text: [
        `🐾 *WELCOME YOUR NEW PET!*`,
        ``,
        `${rarity.color} *${pet.name}*`,
        `📖 Species: ${sp.name}`,
        `⭐ Rarity: ${rarity.label}`,
        ``,
        `❤️ HP: ${pet.maxHp}   ⚔️ ATK: ${pet.attack}`,
        `🛡 DEF: ${pet.defense}  ⚡ SPD: ${pet.speed}`,
        ``,
        `🍖 Hunger: 100%  😊 Happiness: 100%`,
        `✨ Level 1  |  🎁 Skill: *${pet.skill}*`,
        ``,
        `Use *.pet* to view your companion!`,
        `Use *.feed* and *.play* to keep them happy!`,
      ].join("\n"),
    }, { quoted: msg });
  },
};
