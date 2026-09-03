/**
 * Naruto Canvas Image Generator for WhatsApp Bot
 * Generates PNG images from canvas for direct WhatsApp messaging
 *
 * Usage: generateMissionBattleImage(), generateHuntImage(), generateTrainingImage()
 * Returns: Buffer for sending to WhatsApp
 */

import { createCanvas } from '@napi-rs/canvas';

// ==================== MISSION BATTLE IMAGE ====================
export async function generateMissionBattleImage(playerData, enemyData, battleState) {
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Arena border
  ctx.strokeStyle = '#ff8c00';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 100);

  // Player (left side)
  drawCharacter(ctx, 80, 150, playerData, battleState.playerHp, true);

  // Enemy (right side)
  drawCharacter(ctx, canvas.width - 80, 150, enemyData, battleState.enemyHp, false);

  // VS Text
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('VS', canvas.width / 2, 60);

  // Battle info at bottom
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, canvas.height - 80, canvas.width, 80);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Round: ${battleState.round}`, canvas.width / 2, canvas.height - 50);
  ctx.fillText(`${playerData.attack} ATK | ${enemyData.defense} DEF`, canvas.width / 2, canvas.height - 20);

  return canvas.toBuffer('image/png');
}

// ==================== HUNT ARENA IMAGE ====================
export async function generateHuntImage(playerData, enemies, score) {
  const canvas = createCanvas(600, 450);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid pattern
  ctx.strokeStyle = 'rgba(255, 140, 0, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height - 100);
    ctx.stroke();
  }

  // Arena border
  ctx.strokeStyle = '#ff8c00';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 120);

  // Player in center
  const playerX = canvas.width / 2;
  const playerY = canvas.height / 2;

  ctx.fillStyle = '#4299e1';
  ctx.beginPath();
  ctx.arc(playerX, playerY - 30, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(playerX - 20, playerY, 40, 50);
  ctx.fillRect(playerX - 15, playerY + 50, 15, 40);
  ctx.fillRect(playerX, playerY + 50, 15, 40);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${playerData.username}`, playerX, playerY + 100);

  // Draw enemies
  enemies.forEach((enemy, idx) => {
    const angle = (idx / enemies.length) * Math.PI * 2;
    const distance = 120;
    const ex = playerX + Math.cos(angle) * distance;
    const ey = playerY + Math.sin(angle) * distance;

    // Enemy circle
    ctx.fillStyle = '#ed8936';
    ctx.beginPath();
    ctx.arc(ex, ey, 20, 0, Math.PI * 2);
    ctx.fill();

    // Health bar
    ctx.fillStyle = '#48bb78';
    ctx.fillRect(ex - 30, ey - 35, 60, 8);

    // Enemy name
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(enemy.name, ex, ey + 35);
  });

  // Score display at bottom
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height - 55);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`Enemies Remaining: ${enemies.length}`, canvas.width / 2, canvas.height - 20);

  return canvas.toBuffer('image/png');
}

// ==================== TRAINING IMAGE ====================
export async function generateTrainingImage(playerData, stats, level) {
  const canvas = createCanvas(600, 500);
  const ctx = canvas.getContext('2d');

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Training ground border
  ctx.strokeStyle = '#ff8c00';
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, canvas.width - 60, 280);

  // Character training stance
  const charX = canvas.width / 2;
  const charY = 150;

  // Head
  ctx.fillStyle = '#4299e1';
  ctx.beginPath();
  ctx.arc(charX, charY - 40, 28, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillRect(charX - 20, charY - 10, 40, 60);

  // Training pose - extended arms
  ctx.fillRect(charX - 50, charY + 20, 50, 12);
  ctx.fillRect(charX, charY + 20, 50, 12);

  // Legs
  ctx.fillRect(charX - 15, charY + 50, 15, 50);
  ctx.fillRect(charX, charY + 50, 15, 50);

  // Training aura (circles)
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
  ctx.lineWidth = 2;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(charX, charY, 60 + i * 25, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Character name
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(playerData.username, charX, charY + 140);

  // Stats display
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 320, canvas.width, 180);

  const statNames = ['Attack', 'Defense', 'Speed', 'Chakra'];
  const statValues = [stats.attack, stats.defense, stats.speed, stats.chakra];
  const statColors = ['#e53e3e', '#3182ce', '#38a169', '#ffd700'];

  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';

  statNames.forEach((name, idx) => {
    const y = 350 + idx * 35;
    const x = 50;
    const value = statValues[idx];
    const maxValue = 200;
    const barWidth = 400;

    // Stat name
    ctx.fillStyle = '#fff';
    ctx.fillText(name, x, y);

    // Stat value
    ctx.fillStyle = statColors[idx];
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(Math.floor(value), canvas.width - 50, y);

    // Stat bar
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#444';
    ctx.fillRect(x + 100, y - 12, barWidth, 16);

    ctx.fillStyle = statColors[idx];
    const barFill = Math.min((value / maxValue) * barWidth, barWidth);
    ctx.fillRect(x + 100, y - 12, barFill, 16);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 100, y - 12, barWidth, 16);
  });

  // Level display
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Level: ${level}`, canvas.width / 2, canvas.height - 10);

  return canvas.toBuffer('image/png');
}

// ==================== MISSION SELECT IMAGE ====================
export async function generateMissionSelectImage(missions, playerLevel) {
  const canvas = createCanvas(600, 800);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#ff8c00';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('⚔️ MISSIONS ⚔️', canvas.width / 2, 50);

  // Divider
  ctx.strokeStyle = '#ff8c00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 70);
  ctx.lineTo(canvas.width - 50, 70);
  ctx.stroke();

  // Draw missions
  let yPos = 110;
  missions.slice(0, 5).forEach((mission, idx) => {
    const rankColor = getRankColor(mission.rank);
    const canAccess = playerLevel >= mission.minLevel;

    // Mission box
    ctx.fillStyle = canAccess ? 'rgba(66, 153, 225, 0.2)' : 'rgba(100, 100, 100, 0.2)';
    ctx.fillRect(30, yPos, canvas.width - 60, 110);

    ctx.strokeStyle = canAccess ? rankColor : '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, yPos, canvas.width - 60, 110);

    // Mission name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(mission.name, 50, yPos + 30);

    // Rank
    ctx.fillStyle = rankColor;
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`[${mission.rank}]`, canvas.width - 80, yPos + 30);

    // Info line
    ctx.fillStyle = '#ccc';
    ctx.font = '12px Arial';
    ctx.fillText(`Min Level: ${mission.minLevel} | XP: ${mission.xp} | Ryo: ${mission.ryo}`, 50, yPos + 60);

    // Status
    const status = canAccess ? '✅ AVAILABLE' : '🔒 LOCKED';
    ctx.fillStyle = canAccess ? '#48bb78' : '#e53e3e';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(status, 50, yPos + 85);

    yPos += 130;
  });

  // Footer
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Use .nmission <number> to start', canvas.width / 2, canvas.height - 15);

  return canvas.toBuffer('image/png');
}

// ==================== LEADERBOARD IMAGE ====================
export async function generateLeaderboardImage(players) {
  const canvas = createCanvas(600, 400 + players.length * 40);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🏆 LEADERBOARD 🏆', canvas.width / 2, 50);

  // Headers
  ctx.fillStyle = '#ff8c00';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('RANK', 50, 100);
  ctx.fillText('PLAYER', 150, 100);
  ctx.fillText('LEVEL', 350, 100);
  ctx.fillText('XP', 450, 100);

  // Divider
  ctx.strokeStyle = '#ff8c00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(30, 120);
  ctx.lineTo(canvas.width - 30, 120);
  ctx.stroke();

  // Players
  let yPos = 160;
  players.slice(0, 10).forEach((player, idx) => {
    const isTop3 = idx < 3;
    const medals = ['🥇', '🥈', '🥉'];

    ctx.fillStyle = isTop3 ? 'rgba(255, 215, 0, 0.15)' : 'rgba(100, 100, 100, 0.05)';
    ctx.fillRect(30, yPos - 25, canvas.width - 60, 35);

    // Rank with medal
    ctx.fillStyle = '#fff';
    ctx.font = isTop3 ? 'bold 24px Arial' : 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(isTop3 ? medals[idx] : `#${idx + 1}`, 50, yPos);

    // Player name
    ctx.font = 'bold 16px Arial';
    ctx.fillText(player.username, 150, yPos);

    // Level
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Lv ${player.level}`, 350, yPos);

    // XP
    ctx.fillStyle = '#ffd700';
    ctx.fillText(player.xp, 450, yPos);

    ctx.fillStyle = '#fff';
    yPos += 40;
  });

  return canvas.toBuffer('image/png');
}

// ==================== PLAYER PROFILE IMAGE ====================
export async function generateProfileImage(playerData) {
  const canvas = createCanvas(600, 700);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = '#ff8c00';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  // Character illustration area
  ctx.fillStyle = 'rgba(255, 140, 0, 0.1)';
  ctx.fillRect(40, 40, canvas.width - 80, 150);

  // Draw character
  const charX = canvas.width / 2;
  const charY = 100;

  ctx.fillStyle = '#4299e1';
  ctx.beginPath();
  ctx.arc(charX, charY - 30, 35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(charX - 25, charY + 10, 50, 70);
  ctx.fillRect(charX - 20, charY + 80, 18, 50);
  ctx.fillRect(charX + 2, charY + 80, 18, 50);

  // Player Info
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(playerData.username, canvas.width / 2, 250);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px Arial';
  ctx.fillText(playerData.rank, canvas.width / 2, 285);

  // Stats section
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(40, 310, canvas.width - 80, 350);

  const stats = [
    { label: 'Level', value: playerData.level, color: '#ffd700' },
    { label: 'XP', value: playerData.xp, color: '#48bb78' },
    { label: 'HP', value: `${playerData.hp}/${playerData.maxHp}`, color: '#e53e3e' },
    { label: 'Chakra', value: `${playerData.chakra}/${playerData.maxChakra}`, color: '#9f7aea' },
    { label: 'Attack', value: playerData.attack, color: '#e53e3e' },
    { label: 'Defense', value: playerData.defense, color: '#3182ce' },
    { label: 'Speed', value: playerData.speed, color: '#38a169' },
    { label: 'Ryo', value: playerData.ryo, color: '#48bb78' }
  ];

  let yPos = 350;
  ctx.font = '16px Arial';

  stats.forEach((stat, idx) => {
    // Label
    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'left';
    ctx.fillText(stat.label, 70, yPos);

    // Value
    ctx.fillStyle = stat.color;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(stat.value, canvas.width - 70, yPos);

    ctx.font = '16px Arial';
    yPos += 35;
  });

  return canvas.toBuffer('image/png');
}

// ==================== HELPER FUNCTIONS ====================
function drawCharacter(ctx, x, y, characterData, currentHp, isPlayer) {
  // Head
  ctx.fillStyle = isPlayer ? '#4299e1' : '#ed8936';
  ctx.beginPath();
  ctx.arc(x, y - 30, 25, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillRect(x - 20, y, 40, 50);

  // Arms
  ctx.fillRect(x - 35, y + 15, 15, 30);
  ctx.fillRect(x + 20, y + 15, 15, 30);

  // Legs
  ctx.fillRect(x - 15, y + 50, 15, 40);
  ctx.fillRect(x, y + 50, 15, 40);

  // HP Bar background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x - 50, y - 65, 100, 12);

  // HP Bar fill
  const hpPercent = currentHp / (characterData.maxHp || 100);
  ctx.fillStyle = hpPercent > 0.5 ? '#48bb78' : hpPercent > 0.25 ? '#ffd700' : '#e53e3e';
  ctx.fillRect(x - 50, y - 65, 100 * hpPercent, 12);

  // HP Bar border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 50, y - 65, 100, 12);

  // HP Text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(currentHp)}/${characterData.maxHp}`, x, y - 50);

  // Name
  ctx.font = 'bold 12px Arial';
  ctx.fillText(characterData.name, x, y + 110);
}

function getRankColor(rank) {
  const colors = {
    'D': '#48bb78',
    'C': '#3182ce',
    'B': '#ffd700',
    'A': '#ed8936',
    'S': '#e53e3e'
  };
  return colors[rank] || '#fff';
}

export default {
  generateMissionBattleImage,
  generateHuntImage,
  generateTrainingImage,
  generateMissionSelectImage,
  generateLeaderboardImage,
  generateProfileImage
};
