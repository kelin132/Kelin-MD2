// plugins/pokemon/battle.js
// Handles all battle subcommands: fight, run, item, pokeball

import { getBattle, updateBattle, endBattle, isMyTurn } from "../../lib/pokemon/battleState.mjs";
import { clearWild, updateWildHp } from "../../lib/pokemon/wildState.mjs";
import { getTrainer, removeItem, addCoins } from "../../lib/pokemon/players.mjs";
import { getPokemon, updatePokemon, addPokemonXP, buildPokemon, savePokemon, getTrainerParty } from "../../lib/pokemon/pokemonDb.mjs";
import { addToParty, addToPC, updateTrainer } from "../../lib/pokemon/players.mjs";
import { calcDamage, tryCatch, xpReward, coinReward, getMovesForType } from "../../lib/pokemon/gameLogic.mjs";
import { generateBattleScene, generateCatchScene, generateBattleResult } from "../../lib/pokemon/canvas.mjs";
import { fetchPokemon } from "../../lib/pokemon/api.mjs";

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

async function handleWildDefeat(sock, jid, msg, battle, trainer) {
  const wp = battle.opponentPokemon;
  const xp = xpReward(wp);
  const coins = coinReward(wp.level);

  const xpRes = await addPokemonXP(battle.challengerPokemon._id || battle.challengerPokemon.id, xp);
  await addCoins(battle.challengerJid, coins);

  endBattle(jid);
  clearWild(jid);

  let resultText = `
🏆 *WILD ${(wp.displayName || wp.name).toUpperCase()} DEFEATED!*

🌟 *Rewards:*
💰 +${coins} coins
✨ +${xp} XP`;

  if (xpRes?.leveledUp) {
    resultText += `\n🎉 *${(battle.challengerPokemon.displayName || battle.challengerPokemon.name)} leveled up! Now Lv.${xpRes.newLevel}*`;
  }

  try {
    const buf = await generateBattleResult({
      winner: { name: battle.challengerPokemon.displayName || battle.challengerPokemon.name, imageUrl: battle.challengerPokemon.imageUrl || battle.challengerPokemon.backImageUrl },
      loser: { name: wp.displayName || wp.name, imageUrl: wp.imageUrl },
      rewardText: `+${coins} coins | +${xp} XP`,
    });
    await sock.sendMessage(jid, { image: buf, caption: resultText }, { quoted: msg });
  } catch {
    await sock.sendMessage(jid, { text: resultText }, { quoted: msg });
  }
}

async function handlePvPDefeat(sock, jid, msg, battle, loserJid) {
  const isChallenger = loserJid === battle.challengerJid;
  const winner = isChallenger ? { jid: battle.opponentJid, name: battle.opponentName, pokemon: battle.opponentPokemon }
                              : { jid: battle.challengerJid, name: battle.challengerName, pokemon: battle.challengerPokemon };
  const loser  = isChallenger ? { jid: battle.challengerJid, name: battle.challengerName, pokemon: battle.challengerPokemon }
                              : { jid: battle.opponentJid, name: battle.opponentName, pokemon: battle.opponentPokemon };

  const coins = coinReward((winner.pokemon.level + loser.pokemon.level) / 2) * 2;
  const xp = xpReward(loser.pokemon);
  await addCoins(winner.jid, coins);
  await addPokemonXP(winner.pokemon._id || winner.pokemon.id, xp);

  endBattle(jid);

  let resultText = `🏆 *BATTLE OVER!*\n\n🥇 Winner: *${winner.name}*\n💀 Loser: *${loser.name}*\n\n💰 +${coins} coins to ${winner.name}\n✨ +${xp} XP`;

  try {
    const buf = await generateBattleResult({
      winner: { name: winner.pokemon.displayName || winner.pokemon.name, imageUrl: winner.pokemon.imageUrl },
      loser: { name: loser.pokemon.displayName || loser.pokemon.name, imageUrl: loser.pokemon.imageUrl },
      rewardText: `${winner.name} wins! +${coins} coins | +${xp} XP`,
    });
    await sock.sendMessage(jid, { image: buf, caption: resultText }, { quoted: msg });
  } catch {
    await sock.sendMessage(jid, { text: resultText }, { quoted: msg });
  }
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
      const moveIdx = parseInt(args[1]) - 1;
      const moves = myPokemon.moves || [];
      if (isNaN(moveIdx) || moveIdx < 0 || moveIdx >= moves.length) {
        const list = moves.map((m, i) => `*${i + 1}.* ${m.name} (Power: ${m.power || "—"})`).join("\n");
        return sock.sendMessage(jid, {
          text: `📋 Choose a move:\n${list}\n\nUsage: \`.battle fight <1-${moves.length}>\``,
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

      const statusText = `${myName} used ${move.name}!${crit ? " Critical hit!" : ""} -${finalDmg} HP${newEnemyHp <= 0 ? `\n${enemyName} fainted!` : ""}`;
      const hitSide = "enemy";

      // Check faint
      if (newEnemyHp <= 0) {
        // Update battle state before sending result
        updateBattle(jid, newState);
        if (battle.type === "wild") {
          return handleWildDefeat(sock, jid, msg, updated, null);
        } else {
          return handlePvPDefeat(sock, jid, msg, updated, enemyPokemon.ownerJid || battle.opponentJid);
        }
      }

      // Wild Pokémon counterattacks
      let counterText = "";
      if (battle.type === "wild") {
        const wildMoves = enemyPokemon.moves || [{ name: "Tackle", power: 40 }];
        const wMove = wildMoves[Math.floor(Math.random() * wildMoves.length)];
        const wDmg = calcDamage(enemyPokemon, myPokemon, wMove);
        const newMyHp = Math.max(0, myPokemon.hp - wDmg);

        const myUpdated = { ...myPokemon, hp: newMyHp };
        updateBattle(jid, { challengerPokemon: myUpdated, turn: "challenger" });
        if (myPokemon._id) await updatePokemon(myPokemon._id, { hp: newMyHp });

        counterText = `\n🐾 Wild ${enemyName} used ${wMove.name}! -${wDmg} HP`;
        if (newMyHp <= 0) counterText += `\n💔 ${myName} fainted!`;

        if (newMyHp <= 0) {
          endBattle(jid);
          clearWild(jid);
          return sock.sendMessage(jid, {
            text: `💔 *${myName} fainted!*\n\nYou lost the battle. Use *.heal* to recover your Pokémon.`,
          }, { quoted: msg });
        }
      }

      // Build the updated battle object for canvas
      const displayBattle = getBattle(jid) || updated;
      await sendScene(sock, jid, msg, displayBattle, statusText + counterText, hitSide, finalDmg, crit);

      if (battle.type === "pvp") {
        const nextTurn = isChallenger ? battle.opponentName : battle.challengerName;
        await sock.sendMessage(jid, { text: `⏳ It's *${nextTurn}'s* turn!\nUse \`.battle fight <1-4>\`` }, { quoted: msg });
      }
      return;
    }

    // ── POKEBALL ─────────────────────────────────────────────────────────────
    if (sub === "pokeball" || sub === "ball" || sub === "throw") {
      if (battle.type !== "wild") {
        return sock.sendMessage(jid, { text: "❌ You can only throw Pokéballs at wild Pokémon!" }, { quoted: msg });
      }
      if (!isMyTurn(jid, sender)) {
        return sock.sendMessage(jid, { text: "⏳ It's not your turn!" }, { quoted: msg });
      }

      const ballType = (args[1] || "pokeball").toLowerCase().replace(/\s+/g, "").replace("ball", "ball");
      const validBalls = ["pokeball","greatball","ultraball","masterball","premierball","healball","duskball","netball","luxuryball","quickball"];
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
        // Heal ball heals to full
        if (ball === "healball") built.hp = built.maxHp;
        await savePokemon(built);

        const trainerData = await getTrainer(sender);
        const partyFull = (trainerData?.party || []).length >= 6;
        if (!partyFull) {
          await addToParty(sender, built._id.toString());
          built.inParty = true;
        } else {
          await addToPC(sender, built._id.toString());
        }

        endBattle(jid);
        clearWild(jid);

        const dest = partyFull ? "📦 PC" : "🎒 Party";
        const resultText = `🎉 *GOTCHA!* ${wp.displayName} was caught!\nSent to your ${dest}.`;

        if (catchBuf) {
          await sock.sendMessage(jid, { image: catchBuf, caption: resultText }, { quoted: msg });
        } else {
          await sock.sendMessage(jid, { text: resultText }, { quoted: msg });
        }
      } else {
        // Failed — wild Pokémon attacks back
        const wildMoves = wp.moves || [{ name: "Tackle", power: 40 }];
        const wMove = wildMoves[Math.floor(Math.random() * wildMoves.length)];
        const wDmg = calcDamage(wp, myPokemon, wMove);
        const newMyHp = Math.max(0, myPokemon.hp - wDmg);
        const myUpdated = { ...myPokemon, hp: newMyHp };
        updateBattle(jid, { challengerPokemon: myUpdated });
        if (myPokemon._id) await updatePokemon(myPokemon._id, { hp: newMyHp });

        const failText = `${wp.displayName} broke free!\n🐾 Wild ${wp.displayName} used ${wMove.name}! -${wDmg} HP`;

        if (catchBuf) {
          await sock.sendMessage(jid, { image: catchBuf, caption: failText }, { quoted: msg });
        } else {
          await sock.sendMessage(jid, { text: `❌ ${failText}` }, { quoted: msg });
        }

        if (newMyHp <= 0) {
          endBattle(jid);
          clearWild(jid);
          await sock.sendMessage(jid, { text: `💔 ${myPokemon.displayName || myPokemon.name} fainted! The wild ${wp.displayName} escaped.` }, { quoted: msg });
        }
      }
      return;
    }

    // ── ITEM ─────────────────────────────────────────────────────────────────
    if (sub === "item" || sub === "use") {
      const itemKey = (args[1] || "").toLowerCase();
      if (!itemKey) {
        return sock.sendMessage(jid, {
          text: "Usage: `.battle item <item>`\nHeal items: potion, superpotion, hyperpotion, fullrestore, revive",
        }, { quoted: msg });
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

    // ── STATUS ────────────────────────────────────────────────────────────────
    return sock.sendMessage(jid, {
      text:
`⚔️ *BATTLE STATUS*

🐉 Your Pokémon: *${myPokemon.displayName || myPokemon.name}* Lv.${myPokemon.level}
❤️ HP: ${myPokemon.hp}/${myPokemon.maxHp}

🐾 Enemy: *${enemyPokemon.displayName || enemyPokemon.name}* Lv.${enemyPokemon.level}
❤️ HP: ${enemyPokemon.hp}/${enemyPokemon.maxHp}

*Commands:*
\`.battle fight <1-4>\` — Attack
\`.battle pokeball <type>\` — Catch (wild only)
\`.battle item <item>\` — Use item
\`.battle run\` — Flee`,
    }, { quoted: msg });
  },
};
