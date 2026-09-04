// plugins/pets/renamepet.js
// .renamepet <new name> — Rename your active pet
import { getActivePet, savePet } from "../../lib/petDatabase.js";

const MAX_NAME_LEN = 20;
const FORBIDDEN    = /[<>@{}]/;

export default {
  name: "renamepet",
  description: "Rename your active pet",
  category: "pets",
  usage: ".renamepet <new name>",
  aliases: ["petname", "namepet"],
  checkJail: true,

  async run({ sock, msg, text }) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const newName = (text || "").trim();

    if (!newName) {
      return sock.sendMessage(jid, {
        text: `✏️ Usage: *.renamepet <new name>*\n\nExample: *.renamepet Akamaru*`,
      }, { quoted: msg });
    }

    if (newName.length > MAX_NAME_LEN) {
      return sock.sendMessage(jid, {
        text: `❌ Name is too long! Max *${MAX_NAME_LEN} characters*.`,
      }, { quoted: msg });
    }

    if (FORBIDDEN.test(newName)) {
      return sock.sendMessage(jid, {
        text: `❌ Name contains invalid characters.`,
      }, { quoted: msg });
    }

    const pet = await getActivePet(sender);
    if (!pet) {
      return sock.sendMessage(jid, {
        text: `🐾 You don't have an active pet!\n\nUse *.adopt* or *.pets select <ID>* first.`,
      }, { quoted: msg });
    }

    const oldName = pet.name;
    await savePet(sender, pet.petId, { name: newName });

    return sock.sendMessage(jid, {
      text: `✏️ Your pet has been renamed!\n\n*${oldName}* → ✨ *${newName}*`,
    }, { quoted: msg });
  },
};
