// plugins/pets/trainpet.js
// .trainpet — Train your pet to gain EXP
import { getActivePet, savePet, awardExp } from "../../lib/petDatabase.js";
import { nextEvolStage } from "../../lib/petData.js";

const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const BASE_EXP    = 35;

const TRAIN_SCENES = [
  "sprints through the training ground",
  "practices battle stances",
  "meditates and focuses their energy",
  "spars with a training dummy",
  "pushes through an intense workout",
  "channels their elemental power",
  "hones their special skill",
];

export default {
  name: "trainpet",
  description: "Train your pet to gain EXP",
  category: "pets",
  usage: ".trainpet",
  aliases: ["ptrain", "pettrain"],
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

    // Cooldown
    const now         = Date.now();
    const lastTrained = pet.lastTrained ? new Date(pet.lastTrained).getTime() : 0;
    const elapsed     = now - lastTrained;

    if (elapsed < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - elapsed;
      const mins      = Math.ceil(remaining / 60000);
      return sock.sendMessage(jid, {
        text: `⚡ *${pet.name}* is still resting!\n\nCome back in *${mins} minute${mins !== 1 ? "s" : ""}* to train again.`,
      }, { quoted: msg });
    }

    // Hunger must be above 20% to train
    const hunger = pet.hunger ?? 100;
    if (hunger < 20) {
      return sock.sendMessage(jid, {
        text: `🍖 *${pet.name}* is too hungry to train!\n\nFeed them first with *.feed*`,
      }, { quoted: msg });
    }

    // Happiness bonus (+20% EXP if happy)
    const happy   = pet.happiness ?? 100;
    const bonus   = happy >= 70 ? Math.floor(BASE_EXP * 0.20) : 0;
    const expGain = BASE_EXP + bonus;

    const scene   = TRAIN_SCENES[Math.floor(Math.random() * TRAIN_SCENES.length)];

    // Apply training costs
    const newHunger = Math.max(0, hunger - 15);
    await savePet(sender, pet.petId, {
      hunger:      newHunger,
      lastTrained: new Date().toISOString(),
    });

    // Award EXP
    const result = await awardExp(sender, pet.petId, expGain);
    if (!result) return;

    const { pet: updatedPet, levelsGained } = result;
    const nextEvol = nextEvolStage(pet.species, updatedPet.level);

    const lines = [
      `⚡ *${pet.name}* ${scene}!`,
      ``,
      `✨ *+${expGain} EXP*${bonus > 0 ? ` (😊 Happiness Bonus +${bonus})` : ""}`,
      `📈 EXP: ${updatedPet.exp}/${updatedPet.expNeeded}`,
      `🍖 Hunger: ${hunger}% → *${newHunger}%*`,
    ];

    if (levelsGained > 0) {
      lines.push(``, `🎉 *LEVEL UP!* ✨ ${pet.name} is now *Level ${updatedPet.level}*!`);
      lines.push(`❤️ HP: ${updatedPet.maxHp}  ⚔️ ATK: ${updatedPet.attack}  🛡 DEF: ${updatedPet.defense}  ⚡ SPD: ${updatedPet.speed}`);
      if (nextEvol) {
        lines.push(``, `🔮 *${nextEvol.name}* evolution unlocks at Level *${nextEvol.minLevel}*! (currently ${updatedPet.level})`);
      }
    }

    if (nextEvol && levelsGained === 0) {
      lines.push(``, `🔮 Next evolution: *${nextEvol.name}* at Level *${nextEvol.minLevel}*`);
    }

    lines.push(``, `Next training available in *30 minutes*.`);

    return sock.sendMessage(jid, { text: lines.join("\n") }, { quoted: msg });
  },
};
