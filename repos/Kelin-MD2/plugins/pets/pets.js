// plugins/pets/pets.js
// .pets — Show all owned pets
import { getAllPets, setActivePet } from "../../lib/petDatabase.js";
import { RARITIES } from "../../lib/petData.js";

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
      return `│ \`${i + 1}.\` *${p.name}*${active} [Lv. \`${p.level || 1}\`]\n│    ${rarity.color} ${rarity.label} · ⚔️ \`${p.attack}\` · ❤️ \`${p.maxHp}\`\n│    🍖 \`${p.hunger ?? 100}%\` · 😊 \`${p.happiness ?? 100}%\` · 🆔 \`${p.petId}\``;
    }).join("\n│\n");

    const text = 
`╭─❀「 🐾 *𝐏𝐄𝐓 𝐂𝐎𝐋𝐋𝐄𝐂𝐓𝐈𝐎𝐍* 」❀─╮
${petList}
│
│ 🌸 \`.pets select <ID>\` · \`${all.length}/5\` companions
╰───────────────❀`;

    return sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
