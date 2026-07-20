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
      const found = all.find(p => p.petId === petId || p.petId.startsWith(petId));
      if (!found) {
        return sock.sendMessage(jid, { text: `❌ No pet found with that ID.\n\nUse *.pets* to see your pet IDs.` }, { quoted: msg });
      }
      await setActivePet(sender, found.petId);
      return sock.sendMessage(jid, {
        text: `✅ *${found.name}* is now your active pet!`,
      }, { quoted: msg });
    }

    const all = await getAllPets(sender);
    if (!all || all.length === 0) {
      return sock.sendMessage(jid, {
        text: `🐾 You have no pets!\n\nUse *.adopt* to get your first companion.`,
      }, { quoted: msg });
    }

    const lines = all.map((p, i) => {
      const rarity = RARITIES[p.rarity] || RARITIES.common;
      const active = p.isActive ? " 🌟 *[ACTIVE]*" : "";
      return [
        `${i + 1}. ${rarity.color} *${p.name}*${active}`,
        `   Lv.${p.level} ${rarity.label} | ⚔️ ${p.attack} | ❤️ ${p.maxHp}`,
        `   🍖 ${p.hunger ?? 100}% | 😊 ${p.happiness ?? 100}%`,
        `   🆔 \`${p.petId.slice(0, 8)}\``,
      ].join("\n");
    });

    const text = [
      `🐾 *YOUR PETS* (${all.length}/5)`,
      ``,
      lines.join("\n\n"),
      ``,
      `💡 *.pets select <ID>* — switch active pet`,
    ].join("\n");

    return sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
