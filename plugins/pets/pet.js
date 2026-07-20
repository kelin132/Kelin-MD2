// plugins/pets/pet.js
// .pet — View your active pet with RPG card
import { getActivePet } from "../../lib/petDatabase.js";
import { RARITIES, PET_SPECIES } from "../../lib/petData.js";

function bar(value, max, len = 10) {
  const filled = Math.round((value / max) * len);
  return "█".repeat(filled) + "░".repeat(len - filled);
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

    const sp      = PET_SPECIES[pet.species] || {};
    const rarity  = RARITIES[pet.rarity] || RARITIES.common;
    const hunger  = Math.max(0, pet.hunger ?? 100);
    const happy   = Math.max(0, pet.happiness ?? 100);

    const caption = [
      `╭━━━〔 🐾 PET PROFILE 〕━━━╮`,
      ``,
      `${rarity.color} *Name:* ${pet.name}`,
      `⭐ *Rarity:* ${rarity.label}`,
      `📖 *Species:* ${sp.name || pet.species}`,
      ``,
      `❤️ *HP:* ${pet.maxHp}/${pet.maxHp}`,
      `⚔️ *Attack:* ${pet.attack}`,
      `🛡 *Defense:* ${pet.defense}`,
      `⚡ *Speed:* ${pet.speed}`,
      ``,
      `🍖 *Hunger:* ${hunger}% ${bar(hunger, 100, 8)}`,
      `😊 *Happiness:* ${happy}% ${bar(happy, 100, 8)}`,
      ``,
      `✨ *Level:* ${pet.level}`,
      `📈 *EXP:* ${pet.exp}/${pet.expNeeded}`,
      ``,
      `🎁 *Skill:*`,
      `   ${pet.skill}`,
      ``,
      `╰━━━━━━━━━━━━━━━━━━━━━━╯`,
    ].join("\n");

    if (pet.imageUrl) {
      return sock.sendMessage(jid, { image: { url: pet.imageUrl }, caption }, { quoted: msg });
    }
    return sock.sendMessage(jid, { text: caption }, { quoted: msg });
  },
};
