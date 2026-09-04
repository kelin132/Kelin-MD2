// plugins/pets/pet.js
// .pet — View your active pet with RPG card
import { getActivePet, savePet } from "../../lib/petDatabase.js";
import { RARITIES, PET_SPECIES } from "../../lib/petData.js";
import { getPetImage } from "../../lib/petImages.mjs";

function bar(value, max, len = 10, filled = "🟦") {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const filledCount = Math.round(ratio * len);
  return filled.repeat(filledCount) + "⬛".repeat(len - filledCount);
}

export default {
  name: "pet",
  description: "View your active pet",
  category: "pets",
  usage: ".pet",
  aliases: ["mypet"],

  async run({ sock, msg }) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const pet = await getActivePet(sender);
    if (!pet) {
      return sock.sendMessage(jid, {
        text: `🐾 You don't have a pet yet!\n\nUse *.adopt* to get your first companion.`,
      }, { quoted: msg });
    }

    const sp     = PET_SPECIES[pet.species] || {};
    const rarity = RARITIES[pet.rarity] || RARITIES.common;
    const hunger = Math.max(0, pet.hunger ?? 100);
    const happy  = Math.max(0, pet.happiness ?? 100);

    // Older pets were created before pet images existed — backfill once, then reuse.
    let imageUrl = pet.imageUrl;
    if (!imageUrl) {
      imageUrl = await getPetImage(pet.species);
      if (imageUrl) await savePet(sender, pet.petId, { imageUrl });
    }

    const caption = [
      `🐾 *${pet.name}*`,
      `${sp.name || pet.species} · ${rarity.label}`,
      ``,
      `❤️ HP       **${pet.maxHp}**`,
      `⚔️ Attack   **${pet.attack}**`,
      `🛡️ Defense  **${pet.defense}**`,
      `⚡ Speed    **${pet.speed}**`,
      ``,
      `🍖 Hunger   **${hunger}%** ${bar(hunger, 100, 8, "🟦")}`,
      `😊 Happiness **${happy}%** ${bar(happy, 100, 8, "🩷")}`,
      ``,
      `⭐ Level **${pet.level}**`,
      `✨ XP **${pet.exp}/${pet.expNeeded}** ${bar(pet.exp, pet.expNeeded, 10, "🟦")}`,
      `🎁 Skill   **${pet.skill}**`,
    ].join("\n");

    if (imageUrl) {
      return sock.sendMessage(jid, { image: { url: imageUrl }, caption }, { quoted: msg });
    }
    return sock.sendMessage(jid, { text: caption }, { quoted: msg });
  },
};
