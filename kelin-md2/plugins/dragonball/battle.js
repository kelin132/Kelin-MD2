/**
 * KELIN MD — DBZ Battle Handler (plugins/dbz/battle.js)
 * .dbzbattle fight <1-6>  — use a move
 * .dbzbattle run          — flee
 *
 * Mirrors plugins/pokemon/battle.js pattern.
 * Handles both PvP (dbzchallenge) and villain fights (dbzfight).
 */

import { getBattle, updateBattle, endBattle, isMyTurn } from "../../lib/dbz/battleState.mjs";
import { clearVillain } from "../../lib/dbz/villainState.mjs";
import { addFighterXP, updateFighter, recordResult } from "../../lib/dbz/dbzDb.mjs";
import {
  BATTLE_MOVE_LIST, DBZ_MOVES,
  calcDamage, isCriticalHit,
  regenKi, spendKi, applyTransform,
  pvpXpReward, xpRewardVillain, zeniReward, getXpNeeded,
} from "../../lib/dbz/gameLogic.mjs";
import {
  generateBattleScene, generateBattleResult, generateTransformScene,
} from "../../lib/dbz/canvas.mjs";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const DELAY = 3000;

// ── Scene sender ───────────────────────────────────────────────────────────────
async function sendScene(sock, jid, msg, battle, statusText, hitSide, damage, crit, isKiBlast = false) {
  try {
    const cFighter = battle.challengerFighter;
    const oFighter = battle.opponentFighter;
    const buf = await generateBattleScene({
      player: {
        name:    cFighter.name,
        level:   cFighter.level,
        hp:      cFighter.hp,
        maxHp:   cFighter.maxHp,
        ki:      cFighter.ki || 0,
        maxKi:   cFighter.maxKi || 300,
        imageUrl: cFighter.imageUrl,
        race:    cFighter.race,
        transformed: !!cFighter.transformed,
        auraColor:   cFighter.auraColor || null,
      },
      enemy: {
        name:    oFighter.name,
        level:   oFighter.level,
        hp:      oFighter.hp,
        maxHp:   oFighter.maxHp,
        ki:      oFighter.ki || 0,
        maxKi:   oFighter.maxKi || 300,
        imageUrl: oFighter.imageUrl,
        race:    oFighter.race,
        transformed: !!oFighter.transformed,
        auraColor:   oFighter.auraColor || null,
      },
      round: battle.round,
      hitSide, damage, crit, statusText, isKiBlast,
    });
    await sock.sendMessage(jid, { image: buf, caption: statusText }, { quoted: msg });
    return true;
  } catch {
    await sock.sendMessage(jid, { text: statusText }, { quoted: msg });
    return false;
  }
}

// ── Battle prompt ──────────────────────────────────────────────────────────────
async function sendBattlePrompt(sock, jid, msg, battle, activeJid) {
  const isChallenger = activeJid === battle.challengerJid;
  const myFighter    = isChallenger ? battle.challengerFighter : battle.opponentFighter;
  const enFighter    = isChallenger ? battle.opponentFighter   : battle.challengerFighter;
  const isVillain    = battle.type === "villain";

  const moveLines = BATTLE_MOVE_LIST.map((m, i) => {
    const kiTag  = m.cost > 0 ? ` (💠 ${m.cost} Ki)` : "";
    const locked = m.id === "transform" && !(myFighter.forms || []).length ? " _(no forms)_" : "";
    const locked2 = m.cost > 0 && (myFighter.ki || 0) < m.cost ? " ❌ not enough Ki" : "";
    return `  *${i + 1}.* ${m.emoji} *${m.name}*${kiTag}${locked}${locked2} — ${m.desc}`;
  }).join("\n");

  const jidNum = activeJid ? activeJid.split("@")[0] : null;
  const tag    = jidNum ? `@${jidNum}` : "Fighter";

  await sock.sendMessage(jid, {
    text:
`⚡ *Your Turn!* ⚡

🐉 *${myFighter.name}* Lv.${myFighter.level}
   ❤️ HP: ${myFighter.hp}/${myFighter.maxHp}  💠 Ki: ${Math.floor(myFighter.ki || 0)}/${myFighter.maxKi || 300}${myFighter.transformed ? ` 🌟 [${myFighter.currentFormName}]` : ""}

━━━━━━━━━━━━━━━━━━━━

${isVillain ? "👹" : "🔴"} *${enFighter.name}* Lv.${enFighter.level}
   ❤️ HP: ${enFighter.hp}/${enFighter.maxHp}${enFighter.transformed ? ` 🌟 [${enFighter.currentFormName}]` : ""}

━━━━━━━━━━━━━━━━━━━━

⚔️ *Choose your move, ${tag}:*

${moveLines}

➤ \`.dbzbattle fight <1-${BATTLE_MOVE_LIST.length}>\`
➤ \`.dbzbattle run\` — flee`,
    mentions: activeJid ? [activeJid] : [],
  }, { quoted: msg });
}

// ── Villain AI ─────────────────────────────────────────────────────────────────
function villainAiMove(villain) {
  // Prioritize special if enough Ki, otherwise basic attacks
  if ((villain.ki || 0) >= 50 && Math.random() < 0.35) return DBZ_MOVES.special;
  if ((villain.ki || 0) >= 20 && Math.random() < 0.45) return DBZ_MOVES.ki_blast;
  return Math.random() < 0.5 ? DBZ_MOVES.punch : DBZ_MOVES.kick;
}

// ── End battle (villain) ───────────────────────────────────────────────────────
async function handleVillainDefeat(sock, jid, msg, battle) {
  const myFighter   = battle.challengerFighter;
  const villain     = battle.opponentFighter;
  const username    = battle.challengerName || msg.pushName || "Fighter";

  const xp    = xpRewardVillain(villain.level);
  const zeni  = zeniReward(villain.level);

  endBattle(jid);
  clearVillain(jid);

  const xpRes = await addFighterXP(battle.challengerJid, xp).catch(() => null);
  // Add zeni via the economy system if available
  try {
    const { addMoney } = await import("../economy/database.js");
    await addMoney(battle.challengerJid, zeni);
  } catch {}

  let resultText =
`🏆 *${villain.name} was defeated!*

⚡ *${username}'s ${myFighter.name}* wins!
✨ +${xp} XP  💰 +${zeni} Zeni`;

  if (xpRes?.leveledUp) {
    resultText += `\n🎉 *${myFighter.name} leveled up! Now Lv.${xpRes.newLevel}!*`;
  }

  try {
    const buf = await generateBattleResult({
      winner: { name: myFighter.name, imageUrl: myFighter.imageUrl },
      loser:  { name: villain.name,   imageUrl: villain.imageUrl },
      rewardText: `+${xp} XP  +${zeni} Zeni`,
      outcome: "victory",
    });
    await sock.sendMessage(jid, { image: buf, caption: resultText }, { quoted: msg });
  } catch {
    await sock.sendMessage(jid, { text: resultText }, { quoted: msg });
  }
}

// ── End battle (PvP) ───────────────────────────────────────────────────────────
async function handlePvPVictory(sock, jid, msg, battle, loserJid) {
  const isLoserChallenger = loserJid === battle.challengerJid;
  const winnerJid = isLoserChallenger ? battle.opponentJid   : battle.challengerJid;
  const loser   = {
    jid:     loserJid,
    name:    isLoserChallenger ? battle.challengerName  : battle.opponentName,
    fighter: isLoserChallenger ? battle.challengerFighter : battle.opponentFighter,
  };
  const winner  = {
    jid:     winnerJid,
    name:    isLoserChallenger ? battle.opponentName    : battle.challengerName,
    fighter: isLoserChallenger ? battle.opponentFighter : battle.challengerFighter,
  };

  endBattle(jid);

  const xp    = pvpXpReward(winner.fighter, loser.fighter);
  const zeni  = zeniReward((winner.fighter.level + loser.fighter.level) / 2) * 2;

  await Promise.all([
    addFighterXP(winner.jid, xp).catch(() => {}),
    recordResult(winner.jid, "win").catch(() => {}),
    recordResult(loser.jid,  "loss").catch(() => {}),
  ]);

  try {
    const { addMoney } = await import("../economy/database.js");
    await addMoney(winner.jid, zeni);
  } catch {}

  let resultText =
`🏆 *${winner.name.toUpperCase()} WINS!*

⚡ *${winner.name}'s ${winner.fighter.name}* defeated *${loser.name}'s ${loser.fighter.name}*!
✨ +${xp} XP  💰 +${zeni} Zeni`;

  try {
    const buf = await generateBattleResult({
      winner: { name: winner.fighter.name, imageUrl: winner.fighter.imageUrl },
      loser:  { name: loser.fighter.name,  imageUrl: loser.fighter.imageUrl },
      rewardText: `${winner.name} wins! +${xp} XP  +${zeni} Zeni`,
      outcome: "victory",
    });
    await sock.sendMessage(jid, { image: buf, caption: resultText }, { quoted: msg });
  } catch {
    await sock.sendMessage(jid, { text: resultText }, { quoted: msg });
  }
}

// ── Handle a fighter fainting ──────────────────────────────────────────────────
async function handleFaint(sock, jid, msg, battle, faintedJid) {
  const isVillain    = battle.type === "villain";
  const isChallenger = faintedJid === battle.challengerJid;

  if (isVillain) {
    // Player was defeated
    endBattle(jid);
    clearVillain(jid);
    const myFighter = battle.challengerFighter;
    const villain   = battle.opponentFighter;
    const username  = battle.challengerName || msg.pushName || "Fighter";
    await updateFighter(faintedJid, { hp: 0 }).catch(() => {});
    const caption = `💀 *${username}'s ${myFighter.name} has been defeated by ${villain.name}!*\n\nUse *.dbzheal* to recover.`;
    try {
      const buf = await generateBattleResult({
        winner: { name: villain.name,     imageUrl: villain.imageUrl },
        loser:  { name: myFighter.name,   imageUrl: myFighter.imageUrl },
        rewardText: "You were defeated!",
        outcome: "defeat",
      });
      await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
    } catch {
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    }
  } else {
    await handlePvPVictory(sock, jid, msg, battle, faintedJid);
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────
export default {
  name:        "dbzbattle",
  aliases:     ["dbzb"],
  description: "DBZ battle commands: fight, run",
  category:    "dbz",
  usage:       ".dbzbattle <fight|run> [move number]",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();

    const battle = getBattle(jid);
    if (!battle) {
      return sock.sendMessage(jid, {
        text: "⚡ No active DBZ battle here!\nUse *.dbzfight* when a villain appears, or *.dbzchallenge @user* to challenge someone.",
      }, { quoted: msg });
    }

    const isChallenger = battle.challengerJid === sender;
    const isOpponent   = battle.opponentJid   === sender;
    if (!isChallenger && !isOpponent) {
      return sock.sendMessage(jid, { text: "❌ You are not in this battle!" }, { quoted: msg });
    }

    const myFighterKey  = isChallenger ? "challengerFighter" : "opponentFighter";
    const envFighterKey = isChallenger ? "opponentFighter"   : "challengerFighter";
    const myFighter     = battle[myFighterKey];
    const envFighter    = battle[envFighterKey];

    // ── RUN / FLEE ────────────────────────────────────────────────────────────
    if (sub === "run" || sub === "flee") {
      endBattle(jid);
      if (battle.type === "villain") clearVillain(jid);

      const fleeCaption = battle.type === "pvp"
        ? `🏳️ *${msg.pushName || sender.split("@")[0]} has forfeited the battle!*`
        : `🏃 *You fled from ${envFighter.name}!*`;

      try {
        const buf = await generateBattleResult({
          winner: { name: envFighter.name, imageUrl: envFighter.imageUrl },
          loser:  { name: myFighter.name,  imageUrl: myFighter.imageUrl },
          rewardText: battle.type === "pvp" ? "Forfeited!" : "Fled!",
          outcome: "fled",
        });
        return sock.sendMessage(jid, { image: buf, caption: fleeCaption }, { quoted: msg });
      } catch {
        return sock.sendMessage(jid, { text: fleeCaption }, { quoted: msg });
      }
    }

    // ── FIGHT ─────────────────────────────────────────────────────────────────
    if (sub === "fight" || sub === "f") {
      if (!isMyTurn(jid, sender)) {
        return sock.sendMessage(jid, { text: "⏳ It's not your turn!" }, { quoted: msg });
      }

      // If no move number, show the move list
      if (!args[1]) {
        return sendBattlePrompt(sock, jid, msg, battle, sender);
      }

      const moveIdx = parseInt(args[1]) - 1;
      if (isNaN(moveIdx) || moveIdx < 0 || moveIdx >= BATTLE_MOVE_LIST.length) {
        return sock.sendMessage(jid, {
          text: `❌ Invalid move number. Use 1–${BATTLE_MOVE_LIST.length}.\n\nUse \`.dbzbattle fight\` to see your moves.`,
        }, { quoted: msg });
      }

      const chosenMove = BATTLE_MOVE_LIST[moveIdx];

      // ── GUARD ────────────────────────────────────────────────────────────
      if (chosenMove.id === "guard") {
        const updatedMy = regenKi({ ...myFighter, ki: (myFighter.ki || 0) + 30 });
        const updatedMy2 = { ...updatedMy, ki: Math.min(updatedMy.maxKi || 300, updatedMy.ki), isGuarding: true };
        updateBattle(jid, {
          [myFighterKey]: updatedMy2,
          turn: isChallenger ? "opponent" : "challenger",
        });
        const guardStatus = `🛡️ *${myFighter.name}* braces for impact! (+30 Ki)`;
        await sendScene(sock, jid, msg, updateBattle(jid, {}), guardStatus, null, null, false);
        await sleep(DELAY);

        // Villain auto-counter after guard
        if (battle.type === "villain") {
          const freshBattle = getBattle(jid);
          if (!freshBattle) return;
          const villainMove = villainAiMove(freshBattle.opponentFighter);
          const villainUpdated = regenKi(freshBattle.opponentFighter);
          const vSpent = spendKi(villainUpdated, villainMove.cost || 0) || villainUpdated;
          const rawDmg = calcDamage(vSpent, freshBattle.challengerFighter, villainMove, true);
          const vCrit  = isCriticalHit();
          const vDmg   = vCrit ? Math.floor(rawDmg * 1.5) : rawDmg;
          const newMyHp = Math.max(0, freshBattle.challengerFighter.hp - vDmg);
          const newMy   = { ...freshBattle.challengerFighter, hp: newMyHp, isGuarding: false };
          const after   = updateBattle(jid, {
            challengerFighter: newMy,
            opponentFighter:   vSpent,
            turn: "challenger",
            round: freshBattle.round + 1,
          });

          const vStatus = `👹 *${freshBattle.opponentFighter.name}* used ${villainMove.name}! Blocked — dealt ${vDmg} damage.${vCrit ? " ★ CRIT!" : ""}`;
          await sleep(DELAY);
          await sendScene(sock, jid, msg, after, vStatus, "player", vDmg, vCrit, villainMove.id === "ki_blast");

          if (newMyHp <= 0) {
            await sleep(DELAY);
            return handleFaint(sock, jid, msg, after, battle.challengerJid);
          }
          await sleep(DELAY);
          return sendBattlePrompt(sock, jid, msg, after, battle.challengerJid);
        }
        await sleep(DELAY);
        return sendBattlePrompt(sock, jid, msg, getBattle(jid) || battle, battle.opponentJid);
      }

      // ── TRANSFORM ────────────────────────────────────────────────────────
      if (chosenMove.id === "transform") {
        const spent = spendKi(myFighter, 30);
        if (!spent) {
          return sock.sendMessage(jid, { text: `❌ Not enough Ki to transform! Need 30 Ki, have ${Math.floor(myFighter.ki || 0)}.` }, { quoted: msg });
        }
        const transformed = applyTransform(spent);
        if (!transformed) {
          return sock.sendMessage(jid, { text: "❌ No more transformations available!" }, { quoted: msg });
        }

        const prevFormName = myFighter.currentFormName || myFighter.name;
        const after = updateBattle(jid, {
          [myFighterKey]: transformed,
          turn: isChallenger ? "opponent" : "challenger",
        });

        // Send transform scene
        try {
          const tBuf = await generateTransformScene({
            fighter:       transformed,
            fromFormName:  prevFormName,
            toFormName:    transformed.currentFormName,
          });
          await sock.sendMessage(jid, {
            image: tBuf,
            caption: `🌟 *${myFighter.name}* TRANSFORMS into *${transformed.currentFormName}*!\n⚔️ All stats ×${(transformed.attack / myFighter.attack).toFixed(2)}`,
          }, { quoted: msg });
        } catch {
          await sock.sendMessage(jid, {
            text: `🌟 *${myFighter.name}* TRANSFORMS into *${transformed.currentFormName}*!`,
          }, { quoted: msg });
        }

        // Villain counter
        if (battle.type === "villain") {
          await sleep(DELAY);
          const fb = getBattle(jid);
          if (!fb) return;
          const vm = villainAiMove(fb.opponentFighter);
          const vUp = regenKi(fb.opponentFighter);
          const vSp = spendKi(vUp, vm.cost || 0) || vUp;
          const rDmg = calcDamage(vSp, fb.challengerFighter, vm);
          const vCrit = isCriticalHit();
          const vDmg  = vCrit ? Math.floor(rDmg * 1.5) : rDmg;
          const newHp = Math.max(0, fb.challengerFighter.hp - vDmg);
          const newCh = { ...fb.challengerFighter, hp: newHp };
          const fb2   = updateBattle(jid, { challengerFighter: newCh, opponentFighter: vSp, turn: "challenger", round: fb.round + 1 });
          const vs    = `👹 *${fb.opponentFighter.name}* used ${vm.name}! Dealt ${vDmg} damage.${vCrit ? " ★ CRIT!" : ""}`;
          await sendScene(sock, jid, msg, fb2, vs, "player", vDmg, vCrit, vm.id === "ki_blast");
          if (newHp <= 0) { await sleep(DELAY); return handleFaint(sock, jid, msg, fb2, battle.challengerJid); }
          await sleep(DELAY);
          return sendBattlePrompt(sock, jid, msg, fb2, battle.challengerJid);
        }
        await sleep(DELAY);
        return sendBattlePrompt(sock, jid, msg, getBattle(jid) || battle, battle.opponentJid);
      }

      // ── ATTACK MOVES (punch, kick, ki_blast, special) ─────────────────────
      if ((chosenMove.cost || 0) > 0) {
        const spent = spendKi(myFighter, chosenMove.cost);
        if (!spent) {
          return sock.sendMessage(jid, {
            text: `❌ Not enough Ki for *${chosenMove.name}*! Need ${chosenMove.cost}, have ${Math.floor(myFighter.ki || 0)}.`,
          }, { quoted: msg });
        }
        // Apply regen then cost
        const regenned = regenKi(myFighter);
        const myAfterKi = spendKi(regenned, chosenMove.cost) || myFighter;
        Object.assign(myFighter, myAfterKi);
      } else {
        const regenned = regenKi(myFighter);
        Object.assign(myFighter, regenned);
      }

      const rawDmg   = calcDamage(myFighter, envFighter, chosenMove, envFighter.isGuarding);
      const crit     = isCriticalHit();
      const finalDmg = crit ? Math.floor(rawDmg * 1.5) : rawDmg;
      const newEnvHp = Math.max(0, envFighter.hp - finalDmg);
      const envAfter = { ...envFighter, hp: newEnvHp, isGuarding: false };
      const myAfter  = { ...myFighter };

      let nextTurn = isChallenger ? "opponent" : "challenger";
      const battleAfter = updateBattle(jid, {
        [myFighterKey]:  myAfter,
        [envFighterKey]: envAfter,
        turn: nextTurn,
        round: battle.round + 1,
      });

      const myName  = msg.pushName || sender.split("@")[0];
      const statusText = `${chosenMove.emoji} *${myFighter.name}* used *${chosenMove.name}*! Dealt ${finalDmg} damage.${crit ? " ★ CRITICAL HIT!" : ""}`;

      await sendScene(sock, jid, msg, battleAfter, statusText, "enemy", finalDmg, crit, chosenMove.id === "ki_blast");

      // Check if enemy fainted
      if (newEnvHp <= 0) {
        await sleep(DELAY);
        if (battle.type === "villain") {
          return handleVillainDefeat(sock, jid, msg, battleAfter);
        } else {
          return handlePvPVictory(sock, jid, msg, battleAfter, battle.opponentJid === sender ? battle.challengerJid : battle.opponentJid);
        }
      }

      // Villain auto-counter after player attacks
      if (battle.type === "villain") {
        await sleep(DELAY);
        const fb = getBattle(jid);
        if (!fb) return;
        const vm  = villainAiMove(fb.opponentFighter);
        const vUp = regenKi(fb.opponentFighter);
        const vSp = spendKi(vUp, vm.cost || 0) || vUp;
        const rDmg = calcDamage(vSp, fb.challengerFighter, vm, fb.challengerFighter.isGuarding);
        const vCrit = isCriticalHit();
        const vDmg  = vCrit ? Math.floor(rDmg * 1.5) : rDmg;
        const newMyHp = Math.max(0, fb.challengerFighter.hp - vDmg);
        const newMy   = { ...fb.challengerFighter, hp: newMyHp, isGuarding: false };
        const fb2     = updateBattle(jid, { challengerFighter: newMy, opponentFighter: vSp, turn: "challenger", round: fb.round + 1 });
        const vs      = `👹 *${fb.opponentFighter.name}* used *${vm.name}*! Dealt ${vDmg} damage.${vCrit ? " ★ CRIT!" : ""}`;
        await sleep(DELAY);
        await sendScene(sock, jid, msg, fb2, vs, "player", vDmg, vCrit, vm.id === "ki_blast");
        if (newMyHp <= 0) { await sleep(DELAY); return handleFaint(sock, jid, msg, fb2, battle.challengerJid); }
        await sleep(DELAY);
        return sendBattlePrompt(sock, jid, msg, fb2, battle.challengerJid);
      }

      // PvP: prompt next player
      await sleep(DELAY);
      const freshBattle = getBattle(jid);
      if (!freshBattle) return;
      const nextJid = nextTurn === "challenger" ? freshBattle.challengerJid : freshBattle.opponentJid;
      return sendBattlePrompt(sock, jid, msg, freshBattle, nextJid);
    }

    // Default: show prompt
    return sendBattlePrompt(sock, jid, msg, battle, sender);
  },
};
