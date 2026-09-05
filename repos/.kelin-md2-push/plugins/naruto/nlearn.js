// plugins/naruto/nlearn.js
// Learn new jutsu — shows character art relevant to the jutsu being learned

import players    from "../../lib/naruto/players.js";
import jutsuList  from "../../lib/jutsu.js";
import { sendWithCharacterImage, sendWithNarutoTheme } from "../../lib/gifHelper.mjs";

// Jutsu ID → character who famously uses it (for the image)
const JUTSU_CHARACTERS = {
  shadow_clone:       "Naruto Uzumaki",
  fireball:           "Sasuke Uchiha",
  great_fireball:     "Itachi Uchiha",
  chidori:            "Kakashi Hatake",
  rasengan:           "Naruto Uzumaki",
  rasenshuriken:      "Naruto Uzumaki",
  amaterasu:          "Itachi Uchiha",
  susanoo:            "Sasuke Uchiha",
  shadow_possession:  "Shikamaru Nara",
  shadow_sewing:      "Shikamaru Nara",
  gentle_fist:        "Hinata Hyuga",
  eight_trigrams_64:  "Neji Hyuga",
  water_dragon:       "Zabuza Momochi",
  water_shark_bomb:   "Kisame Hoshigaki",
  sand_coffin:        "Gaara",
  wood_style:         "Hashirama Senju",
  bijuu_bomb:         "Naruto Uzumaki",
  truth_seeking_orbs: "Naruto Uzumaki",
  insect_swarm:       "Shino Aburame",
  expansion_jutsu:    "Choji Akimichi",
  fang_over_fang:     "Kiba Inuzuka",
  mind_transfer:      "Ino Yamanaka",
  bone_blade:         "Kimimaro",
  eight_gates:        "Might Guy",
  flying_thunder_god: "Minato Namikaze",
  hydration_technique:"Suigetsu Hōzuki",
  kama_absorption:    "Kawaki",
  infinite_tsukuyomi: "Madara Uchiha",
};

export default {
  name: "nlearn",
  description: "Learn new jutsu techniques",
  category: "naruto",
  usage: ".nlearn [jutsu_id]",

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    try {
      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(jid, {
          text: "🥷 You don't have a ninja profile.\n\nUse .nstart first."
        }, { quoted: msg });
      }

      // No argument — show available jutsu grouped by rank
      if (!text) {
        const available = jutsuList.filter(j => {
          if (j.level > player.level) return false;
          if (j.clan && j.clan !== player.clan?.name) return false;
          return true;
        });

        if (!available.length) {
          return sock.sendMessage(jid, {
            text: `⚠️ No jutsu available for your level yet.\n\n⭐ Level: ${player.level}\n\nTrain with .ntrain to level up!`
          }, { quoted: msg });
        }

        const RANK_ORDER = ["E", "D", "C", "B", "A", "S"];
        const byRank = {};
        for (const j of available) {
          if (!byRank[j.rank]) byRank[j.rank] = [];
          byRank[j.rank].push(j);
        }

        const rankEmoji = { E: "⬜", D: "🟫", C: "🟩", B: "🟦", A: "🟥", S: "🟨" };
        const knownIds  = new Set((player.jutsu || []).map(j => typeof j === "string" ? j : j.id));

        const sections = RANK_ORDER.filter(r => byRank[r]).map(rank => {
          const items = byRank[rank].map(j => {
            const known = knownIds.has(j.id) ? " ✅" : "";
            const cost  = j.level * 100;
            const clanTag = j.clan ? ` [${j.clan} only]` : "";
            return `  ${rankEmoji[rank]} *${j.name}*${clanTag}${known}\n     ID: \`${j.id}\` | Lv${j.level} | 💥${j.damage} dmg | 💙${j.chakra} | 💰${cost} Ryo`;
          }).join("\n");
          return `*Rank ${rank}*\n${items}`;
        }).join("\n\n");

        return sendWithNarutoTheme(sock, jid, msg,
`📖 *JUTSU SCROLL*

🥷 ${player.username} (Lv ${player.level}) | 👁️ ${player.clan?.name || "Clanless"}
💰 Ryo: ${player.ryo}

${sections}

Use *.nlearn <jutsu_id>* to learn.
✅ = Already known`, "jutsu");
      }

      // Learn a specific jutsu
      const id    = text.trim().toLowerCase();
      const jutsu = jutsuList.find(j => j.id === id);

      if (!jutsu) {
        return sock.sendMessage(jid, {
          text: `❌ Jutsu "*${id}*" not found.\n\nUse .nlearn to see available techniques.`
        }, { quoted: msg });
      }

      if (player.level < jutsu.level) {
        return sock.sendMessage(jid, {
          text: `❌ Too low level!\n\n🌀 ${jutsu.name} requires Level ${jutsu.level}.\nYour level: ${player.level}`
        }, { quoted: msg });
      }

      if (jutsu.clan && jutsu.clan !== player.clan?.name) {
        return sock.sendMessage(jid, {
          text: `❌ This jutsu is exclusive to the *${jutsu.clan}* clan!\nYour clan: ${player.clan?.name || "None"}`
        }, { quoted: msg });
      }

      const alreadyKnown = player.jutsu?.some(j =>
        (typeof j === "string" ? j : j.id) === jutsu.id
      );
      if (alreadyKnown) {
        return sock.sendMessage(jid, {
          text: `🌀 You already know *${jutsu.name}*!`
        }, { quoted: msg });
      }

      const cost = jutsu.level * 100;
      if (player.ryo < cost) {
        return sock.sendMessage(jid, {
          text: `💰 Not enough Ryo!\n\nCost: ${cost} Ryo\nYour Ryo: ${player.ryo}`
        }, { quoted: msg });
      }

      player.ryo -= cost;
      if (!Array.isArray(player.jutsu)) player.jutsu = [];
      player.jutsu.push({ id: jutsu.id, name: jutsu.name });
      await player.save();

      const charName = JUTSU_CHARACTERS[jutsu.id] || null;

      const caption =
`🎉 *JUTSU LEARNED!*

🌀 ${jutsu.name}
⭐ Rank: ${jutsu.rank}
💥 Type: ${jutsu.type}
⚡ Damage: ${jutsu.damage}
💙 Chakra cost: ${jutsu.chakra}
🕐 Cooldown: ${jutsu.cooldown} turn(s)

💰 Ryo spent: ${cost}
💰 Ryo remaining: ${player.ryo}`;

      if (charName) {
        return sendWithCharacterImage(sock, jid, msg, caption, charName, "jutsu");
      }
      return sendWithNarutoTheme(sock, jid, msg, caption, "jutsu");

    } catch (err) {
      console.error("NLEARN ERROR:", err);
      await sock.sendMessage(jid, {
        text: "❌ Failed to learn jutsu. Please try again."
      }, { quoted: msg });
    }
  }
};
