// plugins/pets/adopt.js
// .adopt — Get your first pet (free starter, one-time)
import { getAllPets, createPet } from "../../lib/petDatabase.js";
import { PET_SPECIES, RARITIES } from "../../lib/petData.js";

const STARTER_SPECIES = ["cat", "dog", "bunny", "fox"];

async function fetchNekoImage(imgCat) {
  try {
    const res  = await fetch(`https://nekos.best/api/v2/${imgCat}?amount=1`);
    const json = await res.json();
    return json.results?.[0]?.url || null;
  } catch {
    return null;
  }
}

export default {
  name: "adopt",
  description: "Get your first pet for free",
  category: "pets",
  usage: ".adopt <cat|dog|bunny|fox>",
  aliases: ["getpet"],
  checkJail: true,

  async run({ sock, msg, text }) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    // Check if user already has pets
    const existing = await getAllPets(sender);
    if (existing.length > 0) {
      return sock.sendMessage(jid, {
        text: `🐾 You already have a pet!\n\nUse *.pets* to see your pets or *.hatch* to get more.`,
      }, { quoted: msg });
    }

    const choice = (text || "").trim().toLowerCase();
    if (!choice || !STARTER_SPECIES.includes(choice)) {
      const list = STARTER_SPECIES
        .map(s => `• *${s}* — ${PET_SPECIES[s].name} (${RARITIES[PET_SPECIES[s].rarity].label})`)
        .join("\n");
      return sock.sendMessage(jid, {
        text: `🐾 *PET ADOPTION*\n\nChoose your starter companion:\n\n${list}\n\nUsage: *.adopt <name>*\nExample: *.adopt cat*`,
      }, { quoted: msg });
    }

    const sp       = PET_SPECIES[choice];
    const imageUrl = await fetchNekoImage(sp.imgCat);

    const pet = await createPet(sender, choice, imageUrl || "", true);

    const caption = [
      `🐾 *WELCOME YOUR NEW PET!*`,
      ``,
      `${RARITIES[pet.rarity].color} *${pet.name}*`,
      `📖 Species: ${sp.name} | ⭐ Rarity: ${RARITIES[pet.rarity].label}`,
      ``,
      `❤️ HP: ${pet.maxHp}   ⚔️ ATK: ${pet.attack}`,
      `🛡 DEF: ${pet.defense}  ⚡ SPD: ${pet.speed}`,
      ``,
      `🍖 Hunger: 100%  😊 Happiness: 100%`,
      `✨ Level 1  |  🎁 Skill: *${pet.skill}*`,
      ``,
      `Use *.pet* to view your companion!`,
      `Use *.feed* and *.play* to keep them happy!`,
    ].join("\n");

    if (imageUrl) {
      return sock.sendMessage(jid, { image: { url: imageUrl }, caption }, { quoted: msg });
    }
    return sock.sendMessage(jid, { text: caption }, { quoted: msg });
  },
};
