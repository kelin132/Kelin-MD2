// plugins/pets/evolve.js
// .evolve — Evolve your active pet when level requirement is met
import { getActivePet, savePet } from "../../lib/petDatabase.js";
import { currentEvolStage, nextEvolStage, PET_SPECIES, RARITIES, getSpeciesImage } from "../../lib/petData.js";

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
          `Current Level:  *${pet.level}*`,
          ``,
          `Keep training with *.trainpet*!`,
        ].join("\n"),
      }, { quoted: msg });
    }

    // Evolve — get the image for the new stage
    await sock.sendMessage(jid, {
      text: `🌟 *${pet.name}* is evolving...\n\n✨✨✨ The light is blinding! ✨✨✨`,
    }, { quoted: msg });

    // Use the next stage's specific image, or fall back to species default
    const newImageUrl = next.image || getSpeciesImage(pet.species, next.minLevel) || pet.imageUrl;

    await savePet(sender, pet.petId, {
      name:     next.name,
      imageUrl: newImageUrl,
    });

    const rarity  = RARITIES[pet.rarity] || RARITIES.common;
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

    if (newImageUrl) {
      return sock.sendMessage(jid, { image: { url: newImageUrl }, caption }, { quoted: msg });
    }
    return sock.sendMessage(jid, { text: caption }, { quoted: msg });
  },
};
