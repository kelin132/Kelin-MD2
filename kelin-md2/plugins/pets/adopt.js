// plugins/pets/adopt.js
// .adopt — Get your first pet (free starter, one-time)
import { getAllPets, createPet } from "../../lib/petDatabase.js";
import { PET_SPECIES, RARITIES } from "../../lib/petData.js";
import { getPetImage } from "../../lib/petImages.mjs";

const STARTER_SPECIES = ["cat", "dog", "bunny", "fox", "moon_cat", "sakura_bunny", "fire_slime"];

export default {
  name: "adopt",
  description: "Get your first pet for free",
  category: "pets",
  usage: ".adopt <species>",
  aliases: ["getpet"],
  checkJail: true,

  async run({ sock, msg, text }) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const existing = await getAllPets(sender);
    if (existing.length > 0) {
      return sock.sendMessage(jid, {
        text: `🐾 You already have a pet!\n\nUse *.pets* to see your pets or *.hatch* to get more.`,
      }, { quoted: msg });
    }

    const choice = (text || "").trim().toLowerCase().replace(/\s+/g, "_");

    if (!choice || !STARTER_SPECIES.includes(choice)) {
      const list = STARTER_SPECIES.map(s => {
        const sp = PET_SPECIES[s];
        return `• *${s}* — ${sp.name} (${RARITIES[sp.rarity].label})`;
      }).join("\n");
      return sock.sendMessage(jid, {
        text: `🐾 *PET ADOPTION*\n\nChoose your starter companion:\n\n${list}\n\nUsage: *.adopt <name>*\nExample: *.adopt cat*`,
      }, { quoted: msg });
    }

    const sp        = PET_SPECIES[choice];
    const imageUrl  = await getPetImage(choice);
    const pet       = await createPet(sender, choice, imageUrl || "", true);
    const rarity    = RARITIES[pet.rarity];

    const caption = [
      `꧁━━〔 🐾 *N E W  C O M P A N I O N!* 〕━━꧂`,
      ``,
      `  ${rarity.color} *${pet.name}*`,
      `  📖 *${sp.name}*  ✦  ⭐ *${rarity.label}*`,
      ``,
      `  〔 ⚔️ *BATTLE STATS* 〕`,
      `  ━━━━━━━━━━━━━━━━━━━━━━━`,
      `  ❤️  *HP*       *${pet.maxHp}*`,
      `  ⚔️  *Attack*   *${pet.attack}*`,
      `  🛡  *Defense*  *${pet.defense}*`,
      `  ⚡  *Speed*    *${pet.speed}*`,
      ``,
      `  〔 🌸 *STATUS* 〕`,
      `  ━━━━━━━━━━━━━━━━━━━━━━━`,
      `  🍖 *Hunger*    *100%*  ▰▰▰▰▰▰▰▰`,
      `  😊 *Happy*     *100%*  ▰▰▰▰▰▰▰▰`,
      ``,
      `  ✨ *Level 1*  〔 🎁 *${pet.skill}* 〕`,
      ``,
      `  *.pet* ✦ *.feed* ✦ *.play* ✦ *.trainpet*`,
      ``,
      `꧂━━━━━━━━━━━━━━━━━━━━━━━━━━━━꧁`,
    ].join("\n");

    if (imageUrl) {
      return sock.sendMessage(jid, { image: { url: imageUrl }, caption }, { quoted: msg });
    }
    return sock.sendMessage(jid, { text: caption }, { quoted: msg });
  },
};
