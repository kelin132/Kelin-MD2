import { getActivePet } from "../../lib/petDatabase.js";
import { renderPetRoom } from "../../lib/petVisuals.mjs";

export default {
  name: "petroom",
  description: "Visit your active pet's pixel-art room",
  category: "pets",
  usage: ".petroom",
  aliases: ["roompet"],
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const pet = await getActivePet(sender);

    if (!pet) {
      return sock.sendMessage(jid, {
        text: "🐾 You don't have a pet yet. Use *.adopt* to get your first companion.",
      }, { quoted: msg });
    }

    const image = await renderPetRoom(pet);
    return sock.sendMessage(jid, {
      image,
      fileName: "pet-room.png",
      caption: `🏠 ${pet.name}'s room · Lv. ${pet.level || 1}`,
    }, { quoted: msg });
  },
};
