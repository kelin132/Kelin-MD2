// plugins/naruto/nmissions.js
// Naruto mission battle system
// Usage: .nmission [number] | .nmission attack | .nmission forfeit

import { generateMissionBattleImage, generateMissionSelectImage } from '../../lib/naruto-canvas-image-generator.mjs';
import Players from '../../lib/naruto/players.js';
import Enemies from '../../lib/naruto/enemies.js';
import Missions from '../../lib/missions.js';

const activeBattles = new Map();

export default {
  name: 'nmission',
  description: 'Start a naruto mission battle',
  category: 'naruto',
  usage: '.nmission [number] | .nmission attack | .nmission forfeit',
  aliases: ['nbattle'],
  cooldown: 3,

  async run({ sock, msg, args, sender }) {
    const jid    = msg.key.remoteJid;
    const subCmd = args[0]?.toLowerCase();

    try {
      // ── Attack sub-command ────────────────────────────────────────────────
      if (subCmd === 'attack' || subCmd === 'att') {
        let battleState = null;
        for (const [, b] of activeBattles.entries()) {
          if (b.sender === sender) { battleState = b; break; }
        }

        if (!battleState)       return sock.sendMessage(jid, { text: '❌ No active battle!\nUse .nmission <number> to start.' }, { quoted: msg });
        if (!battleState.isActive) return sock.sendMessage(jid, { text: '❌ This battle has already ended!' }, { quoted: msg });

        const p     = battleState.player;
        const enemy = battleState.selectedEnemy;

        const playerDamage = Math.max(1, (p.attack || 10) + Math.random() * 10 - Math.random() * (enemy.defense || 5));
        const enemyDamage  = Math.max(1, (enemy.attack || 10) + Math.random() * 5  - Math.random() * (p.defense || 10));

        battleState.enemyHp  -= playerDamage;
        battleState.playerHp -= enemyDamage;
        battleState.round    += 1;

        let result = null;
        if (battleState.enemyHp <= 0) {
          battleState.isActive = false;
          result = 'victory';
        } else if (battleState.playerHp <= 0) {
          battleState.isActive = false;
          result = 'defeat';
          await Players.addXP(sender, -Math.floor(battleState.selectedMission.xp * 0.1));
        }

        const img = await generateMissionBattleImage(p, enemy, {
          playerHp: Math.max(0, battleState.playerHp),
          enemyHp:  Math.max(0, battleState.enemyHp),
          round:    battleState.round,
        });

        let caption = `⚔️ *ROUND ${battleState.round}*\n\n`;
        caption += `${p.username} dealt *${Math.round(playerDamage)}* dmg!\n`;
        caption += `${enemy.name} dealt *${Math.round(enemyDamage)}* dmg!\n\n`;
        caption += `*HP:*\nYou: ${Math.max(0, Math.round(battleState.playerHp))}/${battleState.playerMaxHp}\n`;
        caption += `${enemy.name}: ${Math.max(0, Math.round(battleState.enemyHp))}/${battleState.enemyMaxHp}\n\n`;

        if (result === 'victory') {
          const xpResult = await Players.addXP(sender, battleState.selectedMission.xp);
          await Players.addRyo(sender, battleState.selectedMission.ryo);

          let rankLine = `Use .nprofile to check your stats`;
          if (xpResult?.rankedUp) {
            rankLine = `🎊 *RANK UP!* ${xpResult.oldRank} → *${xpResult.newRank}*\nCongratulations, ${xpResult.player.username}!`;
          } else if (xpResult?.leveledUp) {
            rankLine = `⬆️ *LEVEL UP!* Now Level ${xpResult.player.level} | Rank: ${xpResult.player.rank}`;
          }

          caption += `🎉 *VICTORY!*\n\nMission: ${battleState.selectedMission.name}\n+${battleState.selectedMission.xp} XP | +${battleState.selectedMission.ryo} Ryo\n\n${rankLine}`;
          setTimeout(() => activeBattles.delete(battleState.battleId), 5000);
        } else if (result === 'defeat') {
          caption += `💔 *DEFEAT!*\n\nYou were defeated...\nTry again: .nmission`;
          setTimeout(() => activeBattles.delete(battleState.battleId), 5000);
        } else {
          caption += `*.nmission attack* to continue\n*.nmission forfeit* to give up`;
        }

        return sock.sendMessage(jid, { image: img, caption }, { quoted: msg });
      }

      // ── Forfeit sub-command ───────────────────────────────────────────────
      if (subCmd === 'forfeit' || subCmd === 'surrender') {
        let battleId    = null;
        let battleState = null;
        for (const [id, b] of activeBattles.entries()) {
          if (b.sender === sender) { battleState = b; battleId = id; break; }
        }

        if (!battleState) return sock.sendMessage(jid, { text: '❌ No active battle to forfeit!' }, { quoted: msg });

        battleState.isActive = false;
        activeBattles.delete(battleId);
        return sock.sendMessage(jid, { text: `❌ You forfeited against ${battleState.selectedEnemy.name}!\n\nTry again: .nmission` }, { quoted: msg });
      }

      // ── Needs player for anything below ──────────────────────────────────
      const player = await Players.get(sender);
      if (!player) return sock.sendMessage(jid, { text: '❌ You must register first!\nUse: .nstart' }, { quoted: msg });

      const missions = Missions || [];

      // ── No args — show mission list ───────────────────────────────────────
      if (!args[0] || isNaN(parseInt(args[0]))) {
        const img = await generateMissionSelectImage(missions, player.level);
        return sock.sendMessage(jid, {
          image: img,
          caption: `🎯 *NARUTO MISSIONS*\n\nYour Level: ${player.level}\n\nUse .nmission <number> to start\nExample: .nmission 1`,
        }, { quoted: msg });
      }

      // ── Start a mission ───────────────────────────────────────────────────
      const idx = parseInt(args[0]) - 1;
      if (idx < 0 || idx >= missions.length) {
        return sock.sendMessage(jid, { text: '❌ Invalid mission number!' }, { quoted: msg });
      }

      const selectedMission = missions[idx];
      if (player.level < selectedMission.minLevel) {
        return sock.sendMessage(jid, { text: `❌ Your level (${player.level}) is too low!\nRequired: ${selectedMission.minLevel}` }, { quoted: msg });
      }

      const selectedEnemy = Enemies[Math.floor(Math.random() * Enemies.length)];
      const battleId      = `${sender}_${Date.now()}`;

      const battleState = {
        battleId,
        sender,
        playerHp:     player.maxHp || 100,
        enemyHp:      selectedEnemy.maxHp,
        playerMaxHp:  player.maxHp || 100,
        enemyMaxHp:   selectedEnemy.maxHp,
        round:        0,
        player,
        selectedMission,
        selectedEnemy,
        isActive:     true,
      };

      activeBattles.set(battleId, battleState);
      setTimeout(() => activeBattles.delete(battleId), 300000);

      const img = await generateMissionBattleImage(player, selectedEnemy, {
        playerHp: battleState.playerHp,
        enemyHp:  battleState.enemyHp,
        round:    0,
      });

      return sock.sendMessage(jid, {
        image: img,
        caption: `⚔️ *MISSION BATTLE*\n\n*${selectedMission.name}* (${selectedMission.rank}-Rank)\n\n` +
          `*You:*\nHP: ${battleState.playerHp}/${battleState.playerMaxHp}\nATK: ${player.attack} | DEF: ${player.defense}\n\n` +
          `*Enemy:*\n${selectedEnemy.name} (Lv${selectedEnemy.level})\nHP: ${battleState.enemyHp}/${battleState.enemyMaxHp}\nATK: ${selectedEnemy.attack} | DEF: ${selectedEnemy.defense}\n\n` +
          `*.nmission attack* — Attack\n*.nmission forfeit* — Give up`,
      }, { quoted: msg });

    } catch (err) {
      console.error('nmission error:', err);
      return sock.sendMessage(jid, { text: '❌ Error!\n' + err.message }, { quoted: msg });
    }
  },
};
