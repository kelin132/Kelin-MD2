import {
  getUser,
  saveUser,
  requireRegistration,
  addHistory,
  checkLevelUp,
  claimWorkShift,
  restoreWorkEnergy,
} from "./database.js";
import { guildSystem } from "../../lib/guildSystem.js";
import {
  SHIFT_COOLDOWN_MS,
  REST_COOLDOWN_MS,
  JOB_CHANGE_COOLDOWN_MS,
  MAX_ENERGY,
  MAX_SHIFT_GROSS_PAY,
  PAYROLL_TAX_RATE,
  buildJobBoard,
  buildPaystub,
  buildStatus,
  clampEnergy,
  formatMoney,
  formatRemaining,
  getEnergyItem,
  getJob,
  getMissingRequirements,
  normalizeJobKey,
  resolveJob,
  rollWorkEvent,
} from "./workSystem.mjs";

const replyWith = (sock, jid, msg) => (text) =>
  sock.sendMessage(jid, { text }, { quoted: msg });

function jobDisplay(jobKey) {
  const job = getJob(jobKey);
  return job ? `${job.emoji} ${job.name}` : "Unknown job";
}

function usageText() {
  return [
    `💼 *WORK SYSTEM*`,
    ``,
    `*.work* — take your next shift`,
    `*.work jobs* — browse careers and promotions`,
    `*.work <job>* — apply or promote`,
    `*.work status* — energy, XP, and shift count`,
    `*.work rest* — recover 25 energy`,
    `*.work eat <item>* — consume food or an energy item`,
  ].join("\n");
}

async function handleJobSelection({ sock, msg, sender, user, jid, args }) {
  const reply = replyWith(sock, jid, msg);
  const isChange = args[0]?.toLowerCase() === "change" || args[0]?.toLowerCase() === "apply";
  const input = (isChange ? args.slice(1) : args).join(" ");
  const jobKey = resolveJob(input);
  if (!jobKey) return reply(`❌ Career not found.\n\n${usageText()}`);

  const currentJob = normalizeJobKey(user.job);
  if (currentJob === jobKey) {
    return reply(`✅ You already work as *${jobDisplay(jobKey)}*.\n\nUse *.work* to take a shift.`);
  }

  const missing = getMissingRequirements(user, jobKey);
  if (missing.length) {
    return reply([
      `╭───〔 🔒 *CAREER LOCKED* 〕───╮`,
      `│ ${jobDisplay(jobKey)}`,
      `│`,
      `│ Missing:`,
      ...missing.map((item) => `│ • ${item}`),
      `│`,
      `│ Complete more shifts, earn career XP,`,
      `│ or buy the required education/gear.`,
      `╰────────────────────────────`,
    ].join("\n"));
  }

  const now = Date.now();
  const sinceChange = now - Number(user.lastJobChange || 0);
  if (currentJob && sinceChange < JOB_CHANGE_COOLDOWN_MS) {
    return reply([
      `🔒 *Career change on cooldown*`,
      ``,
      `Current: ${jobDisplay(currentJob)}`,
      `Switch again in: ${formatRemaining(JOB_CHANGE_COOLDOWN_MS - sinceChange)}`,
      ``,
      `_Promotion is faster when you keep completing shifts._`,
    ].join("\n"));
  }

  user.job = jobKey;
  user.fired = false;
  user.lastJobChange = now;
  await saveUser(sender, user);
  const job = getJob(jobKey);
  return reply([
    `╭───〔 ✅ *CAREER UPDATED* 〕───╮`,
    `│ ${job.emoji} *${job.name}*`,
    `│ Tier: ${job.tier}`,
    `│ Base pay: ${formatMoney(job.pay)} / shift`,
    `│ Energy cost: ${job.energy}%`,
    `│`,
    `│ Your next shift is ready now.`,
    `│ Use *.work* every 10 minutes.`,
    `╰────────────────────────────`,
  ].join("\n"));
}

async function handleRest({ sock, msg, sender, user, jid }) {
  const reply = replyWith(sock, jid, msg);
  const now = Date.now();
  const energy = clampEnergy(user.energy);
  if (energy >= MAX_ENERGY) return reply(`🛌 Your energy is already full.\n\n${"█".repeat(10)} 100%`);

  const sinceRest = now - Number(user.lastRest || 0);
  if (sinceRest < REST_COOLDOWN_MS) {
    return reply(`🛌 You are already resting.\n\nTry again in *${formatRemaining(REST_COOLDOWN_MS - sinceRest)}*.`);
  }

  const updated = await restoreWorkEnergy(sender, now, REST_COOLDOWN_MS, 25);
  if (!updated) return reply(`🛌 Rest was already used or your energy changed. Check *.work status*.`);
  return reply([
    `🛌 *REST COMPLETE*`,
    ``,
    `Energy restored: *+25%*`,
    `Energy: ${updated.energyBar}`,
    ``,
    `_Food and energy items can restore more at once._`,
  ].join("\n"));
}

async function handleEat({ sock, msg, sender, user, jid, args }) {
  const reply = replyWith(sock, jid, msg);
  const item = getEnergyItem(args.join(" "));
  if (!item) {
    return reply([
      `🍱 *WORK RECOVERY ITEMS*`,
      ``,
      `*.work eat work_meal* +35%`,
      `*.work eat protein_bar* +15%`,
      `*.work eat energy_drink* +25%`,
      `*.work eat premium_meal* +60%`,
      ``,
      `Buy them in *.shop consumables* and check *.inventory*.`,
    ].join("\n"));
  }

  const index = (user.inventory || []).indexOf(item.key);
  if (index === -1) return reply(`❌ You do not have *${item.label}*.\n\nBuy one from *.shop consumables*.`);
  if (clampEnergy(user.energy) >= MAX_ENERGY) return reply(`⚡ Your energy is already full.`);

  user.inventory.splice(index, 1);
  const before = clampEnergy(user.energy);
  user.energy = Math.min(MAX_ENERGY, before + item.energy);
  await saveUser(sender, user);
  return reply([
    `🍱 *RECOVERY USED*`,
    ``,
    `${item.label}: *+${item.energy}% energy*`,
    `Energy: ${user.energy >= MAX_ENERGY ? "██████████ 100%" : `${"█".repeat(Math.round(user.energy / 10))}${"░".repeat(10 - Math.round(user.energy / 10))} ${Math.round(user.energy)}%`}`,
    `Restored: +${Math.round(user.energy - before)}%`,
  ].join("\n"));
}

export default {
  name: "work",
  description: "Take a 10-minute shift, build a career, and earn a taxed paycheck",
  category: "economy",
  cooldown: 5,
  usage: ".work | .work jobs | .work <job> | .work status | .work rest | .work eat <item>",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid = msg.key.remoteJid;
    const user = await getUser(sender);
    const sub = (args[0] || "").toLowerCase();

    if (sub === "jobs" || sub === "careers" || sub === "board") {
      return sock.sendMessage(jid, { text: buildJobBoard(user) }, { quoted: msg });
    }
    if (sub === "status" || sub === "energy" || sub === "profile") {
      return sock.sendMessage(jid, { text: buildStatus(user) }, { quoted: msg });
    }
    if (sub === "rest" || sub === "sleep") {
      return handleRest({ sock, msg, sender, user, jid });
    }
    if (sub === "eat" || sub === "food" || sub === "refill") {
      return handleEat({ sock, msg, sender, user, jid, args: args.slice(1) });
    }
    if (sub === "help") {
      return sock.sendMessage(jid, { text: usageText() }, { quoted: msg });
    }
    if (args.length > 0) {
      return handleJobSelection({ sock, msg, sender, user, jid, args });
    }

    const jobKey = normalizeJobKey(user.job);
    const job = getJob(jobKey);
    if (!job || user.fired) {
      return sock.sendMessage(jid, {
        text: `🌙 You are currently unemployed.\n\n${buildJobBoard(user)}`,
      }, { quoted: msg });
    }
    if (user.job !== jobKey) {
      user.job = jobKey;
      await saveUser(sender, user);
    }

    const now = Date.now();
    const lastWork = Number(user.lastWork || 0);
    if (now - lastWork < SHIFT_COOLDOWN_MS) {
      return sock.sendMessage(jid, {
        text: [
          `⏳ *SHIFT NOT READY*`,
          ``,
          `${job.emoji} ${job.name}`,
          `Next shift in: *${formatRemaining(SHIFT_COOLDOWN_MS - (now - lastWork))}*`,
          `Energy: ${clampEnergy(user.energy)}%`,
        ].join("\n"),
      }, { quoted: msg });
    }

    const energy = clampEnergy(user.energy);
    if (energy < job.energy) {
      return sock.sendMessage(jid, {
        text: [
          `⚡ *TOO TIRED TO CLOCK IN*`,
          ``,
          `This shift needs *${job.energy}%* energy.`,
          `Your energy: *${energy}%*`,
          ``,
          `Use *.work rest* or *.work eat work_meal*.`,
        ].join("\n"),
      }, { quoted: msg });
    }

    const event = rollWorkEvent(job);
    const gross = Math.min(MAX_SHIFT_GROSS_PAY, Math.max(0, job.pay + event.amount));
    const payrollTax = Math.floor(gross * PAYROLL_TAX_RATE);
    const guildTaxInfo = await guildSystem.getGuildTax(sender, gross);
    const guildTax = Math.min(Math.max(0, gross - payrollTax), guildTaxInfo.amount);
    const tax = payrollTax + guildTax;
    const net = gross - tax;
    const updated = await claimWorkShift(sender, {
      jobKey,
      now,
      cooldownMs: SHIFT_COOLDOWN_MS,
      energyCost: job.energy,
      netPay: net,
      xp: job.xp,
      workXp: job.xp,
      gross,
      tax,
      eventKey: event.key,
      eventLabel: event.label,
      eventAmount: event.amount,
      historyDescription: `${job.name}: ${event.label}`,
    });

    if (!updated) {
      return sock.sendMessage(jid, {
        text: `⚠️ Your shift was just claimed or your energy changed.\n\nUse *.work status* to refresh your career panel.`,
      }, { quoted: msg });
    }

    const { leveled } = checkLevelUp(updated);
    if (leveled) await saveUser(sender, updated);
    if (guildTaxInfo.guild && guildTax > 0) {
      await guildSystem.recordWorkContribution(guildTaxInfo.guild.name, guildTax, job.xp);
    }
    await addHistory(sender, "work", net, `${job.name} — ${event.label}; payroll tax ${formatMoney(payrollTax)}; guild tax ${formatMoney(guildTax)}`);

    const caption = buildPaystub({
      user: updated,
      jobKey,
      job,
      event,
      gross,
      tax,
      payrollTax,
      guildTax,
      guildTaxRate: guildTaxInfo.rate,
      guildName: guildTaxInfo.guild?.name ?? null,
      net,
      xpGained: job.xp,
      energyAfter: updated.energy,
      now,
    });
    return sock.sendMessage(jid, {
      text: `${caption}${leveled ? `\n\n🎉 *LEVEL UP!* You are now Level ${updated.level}.` : ""}`,
    }, { quoted: msg });
  },
};
