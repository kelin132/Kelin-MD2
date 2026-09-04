/**
 * Fast-paced career system used by .work.
 *
 * This file is shared with the WhatsApp bot. Keeping it in the Discord fork
 * lets the adapter load the complete economy command set without a missing
 * module warning.
 */

export const SHIFT_COOLDOWN_MS = 10 * 60 * 1000;
export const REST_COOLDOWN_MS = 5 * 60 * 1000;
export const JOB_CHANGE_COOLDOWN_MS = 60 * 60 * 1000;
export const MAX_ENERGY = 100;
export const PAYROLL_TAX_RATE = 0.10;
export const MAX_SHIFT_GROSS_PAY = 29_999;

const ITEM_LABELS = {
  work_meal: "Work meal",
  protein_bar: "Protein bar",
  energy_drink: "Energy drink",
  premium_meal: "Premium meal",
  potion: "Potion",
  elixir: "Elixir",
  small_health_potion: "Small health potion",
  max_elixir: "Max elixir",
  full_restore: "Full restore",
};

export const ENERGY_ITEMS = {
  work_meal: { energy: 35, label: ITEM_LABELS.work_meal },
  protein_bar: { energy: 15, label: ITEM_LABELS.protein_bar },
  energy_drink: { energy: 25, label: ITEM_LABELS.energy_drink },
  premium_meal: { energy: 60, label: ITEM_LABELS.premium_meal },
  potion: { energy: 10, label: ITEM_LABELS.potion },
  elixir: { energy: 20, label: ITEM_LABELS.elixir },
  small_health_potion: { energy: 15, label: ITEM_LABELS.small_health_potion },
  max_elixir: { energy: 45, label: ITEM_LABELS.max_elixir },
  full_restore: { energy: 100, label: ITEM_LABELS.full_restore },
};

const JOBS = {
  fastFoodWorker: {
    name: "Fast Food Worker", tier: "Entry-Level", tierKey: "entry",
    emoji: "🍔", pay: 4_000, xp: 55, energy: 16,
  },
  deliveryRider: {
    name: "Delivery Rider", tier: "Entry-Level", tierKey: "entry",
    emoji: "🛵", pay: 4_500, xp: 65, energy: 18,
  },
  farmWorker: {
    name: "Farm Worker", tier: "Entry-Level", tierKey: "entry",
    emoji: "🌾", pay: 3_800, xp: 50, energy: 17,
  },
  teacher: {
    name: "Teacher", tier: "Entry-Level", tierKey: "entry",
    emoji: "📚", pay: 5_200, xp: 75, energy: 18,
  },
  softwareDeveloper: {
    name: "Software Developer", tier: "Mid-Level", tierKey: "mid",
    emoji: "💻", pay: 9_000, xp: 120, energy: 22,
    requirements: { shifts: 12, workXp: 900, items: ["coding_bootcamp"] },
  },
  registeredNurse: {
    name: "Registered Nurse", tier: "Mid-Level", tierKey: "mid",
    emoji: "🩺", pay: 9_800, xp: 130, energy: 24,
    requirements: { shifts: 15, workXp: 1_050, items: ["nursing_license"] },
  },
  engineer: {
    name: "Project Engineer", tier: "Mid-Level", tierKey: "mid",
    emoji: "🧰", pay: 10_500, xp: 140, energy: 23,
    requirements: { shifts: 18, workXp: 1_250, items: ["engineering_degree"] },
  },
  wallStreetTrader: {
    name: "Wall Street Trader", tier: "Mid-Level", tierKey: "mid",
    emoji: "📈", pay: 12_000, xp: 155, energy: 26,
    requirements: { shifts: 20, workXp: 1_500, items: ["finance_degree"] },
  },
  chiefExecutive: {
    name: "Chief Executive Officer", tier: "High-Tier", tierKey: "high",
    emoji: "🏢", pay: 16_000, xp: 220, energy: 30,
    requirements: { shifts: 35, workXp: 3_500, items: ["business_degree", "executive_suit"] },
  },
  investmentTrader: {
    name: "Investment Trader", tier: "High-Tier", tierKey: "high",
    emoji: "💹", pay: 18_000, xp: 240, energy: 32,
    requirements: { shifts: 40, workXp: 4_000, items: ["finance_degree", "trading_license"] },
  },
  traumaSurgeon: {
    name: "Trauma Surgeon", tier: "High-Tier", tierKey: "high",
    emoji: "⚕️", pay: 19_000, xp: 260, energy: 34,
    requirements: { shifts: 45, workXp: 4_500, items: ["medical_degree", "surgeon_kit"] },
  },
  companyFounder: {
    name: "Company Founder", tier: "High-Tier", tierKey: "high",
    emoji: "🚀", pay: 20_000, xp: 300, energy: 35,
    requirements: { shifts: 55, workXp: 5_500, items: ["business_degree", "founder_capital"] },
  },
};

const LEGACY_JOB_ALIASES = {
  programmer: "softwareDeveloper",
  farmer: "farmWorker",
  doctor: "registeredNurse",
  chef: "fastFoodWorker",
  trader: "wallStreetTrader",
  mechanic: "engineer",
  police: "registeredNurse",
  artist: "softwareDeveloper",
  teacher: "teacher",
  hacker: "softwareDeveloper",
  cryptoWhale: "investmentTrader",
  kingpin: "companyFounder",
  overlord: "companyFounder",
  assassin: "traumaSurgeon",
  spy: "investmentTrader",
  bountyHunter: "investmentTrader",
  dragonTamer: "companyFounder",
  alchemist: "registeredNurse",
  warlord: "companyFounder",
  hiredGun: "investmentTrader",
};

export function getJobs() {
  return JOBS;
}

export function getJob(jobKey) {
  const canonical = normalizeJobKey(jobKey);
  return canonical ? JOBS[canonical] : null;
}

export function normalizeJobKey(jobKey) {
  if (!jobKey) return null;
  if (JOBS[jobKey]) return jobKey;
  return LEGACY_JOB_ALIASES[jobKey] || null;
}

export function resolveJob(input) {
  const normalized = String(input || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return Object.keys(JOBS).find((key) => {
    const job = JOBS[key];
    return [key, job.name].some((value) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized
    );
  }) || LEGACY_JOB_ALIASES[Object.keys(LEGACY_JOB_ALIASES).find((key) =>
    key.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized
  )] || null;
}

function uniqueInventory(inventory = []) {
  return new Set(inventory);
}

export function getCareerStats(user) {
  return {
    shifts: Number(user.completedShifts || 0),
    workXp: Number(user.workXp || 0),
    energy: clampEnergy(user.energy),
  };
}

export function getMissingRequirements(user, jobKey) {
  const job = getJob(jobKey);
  if (!job?.requirements) return [];
  const stats = getCareerStats(user);
  const missing = [];
  if (stats.shifts < job.requirements.shifts) {
    missing.push(`${job.requirements.shifts - stats.shifts} more shifts`);
  }
  if (stats.workXp < job.requirements.workXp) {
    missing.push(`${job.requirements.workXp - stats.workXp} more career XP`);
  }
  const inventory = uniqueInventory(user.inventory);
  for (const item of job.requirements.items || []) {
    if (!inventory.has(item)) missing.push(`item: ${item}`);
  }
  return missing;
}

export function canTakeJob(user, jobKey) {
  return getMissingRequirements(user, jobKey).length === 0;
}

export function clampEnergy(value) {
  return Math.max(0, Math.min(
    MAX_ENERGY,
    Number.isFinite(Number(value)) ? Number(value) : MAX_ENERGY,
  ));
}

export function energyBar(value, width = 10) {
  const energy = clampEnergy(value);
  const filled = Math.round((energy / MAX_ENERGY) * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)} ${Math.round(energy)}%`;
}

export function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${seconds}s`;
}

export function formatMoney(amount) {
  return `$${Math.round(amount).toLocaleString()}`;
}

export function rollWorkEvent(job) {
  const roll = Math.random();
  if (roll < 0.03) return {
    key: "quarterlyBonus", label: "Quarterly bonus", amount: Math.floor(job.pay * 0.40),
  };
  if (roll < 0.13) return {
    key: "overtimeTip", label: "Over-time tip", amount: Math.floor(job.pay * 0.10),
  };
  if (roll < 0.21) return {
    key: "coffeeSpill", label: "Coffee spill penalty", amount: -Math.floor(job.pay * 0.08),
  };
  if (roll < 0.26) return {
    key: "writtenUp", label: "Written-up penalty", amount: -Math.floor(job.pay * 0.15),
  };
  return { key: "standardShift", label: "Standard shift", amount: 0 };
}

export function buildPaystub({
  user, job, event, gross, tax, payrollTax = tax, guildTax = 0,
  guildTaxRate = 0, guildName = null, net, xpGained, energyAfter, now,
}) {
  const nextShift = Math.max(0, SHIFT_COOLDOWN_MS - (Date.now() - now));
  const eventAmount = event.amount >= 0
    ? `+${formatMoney(event.amount)}`
    : `-${formatMoney(Math.abs(event.amount))}`;

  return [
    `╭───〔 💼 *SHIFT PAYSTUB* 〕───╮`,
    `│ ${job.emoji} *${job.name}*`,
    `│ ${job.tier}  •  Shift #${Number(user.completedShifts || 0)}`,
    `├────────────────────────────`,
    `│ Base pay       ${formatMoney(job.pay)}`,
    `│ ${event.label.padEnd(16)} ${eventAmount}`,
    `│ Gross pay      ${formatMoney(gross)}`,
    `│ Payroll tax    -${formatMoney(payrollTax)} (10%)`,
    ...(guildTax > 0
      ? [
        `│ Guild tax      -${formatMoney(guildTax)} (${(guildTaxRate * 100).toFixed(0)}%)`,
        `│ Guild treasury ${guildName ? `→ ${guildName}` : "contribution"}`,
      ]
      : []),
    `│ Total tax      -${formatMoney(tax)}`,
    `│ *Net pay       +${formatMoney(net)}*`,
    `├────────────────────────────`,
    `│ Career XP      +${xpGained}`,
    `│ Energy         ${energyBar(energyAfter)}`,
    `│ Career         ${Number(user.workXp || 0) + xpGained} XP`,
    `│ Wallet         ${formatMoney(user.money || 0)}`,
    `│ Next shift     ${formatRemaining(nextShift)}`,
    `╰────────────────────────────`,
  ].join("\n");
}

export function buildJobBoard(user) {
  const groups = ["entry", "mid", "high"];
  const lines = [
    `╭───〔 📋 *CAREER BOARD* 〕───╮`,
    `│ Cooldown: 10 minutes  •  Payroll tax: 10%`,
    `│ Energy cost is paid per shift.`,
    `│ Start unemployed: choose an entry job first.`,
    `├────────────────────────────`,
  ];

  for (const tierKey of groups) {
    const tierJobs = Object.entries(JOBS).filter(([, job]) => job.tierKey === tierKey);
    lines.push(`│ *${tierJobs[0][1].tier}*`);
    for (const [key, job] of tierJobs) {
      const missing = getMissingRequirements(user, key);
      const status = missing.length === 0 ? "✅" : "🔒";
      lines.push(`│ ${status} ${job.emoji} *${key}* — ${formatMoney(job.pay)}`);
      if (missing.length) lines.push(`│    _Requires ${missing.join(", ")}_`);
    }
    lines.push(`│`);
  }

  lines.push(
    `│ *.work <job>* apply or promote`,
    `│ *.work status* career + energy`,
    `│ *.work rest* recover 25 energy`,
    `│ *.work eat <item>* use a food/item`,
    `╰────────────────────────────`,
  );
  return lines.join("\n");
}

export function buildStatus(user) {
  const jobKey = normalizeJobKey(user.job);
  const job = getJob(jobKey);
  return [
    `╭───〔 📊 *WORK STATUS* 〕───╮`,
    `│ ${job ? `${job.emoji} *${job.name}*` : "🌙 *Unemployed*"}`,
    `│ Tier           ${job?.tier || "Entry-Level"}`,
    `│ Energy         ${energyBar(user.energy)}`,
    `│ Career XP      ${Number(user.workXp || 0).toLocaleString()}`,
    `│ Shifts done    ${Number(user.completedShifts || 0).toLocaleString()}`,
    `│ Wallet         ${formatMoney(user.money || 0)}`,
    `│`,
    `│ *.work jobs* — view promotions`,
    `│ *.work rest* — recover 25 energy`,
    `╰────────────────────────────`,
  ].join("\n");
}

export function getEnergyItem(itemName) {
  const key = String(itemName || "").toLowerCase().replace(/\s+/g, "_");
  return ENERGY_ITEMS[key] ? { key, ...ENERGY_ITEMS[key] } : null;
}