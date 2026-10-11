export const GUILD_WAR_DURATION_MS = 48 * 60 * 60 * 1000;
export const MAX_GUILD_WAR_MATCHUPS = 8;

function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function pairWarMembers(membersA, membersB, {
  limit = MAX_GUILD_WAR_MATCHUPS,
  random = Math.random,
} = {}) {
  const sideA = shuffle(Array.isArray(membersA) ? membersA : [], random);
  const sideB = shuffle(Array.isArray(membersB) ? membersB : [], random);
  const count = Math.min(
    MAX_GUILD_WAR_MATCHUPS,
    Math.max(0, Math.floor(Number(limit) || MAX_GUILD_WAR_MATCHUPS)),
    sideA.length,
    sideB.length,
  );

  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    a: sideA[index],
    b: sideB[index],
    status: "Pending",
    winnerSide: null,
    resultType: null,
    reportedBy: null,
    resolvedAt: null,
  }));
}

export function scoreWarMatchups(matchups = []) {
  return matchups.reduce((score, matchup) => {
    if (matchup?.winnerSide === "a") score.a += 1;
    if (matchup?.winnerSide === "b") score.b += 1;
    return score;
  }, { a: 0, b: 0 });
}

export function formatWarTimeRemaining(deadlineAt, now = Date.now()) {
  const deadline = deadlineAt instanceof Date
    ? deadlineAt.getTime()
    : new Date(deadlineAt).getTime();
  const remainingMinutes = Number.isFinite(deadline)
    ? Math.max(0, Math.floor((deadline - Number(now)) / 60_000))
    : 0;
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = String(remainingMinutes % 60).padStart(2, "0");
  return `${hours}h ${minutes}m`;
}

function safeLabel(value, maxLength = 26) {
  return String(value ?? "Unknown")
    .replace(/[\r\n\t]/g, " ")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength) || "Unknown";
}

const STATE_LABELS = {
  pending: "Challenge Pending",
  active: "Battle",
  completed: "Completed",
  expired: "Expired",
  cancelled: "Cancelled",
};

export function formatGuildWarStatus(war, now = Date.now()) {
  if (!war) return "⚔️ No guild war found.";

  const state = STATE_LABELS[war.status] || "Unknown";
  const deadline = war.status === "pending"
    ? war.challengeExpiresAt
    : war.deadlineAt;
  const remaining = ["pending", "active"].includes(war.status)
    ? formatWarTimeRemaining(deadline, now)
    : "0h 00m";
  const guildA = safeLabel(war.guildA?.name);
  const guildB = safeLabel(war.guildB?.name);
  const score = scoreWarMatchups(war.matchups);
  const lines = [
    "╭─〔 ⚔️ GUILD WAR STATUS 〕",
    `│ 🔹 State: ${state}`,
    `│ ⏱️ Time Remaining: ${remaining}`,
    "│",
    `│ 🐺 ${guildA} vs 🐉 ${guildB}`,
    `│ 🏅 Score: ${score.a} - ${score.b}`,
    "│",
    "│ Matchups:",
  ];

  if (!Array.isArray(war.matchups) || war.matchups.length === 0) {
    lines.push("│   Waiting for the challenge to be accepted.");
  } else {
    for (const [index, matchup] of war.matchups.entries()) {
      const nameA = safeLabel(matchup.a?.name, 22);
      const nameB = safeLabel(matchup.b?.name, 22);
      const status = ["Completed", "Forfeited"].includes(matchup.status)
        ? matchup.status
        : "Pending";
      lines.push(`│ ${index + 1} @${nameA} ⚔️ @${nameB} [${status}]`);
    }
  }

  lines.push("╰────────────────────────");
  return lines.join("\n");
}
