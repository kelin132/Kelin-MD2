// plugins/pokemon/battle.js
// Handles all battle subcommands: fight, run, item, pokeball

import { getBattle, updateBattle, endBattle, isMyTurn } from "../../lib/pokemon/battleState.mjs";
import { clearWild, updateWildHp } from "../../lib/pokemon/wildState.mjs";
import { getTrainer, removeItem } from "../../lib/pokemon/players.mjs";
import { addMoney } from "../economy/database.js";
import { getPokemon, updatePokemon, addPokemonXP, buildPokemon, savePokemon, getTrainerParty } from "../../lib/pokemon/pokemonDb.mjs";
import { addToParty, addToPC, updateTrainer } from "../../lib/pokemon/players.mjs";
import { calcDamage, tryCatch, xpReward, coinReward, getMovesForType, getLearnableMoveAtLevel, TYPE_EMOJIS } from "../../lib/pokemon/gameLogic.mjs";
import { generateBattleScene, generateCatchScene, generateBattleResult } from "../../lib/pokemon/canvas.mjs";
import { fetchPokemon } from "../../lib/pokemon/api.mjs";
import { setPendingLearn } from "../../lib/pokemon/moveLearnState.mjs";

async function sendScene(sock, jid, msg, battle, statusText, hitSide, damage, crit) {
  try {
    const buf = await generateBattleScene({
      player: {
        name: battle.challengerPokemon.displayName || battle.challengerPokemon.name,
        level: battle.challengerPokemon.level,
        hp: battle.challengerPokemon.hp,
        maxHp: battle.challengerPokemon.maxHp,
        imageUrl: battle.challengerPokemon.backImageUrl || battle.challengerPokemon.imageUrl,
        shiny: battle.challengerPokemon.shiny,
      },
      enemy: {
        name: battle.opponentPokemon.displayName || battle.opponentPokemon.name,
        level: battle.opponentPokemon.level,
        hp: battle.opponentPokemon.hp,
        maxHp: battle.opponentPokemon.maxHp,
        imageUrl: battle.opponentPokemon.imageUrl,
        shiny: battle.opponentPokemon.shiny,
      },
      round: battle.round,
      hitSide, damage, crit, statusText,
    });
    await sock.sendMessage(jid, { image: buf, caption: statusText }, { quoted: msg });
    return true;
  } catch {
    await sock.sendMessage(jid, { text: statusText }, { quoted: msg });
    return false;
  }
}

/** Format the move list with descriptions for display */
function formatMoveList(moves) {
  return moves.map((m, i) => {
    const emoji = TYPE_EMOJIS[m.type] || "⭐";
    const power = m.power ? `Power: ${m.power}` : "Status";
    const desc = m.desc ? `\n     📖 ${m.desc}` : "";
    return `*${i + 1}.* ${emoji} *${m.name}* (${power}, PP: ${m.pp})${desc}`;
  }).join("\n\n");
}

/** Check for a learnable move after level-up and prompt the trainer */
async function checkMoveLearn(sock, jid, msg, trainerJid, pokemonResult) {
  if (!pokemonResult?.leveledUp) return;

  const { newLevel, pokemon } = pokemonResult;
  const pokemon_name = pokemon.displayName || pokemon.name;
  const newMove = getLearnableMoveAtLevel(pokemon.primaryType, newLevel, pokemon.moves || []);
  if (!newMove) return;

  const currentMoves = pokemon.moves || [];
  const moveId = pokemon._id?.toString() || pokemon.id?.toString();

  setPendingLearn(trainerJid, {
    pokemonId: moveId,
    pokemonName: pokemon_name,
    newMove,
    currentMoves,
    chatId: jid,
  });

  const newEmoji = TYPE_EMOJIS[newMove.type] || "⭐";
  const currentList = currentMoves.map((m, i) => {
    const e = TYPE_EMOJIS[m.type] || "⭐";
    return `  *${i + 1}.* ${e} ${m.name} (Power: ${m.power || "—"})`;
  }).join("\n");

  await sock.sendMessage(jid, {
    text:
`🌟 *${pokemon_name.toUpperCase()} WANTS TO LEARN A NEW MOVE!*

${newEmoji} *${newMove.name}* (Power: ${newMove.power || "—"}, PP: ${newMove.pp})
📖 ${newMove.desc || "A powerful new move."}

*Current Moves:*
${currentList}

Reply *.learnmove <1-6>* to replace a move with *${newMove.name}*
Reply *.learnmove cancel* to skip this move.
⏳ *You have 60 seconds to decide!*`,
  }, { quoted: msg });
}

async function handleWildDefeat(sock, jid, msg, battle, trainer) {
  const wp = battle.opponentPokemon;
  const xp = xpReward(wp);
  const coins = coinReward(wp.level);

  const xpRes = await addPokemonXP(battle.challengerPokemon._id || battle.challengerPokemon.id, xp);
  await addMoney(battle.challengerJid, coins);

  endBattle(jid);
  clearWild(jid);

  const trainerName = trainer?.username || "Trainer";
  const myPokeName  = battle.challengerPokemon.displayName || battle.challengerPokemon.name;

  let resultText = `
🏆 *WILD ${(wp.displayName || wp.name).toUpperCase()} DEFEATED!*

🐉 *${trainerName}'s ${myPokeName}* won the battle!
✨ +${xp} XP`;

  if (xpRes?.leveledUp) {
    resultText += `\n🎉 *${(battle.challengerPokemon.displayName || battle.challengerPokemon.name)} leveled up! Now Lv.${xpRes.newLevel}*`;
  }

  try {
    const buf = await generateBattleResult({
      winner: { name: battle.challengerPokemon.displayName || battle.challengerPokemon.name, imageUrl: battle.challengerPokemon.imageUrl || battle.challengerPokemon.backImageUrl },
      loser: { name: wp.displayName || wp.name, imageUrl: wp.imageUrl },
      rewardText: `+${xp} XP`,
    });
    await sock.sendMessage(jid, { image: buf, caption: resultText }, { quoted: msg });
  } catch {
    await sock.sendMessage(jid, { text: resultText }, { quoted: msg });
  }

  // Check for move learn after battle ends
  await checkMoveLearn(sock, jid, msg, battle.challengerJid, xpRes);
}

async function handlePvPDefeat(sock, jid, msg, battle, loserJid) {
  const isChallenger = loserJid === battle.challengerJid;
  const winner = isChallenger ? { jid: battle.opponentJid, name: battle.opponentName, pokemon: battle.opponentPokemon }
                              : { jid: battle.challengerJid, name: battle.challengerName, pokemon: battle.challengerPokemon };
  const loser  = isChallenger ? { jid: battle.challengerJid, name: battle.challengerName, pokemon: battle.challengerPokemon }
                              : { jid: battle.opponentJid, name: battle.opponentName, pokemon: battle.opponentPokemon };

  const coins = coinReward((winner.pokemon.level + loser.pokemon.level) / 2) * 2;
  const xp = xpReward(loser.pokemon);

  const xpRes = await addPokemonXP(winner.pokemon._id || winner.pokemon.id, xp);
  await addMoney(winner.jid, coins);
  await updateTrainer(winner.jid, { $inc: { wins: 1 } });
  await updateTrainer(loser.jid, { $inc: { losses: 1 } });

  endBattle(jid);

  let resultText = `
🏆 *${winner.name.toUpperCase()} WINS THE BATTLE!*

🐉 *${winner.name}'s ${winner.pokemon.displayName || winner.pokemon.name}* defeated *${loser.name}'s ${loser.pokemon.displayName || loser.pokemon.name}*!
✨ +${xp} XP`;

  if (xpRes?.leveledUp) {
    resultText += `\n🎉 *${winner.pokemon.displayName || winner.pokemon.name} leveled up! Now Lv.${xpRes.newLevel}*`;
  }

  try {
    const buf = await generateBattleResult({
      winner: { name: winner.pokemon.displayName || winner.pokemon.name, imageUrl: winner.pokemon.imageUrl },
      loser: { name: loser.pokemon.displayName || loser.pokemon.name, imageUrl: loser.pokemon.imageUrl },
      rewardText: `${winner.name} wins! +${xp} XP`,
    });
    await sock.sendMessage(jid, { image: buf, caption: resultText }, { quoted: msg });
  } catch {
    await sock.sendMessage(jid, { text: resultText }, { quoted: msg });
  }

  // Check for move learn for the winner
  await checkMoveLearn(sock, jid, msg, winner.jid, xpRes);
}

export default {
  name: "battle",
  aliases: ["b"],
  description: "Battle commands: fight, run, item, pokeball",
  category: "pokemon",
  usage: ".battle <fight|run|item|pokeball> [args]",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();

    const battle = getBattle(jid);
    if (!battle) {
      return sock.sendMessage(jid, {
        text: "⚔️ No active battle here!\nUse *.catch* to start a wild battle or *.ch @user* to challenge someone.",
      }, { quoted: msg });
    }

    // Check if sender is in this battle
    const isChallenger = battle.challengerJid === sender;
    const isOpponent = battle.opponentJid === sender;
    if (!isChallenger && !isOpponent) {
      return sock.sendMessage(jid, { text: "❌ You are not in this battle!" }, { quoted: msg });
    }

    const myPokemon = isChallenger ? battle.challengerPokemon : battle.opponentPokemon;
    const enemyPokemon = isChallenger ? battle.opponentPokemon : battle.challengerPokemon;

    // ── RUN ──────────────────────────────────────────────────────────────────
    if (sub === "run" || sub === "flee") {
      if (battle.type === "pvp" && !isMyTurn(jid, sender)) {
        return sock.sendMessage(jid, { text: "⏳ Wait for your turn!" }, { quoted: msg });
      }
      endBattle(jid);
      if (battle.type === "wild") clearWild(jid);

      try {
        const buf = await generateBattleResult({
          winner: { name: enemyPokemon.displayName || enemyPokemon.name, imageUrl: enemyPokemon.imageUrl },
          loser: { name: myPokemon.displayName || myPokemon.name, imageUrl: myPokemon.imageUrl },
          rewardText: "Fled from battle!",
          outcome: "fled",
        });
        return sock.sendMessage(jid, { image: buf, caption: `🏃 *You fled from the battle!*` }, { quoted: msg });
      } catch {
        return sock.sendMessage(jid, { text: "🏃 You fled from the battle!" }, { quoted: msg });
      }
    }

    // ── FIGHT ─────────────────────────────────────────────────────────────────
    if (sub === "fight" || sub === "attack" || sub === "move") {
      if (!isMyTurn(jid, sender)) {
        return sock.sendMessage(jid, { text: "⏳ It's not your turn!" }, { quoted: msg });
      }

      const moves = myPokemon.moves || [];

      // No move number given → show moves with full explanations
      if (!args[1]) {
        const myName = myPokemon.displayName || myPokemon.name;
        const enemyName = enemyPokemon.displayName || enemyPokemon.name;
        return sock.sendMessage(jid, {
          text:
`⚔️ *${myName.toUpperCase()} — CHOOSE A MOVE!*

${formatMoveList(moves)}

━━━━━━━━━━━━━━━━━━━━
🐾 Enemy: *${enemyName}* Lv.${enemyPokemon.level} ❤️ ${enemyPokemon.hp}/${enemyPokemon.maxHp}

Reply: \`.battle fight <1-${moves.length}>\``,
        }, { quoted: msg });
      }

      const moveIdx = parseInt(args[1]) - 1;
      if (isNaN(moveIdx) || moveIdx < 0 || moveIdx >= moves.length) {
        return sock.sendMessage(jid, {
          text: `❌ Invalid move! Choose a number between *1* and *${moves.length}*.\nType \`.battle fight\` to see your moves.`,
        }, { quoted: msg });
      }

      const move = moves[moveIdx];
      const damage = calcDamage(myPokemon, enemyPokemon, move);
      const crit = Math.random() < 0.0625;
      const finalDmg = crit ? Math.floor(damage * 1.5) : damage;

      // Apply damage
      const newEnemyHp = Math.max(0, (enemyPokemon.hp || enemyPokemon.maxHp) - finalDmg);
      const myName = myPokemon.displayName || myPokemon.name;
      const enemyName = enemyPokemon.displayName || enemyPokemon.name;

      // Update battle state
      const updatedPokemon = { ...enemyPokemon, hp: newEnemyHp };
      const newState = {
        ...(isChallenger
          ? { opponentPokemon: updatedPokemon }
          : { challengerPokemon: updatedPokemon }),
        turn: isChallenger ? "opponent" : "challenger",
        round: battle.round + (isChallenger ? 0 : 1),
      };
      if (battle.type === "wild") updateWildHp(jid, newEnemyHp);

      const updated = updateBattle(jid, newState);

      const typeEmoji = TYPE_EMOJIS[move.type] || "⭐";
      const statusText = `${typeEmoji} *${myName}* used *${move.name}*!${crit ? " ⚡ Critical hit!" : ""}\n💥 -${finalDmg} HP to ${enemyName}${newEnemyHp <= 0 ? `\n💀 *${enemyName} fainted!*` : `\n❤️ ${enemyName}: ${newEnemyHp}/${enemyPokemon.maxHp}`}`;

      // ── Enemy fainted ──────────────────────────────────────────────────────
      if (newEnemyHp <= 0) {
        await sendScene(sock, jid, msg, updated, statusText, "enemy", finalDmg, crit);
        const trainer = await getTrainer(sender);
        if (battle.type === "wild") {
          await handleWildDefeat(sock, jid, msg, { ...battle, opponentPokemon: updatedPokemon }, trainer);
        } else {
          await handlePvPDefeat(sock, jid, msg, { ...battle, ...(isChallenger ? { opponentPokemon: updatedPokemon } : { challengerPokemon: updatedPokemon }) }, isChallenger ? battle.opponentJid : battle.challengerJid);
        }
        return;
      }

      await sendScene(sock, jid, msg, updated, statusText, "enemy", finalDmg, crit);

      // Wild auto-counter
      if (battle.type === "wild" && updated) {
        const wildMoves = updated.opponentPokemon.moves || [];
        if (wildMoves.length === 0) {
          // Wild has no moves — reset turn so player can attack again
          updateBattle(jid, { turn: "challenger" });
        } else {
          const wildMove = wildMoves[Math.floor(Math.random() * wildMoves.length)];
          const wildDmg = calcDamage(updated.opponentPokemon, updated.challengerPokemon, wildMove);
          const wildCrit = Math.random() < 0.0625;
          const wildFinalDmg = wildCrit ? Math.floor(wildDmg * 1.5) : wildDmg;
          const newPlayerHp = Math.max(0, updated.challengerPokemon.hp - wildFinalDmg);
          const updatedPlayer = { ...updated.challengerPokemon, hp: newPlayerHp };
          const stateAfterWild = updateBattle(jid, { challengerPokemon: updatedPlayer, turn: "challenger" });

          const wildEmoji = TYPE_EMOJIS[wildMove.type] || "⭐";
          const wildText = `${wildEmoji} *Wild ${enemyName}* used *${wildMove.name}*!${wildCrit ? " ⚡ Critical hit!" : ""}\n💥 -${wildFinalDmg} HP to ${myName}${newPlayerHp <= 0 ? `\n💀 *${myName} has fainted!*` : `\n❤️ ${myName}: ${newPlayerHp}/${updated.challengerPokemon.maxHp}`}`;

          if (newPlayerHp <= 0) {
            // Player's Pokémon fainted
            const tr = await getTrainer(sender);
            const trName = tr?.username || msg.pushName || "Trainer";
            endBattle(jid);
            clearWild(jid);
            const faintCaption = `💀 *${trName}'s ${myName} has fainted!*\nYou lost the battle. Use *.heal* to heal your party.`;
            try {
              const buf = await generateBattleResult({
                winner: { name: enemyName, imageUrl: updated.opponentPokemon.imageUrl },
                loser: { name: myName, imageUrl: updated.challengerPokemon.imageUrl },
                rewardText: `${trName}'s ${myName} fainted!`,
              });
              await sock.sendMessage(jid, { image: buf, caption: faintCaption }, { quoted: msg });
            } catch {
              await sock.sendMessage(jid, { text: faintCaption }, { quoted: msg });
            }
          } else if (stateAfterWild) {
            await sendScene(sock, jid, msg, stateAfterWild, wildText, "player", wildFinalDmg, wildCrit);
          }
        }
      }

      return;
    }

    // ── POKEBALL ──────────────────────────────────────────────────────────────
    if (sub === "pokeball" || sub === "catch" || sub === "ball") {
      if (battle.type !== "wild") {
        return sock.sendMessage(jid, { text: "❌ You can only throw a Pokéball at wild Pokémon!" }, { quoted: msg });
      }
      if (!isMyTurn(jid, sender)) {
        return sock.sendMessage(jid, { text: "⏳ It's not your turn!" }, { quoted: msg });
      }

      const validBalls = ["pokeball","greatball","ultraball","masterball","quickball","duskball","nestball","healball","timerball","luxuryball"];
      const ballType = (args[1] || "pokeball").toLowerCase().replace(/\s/g,"");
      const ball = validBalls.find(b => b.includes(ballType.replace("ball","")) || b === ballType) || "pokeball";

      const trainer = await getTrainer(sender);
      const hasIt = (trainer?.inventory?.[ball] || 0) > 0;
      if (!hasIt) {
        return sock.sendMessage(jid, {
          text: `❌ You don't have any *${ball}s*!\nBuy them at *.mart*`,
        }, { quoted: msg });
      }

      await removeItem(sender, ball, 1);

      const wp = battle.opponentPokemon;
      const { success } = tryCatch(ball, wp);

      let catchBuf;
      try {
        catchBuf = await generateCatchScene({
          pokemon: { name: wp.displayName || wp.name, imageUrl: wp.imageUrl, level: wp.level },
          ballType: ball,
          caught: success,
          trainerName: trainer.username || msg.pushName || "Trainer",
        });
      } catch {}

      if (success) {
        // Build and save the caught Pokémon
        let apiData;
        try { apiData = await fetchPokemon(wp.pokedexId || wp.name); } catch {}

        const caughtPoke = {
          pokedexId: wp.pokedexId,
          name: wp.name,
          displayName: wp.displayName,
          types: wp.types,
          primaryType: wp.primaryType,
          imageUrl: wp.imageUrl,
          backImageUrl: wp.imageUrl,
          baseHp: Math.round(wp.maxHp / (1 + wp.level * 0.05)),
          baseAttack: Math.round(wp.attack / (1 + wp.level * 0.05)),
          baseDefense: Math.round(wp.defense / (1 + wp.level * 0.05)),
          baseSpeed: Math.round((wp.speed || 10) / (1 + wp.level * 0.05)),
          baseSpAtk: 50,
          height: 10, weight: 100,
        };

        const built = buildPokemon(caughtPoke, sender, wp.level, false);
        if (ball === "healball") built.hp = built.maxHp;
        await savePokemon(built);

        const party = await getTrainerParty(sender);
        if (party.length < 6) {
          await addToParty(sender, built._id.toString());
          built.inParty = true;
        } else {
          await addToPC(sender, built._id.toString());
        }

        endBattle(jid);
        clearWild(jid);

        const caption = `🎉 *Gotcha! ${wp.displayName || wp.name} was caught!*\n${built.inParty ? "Added to your party! 🎒" : "Sent to PC. 💻"}`;
        if (catchBuf) {
          await sock.sendMessage(jid, { image: catchBuf, caption }, { quoted: msg });
        } else {
          await sock.sendMessage(jid, { text: caption }, { quoted: msg });
        }
      } else {
        updateBattle(jid, { turn: "challenger", catchAttempts: (battle.catchAttempts || 0) + 1 });

        const caption = `💨 *${wp.displayName || wp.name} broke free!*\nTry again or use a stronger ball.`;
        if (catchBuf) {
          await sock.sendMessage(jid, { image: catchBuf, caption }, { quoted: msg });
        } else {
          await sock.sendMessage(jid, { text: caption }, { quoted: msg });
        }
      }

      return;
    }

    // ── ITEM ──────────────────────────────────────────────────────────────────
    if (sub === "item" || sub === "use") {
      if (!isMyTurn(jid, sender)) {
        return sock.sendMessage(jid, { text: "⏳ It's not your turn!" }, { quoted: msg });
      }

      const itemKey = (args[1] || "").toLowerCase();
      if (!itemKey) {
        return sock.sendMessage(jid, { text: "Usage: `.battle item <potion|superpotion|hyperpotion|fullrestore>`" }, { quoted: msg });
      }

      const healAmounts = { potion: 20, superpotion: 50, hyperpotion: 200, fullrestore: 9999 };
      const healAmt = healAmounts[itemKey];
      if (!healAmt) {
        return sock.sendMessage(jid, { text: `❌ *${itemKey}* cannot be used in battle. Try: potion, superpotion, hyperpotion, fullrestore` }, { quoted: msg });
      }

      const removed = await removeItem(sender, itemKey, 1);
      if (!removed) {
        return sock.sendMessage(jid, { text: `❌ You don't have any *${itemKey}*! Buy from *.mart*` }, { quoted: msg });
      }

      const newHp = Math.min(myPokemon.maxHp, myPokemon.hp + healAmt);
      const healed = newHp - myPokemon.hp;
      const myUpdated = { ...myPokemon, hp: newHp };

      updateBattle(jid, isChallenger
        ? { challengerPokemon: myUpdated }
        : { opponentPokemon: myUpdated }
      );
      if (myPokemon._id) await updatePokemon(myPokemon._id, { hp: newHp });

      const myName = myPokemon.displayName || myPokemon.name;
      await sock.sendMessage(jid, {
        text: `💊 Used *${itemKey}* on ${myName}!\n❤️ +${healed} HP → ${newHp}/${myPokemon.maxHp}`,
      }, { quoted: msg });

      return;
    }

    // ── STATUS (default / no sub) ─────────────────────────────────────────────
    return sock.sendMessage(jid, {
      text:
`⚔️ *BATTLE STATUS*

🐉 Your Pokémon: *${myPokemon.displayName || myPokemon.name}* Lv.${myPokemon.level}
❤️ HP: ${myPokemon.hp}/${myPokemon.maxHp}

🐾 Enemy: *${enemyPokemon.displayName || enemyPokemon.name}* Lv.${enemyPokemon.level}
❤️ HP: ${enemyPokemon.hp}/${enemyPokemon.maxHp}

*Commands:*
\`.battle fight\` — See your moves & choose an attack
\`.battle fight <1-6>\` — Attack with a specific move
\`.battle pokeball <type>\` — Catch (wild only)
\`.battle item <item>\` — Use item
\`.battle run\` — Flee`,
    }, { quoted: msg });
  },
};
