// plugins/pets/petbattle.js
// .petbattle — Fight monsters with your pet for EXP and gold
import { getActivePet, savePet, awardExp } from "../../lib/petDatabase.js";
import { MONSTERS, PET_SPECIES } from "../../lib/petData.js";

const COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes

function roll(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function bar(v, max, len = 10) {
  const f = Math.max(0, Math.round((v / max) * len));
  return "█".repeat(f) + "░".repeat(len - f);
}

function calcDamage(atk, def) {
  const base = Math.max(1, atk - Math.floor(def * 0.4));
  return roll(Math.floor(base * 0.8), Math.ceil(base * 1.2));
}

export default {
  name: "petbattle",
  description: "Fight a monster with your pet",
  category: "pets",
  usage: ".petbattle",
  aliases: ["pbattle", "pmonster", "petfight"],
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
    const lastBattle  = pet.lastBattle ? new Date(pet.lastBattle).getTime() : 0;
    if (now - lastBattle < COOLDOWN_MS) {
      const mins = Math.ceil((COOLDOWN_MS - (now - lastBattle)) / 60000);
      return sock.sendMessage(jid, {
        text: `⚔️ *${pet.name}* is still recovering!\n\nNext battle in *${mins} minute${mins !== 1 ? "s" : ""}*.`,
      }, { quoted: msg });
    }

    // Hunger must be above 10%
    const hunger = pet.hunger ?? 100;
    if (hunger < 10) {
      return sock.sendMessage(jid, {
        text: `🍖 *${pet.name}* is too hungry to fight!\n\nFeed them with *.feed* first.`,
      }, { quoted: msg });
    }

    // Scale monster to pet level
    const template  = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
    const monHp     = Math.max(20, Math.floor(pet.maxHp * template.hpMult));
    const monAtk    = Math.max(5,  Math.floor(pet.attack * template.atkMult));

    // Simulate battle (up to 10 rounds)
    let petHp       = pet.maxHp;
    let monsterHp   = monHp;
    const log       = [];
    let round       = 1;

    while (petHp > 0 && monsterHp > 0 && round <= 10) {
      // Pet attacks
      const petDmg = calcDamage(pet.attack, Math.floor(monAtk * 0.5));
      monsterHp   -= petDmg;
      log.push(`Round ${round}: *${pet.name}* deals *${petDmg}* dmg! ${template.emoji} HP: ${Math.max(0, monsterHp)}/${monHp}`);

      if (monsterHp <= 0) break;

      // Monster attacks
      const monDmg = calcDamage(monAtk, pet.defense);
      petHp       -= monDmg;
      log.push(`          ${template.emoji} *${template.name}* deals *${monDmg}* dmg! ❤️ ${Math.max(0, petHp)}/${pet.maxHp}`);
      round++;
    }

    const petWon     = monsterHp <= 0 || petHp > 0;
    const expReward  = petWon ? template.reward.exp  : Math.floor(template.reward.exp  * 0.2);
    const goldReward = petWon ? template.reward.gold : 0;

    // Drain hunger & update battle time
    const newHunger = Math.max(0, hunger - 20);
    await savePet(sender, pet.petId, {
      hunger:     newHunger,
      lastBattle: new Date().toISOString(),
    });

    const result = await awardExp(sender, pet.petId, expReward);
    const updatedPet = result?.pet || pet;

    const lines = [
      `⚔️ *PET BATTLE*`,
      ``,
      `${pet.name} vs ${template.emoji} *${template.name}*`,
      `━━━━━━━━━━━━━━━━━━`,
      ...log.slice(0, 6), // show up to 6 lines of combat
      `━━━━━━━━━━━━━━━━━━`,
      ``,
    ];

    if (petWon) {
      lines.push(`🏆 *${pet.name} WINS!*`);
      lines.push(``, `✨ +${expReward} EXP  💰 +${goldReward} Gold`);
      if (result?.levelsGained > 0) {
        lines.push(`🎉 *LEVEL UP!* Now Level *${updatedPet.level}*!`);
      }
    } else {
      lines.push(`💀 *${template.name}* wins this round...`);
      lines.push(``, `✨ +${expReward} EXP (consolation)`);
      lines.push(`💪 Train more with *.trainpet* to grow stronger!`);
    }

    lines.push(``, `🍖 Hunger: ${hunger}% → *${newHunger}%*`);
    lines.push(`⏳ Next battle in *20 minutes*.`);

    return sock.sendMessage(jid, { text: lines.join("\n") }, { quoted: msg });
  },
};
