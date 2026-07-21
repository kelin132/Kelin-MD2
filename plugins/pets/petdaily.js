// plugins/pets/petdaily.js
// .petdaily — Daily EXP + hunger + happiness restore for active pet
import { getActivePet, savePet, awardExp } from "../../lib/petDatabase.js";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export default {
  name: "petdaily",
  description: "Claim your pet's daily reward",
  category: "pets",
  usage: ".petdaily",
  aliases: ["dailypet"],
  cooldown: 5,

  async run({ sock, msg }) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const pet = await getActivePet(sender);
    if (!pet) {
      return sock.sendMessage(jid, {
        text: `🐾 You don't have an active pet!\n\nUse *.adopt* to get your first companion.`,
      }, { quoted: msg });
    }

    const now      = Date.now();
    const lastUsed = pet.lastPetDaily || 0;

    if (now - lastUsed < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (now - lastUsed);
      const hours     = Math.floor(remaining / 3_600_000);
      const mins      = Math.floor((remaining % 3_600_000) / 60_000);
      return sock.sendMessage(jid, {
        text: `⏰ *Pet Daily already claimed!*\n\nCome back in *${hours}h ${mins}m*.`,
      }, { quoted: msg });
    }

    const EXP_BONUS   = 120;
    const newHunger   = Math.min(100, pet.hunger + 50);
    const newHappiness = Math.min(100, pet.happiness + 30);

    await savePet(sender, pet.petId, {
      hunger:       newHunger,
      happiness:    newHappiness,
      lastPetDaily: now,
    });

    const result = await awardExp(sender, pet.petId, EXP_BONUS);
    const leveled = result?.levelsGained > 0;

    let text = [
      `🌅 *PET DAILY CLAIMED!*`,
      ``,
      `🐾 *${pet.name}* feels loved!`,
      ``,
      `🍖 Hunger    : ${pet.hunger}% → ${newHunger}%`,
      `😊 Happiness : ${pet.happiness}% → ${newHappiness}%`,
      `✨ EXP Bonus : +${EXP_BONUS}`,
    ].join("\n");

    if (leveled) text += `\n\n🎉 *LEVEL UP!* ${pet.name} is now Level ${result.pet.level}!`;
    text += `\n\n> Come back tomorrow for more!`;

    return sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
