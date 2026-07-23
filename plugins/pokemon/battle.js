// plugins/pokemon/battle.js
// Handles all battle subcommands: fight, run, item, pokeball, switch

import { getBattle, updateBattle, endBattle, isMyTurn } from "../../lib/pokemon/battleState.mjs";
import { clearWild, updateWildHp } from "../../lib/pokemon/wildState.mjs";
import { getTrainer, removeItem } from "../../lib/pokemon/players.mjs";
import { addMoney } from "../economy/database.js";
import { updatePokemon, addPokemonXP, buildPokemon, savePokemon, getTrainerParty, getPokemonXpNeeded } from "../../lib/pokemon/pokemonDb.mjs";
import { addToParty, addToPC, updateTrainer } from "../../lib/pokemon/players.mjs";
import { calcDamage, tryCatch, xpReward, coinReward, getMovesForType, getLearnableMoveAtLevel, getLevelEvolution, TYPE_EMOJIS, TYPE_MOVES } from "../../lib/pokemon/gameLogic.mjs";
import { generateBattleScene, generateCatchScene, generateBattleResult } from "../../lib/pokemon/canvas.mjs";
import { fetchPokemon } from "../../lib/pokemon/api.mjs";
import { setPendingLearn } from "../../lib/pokemon/moveLearnState.mjs";
import { MART_ITEMS } from "../../lib/pokemon/martItems.mjs";

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const DELAY = 3000; // 3-second delay between messages

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

/** Show the current battle status and whose turn it is. */
async function sendBattlePrompt(sock, jid, msg, myPokemon, enemyPokemon, battleType, turnName = null) {
  const myName    = myPokemon.displayName    || myPokemon.name;
  const enemyName = enemyPokemon.displayName || enemyPokemon.name;
  const isWild    = battleType === "wild";
  const heading   = !isWild && turnName
    ? `⚔️ *${turnName}'S TURN!*`
    : "⚔️ *BATTLE STARTED!*";

  const catchLine = isWild
    ? `\n🎾 \`.battle pokeball <type>\` — Throw a Pokéball`
    : "";
  const xpNeeded = getPokemonXpNeeded(myPokemon.level);
  const xpText = xpNeeded > 0 ? `${myPokemon.xp || 0}/${xpNeeded}` : "MAX LEVEL";

  await sock.sendMessage(jid, {
    text:
`${heading}

🐉 Your Pokémon: *${myName}* Lv.${myPokemon.level}
❤️ HP: ${myPokemon.hp}/${myPokemon.maxHp}
✨ XP: ${xpText}

🐾 ${isWild ? "Wild" : "Opponent"}: *${enemyName}* Lv.${enemyPokemon.level}
❤️ HP: ${enemyPokemon.hp}/${enemyPokemon.maxHp}

*Battle Commands:*
⚔️ \`.battle fight\` — See your moves
⚔️ \`.battle switch\` — Switch Pokémon${catchLine}
💊 \`.battle item <item>\` — Use a heal item
🏃 \`.battle run\` — Flee from battle`,
  }, { quoted: msg });
}

/** Show the current PvP state from the next player's point of view. */
async function sendNextPvPPrompt(sock, jid, msg, battle) {
  const nextIsChallenger = battle.turn === "challenger";
  const nextPokemon = nextIsChallenger
    ? battle.challengerPokemon
    : battle.opponentPokemon;
  const nextEnemy = nextIsChallenger
    ? battle.opponentPokemon
    : battle.challengerPokemon;
  const nextName = nextIsChallenger
    ? battle.challengerName
    : battle.opponentName;

  await sendBattlePrompt(sock, jid, msg, nextPokemon, nextEnemy, "pvp", nextName);
}

/** Format the move list with descriptions and command hints for display */
function formatMoveList(moves) {
  return moves.map((m, i) => {
    const emoji = TYPE_EMOJIS[m.type] || "⭐";
    const power = m.power ? `Power: ${m.power}` : "Status";
    const desc  = m.desc ? `\n   📖 *What it does:* ${m.desc}` : "";
    return `*${i + 1}.* ${emoji} *${m.name}* (${power}, PP: ${m.pp})${desc}\n   ➤ Use \`.battle fight ${i + 1}\``;
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

  const newEmoji  = TYPE_EMOJIS[newMove.type] || "⭐";
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
  const wp    = battle.opponentPokemon;
  const xp    = xpReward(wp);
  const coins = coinReward(wp.level);
  const pokeId = battle.challengerPokemon._id || battle.challengerPokemon.id;

  const xpRes = await addPokemonXP(pokeId, xp);
  await addMoney(battle.challengerJid, coins);

  endBattle(jid);
  clearWild(jid);

  const trainerName = trainer?.username || "Trainer";
  const myPokeName  = battle.challengerPokemon.displayName || battle.challengerPokemon.name;

  let resultText =
`🏆 *WILD ${(wp.displayName || wp.name).toUpperCase()} DEFEATED!*

🐉 *${trainerName}'s ${myPokeName}* won the battle!
✨ +${xp} XP  💰 +${coins} coins`;

  if (xpRes?.leveledUp) {
    resultText += `\n🎉 *${myPokeName} leveled up! Now Lv.${xpRes.newLevel}!*`;

    // ── Auto-evolve on level up ─────────────────────────────────────────────
    const evoTarget = getLevelEvolution(battle.challengerPokemon.name, xpRes.newLevel);
    if (evoTarget) {
      try {
        const newApiData  = await fetchPokemon(evoTarget);
        const evolved     = await evolvePokemon(pokeId, newApiData);
        if (evolved) {
          const evolvedName = evolved.displayName || evolved.name;
          resultText += `\n\n✨ *WHAT?! ${myPokeName.toUpperCase()} IS EVOLVING!*\n🌟 *${myPokeName}* → *${evolvedName}*! 🎉`;
        }
      } catch {}
    }
  }

  try {
    const buf = await generateBattleResult({
      winner: { name: myPokeName, imageUrl: battle.challengerPokemon.imageUrl || battle.challengerPokemon.backImageUrl },
      loser:  { name: wp.displayName || wp.name, imageUrl: wp.imageUrl },
      rewardText: `+${xp} XP`,
    });
    await sock.sendMessage(jid, { image: buf, caption: resultText }, { quoted: msg });
  } catch {
    await sock.sendMessage(jid, { text: resultText }, { quoted: msg });
  }

  await checkMoveLearn(sock, jid, msg, battle.challengerJid, xpRes);
}

async function handlePvPDefeat(sock, jid, msg, battle, loserJid) {
  const isChallenger = loserJid === battle.challengerJid;
  const winner = isChallenger
    ? { jid: battle.opponentJid,   name: battle.opponentName,   pokemon: battle.opponentPokemon }
    : { jid: battle.challengerJid, name: battle.challengerName, pokemon: battle.challengerPokemon };
  const loser  = isChallenger
    ? { jid: battle.challengerJid, name: battle.challengerName, pokemon: battle.challengerPokemon }
    : { jid: battle.opponentJid,   name: battle.opponentName,   pokemon: battle.opponentPokemon };

  const coins     = coinReward((winner.pokemon.level + loser.pokemon.level) / 2) * 2;
  const xp        = xpReward(loser.pokemon);
  const winnerId  = winner.pokemon._id || winner.pokemon.id;

  const xpRes = await addPokemonXP(winnerId, xp);
  await addMoney(winner.jid, coins);
  await updateTrainer(winner.jid, { $inc: { wins: 1 } });
  await updateTrainer(loser.jid,  { $inc: { losses: 1 } });

  endBattle(jid);

  const winPokeName = winner.pokemon.displayName || winner.pokemon.name;
  let resultText =
`🏆 *${winner.name.toUpperCase()} WINS THE BATTLE!*

🐉 *${winner.name}'s ${winPokeName}* defeated *${loser.name}'s ${loser.pokemon.displayName || loser.pokemon.name}*!
✨ +${xp} XP  💰 +${coins} coins`;

  if (xpRes?.leveledUp) {
    resultText += `\n🎉 *${winPokeName} leveled up! Now Lv.${xpRes.newLevel}!*`;

    // ── Auto-evolve on level up ────────────────────────────────────────────
    const evoTarget = getLevelEvolution(winner.pokemon.name, xpRes.newLevel);
    if (evoTarget) {
      try {
        const newApiData  = await fetchPokemon(evoTarget);
        const evolved     = await evolvePokemon(winnerId, newApiData);
        if (evolved) {
          const evolvedName = evolved.displayName || evolved.name;
          resultText += `\n\n✨ *WHAT?! ${winPokeName.toUpperCase()} IS EVOLVING!*\n🌟 *${winPokeName}* → *${evolvedName}*! 🎉`;
        }
      } catch {}
    }
  }

  try {
    const buf = await generateBattleResult({
      winner: { name: winner.pokemon.displayName || winner.pokemon.name, imageUrl: winner.pokemon.imageUrl },
      loser:  { name: loser.pokemon.displayName  || loser.pokemon.name,  imageUrl: loser.pokemon.imageUrl },
      rewardText: `${winner.name} wins! +${xp} XP`,
    });
    await sock.sendMessage(jid, { image: buf, caption: resultText }, { quoted: msg });
  } catch {
    await sock.sendMessage(jid, { text: resultText }, { quoted: msg });
  }

  await checkMoveLearn(sock, jid, msg, winner.jid, xpRes);
}


/**
 * Handle a player's Pokémon fainting.
 * If they have other alive Pokémon, keep the battle alive and prompt a switch.
 * If they have none left, end the battle.
 */
async function handlePlayerFaint(sock, jid, msg, battle, trainerJid, faintedPokemon, enemyPokemon, isWild) {
  const tr     = await getTrainer(trainerJid);
  const trName = tr?.username || msg.pushName || "Trainer";
  const faintedName = faintedPokemon.displayName || faintedPokemon.name;

  // Persist hp = 0 to DB
  if (faintedPokemon._id) {
    await updatePokemon(faintedPokemon._id, { hp: 0 }).catch(() => {});
  }

  // Check for other alive Pokémon
  const party      = await getTrainerParty(trainerJid);
  const curId      = (faintedPokemon._id || faintedPokemon.id)?.toString();
  const otherAlive = (party || []).filter(p => {
    const pid = (p._id || p.id)?.toString();
    return (p.hp || 0) > 0 && pid !== curId;
  });

  const faintText = `💀 *${trName}'s ${faintedName} has fainted!*`;

  if (otherAlive.length > 0) {
    // Keep the battle going — challenger must switch
    const isChallenger = battle.challengerJid === trainerJid;
    updateBattle(jid, isChallenger
      ? { challengerPokemon: { ...faintedPokemon, hp: 0 }, turn: "challenger" }
      : { opponentPokemon:   { ...faintedPokemon, hp: 0 }, turn: "opponent"   }
    );

    const partyList = otherAlive.map((p, i) => {
      const emoji = TYPE_EMOJIS[p.primaryType] || "⭐";
      return `${i + 1}. ${emoji} *${p.displayName || p.name}* Lv.${p.level} ❤️ ${p.hp}/${p.maxHp}`;
    }).join("\n");

    await sock.sendMessage(jid, {
      text:
`${faintText}

🔄 *Send out another Pokémon to continue!*

*Available Pokémon:*
${partyList}

➤ \`.battle switch <slot number>\` to keep fighting!`,
    }, { quoted: msg });
  } else {
    // No more Pokémon — trainer blacks out
    endBattle(jid);
    if (isWild) clearWild(jid);

    const caption = `${faintText}\n☠️ *${trName} has no Pokémon left! You blacked out!*\nUse *.heal* to recover your party.`;
    try {
      const buf = await generateBattleResult({
        winner: { name: enemyPokemon.displayName || enemyPokemon.name, imageUrl: enemyPokemon.imageUrl },
        loser:  { name: faintedName, imageUrl: faintedPokemon.imageUrl },
        rewardText: `${trName} blacked out!`,
      });
      await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
    } catch {
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    }
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default {
  name: "battle",
  aliases: ["b"],
  description: "Battle commands: fight, run, item, pokeball, switch",
  category: "pokemon",
  usage: ".battle <fight|run|item|pokeball|switch> [args]",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();

    const battle = getBattle(jid);
    if (!battle) {
      return sock.sendMessage(jid, {
        text: "⚔️ No active battle here!\nUse *.catch* to start a wild battle or *.ch @user* to challenge someone.",
      }, { quoted: msg });
    }

    const isChallenger = battle.challengerJid === sender;
    const isOpponent   = battle.opponentJid   === sender;
    if (!isChallenger && !isOpponent) {
      return sock.sendMessage(jid, { text: "❌ You are not in this battle!" }, { quoted: msg });
    }

    const myPokemon    = isChallenger ? battle.challengerPokemon : battle.opponentPokemon;
    const enemyPokemon = isChallenger ? battle.opponentPokemon   : battle.challengerPokemon;

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
          loser:  { name: myPokemon.displayName    || myPokemon.name,    imageUrl: myPokemon.imageUrl },
          rewardText: "Fled from battle!",
          outcome: "fled",
        });
        return sock.sendMessage(jid, { image: buf, caption: "🏃 *You fled from the battle!*" }, { quoted: msg });
      } catch {
        return sock.sendMessage(jid, { text: "🏃 You fled from the battle!" }, { quoted: msg });
      }
    }

    // ── ITEM (show bag menu if no args, or use an item) ───────────────────────
    if (sub === "item" || sub === "items" || sub === "use" || sub === "bag") {
      if (!isMyTurn(jid, sender)) {
        return sock.sendMessage(jid, { text: "⏳ It's not your turn!" }, { quoted: msg });
      }

      const trainer = await getTrainer(sender);
      const inv     = trainer?.inventory || {};

      // No item specified → show full in-battle bag
      if (!args[1]) {
        const myName    = myPokemon.displayName    || myPokemon.name;
        const enemyName = enemyPokemon.displayName || enemyPokemon.name;

        // Pokéballs
        const ballKeys = ["pokeball","greatball","ultraball","masterball","premierball","healball","duskball","netball","luxuryball","quickball","beastball"];
        const ballLines = ballKeys.filter(k => (inv[k] || 0) > 0).map(k => {
          const item = MART_ITEMS[k];
          return `  ${item?.emoji || "🎾"} *${item?.name || k}* × ${inv[k]}  — ${item?.desc || ""}\n     ➤ \`.battle pokeball ${k}\``;
        });

        // Healing items
        const healKeys = ["potion","superpotion","hyperpotion","fullrestore","revive","maxrevive"];
        const healLines = healKeys.filter(k => (inv[k] || 0) > 0).map(k => {
          const item = MART_ITEMS[k];
          return `  ${item?.emoji || "💊"} *${item?.name || k}* × ${inv[k]}  — ${item?.desc || ""}\n     ➤ \`.battle item ${k}\``;
        });

        // Battle items
        const battleKeys = ["xattack","xdefense","xspeed"];
        const battleLines = battleKeys.filter(k => (inv[k] || 0) > 0).map(k => {
          const item = MART_ITEMS[k];
          return `  ${item?.emoji || "⚔️"} *${item?.name || k}* × ${inv[k]}  — ${item?.desc || ""}\n     ➤ \`.battle item ${k}\``;
        });

        const hasBalls   = ballLines.length   > 0;
        const hasHeals   = healLines.length   > 0;
        const hasBattles = battleLines.length > 0;

        const nothingMsg = (!hasBalls && !hasHeals && !hasBattles)
          ? "\n⚠️ *Your bag is empty!* Visit *.mart* to buy items."
          : "";

        return sock.sendMessage(jid, {
          text:
`🎒 *BATTLE BAG*
🐉 ${myName} Lv.${myPokemon.level} ❤️ ${myPokemon.hp}/${myPokemon.maxHp}
🐾 ${enemyName} Lv.${enemyPokemon.level} ❤️ ${enemyPokemon.hp}/${enemyPokemon.maxHp}

${hasBalls ? `🎾 *POKÉBALLS* ${battle.type !== "wild" ? "_(wild battles only)_" : ""}\n${ballLines.join("\n")}\n` : ""}${hasHeals ? `\n💊 *HEALING ITEMS*\n${healLines.join("\n")}\n` : ""}${hasBattles ? `\n⚔️ *BATTLE ITEMS*\n${battleLines.join("\n")}\n` : ""}${nothingMsg}
━━━━━━━━━━━━━━━━━━━━
🔙 Back to moves: \`.battle fight\``,
        }, { quoted: msg });
      }

      const itemKey = args[1].toLowerCase().replace(/\s/g, "");

      // If a ball was specified under .battle item, redirect to pokeball logic
      const ballTypes = ["pokeball","greatball","ultraball","masterball","premierball","healball","duskball","netball","luxuryball","quickball"];
      if (ballTypes.some(b => b === itemKey || itemKey.includes(b.replace("ball","")))) {
        if (battle.type !== "wild") {
          return sock.sendMessage(jid, { text: "❌ You can only throw a Pokéball at wild Pokémon!" }, { quoted: msg });
        }
        // Fall through to the pokeball section by calling it inline
        args[0] = "pokeball";
        args[1] = itemKey;
        // re-run as pokeball
      } else {
        // Healing & battle items
        const healAmounts = { potion: 20, superpotion: 50, hyperpotion: 200, fullrestore: 9999, revive: -1, maxrevive: -2 };
        const healAmt = healAmounts[itemKey];

        // Battle boost items
        const boostItems = {
          xattack:  { stat: "attack",  mult: 1.5, label: "Attack ↑50%" },
          xdefense: { stat: "defense", mult: 1.5, label: "Defense ↑50%" },
          xspeed:   { stat: "speed",   mult: 1.5, label: "Speed ↑50%" },
        };

        if (healAmt === undefined && !boostItems[itemKey]) {
          return sock.sendMessage(jid, {
            text: `❌ *${itemKey}* can't be used in battle.\n\nType \`.battle item\` to see your available items.`,
          }, { quoted: msg });
        }

        const removed = await removeItem(sender, itemKey, 1);
        if (!removed) {
          return sock.sendMessage(jid, { text: `❌ You don't have any *${itemKey}*! Visit *.mart* to buy items.` }, { quoted: msg });
        }

        const martItem = MART_ITEMS[itemKey];
        const myName   = myPokemon.displayName || myPokemon.name;

        let resultMsg;

        if (boostItems[itemKey]) {
          // Boost item
          const boost   = boostItems[itemKey];
          const current = myPokemon[boost.stat] || 10;
          const newVal  = Math.floor(current * boost.mult);
          const updatedPoke = { ...myPokemon, [boost.stat]: newVal };
          updateBattle(jid, isChallenger
            ? { challengerPokemon: updatedPoke, ...(battle.type === "pvp" ? { turn: "opponent" } : {}) }
            : { opponentPokemon: updatedPoke, ...(battle.type === "pvp" ? { turn: "challenger" } : {}) }
          );
          resultMsg = `${martItem?.emoji || "⚔️"} Used *${martItem?.name || itemKey}* on ${myName}!\n📈 ${boost.label}`;
        } else if (itemKey === "revive" || itemKey === "maxrevive") {
          // Revive (can't use on active Pokemon if alive, but allow for edge cases)
          const restoreHp = itemKey === "maxrevive" ? myPokemon.maxHp : Math.floor(myPokemon.maxHp / 2);
          const newHp     = restoreHp;
          const updatedPoke = { ...myPokemon, hp: newHp };
          updateBattle(jid, isChallenger
            ? { challengerPokemon: updatedPoke, ...(battle.type === "pvp" ? { turn: "opponent" } : {}) }
            : { opponentPokemon: updatedPoke, ...(battle.type === "pvp" ? { turn: "challenger" } : {}) }
          );
          if (myPokemon._id) await updatePokemon(myPokemon._id, { hp: newHp });
          resultMsg = `${martItem?.emoji || "💫"} Used *${martItem?.name || itemKey}* on ${myName}!\n❤️ HP → ${newHp}/${myPokemon.maxHp}`;
        } else {
          // Heal
          const newHp   = Math.min(myPokemon.maxHp, myPokemon.hp + healAmt);
          const healed  = newHp - myPokemon.hp;
          const updatedPoke = { ...myPokemon, hp: newHp };
          updateBattle(jid, isChallenger
            ? { challengerPokemon: updatedPoke, ...(battle.type === "pvp" ? { turn: "opponent" } : {}) }
            : { opponentPokemon: updatedPoke, ...(battle.type === "pvp" ? { turn: "challenger" } : {}) }
          );
          if (myPokemon._id) await updatePokemon(myPokemon._id, { hp: newHp });
          resultMsg = `${martItem?.emoji || "💊"} Used *${martItem?.name || itemKey}* on ${myName}!\n❤️ +${healed} HP → ${newHp}/${myPokemon.maxHp}`;
        }

        await sock.sendMessage(jid, { text: resultMsg }, { quoted: msg });

        // 3-second delay then show battle prompt
        await sleep(DELAY);
        const freshBattle = getBattle(jid);
        if (freshBattle) {
          if (battle.type === "pvp") {
            await sendNextPvPPrompt(sock, jid, msg, freshBattle);
          } else {
            const freshMy    = isChallenger ? freshBattle.challengerPokemon : freshBattle.opponentPokemon;
            const freshEnemy = isChallenger ? freshBattle.opponentPokemon   : freshBattle.challengerPokemon;
            await sendBattlePrompt(sock, jid, msg, freshMy, freshEnemy, battle.type);
          }
        }
        return;
      }
    }

    // ── POKEBALL ──────────────────────────────────────────────────────────────
    if (sub === "pokeball" || sub === "catch" || sub === "ball" || (sub === "item" && args[1])) {
      if (battle.type !== "wild") {
        return sock.sendMessage(jid, { text: "❌ You can only throw a Pokéball at wild Pokémon!" }, { quoted: msg });
      }
      if (!isMyTurn(jid, sender)) {
        return sock.sendMessage(jid, { text: "⏳ It's not your turn!" }, { quoted: msg });
      }

      const validBalls = ["pokeball","greatball","ultraball","masterball","premierball","healball","duskball","netball","luxuryball","quickball","beastball"];
      const rawInput   = (args[1] || "pokeball").toLowerCase().replace(/\s/g, "");
      const ball       = validBalls.find(b => b === rawInput || rawInput.includes(b.replace("ball", ""))) || "pokeball";

      const trainer = await getTrainer(sender);
      const hasIt   = (trainer?.inventory?.[ball] || 0) > 0;
      if (!hasIt) {
        return sock.sendMessage(jid, {
          text: `❌ You don't have any *${MART_ITEMS[ball]?.name || ball}s*!\nBuy them at *.mart* or type \`.battle item\` to see what you have.`,
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
          baseHp:      Math.round(wp.maxHp    / (1 + wp.level * 0.05)),
          baseAttack:  Math.round(wp.attack   / (1 + wp.level * 0.05)),
          baseDefense: Math.round(wp.defense  / (1 + wp.level * 0.05)),
          baseSpeed:   Math.round((wp.speed || 10) / (1 + wp.level * 0.05)),
          baseSpAtk: 50, height: 10, weight: 100,
        };

        const built = buildPokemon(caughtPoke, sender, wp.level, false);
        if (ball === "healball") built.hp = built.maxHp;
        await savePokemon(built);

        const party = await getTrainerParty(sender);
        if (party.length < 6) {
          await addToParty(sender, built._id.toString());
          await updatePokemon(built._id, { inParty: true });
          built.inParty = true;
        } else {
          await addToPC(sender, built._id.toString());
        }

        endBattle(jid);
        clearWild(jid);

        const caption = `🎉 *Gotcha! ${wp.displayName || wp.name} was caught!*\n${built.inParty ? "Added to your party! 🎒" : "Sent to PC. 💻"}`;
        if (catchBuf) await sock.sendMessage(jid, { image: catchBuf, caption }, { quoted: msg });
        else          await sock.sendMessage(jid, { text: caption }, { quoted: msg });

      } else {
        updateBattle(jid, { turn: "challenger", catchAttempts: (battle.catchAttempts || 0) + 1 });

        const caption = `💨 *${wp.displayName || wp.name} broke free!*\nTry again or use a stronger ball.`;
        if (catchBuf) await sock.sendMessage(jid, { image: catchBuf, caption }, { quoted: msg });
        else          await sock.sendMessage(jid, { text: caption }, { quoted: msg });

        // 3-second delay then re-show battle prompt
        await sleep(DELAY);
        const freshBattle = getBattle(jid);
        if (freshBattle) {
          const freshMy    = isChallenger ? freshBattle.challengerPokemon : freshBattle.opponentPokemon;
          const freshEnemy = isChallenger ? freshBattle.opponentPokemon   : freshBattle.challengerPokemon;
          await sendBattlePrompt(sock, jid, msg, freshMy, freshEnemy, "wild");
        }
      }

      return;
    }

    // ── SWITCH ────────────────────────────────────────────────────────────────
    if (sub === "switch" || sub === "swap") {
      if (!isMyTurn(jid, sender)) {
        return sock.sendMessage(jid, { text: "⏳ It's not your turn!" }, { quoted: msg });
      }

      const party      = await getTrainerParty(sender);
      const aliveParty = (party || []).filter(p => p.hp > 0);

      if (!args[1]) {
        // When current Pokémon is fainted (hp=0), we only need 1 alive; when alive we need 2+
        const myCurrentAlive = (myPokemon.hp || 0) > 0;
        const minimumNeeded  = myCurrentAlive ? 2 : 1;
        if (aliveParty.length < minimumNeeded) {
          return sock.sendMessage(jid, {
            text: "❌ You have no other Pokémon to switch to!\nAll others have fainted. Use *.heal* after battle.",
          }, { quoted: msg });
        }

        const myCurrentId = (myPokemon._id || myPokemon.id)?.toString();
        const partyList   = aliveParty.map((p, i) => {
          const isCurrent = (p._id || p.id)?.toString() === myCurrentId;
          const emoji     = TYPE_EMOJIS[p.primaryType] || "⭐";
          return `${i + 1}. ${emoji} *${p.displayName || p.name}* Lv.${p.level} ❤️ ${p.hp}/${p.maxHp}${isCurrent ? " *(current)*" : ""}`;
        }).join("\n");

        return sock.sendMessage(jid, {
          text:
`🔄 *SWITCH POKÉMON*

*Your Party (alive):*
${partyList}

Reply: \`.battle switch <slot number>\``,
        }, { quoted: msg });
      }

      const slotNum  = parseInt(args[1]);
      if (isNaN(slotNum) || slotNum < 1 || slotNum > aliveParty.length) {
        return sock.sendMessage(jid, {
          text: `❌ Invalid slot! Choose between *1* and *${aliveParty.length}*.\nType \`.battle switch\` to see your party.`,
        }, { quoted: msg });
      }

      const newPoke     = aliveParty[slotNum - 1];
      const myCurrentId = (myPokemon._id || myPokemon.id)?.toString();
      const newPokeId   = (newPoke._id || newPoke.id)?.toString();

      if (newPokeId === myCurrentId) {
        return sock.sendMessage(jid, {
          text: `❌ *${newPoke.displayName || newPoke.name}* is already in battle!`,
        }, { quoted: msg });
      }

      updateBattle(jid, isChallenger
        ? { challengerPokemon: newPoke, turn: "opponent" }
        : { opponentPokemon: newPoke, turn: "challenger" }
      );

      const oldName = myPokemon.displayName || myPokemon.name;
      const newName = newPoke.displayName   || newPoke.name;

      await sock.sendMessage(jid, {
        text: `🔄 *${oldName}* → *${newName}*!\n${newName} is now in battle! ❤️ ${newPoke.hp}/${newPoke.maxHp}`,
      }, { quoted: msg });

      // Wild auto-counter after switch
      if (battle.type === "wild") {
        const currentBattle = getBattle(jid);
        if (!currentBattle) return;
        const wildMoves = currentBattle.opponentPokemon.moves || [];
        if (wildMoves.length > 0) {
          const wildMove     = wildMoves[Math.floor(Math.random() * wildMoves.length)];
          const wildDmg      = calcDamage(currentBattle.opponentPokemon, newPoke, wildMove);
          const wildCrit     = Math.random() < 0.0625;
          const wildFinalDmg = wildCrit ? Math.floor(wildDmg * 1.5) : wildDmg;
          const newPlayerHp  = Math.max(0, newPoke.hp - wildFinalDmg);
          const updatedSwitched = { ...newPoke, hp: newPlayerHp };
          const stateAfterWild  = updateBattle(jid, isChallenger
            ? { challengerPokemon: updatedSwitched, turn: "challenger" }
            : { opponentPokemon:   updatedSwitched, turn: "opponent" }
          );

          const wildEmoji = TYPE_EMOJIS[wildMove.type] || "⭐";
          const wildEnemyName = currentBattle.opponentPokemon.displayName || currentBattle.opponentPokemon.name;

          // Step 1 (switch counter) — "Wild Pokémon used Move"
          const wildSwitchUsedText = `${wildEmoji} *Wild ${wildEnemyName}* used *${wildMove.name}*!${wildCrit ? " ⚡ Critical hit!" : ""}`;
          await sock.sendMessage(jid, { text: wildSwitchUsedText }, { quoted: msg });
          await sleep(DELAY);

          // Step 2 (switch counter) — Damage scene image
          const wildSwitchDamageCaption = newPlayerHp <= 0
            ? `💥 *Wild ${wildEnemyName}* dealt *${wildFinalDmg}* damage to *${newName}*!\n💀 *${newName} has fainted!*`
            : `💥 *Wild ${wildEnemyName}* dealt *${wildFinalDmg}* damage to *${newName}*!\n❤️ ${newName}: ${newPlayerHp}/${newPoke.maxHp}`;

          if (newPlayerHp <= 0) {
            await handlePlayerFaint(sock, jid, msg, { ...currentBattle, challengerJid: sender }, sender, updatedSwitched, currentBattle.opponentPokemon, true);
          } else if (stateAfterWild) {
            await sendScene(sock, jid, msg, stateAfterWild, wildSwitchDamageCaption, "player", wildFinalDmg, wildCrit);
            await sleep(DELAY);
            const freshBattle = getBattle(jid);
            if (freshBattle) {
              const freshMy = isChallenger ? freshBattle.challengerPokemon : freshBattle.opponentPokemon;
              await sendBattlePrompt(sock, jid, msg, freshMy, freshBattle.opponentPokemon, "wild");
            }
          }
        } else {
          updateBattle(jid, { turn: "challenger" });
          await sleep(DELAY);
          const freshBattle = getBattle(jid);
          if (freshBattle) {
            await sendBattlePrompt(sock, jid, msg, newPoke, freshBattle.opponentPokemon, "wild");
          }
        }
      } else if (battle.type === "pvp") {
        await sleep(DELAY);
        const freshBattle = getBattle(jid);
        if (freshBattle) {
          await sendNextPvPPrompt(sock, jid, msg, freshBattle);
        }
      }

      return;
    }

    // ── FIGHT ─────────────────────────────────────────────────────────────────
    if (sub === "fight" || sub === "attack" || sub === "move") {
      if (!isMyTurn(jid, sender)) {
        return sock.sendMessage(jid, { text: "⏳ It's not your turn!" }, { quoted: msg });
      }

      const moves  = myPokemon.moves || [];
      const myName = myPokemon.displayName    || myPokemon.name;
      const eName  = enemyPokemon.displayName || enemyPokemon.name;

      // No move number → show moves panel
      if (!args[1]) {
        return sock.sendMessage(jid, {
          text:
`⚔️ *${myName.toUpperCase()} — CHOOSE A MOVE!*

${formatMoveList(moves)}

━━━━━━━━━━━━━━━━━━━━
🐾 Enemy: *${eName}* Lv.${enemyPokemon.level} ❤️ ${enemyPokemon.hp}/${enemyPokemon.maxHp}
💊 Items: \`.battle item\`  🔄 Switch: \`.battle switch\``,
        }, { quoted: msg });
      }

      const moveIdx = parseInt(args[1]) - 1;
      if (isNaN(moveIdx) || moveIdx < 0 || moveIdx >= moves.length) {
        return sock.sendMessage(jid, {
          text: `❌ Invalid move! Choose 1–${moves.length}.\nType \`.battle fight\` to see your moves.`,
        }, { quoted: msg });
      }

      const move      = moves[moveIdx];
      const damage    = calcDamage(myPokemon, enemyPokemon, move);
      const crit      = Math.random() < 0.0625;
      const finalDmg  = crit ? Math.floor(damage * 1.5) : damage;
      const newEnemyHp = Math.max(0, (enemyPokemon.hp || enemyPokemon.maxHp) - finalDmg);

      const updatedEnemy = { ...enemyPokemon, hp: newEnemyHp };
      const newState = {
        ...(isChallenger ? { opponentPokemon: updatedEnemy } : { challengerPokemon: updatedEnemy }),
        turn:  isChallenger ? "opponent" : "challenger",
        round: battle.round + (isChallenger ? 0 : 1),
      };
      if (battle.type === "wild") updateWildHp(jid, newEnemyHp);

      const updated    = updateBattle(jid, newState);
      const typeEmoji  = TYPE_EMOJIS[move.type] || "⭐";

      // Step 1 — "Pokémon used Move" (text only, no damage yet)
      const usedText = `${typeEmoji} *${myName}* used *${move.name}*!${crit ? " ⚡ Critical hit!" : ""}`;
      await sock.sendMessage(jid, { text: usedText }, { quoted: msg });
      await sleep(DELAY);

      // Step 2 — Damage scene image with dealt-damage caption
      const damageCaption = newEnemyHp <= 0
        ? `💥 *${myName}* dealt *${finalDmg}* damage to *${eName}*!\n💀 *${eName} fainted!*`
        : `💥 *${myName}* dealt *${finalDmg}* damage to *${eName}*!\n❤️ ${eName}: ${newEnemyHp}/${enemyPokemon.maxHp}`;

      // Enemy fainted
      if (newEnemyHp <= 0) {
        await sendScene(sock, jid, msg, updated, damageCaption, "enemy", finalDmg, crit);
        const trainer = await getTrainer(sender);
        if (battle.type === "wild") {
          await handleWildDefeat(sock, jid, msg, { ...battle, opponentPokemon: updatedEnemy, challengerJid: battle.challengerJid }, trainer);
        } else {
          await handlePvPDefeat(sock, jid, msg,
            { ...battle, ...(isChallenger ? { opponentPokemon: updatedEnemy } : { challengerPokemon: updatedEnemy }) },
            isChallenger ? battle.opponentJid : battle.challengerJid
          );
        }
        return;
      }

      // Show damage scene
      await sendScene(sock, jid, msg, updated, damageCaption, "enemy", finalDmg, crit);

      // Wild auto-counter
      if (battle.type === "wild" && updated) {
        const wildMoves = updated.opponentPokemon.moves || [];

        if (wildMoves.length === 0) {
          updateBattle(jid, { turn: "challenger" });
          await sleep(DELAY);
          const freshBattle = getBattle(jid);
          if (freshBattle) {
            await sendBattlePrompt(sock, jid, msg,
              isChallenger ? freshBattle.challengerPokemon : freshBattle.opponentPokemon,
              isChallenger ? freshBattle.opponentPokemon   : freshBattle.challengerPokemon,
              "wild"
            );
          }
        } else {
          const wildMove     = wildMoves[Math.floor(Math.random() * wildMoves.length)];
          const wildDmg      = calcDamage(updated.opponentPokemon, updated.challengerPokemon, wildMove);
          const wildCrit     = Math.random() < 0.0625;
          const wildFinalDmg = wildCrit ? Math.floor(wildDmg * 1.5) : wildDmg;
          const newPlayerHp  = Math.max(0, updated.challengerPokemon.hp - wildFinalDmg);
          const updatedPlayer   = { ...updated.challengerPokemon, hp: newPlayerHp };
          const stateAfterWild  = updateBattle(jid, { challengerPokemon: updatedPlayer, turn: "challenger" });

          const wildEmoji = TYPE_EMOJIS[wildMove.type] || "⭐";

          // Step 1 (wild counter) — "Wild Pokémon used Move"
          const wildUsedText = `${wildEmoji} *Wild ${eName}* used *${wildMove.name}*!${wildCrit ? " ⚡ Critical hit!" : ""}`;
          await sleep(DELAY);
          await sock.sendMessage(jid, { text: wildUsedText }, { quoted: msg });
          await sleep(DELAY);

          // Step 2 (wild counter) — Damage scene image
          const wildDamageCaption = newPlayerHp <= 0
            ? `💥 *Wild ${eName}* dealt *${wildFinalDmg}* damage to *${myName}*!\n💀 *${myName} has fainted!*`
            : `💥 *Wild ${eName}* dealt *${wildFinalDmg}* damage to *${myName}*!\n❤️ ${myName}: ${newPlayerHp}/${updated.challengerPokemon.maxHp}`;

          if (newPlayerHp <= 0) {
            // Show the damage scene first, then handle faint
            await sendScene(sock, jid, msg, stateAfterWild || updated, wildDamageCaption, "player", wildFinalDmg, wildCrit);
            await handlePlayerFaint(sock, jid, msg, battle, sender, updatedPlayer, updated.opponentPokemon, true);
          } else if (stateAfterWild) {
            // Show wild counter damage scene
            await sendScene(sock, jid, msg, stateAfterWild, wildDamageCaption, "player", wildFinalDmg, wildCrit);
            // Step 3 — 3-second delay then re-prompt player
            await sleep(DELAY);
            const freshBattle = getBattle(jid);
            if (freshBattle) {
              await sendBattlePrompt(sock, jid, msg,
                isChallenger ? freshBattle.challengerPokemon : freshBattle.opponentPokemon,
                isChallenger ? freshBattle.opponentPokemon   : freshBattle.challengerPokemon,
                "wild"
              );
            }
          }
        }
      } else if (battle.type === "pvp" && updated) {
        // PvP — show the complete battle prompt for the next player.
        await sleep(DELAY);
        const freshBattle = getBattle(jid);
        if (freshBattle) {
          await sendNextPvPPrompt(sock, jid, msg, freshBattle);
        }
      }

      return;
    }

    // ── STATUS (default / no sub) ─────────────────────────────────────────────
    const _isWild = battle.type === "wild";
    return sock.sendMessage(jid, {
      text:
`⚔️ *BATTLE STARTED!*

🐉 Your Pokémon: *${myPokemon.displayName || myPokemon.name}* Lv.${myPokemon.level}
❤️ HP: ${myPokemon.hp}/${myPokemon.maxHp}

🐾 ${_isWild ? "Wild" : "Opponent"}: *${enemyPokemon.displayName || enemyPokemon.name}* Lv.${enemyPokemon.level}
❤️ HP: ${enemyPokemon.hp}/${enemyPokemon.maxHp}

*Battle Commands:*
⚔️ \`.battle fight\` — See your moves
⚔️ \`.battle switch\` — Switch Pokémon${_isWild ? `\n🎾 \`.battle pokeball <type>\` — Throw a Pokéball` : ""}
💊 \`.battle item <item>\` — Use a heal item
🏃 \`.battle run\` — Flee from battle`,
    }, { quoted: msg });
  },
};
