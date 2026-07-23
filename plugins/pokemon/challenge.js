// plugins/pokemon/challenge.js
// Challenge another trainer to a Pokémon battle

import { getTrainer, pickLeadFromParty } from "../../lib/pokemon/players.mjs";
import { getTrainerParty } from "../../lib/pokemon/pokemonDb.mjs";
import {
  setPendingChallenge, getIncomingChallenge,
  clearPendingChallenge, startPvPBattle, hasBattle,
} from "../../lib/pokemon/battleState.mjs";
import { generateBattleScene } from "../../lib/pokemon/canvas.mjs";

export default {
  name: "challenge",
  aliases: ["ch", "pvp", "pokebattle"],
  description: "Challenge a user to a Pokémon battle, or accept an incoming challenge",
  category: "pokemon",
  usage: ".ch @user  or  .ch accept",

  async run({ sock, msg, sender, args, text }) {
    const jid = msg.key.remoteJid;

    // Accept incoming challenge
    if ((args[0] || "").toLowerCase() === "accept") {
      const incoming = getIncomingChallenge(sender);
      if (!incoming) {
        return sock.sendMessage(jid, {
          text: "❌ You have no pending challenge to accept!",
        }, { quoted: msg });
      }

      if (hasBattle(jid)) {
        return sock.sendMessage(jid, { text: "⚔️ A battle is already happening here!" }, { quoted: msg });
      }

      const challengerTrainer = await getTrainer(incoming.challengerJid);
      const opponentTrainer = await getTrainer(sender);
      if (!challengerTrainer || !opponentTrainer) {
        return sock.sendMessage(jid, { text: "❌ One of the trainers hasn't started their journey!" }, { quoted: msg });
      }

      const challengerParty = await getTrainerParty(incoming.challengerJid);
      const opponentParty = await getTrainerParty(sender);

      const challengerLead = pickLeadFromParty(challengerTrainer, challengerParty);
      const opponentLead   = pickLeadFromParty(opponentTrainer,   opponentParty);

      if (!challengerLead || !opponentLead) {
        clearPendingChallenge(incoming.challengerJid);
        return sock.sendMessage(jid, {
          text: "❌ One of the trainers has no healthy Pokémon! Use *.heal* first.",
        }, { quoted: msg });
      }

      clearPendingChallenge(incoming.challengerJid);

      const battle = startPvPBattle(jid,
        { jid: incoming.challengerJid, username: challengerTrainer.username, pokemon: challengerLead },
        { jid: sender, username: opponentTrainer.username || msg.pushName, pokemon: opponentLead }
      );

      const moveList = (pokemon) =>
        (pokemon.moves || []).map((m, i) => `  *${i + 1}.* ${m.name} (Power: ${m.power || "—"})`).join("\n");

      let buf;
      try {
        buf = await generateBattleScene({
          player: {
            name: challengerLead.displayName || challengerLead.name,
            level: challengerLead.level,
            hp: challengerLead.hp,
            maxHp: challengerLead.maxHp,
            imageUrl: challengerLead.backImageUrl || challengerLead.imageUrl,
            shiny: challengerLead.shiny,
          },
          enemy: {
            name: opponentLead.displayName || opponentLead.name,
            level: opponentLead.level,
            hp: opponentLead.hp,
            maxHp: opponentLead.maxHp,
            imageUrl: opponentLead.imageUrl,
            shiny: opponentLead.shiny,
          },
          round: 1,
          statusText: `${challengerTrainer.username} vs ${opponentTrainer.username || msg.pushName}!`,
        });
      } catch {}

      const caption =
`⚔️ *${challengerTrainer.username}'S TURN!*

🔵 ${challengerTrainer.username}: *${challengerLead.displayName}* Lv.${challengerLead.level} ❤️${challengerLead.hp}/${challengerLead.maxHp}
🔴 ${opponentTrainer.username || msg.pushName}: *${opponentLead.displayName}* Lv.${opponentLead.level} ❤️${opponentLead.hp}/${opponentLead.maxHp}

*Battle Commands:*
⚔️ \`.battle fight\` — See your moves
⚔️ \`.battle switch\` — Switch Pokémon
💊 \`.battle item <item>\` — Use a heal item
🏃 \`.battle run\` — Forfeit`;

      if (buf) {
        await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text: caption }, { quoted: msg });
      }
      return;
    }

    // Send a challenge
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!mentioned || mentioned.length === 0) {
      return sock.sendMessage(jid, {
        text: "Usage: *.ch @user* — mention someone to challenge them\nOr *.ch accept* — to accept a challenge",
      }, { quoted: msg });
    }

    const targetJid = mentioned[0];
    if (targetJid === sender) {
      return sock.sendMessage(jid, { text: "❌ You can't challenge yourself!" }, { quoted: msg });
    }

    const challenger = await getTrainer(sender);
    if (!challenger) {
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }

    const opponent = await getTrainer(targetJid);
    if (!opponent) {
      return sock.sendMessage(jid, { text: "❌ That trainer hasn't started their Pokémon journey yet!" }, { quoted: msg });
    }

    const party = await getTrainerParty(sender);
    const lead = pickLeadFromParty(challenger, party);
    if (!lead || lead.hp <= 0) {
      return sock.sendMessage(jid, {
        text: "💔 All your Pokémon have fainted! Use *.heal* first.",
      }, { quoted: msg });
    }

    setPendingChallenge(sender, targetJid, jid, lead);

    await sock.sendMessage(jid, {
      text: `⚔️ *BATTLE CHALLENGE!*\n\n*${challenger.username}* challenges @${targetJid.split("@")[0]} to a Pokémon battle!\n\n🐉 Their lead: *${lead.displayName}* Lv.${lead.level}\n\nType *.ch accept* to accept within 2 minutes!`,
      mentions: [targetJid],
    }, { quoted: msg });
  },
};
