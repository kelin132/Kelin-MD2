// plugins/pets/pets.js
// .pets — Show all owned pets
import { getAllPets, setActivePet } from "../../lib/petDatabase.js";
import { RARITIES } from "../../lib/petData.js";

function bar(value, max, len = 6, filled = "🟦") {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const filledCount = Math.round(ratio * len);
  return filled.repeat(filledCount) + "⬛".repeat(len - filledCount);
}

export default {
  name: "pets",
  description: "Show all your pets",
  category: "pets",
  usage: ".pets [select <petId>]",
  aliases: ["mypets", "petlist"],

  async run({ sock, msg, args }) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    // Handle: .pets select <petId>
    if (args[0]?.toLowerCase() === "select" && args[1]) {
      const petId = args[1];
      const all   = await getAllPets(sender);
      const found = all.find(p => p.petId === petId);
      if (!found) {
        return sock.sendMessage(jid, { 
          text: `╭─❀「 🐾 *𝐏𝐄𝐓𝐒* 」❀─╮\n│ ❌ No pet found with that ID.\n│\n│ 💡 Use \`.pets\` to view your list.\n╰───────────────❀` 
        }, { quoted: msg });
      }
      await setActivePet(sender, found.petId);
      return sock.sendMessage(jid, {
        text: `╭─❀「 🐾 *𝐏𝐄𝐓𝐒* 」❀─╮\n│ ✅ *${found.name}* is now active!\n╰───────────────❀`,
      }, { quoted: msg });
    }

    const all = await getAllPets(sender);
    if (!all || all.length === 0) {
      return sock.sendMessage(jid, {
        text: `╭─❀「 🐾 *𝐏𝐄𝐓𝐒* 」❀─╮\n│ 🐾 You have no pets!\n│\n│ 💡 Use \`.adopt\` to get a companion.\n╰───────────────❀`,
      }, { quoted: msg });
    }

    const petList = all.map((p, i) => {
      const rarity = RARITIES[p.rarity] || RARITIES.common;
      const active = p.isActive ? " 🌟" : "";
      return [
        `**${i + 1}. ${p.name}**${active} · Lv. **${p.level || 1}**`,
        `${rarity.label} · ⚔️ ${p.attack} · ❤️ ${p.maxHp}`,
        `🍖 ${bar(p.hunger ?? 100, 100, 6, "🟦")}  😊 ${bar(p.happiness ?? 100, 100, 6, "🩷")}`,
        `ID \`${p.petId}\``,
      ].join("\n");
    }).join("\n\n");

    const text =
`🐾 *PET COLLECTION*

${petList}

Use \`.pets select <ID>\` to switch your active pet.
Collection: **${all.length}/5**`;

    return sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
