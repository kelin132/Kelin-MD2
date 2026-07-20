// plugins/pets/evolve.js
// .evolve — Evolve your active pet when requirements are met
import { getActivePet, savePet } from "../../lib/petDatabase.js";
import { currentEvolStage, nextEvolStage, PET_SPECIES, RARITIES } from "../../lib/petData.js";

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
  name: "evolve",
  description: "Evolve your pet when requirements are met",
  category: "pets",
  usage: ".evolve",
  aliases: ["petevolve"],
  checkJail: true,

  async run({ sock, msg }) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const pet = await getActivePet(sender);
    if (!pet) {
      return sock.sendMessage(jid, {
        text: `🐾 You don't have an active pet!\n\nUse *.adopt* or *.pets select <ID>* first.`,
      }, { quoted: msg });
    }

    const sp    = PET_SPECIES[pet.species];
    const next  = nextEvolStage(pet.species, pet.level);

    if (!next) {
      return sock.sendMessage(jid, {
        text: `✨ *${pet.name}* is already at max evolution!\n\nKeep training to make them stronger.`,
      }, { quoted: msg });
    }

    if (pet.level < next.minLevel) {
      return sock.sendMessage(jid, {
        text: [
          `🔮 *${pet.name}* isn't ready to evolve yet!`,
          ``,
          `Next evolution: *${next.name}*`,
          `Required Level: *${next.minLevel}*`,
          `Current Level: *${pet.level}*`,
          ``,
          `Keep training with *.trainpet*!`,
        ].join("\n"),
      }, { quoted: msg });
    }

    // Ready to evolve!
    await sock.sendMessage(jid, {
      text: `🌟 *${pet.name}* is evolving...\n\n✨✨✨ The light is blinding! ✨✨✨`,
    }, { quoted: msg });

    // Fetch new image for the evolved form
    const imageUrl = await fetchNekoImage(next.imgCat);

    await savePet(sender, pet.petId, {
      name:     next.name,
      imageUrl: imageUrl || pet.imageUrl,
    });

    const rarity = RARITIES[pet.rarity] || RARITIES.common;
    const caption = [
      `🎊 *EVOLUTION COMPLETE!*`,
      ``,
      `${rarity.color} *${pet.name}* → ✨ *${next.name}*!`,
      ``,
      `📖 Species: ${sp?.name || pet.species}`,
      `⭐ Level: ${pet.level}`,
      ``,
      `❤️ HP: ${pet.maxHp}   ⚔️ ATK: ${pet.attack}`,
      `🛡 DEF: ${pet.defense}  ⚡ SPD: ${pet.speed}`,
      ``,
      `🎁 Skill: *${pet.skill}*`,
      ``,
      `Your companion has grown stronger! 💪`,
    ].join("\n");

    const finalImage = imageUrl || pet.imageUrl;
    if (finalImage) {
      return sock.sendMessage(jid, { image: { url: finalImage }, caption }, { quoted: msg });
    }
    return sock.sendMessage(jid, { text: caption }, { quoted: msg });
  },
};
