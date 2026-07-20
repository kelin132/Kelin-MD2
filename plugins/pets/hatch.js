// plugins/pets/hatch.js
// .hatch — Hatch a random egg into a pet
import { getAllPets, createPet } from "../../lib/petDatabase.js";
import { rollRarity, pickSpecies, PET_SPECIES, RARITIES } from "../../lib/petData.js";

const MAX_PETS = 5;
const EGG_COST = 500; // Placeholder — integrate with economy if desired

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
  name: "hatch",
  description: "Hatch a random egg into a new pet",
  category: "pets",
  usage: ".hatch",
  aliases: ["hatchegg", "openegg"],
  checkJail: true,

  async run({ sock, msg }) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const all = await getAllPets(sender);
    if (all.length >= MAX_PETS) {
      return sock.sendMessage(jid, {
        text: `🥚 You've reached the max of *${MAX_PETS} pets*!\n\nUse *.release <ID>* to release one first.`,
      }, { quoted: msg });
    }

    // Hatch animation
    await sock.sendMessage(jid, {
      text: `🥚 *Hatching your egg...*\n\n✨ Craaaack... ✨\n\n🐣 Something is emerging!`,
    }, { quoted: msg });

    const rarity     = rollRarity();
    const speciesKey = pickSpecies(rarity);
    const sp         = PET_SPECIES[speciesKey];
    const imageUrl   = await fetchNekoImage(sp.imgCat);
    const isFirst    = all.length === 0;

    const pet = await createPet(sender, speciesKey, imageUrl || "", isFirst);

    const rarityData = RARITIES[rarity];

    // Build excitement message based on rarity
    let exclaim = "A new companion has hatched!";
    if (rarity === "epic")      exclaim = "✨ Wow! An Epic pet appeared!";
    if (rarity === "legendary") exclaim = "🌟 LEGENDARY! You're so lucky!";
    if (rarity === "mythic")    exclaim = "🔥🔥 M Y T H I C ! INCREDIBLE!! 🔥🔥";

    const caption = [
      `🥚 *EGG HATCHED!*`,
      ``,
      `${exclaim}`,
      ``,
      `${rarityData.color} *${pet.name}*`,
      `📖 Species: ${sp.name}`,
      `⭐ Rarity: ${rarityData.label}`,
      ``,
      `❤️ HP: ${pet.maxHp}   ⚔️ ATK: ${pet.attack}`,
      `🛡 DEF: ${pet.defense}  ⚡ SPD: ${pet.speed}`,
      ``,
      `🎁 Skill: *${pet.skill}*`,
      ``,
      isFirst
        ? `🌟 Set as your active pet! Use *.pet* to view.`
        : `💡 Use *.pets select ${pet.petId.slice(0, 8)}* to make it active.`,
    ].join("\n");

    if (imageUrl) {
      return sock.sendMessage(jid, { image: { url: imageUrl }, caption }, { quoted: msg });
    }
    return sock.sendMessage(jid, { text: caption }, { quoted: msg });
  },
};
