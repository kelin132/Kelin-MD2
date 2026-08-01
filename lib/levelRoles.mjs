/**
 * KELIN MD — Economy Level Roles
 * Roles that users earn by levelling up through economy XP.
 * Add new roles at the END to preserve existing thresholds.
 */

export const LEVEL_ROLES = [
  { level: 1,   name: "Newcomer",      emoji: "🌱",  color: "#78c46a" },
  { level: 5,   name: "Street Rat",    emoji: "🐀",  color: "#aaaaaa" },
  { level: 10,  name: "Hustler",       emoji: "💼",  color: "#5b9bd5" },
  { level: 15,  name: "Grinder",       emoji: "⚙️",  color: "#7f7f7f" },
  { level: 20,  name: "Dealer",        emoji: "🃏",  color: "#a45fcf" },
  { level: 25,  name: "Trader",        emoji: "📈",  color: "#2ecc71" },
  { level: 30,  name: "Investor",      emoji: "💹",  color: "#1abc9c" },
  { level: 40,  name: "Tycoon",        emoji: "🏢",  color: "#3498db" },
  { level: 50,  name: "Mogul",         emoji: "💎",  color: "#00d4ff" },
  { level: 60,  name: "Elite",         emoji: "🌟",  color: "#f1c40f" },
  { level: 75,  name: "Legend",        emoji: "⭐",  color: "#e67e22" },
  { level: 100, name: "Immortal",      emoji: "👑",  color: "#e74c3c" },
  { level: 150, name: "God Tier",      emoji: "🌌",  color: "#9b59b6" },
  { level: 200, name: "Omnipotent",    emoji: "☄️",  color: "#ff6b9d" },
];

/**
 * Get the highest role the user has earned for their level.
 * @param {number} level
 * @returns {{ level, name, emoji, color }}
 */
export function getLevelRole(level) {
  let role = LEVEL_ROLES[0];
  for (const r of LEVEL_ROLES) {
    if (level >= r.level) role = r;
    else break;
  }
  return role;
}

/**
 * Get ALL roles the user has unlocked (in order).
 * @param {number} level
 * @returns {Array}
 */
export function getAllEarnedRoles(level) {
  return LEVEL_ROLES.filter(r => level >= r.level);
}

/**
 * Formatted label: "⚙️ Grinder"
 * @param {number} level
 * @returns {string}
 */
export function getLevelRoleLabel(level) {
  const r = getLevelRole(level);
  return `${r.emoji} ${r.name}`;
}

/**
 * Returns the NEW role that was just unlocked going from oldLevel → newLevel,
 * or null if no new role was crossed.
 * @param {number} oldLevel
 * @param {number} newLevel
 * @returns {{ level, name, emoji, color } | null}
 */
export function getNewlyUnlockedRole(oldLevel, newLevel) {
  const crossed = LEVEL_ROLES.filter(r => r.level > oldLevel && r.level <= newLevel);
  return crossed.length > 0 ? crossed[crossed.length - 1] : null;
}

/**
 * Build a pretty level-up notification string.
 * @param {string} tag  — plain phone number / username
 * @param {number} startLevel
 * @param {number} newLevel
 * @param {{ name, emoji } | null} newRole  — newly unlocked role (may be null)
 */
export function buildLevelUpMsg(tag, startLevel, newLevel, newRole) {
  const lines = [
    `╭─❀「 ✨ *𝐋𝐄𝐕𝐄𝐋  𝐔𝐏!* 」❀─╮`,
    `│ 🎊 *Congratulations @${tag}!*`,
    `│`,
    `│ ⭐ *Level* :: *${startLevel} → ${newLevel}*`,
  ];

  if (newRole) {
    lines.push(`│ 🎭 *New Role* :: *${newRole.emoji} ${newRole.name}*`);
  }

  lines.push(`│`);
  lines.push(`│ 🌸 *Keep grinding!* おめでとう！🎉`);
  lines.push(`╰───────────────❀`);
  return lines.join("\n");
}
