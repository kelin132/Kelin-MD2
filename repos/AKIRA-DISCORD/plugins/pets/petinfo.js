// plugins/pets/petinfo.js
// .petinfo — Detailed stats for your active pet
import { getActivePet } from "../../lib/petDatabase.js";
import { PET_SPECIES, RARITIES, currentEvolStage, nextEvolStage } from "../../lib/petData.js";

function bar(value, max, len = 10, filled = "🟦") {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const filledCount = Math.round(ratio * len);
  return filled.repeat(filledCount) + "⬛".repeat(len - filledCount);
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
      `📊 *${pet.name}*`,
      `${sp.name || pet.species} · ${rarity.label} · ID \`${pet.petId}\``,
      ``,
      `⭐ Level **${pet.level}**`,
      `✨ XP **${pet.exp}/${pet.expNeeded}** ${bar(pet.exp, pet.expNeeded, 10, "🟦")}`,
      ``,
      `❤️ HP **${pet.maxHp}**   ⚔️ Attack **${pet.attack}**`,
      `🛡️ Defense **${pet.defense}**   ⚡ Speed **${pet.speed}**`,
      ``,
      `🍖 Hunger **${hunger}%** ${bar(hunger, 100, 8, "🟦")}`,
      `😊 Happiness **${happy}%** ${bar(happy, 100, 8, "🩷")}`,
      `🎁 Skill **${pet.skill}**`,
      ``,
      `🔮 *Evolution path*`,
      chainStr,
      ``,
      evolLine,
    ].join("\n");

    return sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
