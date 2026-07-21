// plugins/pets/petinfo.js
// .petinfo — Detailed stats for your active pet
import { getActivePet } from "../../lib/petDatabase.js";
import { PET_SPECIES, RARITIES, currentEvolStage, nextEvolStage } from "../../lib/petData.js";

function bar(value, max, len = 12) {
  const filled = Math.round((value / max) * len);
  return "█".repeat(filled) + "░".repeat(len - filled);
}

export default {
  name: "petinfo",
  description: "View detailed stats of your active pet",
  category: "pets",
  usage: ".petinfo",
  aliases: ["pinfo", "petstat", "petdetail"],

  async run({ sock, msg }) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const pet = await getActivePet(sender);
    if (!pet) {
      return sock.sendMessage(jid, {
        text: `🐾 You don't have an active pet!\n\nUse *.adopt* or *.pets select <ID>* first.`,
      }, { quoted: msg });
    }

    const sp      = PET_SPECIES[pet.species] || {};
    const rarity  = RARITIES[pet.rarity] || RARITIES.common;
    const hunger  = pet.hunger ?? 100;
    const happy   = pet.happiness ?? 100;
    const next    = nextEvolStage(pet.species, pet.level);
    const chain   = sp.evolChain || [];

    const evolLine = next
      ? `🔮 Next: *${next.name}* (Lv.${next.minLevel})`
      : `🌟 *Max Evolution Reached!*`;

    const chainStr = chain.map((s, i) => {
      const isCurrent = pet.level >= s.minLevel &&
        (!chain[i + 1] || pet.level < chain[i + 1].minLevel);
      return `${isCurrent ? "▶️" : "  "} ${s.name} (Lv.${s.minLevel})`;
    }).join("\n");

    const text = [
      `╭━━━〔 📊 PET DETAILS 〕━━━╮`,
      ``,
      `${rarity.color} *${pet.name}*`,
      `📖 Species: ${sp.name || pet.species}`,
      `⭐ Rarity:  ${rarity.label}`,
      `🆔 ID: \`${pet.petId}\``,
      ``,
      `— *LEVEL & EXP* —`,
      `✨ Level: ${pet.level}`,
      `📈 EXP: ${pet.exp}/${pet.expNeeded} ${bar(pet.exp, pet.expNeeded, 10)}`,
      ``,
      `— *STATS* —`,
      `❤️  HP:      ${pet.maxHp}`,
      `⚔️  Attack:  ${pet.attack}`,
      `🛡  Defense: ${pet.defense}`,
      `⚡  Speed:   ${pet.speed}`,
      ``,
      `— *WELLBEING* —`,
      `🍖 Hunger:    ${hunger}% ${bar(hunger, 100, 8)}`,
      `😊 Happiness: ${happy}% ${bar(happy, 100, 8)}`,
      ``,
      `— *SKILL* —`,
      `🎁 ${pet.skill}`,
      ``,
      `— *EVOLUTION LINE* —`,
      chainStr,
      ``,
      evolLine,
      ``,
      `╰━━━━━━━━━━━━━━━━━━━━━━╯`,
    ].join("\n");

    return sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
