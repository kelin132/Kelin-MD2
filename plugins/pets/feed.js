// plugins/pets/feed.js
// .feed — Feed your active pet to restore hunger
import { getActivePet, savePet } from "../../lib/petDatabase.js";

const COOLDOWN_MS  = 2 * 60 * 60 * 1000; // 2 hours
const HUNGER_GAIN  = 30;

export default {
  name: "feed",
  description: "Feed your active pet",
  category: "pets",
  usage: ".feed",
  aliases: ["feedpet"],
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

    // Cooldown check
    const now      = Date.now();
    const lastFed  = pet.lastFed ? new Date(pet.lastFed).getTime() : 0;
    const elapsed  = now - lastFed;

    if (elapsed < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - elapsed;
      const mins      = Math.ceil(remaining / 60000);
      return sock.sendMessage(jid, {
        text: `🍖 *${pet.name}* is still full!\n\nCome back in *${mins} minute${mins !== 1 ? "s" : ""}* to feed again.`,
      }, { quoted: msg });
    }

    const oldHunger  = pet.hunger ?? 100;
    const newHunger  = Math.min(100, oldHunger + HUNGER_GAIN);
    const newHappiness = Math.min(100, (pet.happiness ?? 100) + 5);

    await savePet(sender, pet.petId, {
      hunger:    newHunger,
      happiness: newHappiness,
      lastFed:   new Date().toISOString(),
    });

    return sock.sendMessage(jid, {
      text: [
        `🍖 *${pet.name}* ate happily!`,
        ``,
        `🍖 Hunger:  ${oldHunger}% → *${newHunger}%*`,
        `😊 Happiness: ${pet.happiness ?? 100}% → *${newHappiness}%*`,
        ``,
        `Next feed available in *2 hours*.`,
      ].join("\n"),
    }, { quoted: msg });
  },
};
