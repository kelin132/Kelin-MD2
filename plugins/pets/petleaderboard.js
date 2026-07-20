// plugins/pets/petleaderboard.js
// .petlb — Top pet trainers leaderboard
import { getPetLeaderboard } from "../../lib/petDatabase.js";
import { RARITIES } from "../../lib/petData.js";

export default {
  name: "petlb",
  description: "Top pet trainers leaderboard",
  category: "pets",
  usage: ".petlb",
  aliases: ["petleaderboard", "pettop", "toppets"],

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    const top = await getPetLeaderboard(10);

    if (!top || top.length === 0) {
      return sock.sendMessage(jid, {
        text: `🏆 No pets registered yet!\n\nUse *.adopt* to be the first pet trainer!`,
      }, { quoted: msg });
    }

    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

    const lines = top.map((pet, i) => {
      const rarity  = RARITIES[pet.rarity] || RARITIES.common;
      const trainer = pet.owner.split("@")[0].split(":")[0];
      return [
        `${medals[i]} *${pet.name}*`,
        `   ${rarity.color} ${rarity.label} | ⭐ Lv.${pet.level} | ⚔️ ${pet.attack}`,
        `   👤 Trainer: +${trainer}`,
      ].join("\n");
    });

    return sock.sendMessage(jid, {
      text: [
        `🏆 *PET LEADERBOARD*`,
        `Top Companions by Level`,
        `━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        lines.join("\n\n"),
        ``,
        `Train hard with *.trainpet* to reach the top!`,
      ].join("\n"),
    }, { quoted: msg });
  },
};
