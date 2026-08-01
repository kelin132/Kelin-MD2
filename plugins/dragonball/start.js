// plugins/dragonball/start.js
// DBZ character creation wizard (.dbzstart)
//   .dbzstart          → Step 1: choose your Race
//   .dbzstart <1-N>    → Step 2: choose your Character
//   .dbzstart <1-N>    → Creates the fighter and shows debut card

import players from "../../lib/dragonball/players.js";
import ranks   from "../../lib/dragonball/ranks.js";
import { RACES, RACE_CHARACTER_OPTIONS, getCharacterImage } from "../../lib/dragonballAPI.mjs";
import { generateProfileScene } from "../../lib/dbzBattleCanvas.mjs";
import { getRankName } from "../../lib/dragonball/utils.js";

// In-memory creation sessions: sender → { step, race, characterOptions }
const sessions = new Map();

function buildRaceMenu() {
  const raceEmojis = {
    Saiyan: "🐒", Human: "👤", Namekian: "💚",
    Android: "🤖", Majin: "🩷", "Frieza Race": "👽",
  };
  const lines = [
    "🐉 *DRAGON BALL Z — CHARACTER CREATION*",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "Choose your *Race*:",
    "",
  ];
  RACES.forEach((race, i) => {
    lines.push(`  *${i + 1}.* ${raceEmojis[race] || "⚡"} ${race}`);
  });
  lines.push("");
  lines.push("Reply with the number of your choice.");
  lines.push("_Example: .dbzstart 1_");
  return lines.join("\n");
}

function buildCharacterMenu(session) {
  const chars = session.characterOptions;
  const lines = [
    `🐉 *CHOOSE YOUR FIGHTER*`,
    `🌍 Race: *${session.race}*`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];
  chars.forEach((name, i) => {
    lines.push(`  *${i + 1}.* ⚡ ${name}`);
  });
  lines.push("");
  lines.push("Reply with the number of your character.");
  lines.push("_Example: .dbzstart 1_");
  return lines.join("\n");
}

async function finishCreation(sock, jid, msg, sender, username, session) {
  const raceBase = ranks[0]; // Starting stats (Earthling level)
  const raceBonus = {
    Saiyan: { attack: 5, hp: 10 },
    Human: { speed: 4, defense: 3 },
    Namekian: { defense: 5, ki: 20 },
    Android: { attack: 4, defense: 4 },
    Majin: { hp: 25 },
    "Frieza Race": { attack: 6, speed: 3 },
  }[session.race] || {};

  const baseStats = {
    hp:      (raceBase.hp  || 100) + (raceBonus.hp  || 0),
    ki:      (raceBase.ki  || 80)  + (raceBonus.ki  || 0),
    attack:  (raceBase.attack  || 10) + (raceBonus.attack  || 0),
    defense: (raceBase.defense || 8)  + (raceBonus.defense || 0),
    speed:   (raceBase.speed   || 10) + (raceBonus.speed   || 0),
  };

  const player = await players.create(sender, username, session.race, session.character, baseStats);

  // Fetch character image
  let imageUrl = null;
  try { imageUrl = await getCharacterImage(session.character); } catch { /**/ }
  if (imageUrl) {
    player.characterImageUrl = imageUrl;
    await player.save();
  }

  player.rank = getRankName(1);

  sessions.delete(sender);

  const caption = [
    `🐉 *WELCOME, ${username.toUpperCase()}!*`,
    ``,
    `Your fighter has been created:`,
    `🌍 Race: *${session.race}*`,
    `⚡ Character: *${session.character}*`,
    `🥊 Rank: *Earthling*`,
    ``,
    `❤️ HP: ${player.maxHp}  |  💠 KI: ${player.maxKi}`,
    `⚔️ ATK: ${player.attack}  |  🛡️ DEF: ${player.defense}  |  💨 SPD: ${player.speed}`,
    `💰 Starting Zeni: 500`,
    ``,
    `*Get started:*`,
    `• *.dbztrain* — Power up your fighter`,
    `• *.dbzhunt* — Hunt villains for XP`,
    `• *.dbzchallenge @user* — Challenge another fighter`,
    `• *.dbzprofile* — View your stats`,
  ].join("\n");

  let buf = null;
  try { buf = await generateProfileScene({ ...player, rank: "Earthling" }); } catch { /**/ }

  if (buf) {
    return sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
  }
  return sock.sendMessage(jid, { text: caption }, { quoted: msg });
}

export default {
  name: "dbzstart",
  description: "Create your Dragon Ball Z fighter",
  category: "dragonball",
  usage: ".dbzstart",
  aliases: ["dbzselect", "dbzbegin", "dbzroster"],
  cooldown: 3,

  async run({ sock, msg, text, sender }) {
    const jid = msg.key.remoteJid;

    try {
      const existing = await players.get(sender);
      if (existing) {
        return sock.sendMessage(jid, {
          text: [
            "⚡ *You already have a Dragon Ball Z fighter!*",
            "",
            `🐉 Character: *${existing.character}*`,
            `🌍 Race: *${existing.race}*`,
            `⭐ Level: *${existing.level}*`,
            "",
            "Use *.dbzprofile* to view your stats.",
          ].join("\n"),
        }, { quoted: msg });
      }

      const username = msg.pushName || sender.split("@")[0];
      const input = (text || "").trim();
      const session = sessions.get(sender);

      // No session → start the wizard
      if (!session) {
        sessions.set(sender, { step: "race" });
        return sock.sendMessage(jid, { text: buildRaceMenu() }, { quoted: msg });
      }

      const choice = parseInt(input, 10);

      // Step 1: pick race
      if (session.step === "race") {
        if (isNaN(choice) || choice < 1 || choice > RACES.length) {
          return sock.sendMessage(jid, {
            text: `❌ Invalid choice! Pick 1–${RACES.length}.\nExample: *.dbzstart 1*`,
          }, { quoted: msg });
        }
        session.race = RACES[choice - 1];
        session.characterOptions = RACE_CHARACTER_OPTIONS[session.race] || [];
        session.step = "character";
        return sock.sendMessage(jid, { text: buildCharacterMenu(session) }, { quoted: msg });
      }

      // Step 2: pick character
      if (session.step === "character") {
        const opts = session.characterOptions || [];
        if (isNaN(choice) || choice < 1 || choice > opts.length) {
          return sock.sendMessage(jid, {
            text: `❌ Invalid choice! Pick 1–${opts.length}.\nExample: *.dbzstart 1*`,
          }, { quoted: msg });
        }
        session.character = opts[choice - 1];
        return finishCreation(sock, jid, msg, sender, username, session);
      }

      // Fallback — restart
      sessions.set(sender, { step: "race" });
      return sock.sendMessage(jid, { text: buildRaceMenu() }, { quoted: msg });

    } catch (err) {
      console.error("DBZSTART ERROR:", err);
      sessions.delete(sender);
      return sock.sendMessage(jid, { text: "❌ Failed to create fighter profile. Try again." }, { quoted: msg });
    }
  },
};
