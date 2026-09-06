// plugins/pets/petleaderboard.js
// .petlb — Top pet trainers leaderboard
import { getPetLeaderboard } from "../../lib/petDatabase.js";
import { RARITIES } from "../../lib/petData.js";
import { getUser } from "../economy/database.js";
import { formatAnimeLeaderboard } from "../../lib/animeLeaderboard.mjs";

export default {
  name: "petlb",
  description: "Top pet trainers leaderboard",
  category: "pets",
  usage: ".petlb",
  aliases: ["petleaderboard", "pettop", "toppets"],

  async run({ sock, msg, discord }) {
    const jid = msg.key.remoteJid;

    const top = await getPetLeaderboard(10);

    if (!top || top.length === 0) {
      if (discord?.message) {
        return sock.sendMessage(jid, {
          discordEmbed: {
            title: "🏆 Pet Companion Leaderboard",
            description: "No pets are registered yet.\nUse `.adopt` to become the first pet trainer!",
            color: "#FFB7C5",
            footer: { text: "AIDORU • Pet companions" },
          },
        }, { quoted: msg });
      }
      return sock.sendMessage(jid, {
        text: `🏆 No pets registered yet!\n\nUse *.adopt* to be the first pet trainer!`,
      }, { quoted: msg });
    }

    // Look up registered names for all owners in parallel
    const ownerNames = await Promise.all(
      top.map(async (pet) => {
        try {
          const user = await getUser(pet.owner);
          return user?.name || `+${pet.owner.split("@")[0].split(":")[0]}`;
        } catch {
          return `+${pet.owner.split("@")[0].split(":")[0]}`;
        }
      })
    );

    const text = formatAnimeLeaderboard({
      subtitle: "PET COMPANION LEADERBOARD",
      rows: top.map((pet, i) => {
        const rarity = RARITIES[pet.rarity] || RARITIES.common;
        return {
          name: pet.name,
          value: pet.level,
          valueText: `⭐ Lv.${pet.level} · ${rarity.color} ${rarity.label} · ⚔️ ${pet.attack} · 👤 ${ownerNames[i]}`,
        };
      }),
      valueIcon: "🐾",
      valueLabel: "𝐋𝐄𝐕𝐄𝐋",
      footer: "🌸 𝐀𝐍𝐈𝐌𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒",
    });

    if (discord?.message) {
      const mentions = [];
      const fields = top.map((pet, i) => {
        const rarity = RARITIES[pet.rarity] || RARITIES.common;
        const owner = String(pet.owner || "");
        const discordOwner = owner.startsWith("discord:")
          ? owner.slice("discord:".length)
          : "";
        if (discordOwner) mentions.push(`discord:${discordOwner}`);
        const ownerLabel = ownerNames[i] || (discordOwner ? `<@${discordOwner}>` : "Unknown trainer");
        return {
          name: `${["🥇", "🥈", "🥉"][i] || `#${i + 1}`} ${pet.name}`,
          value: [
            `**Level:** ${pet.level}  •  **Rarity:** ${rarity.color} ${rarity.label}`,
            `**Attack:** ${pet.attack}  •  **Trainer:** ${ownerLabel}`,
          ].join("\n"),
          inline: false,
        };
      });

      return sock.sendMessage(jid, {
        discordEmbed: {
          title: "🏆 Pet Companion Leaderboard",
          description: "**Top pet trainers across AIDORU.**",
          color: "#FFB7C5",
          fields,
          footer: { text: "AIDORU • Adopt, train, and compete" },
        },
        mentions,
      }, { quoted: msg });
    }

    return sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
