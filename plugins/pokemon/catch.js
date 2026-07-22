// plugins/pokemon/catch.js
// Initiate a battle with the wild Pokémon currently in the group

import { getWild, clearWild } from "../../lib/pokemon/wildState.mjs";
import { getTrainer } from "../../lib/pokemon/players.mjs";
import { getTrainerParty } from "../../lib/pokemon/pokemonDb.mjs";
import { startWildBattle, hasBattle } from "../../lib/pokemon/battleState.mjs";
import { generateBattleScene } from "../../lib/pokemon/canvas.mjs";

export default {
  name: "catch",
  aliases: ["fight", "engage"],
  description: "Battle a wild Pokémon that has appeared",
  category: "pokemon",
  usage: ".catch",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    const wild = getWild(jid);
    if (!wild) {
      return sock.sendMessage(jid, {
        text: "🌿 No wild Pokémon here right now.\nUse *.spawnpoke* to encounter one!",
      }, { quoted: msg });
    }

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, {
        text: "❌ Start your journey first! Use *.startjourney*",
      }, { quoted: msg });
    }

    if (hasBattle(jid)) {
      return sock.sendMessage(jid, {
        text: "⚔️ A battle is already happening here!",
      }, { quoted: msg });
    }

    const party = await getTrainerParty(sender);
    if (!party || party.length === 0) {
      return sock.sendMessage(jid, {
        text: "❌ You have no Pokémon in your party! Use *.t2party* to move one from PC.",
      }, { quoted: msg });
    }

    // Pick lead Pokémon (first healthy one)
    const lead = party.find(p => p.hp > 0) || party[0];
    if (lead.hp <= 0) {
      return sock.sendMessage(jid, {
        text: "💔 All your Pokémon have fainted! Use *.heal* to restore them.",
      }, { quoted: msg });
    }

    const battle = startWildBattle(
      jid,
      { jid: sender, username: trainer.username || msg.pushName || "Trainer", pokemon: lead },
      wild.pokemon
    );

    const moves = lead.moves.map((m, i) => `  *${i + 1}.* ${m.name} (Power: ${m.power || "—"})`).join("\n");

    let sceneBuffer;
    try {
      sceneBuffer = await generateBattleScene({
        player: { name: lead.displayName || lead.name, level: lead.level, hp: lead.hp, maxHp: lead.maxHp, imageUrl: lead.backImageUrl || lead.imageUrl, shiny: lead.shiny },
        enemy: { name: wild.pokemon.displayName || wild.pokemon.name, level: wild.pokemon.level, hp: wild.pokemon.hp, maxHp: wild.pokemon.maxHp, imageUrl: wild.pokemon.imageUrl, shiny: false },
        round: 1,
        statusText: `${lead.displayName} vs Wild ${wild.pokemon.displayName}!`,
      });
    } catch {}

    const caption =
`⚔️ *BATTLE STARTED!*

🐉 Your Pokémon: *${lead.displayName || lead.name}* Lv.${lead.level}
❤️ HP: ${lead.hp}/${lead.maxHp}

🐾 Wild: *${wild.pokemon.displayName}* Lv.${wild.pokemon.level}
❤️ HP: ${wild.pokemon.hp}/${wild.pokemon.maxHp}

📋 *Your Moves:*
${moves}

*Battle Commands:*
⚔️ \`.battle fight <1-4>\` — Use a move
🎾 \`.battle pokeball <type>\` — Throw a Pokéball
💊 \`.battle item <item>\` — Use a heal item
🏃 \`.battle run\` — Flee from battle`;

    if (sceneBuffer) {
      await sock.sendMessage(jid, { image: sceneBuffer, caption }, { quoted: msg });
    } else {
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    }
  },
};
