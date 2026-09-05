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
        text: `⚠️ *You already own a pet!*\n\nUse *.pets* to view your companions or *.hatch* to obtain more.`,
      }, { quoted: msg });
    }

    const choice = (text || "").trim().toLowerCase().replace(/\s+/g, "_");

    if (!choice || !STARTER_SPECIES.includes(choice)) {
      const list = STARTER_SPECIES.map(s => {
        const sp = PET_SPECIES[s];
        return `> • *${sp.name}* \`(${s})\` — ${RARITIES[sp.rarity].label}`;
      }).join("\n");

      return sock.sendMessage(jid, {
        text: `╭━━━〔 🐾 *STARTER ADOPTION* 〕━━━\n` +
              `┃ Choose your first companion:\n` +
              `┃\n` +
              `${list}\n` +
              `┃\n` +
              `┃ 💡 *Usage:* \`.adopt <id>\`\n` +
              `┃ 📌 *Example:* \`.adopt cat\`\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      }, { quoted: msg });
    }

    const sp        = PET_SPECIES[choice];
    const imageUrl  = await getPetImage(choice);
    const pet       = await createPet(sender, choice, imageUrl || "", true);
    const rarity    = RARITIES[pet.rarity];

    const caption = [
      `┌─  🐾 *NEW COMPANION ADOPTED!*`,
      `├──────────────────────────`,
      `│ 🏷️ *Name:* ${pet.name}`,
      `│ 📖 *Species:* ${sp.name}`,
      `│ ⭐ *Rarity:* ${rarity.color} ${rarity.label}`,
      `│ ✨ *Level:* 1`,
      `├──────────────────────────`,
      `│ 📊 *BASE STATS*`,
      `│ ❤️  *HP:* ${pet.maxHp}`,
      `│ ⚔️  *ATK:* ${pet.attack}  │  🛡️ *DEF:* ${pet.defense}`,
      `│ ⚡  *SPD:* ${pet.speed}`,
      `├──────────────────────────`,
      `│ ❇️ *STATUS*`,
      `│ 🍖 *Hunger:* 100% [████████]`,
      `│ 😊 *Happy:*  100% [████████]`,
      `├──────────────────────────`,
      `│ 🎁 *Skill:* ${pet.skill}`,
      `└──────────────────────────`,
      ``,
      `🎮 *Commands:* \`.pet\` • \`.feed\` • \`.play\` • \`.trainpet\``,
    ].join("\n");

    if (imageUrl) {
      return sock.sendMessage(jid, { image: { url: imageUrl }, caption }, { quoted: msg });
    }
    return sock.sendMessage(jid, { text: caption }, { quoted: msg });
  },
};
