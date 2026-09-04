/**
 * KELIN MD — .company (BIT-LIFE)
 * Buy and run your own company. Hire up to 6 employees and pay salaries automatically.
 *
 * Commands:
 *   .company buy <name> <tier 1-5>  — Buy a company (1B–5B)
 *   .company info                   — View your company + auto-payday
 *   .company hire @user <salary>    — Hire someone (max 6 employees)
 *   .company fire @user             — Fire an employee
 *   .company salary @user <amount>  — Update an employee's salary
 *   .company employees              — List all employees
 *   .company work                   — Work a shift as an employee
 *   .company sell                   — Sell company for 40% of purchase price
 *   .company leaderboard            — Top 5 companies by total paid
 *   .company fund <amount>          — Irreversible payroll treasury deposit (max $500B/day)
 *   .company upgrade                — Upgrade company level when requirements are met
 */
import { getUser, saveUser, requireRegistration, addHistory, isRegistered } from "../economy/database.js";
import { parseAmount } from "../economy/parseAmount.js";
import { getDb } from "../../lib/mongo.mjs";
import { generateCompanyCard } from "../../lib/companyCanvas.mjs";
import { formatAnimeLeaderboard } from "../../lib/animeLeaderboard.mjs";

const COMPANY_TIERS = [
  { tier: 1, label: "Startup",           price: 1_000_000_000,  emoji: "🏪" },
  { tier: 2, label: "Small Business",    price: 2_000_000_000,  emoji: "🏬" },
  { tier: 3, label: "Medium Company",    price: 3_000_000_000,  emoji: "🏢" },
  { tier: 4, label: "Large Corporation", price: 4_000_000_000,  emoji: "🏙️" },
  { tier: 5, label: "Mega Corporation",  price: 5_000_000_000,  emoji: "🌆" },
];

const MAX_EMPLOYEES   = 6;
const COMPANY_MAX_LEVEL = 10;
const DAILY_FUND_LIMIT = 500_000_000_000;
const PAYDAY_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const COMPANY_WORK_COOLDOWN = 9 * 60 * 1000; // 9 min between company shifts
const SELL_RATE       = 0.40; // get 40% back on sell — it's a distressed sale

function companyLevelRequirement(level) {
  const nextLevel = Math.max(2, Number(level || 1) + 1);
  return {
    level: nextLevel,
    xp: (nextLevel - 1) * 100,
    treasury: (nextLevel - 1) * 1_000_000_000,
    employees: Math.min(MAX_EMPLOYEES, Math.max(1, nextLevel - 1)),
  };
}

function resetDailyFunding(company) {
  const today = new Date().toISOString().slice(0, 10);
  if (company.fundingDay !== today) {
    company.fundingDay = today;
    company.fundedToday = 0;
  }
}

// ── Collection helper (Col pattern) ─────────────────────────────────────────
const Col = {
  companies: async () => (await getDb()).collection("companies"),
};

async function getCompany(ownerId) {
  const col = await Col.companies();
  return col.findOne({ ownerId });
}

async function saveCompany(data) {
  const col = await Col.companies();
  const { _id, ...rest } = data;
  await col.updateOne({ ownerId: data.ownerId }, { $set: rest }, { upsert: true });
}

/** Resolve display names from the economy profile while keeping JIDs internal. */
async function getRegisteredName(jid, fallback = "Unregistered user") {
  const user = await getUser(jid);
  const name = typeof user.name === "string" ? user.name.trim() : "";
  return user.registered && name ? name : fallback;
}

async function getEmployeeName(employee) {
  return getRegisteredName(employee.jid);
}

async function getCompanyForEmployee(employeeJid) {
  const col = await Col.companies();
  return col.findOne({ "employees.jid": employeeJid });
}

/** Check & execute payday if 24h has passed */
async function tryPayday(company, ownerJid) {
  const now  = Date.now();
  if (!company.employees?.length) return { paid: false };
  if (now - (company.lastPayday || 0) < PAYDAY_INTERVAL) return { paid: false };

  const totalSalary = company.employees.reduce((s, e) => s + (e.salary || 0), 0);
  const treasury = Number(company.treasury || 0);

  if (treasury < totalSalary) return { paid: false, broke: true, totalSalary, treasury };

  // Payroll is paid from the irreversible company treasury.
  company.treasury = treasury - totalSalary;
  company.xp = (company.xp || 0) + company.employees.length;

  // Pay each employee
  for (const emp of company.employees) {
    const empUser = await getUser(emp.jid);
    empUser.money = (empUser.money || 0) + emp.salary;
    await saveUser(emp.jid, empUser);
    await addHistory(emp.jid, "salary", emp.salary, `Salary from ${company.name}`);
  }

  company.lastPayday   = now;
  company.totalPaid    = (company.totalPaid || 0) + totalSalary;
  await saveCompany(company);

  return { paid: true, totalSalary };
}

export default {
  name: "company",
  aliases: ["corp", "bitlife", "business"],
  category: "economy",
  cooldown: 6,
  description: "Run your own company — fund workers, upgrade levels, and grow your empire!",
  usage: ".company buy <name> <tier 1-5> | .company info | .company fund <amount> | .company upgrade",

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const sub   = (args[0] || "info").toLowerCase();

    // ── HELP ─────────────────────────────────────────────────────────────────
    if (sub === "help") {
      const tierList = COMPANY_TIERS.map(t =>
        `  ${t.emoji} *Tier ${t.tier}* — \`${t.label}\` — \`$${t.price.toLocaleString()}\``
      ).join("\n");

      return reply(
`🏢 *BIT-LIFE COMPANY SYSTEM*

Build and run your own company!

💰 *Company Tiers:*
${tierList}

📋 *Commands:*
  \`.company buy <name> <1-5>\`   — Buy a company
  \`.company info\`               — View your company
  \`.company hire @user <salary>\`— Hire an employee (max 6)
  \`.company fire @user\`         — Fire an employee
  \`.company salary @user <amt>\` — Update employee salary
  \`.company employees\`          — List your staff
  \`.company work\`               — Work a shift as an employee
  \`.company fund <amount>\`      — Irreversible treasury deposit (max $500B/day)
  \`.company upgrade\`            — Upgrade company level
  \`.company sell\`               — Sell company (40% back, employees released automatically)
  \`.company leave\`              — Leave a company you work at
  \`.company leaderboard\`        — Top 5 companies

🕐 Salaries are paid automatically every 24 hours from the company treasury.
⚠️ Treasury deposits cannot be withdrawn or transferred back to the owner.`
      );
    }

    // ── BUY ───────────────────────────────────────────────────────────────────
    if (sub === "buy") {
      const existing = await getCompany(sender);
      if (existing) return reply(`❌ You already own \`${existing.name}\`!\n\nUse \`.company info\` to view it.`);

      // Parse name and tier
      const tierNum = parseInt(args[args.length - 1]);
      if (isNaN(tierNum) || tierNum < 1 || tierNum > 5) {
        const tierList = COMPANY_TIERS.map(t =>
          `  ${t.emoji} Tier ${t.tier} — \`${t.label}\` — \`$${t.price.toLocaleString()}\``
        ).join("\n");
        return reply(`❌ Usage: \`.company buy <name> <tier 1-5>\`\n\nTiers:\n${tierList}`);
      }

      const name = args.slice(1, -1).join(" ").trim();
      if (!name || name.length < 2) return reply("❌ Enter a company name.\n\nExample: \`.company buy Kelin Corp 2\`");
      if (name.length > 40) return reply("❌ Company name must be under 40 characters.");

      const tier = COMPANY_TIERS[tierNum - 1];
      const user = await getUser(sender);

      if ((user.money || 0) < tier.price) {
        return reply(
`❌ *Insufficient funds!*

${tier.emoji} \`${tier.label}\` costs \`$${tier.price.toLocaleString()}\`
Your wallet: \`$${(user.money || 0).toLocaleString()}\``
        );
      }

      user.money -= tier.price;
      await saveUser(sender, user);
      await addHistory(sender, "company_buy", -tier.price, `Bought company: ${name}`);

      const now = Date.now();
      const foundedDate = new Date(now).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      });

      await saveCompany({
        ownerId:   sender,
        name,
        tier:      tierNum,
        tierLabel: tier.label,
        tierEmoji: tier.emoji,
        price:     tier.price,
        purchasedAt: now,
        employees:   [],
        lastPayday:  now,
        totalPaid:   0,
        treasury:    0,
        fundedToday: 0,
        fundingDay:  new Date(now).toISOString().slice(0, 10),
        level:       1,
        xp:          0,
        foundedDate,
      });

      // Try to fetch owner's WhatsApp profile picture for the canvas
      let ownerAvatarUrl = null;
      try { ownerAvatarUrl = await sock.profilePictureUrl(sender, "image"); } catch { /* no pic */ }

      const ownerName = await getRegisteredName(sender, "Company owner");

      // Generate company card image
      try {
        const cardBuf = await generateCompanyCard({
          companyName:   name,
          tierLabel:     tier.label,
          tierEmoji:     tier.emoji,
          tier:          tierNum,
          employeeCount: 0,
          maxEmployees:  MAX_EMPLOYEES,
          dailyCost:     0,
          totalPaid:     0,
          ownerName,
          ownerAvatarUrl,
          foundedDate,
        });

        await sock.sendMessage(jid, {
          image:   cardBuf,
          caption:
`${tier.emoji} *COMPANY PURCHASED!*

🏢 Name   : \`${name}\`
📊 Tier   : \`${tier.label}\`
💰 Paid   : \`$${tier.price.toLocaleString()}\`
💰 Balance: \`$${user.money.toLocaleString()}\`

*Next steps:*
• \`.company hire @user <salary>\` — Hire up to \`${MAX_EMPLOYEES}\` employees
• Salaries auto-pay every 24 hours
• \`.company sell\` — Sell for \`${(SELL_RATE * 100).toFixed(0)}%\` back`,
        }, { quoted: msg });
      } catch {
        // Canvas failed — fall back to text
        return reply(
`${tier.emoji} *COMPANY PURCHASED!*

🏢 Name   : \`${name}\`
📊 Tier   : \`${tier.label}\`
💰 Paid   : \`$${tier.price.toLocaleString()}\`
💰 Balance: \`$${user.money.toLocaleString()}\`

*Next steps:*
• \`.company hire @user <salary>\` — Hire up to \`${MAX_EMPLOYEES}\` employees
• Salaries auto-pay every 24 hours
• \`.company sell\` — Sell for \`${(SELL_RATE * 100).toFixed(0)}%\` back`
        );
      }
      return;
    }

    // ── FUND TREASURY ─────────────────────────────────────────────────────────
    if (sub === "fund" || sub === "deposit" || sub === "fundworkers") {
      const company = await getCompany(sender);
      if (!company) return reply("❌ You don't own a company yet! Buy one with \`.company buy <name> <tier>\`.");
      resetDailyFunding(company);

      const amount = parseAmount((args[1] || "").toLowerCase(), 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        return reply("❌ Usage: \`.company fund <amount>\`\n\nExample: \`.company fund 500b\`");
      }
      if (amount > DAILY_FUND_LIMIT) {
        return reply(`❌ The maximum daily company funding is \`$${DAILY_FUND_LIMIT.toLocaleString()}\` (500B).`);
      }
      if ((company.fundedToday || 0) + amount > DAILY_FUND_LIMIT) {
        const remaining = DAILY_FUND_LIMIT - (company.fundedToday || 0);
        return reply(`❌ Your company has already received \`$${(company.fundedToday || 0).toLocaleString()}\` today.\n\nRemaining today: \`$${Math.max(0, remaining).toLocaleString()}\``);
      }

      const user = await getUser(sender);
      if ((user.money || 0) < amount) {
        return reply(`❌ Insufficient wallet funds.\n\nRequired: \`$${amount.toLocaleString()}\` \nWallet: \`$${(user.money || 0).toLocaleString()}\``);
      }

      user.money -= amount;
      await saveUser(sender, user);
      await addHistory(sender, "company_fund", -amount, `Irreversible treasury funding: ${company.name}`);
      company.treasury = (company.treasury || 0) + amount;
      company.fundedToday = (company.fundedToday || 0) + amount;
      company.xp = (company.xp || 0) + Math.max(1, Math.floor(amount / 1_000_000_000));
      await saveCompany(company);

      return reply(
`╭━━━〔 🏢 𝐂𝐎𝐌𝐏𝐀𝐍𝐘 𝐓𝐑𝐄𝐀𝐒𝐔𝐑𝐘 〕━━━╮
┃ ✦ Deposit accepted permanently.
┃
┃ 🏢 Company  :: \`${company.name}\`
┃ 💰 Added    :: \`$${amount.toLocaleString()}\`
┃ 🏦 Treasury :: \`$${company.treasury.toLocaleString()}\`
┃ ✨ Company XP:: \`${company.xp.toLocaleString()}\`
┃ 📅 Funded today :: \`$${company.fundedToday.toLocaleString()}\`/\`$${DAILY_FUND_LIMIT.toLocaleString()}\`
┃
┃ ⚠️ Treasury deposits cannot be withdrawn.
╰━━━━━━━━━━━━━━━━━━━━╯`);
    }

    // ── COMPANY LEVEL UP ───────────────────────────────────────────────────────
    if (sub === "upgrade" || sub === "levelup" || sub === "level") {
      const company = await getCompany(sender);
      if (!company) return reply("❌ You don't own a company yet!");
      const currentLevel = Number(company.level || 1);
      if (currentLevel >= COMPANY_MAX_LEVEL) return reply(`✨ \`${company.name}\` is already at the maximum company level (\`${COMPANY_MAX_LEVEL}\`).`);

      const req = companyLevelRequirement(currentLevel);
      const missing = [];
      if ((company.xp || 0) < req.xp) missing.push(`XP: \`${(req.xp - (company.xp || 0)).toLocaleString()}\` more`);
      if ((company.treasury || 0) < req.treasury) missing.push(`treasury: \`$${(req.treasury - (company.treasury || 0)).toLocaleString()}\` more`);
      if ((company.employees?.length || 0) < req.employees) missing.push(`employees: \`${req.employees - (company.employees?.length || 0)}\` more`);
      if (missing.length) {
        return reply(
`⏳ \`${company.name}\` is not ready for level \`${req.level}\` yet.

📊 Current level: \`${currentLevel}\`
✨ Requirement: \`${req.xp}\` XP
🏦 Treasury requirement: \`$${req.treasury.toLocaleString()}\`
👥 Employee requirement: \`${req.employees}\`

Missing: ${missing.join(" · ")}`);
      }

      company.level = req.level;
      await saveCompany(company);
      return reply(
`╭━━━〔 🎉 𝐂𝐎𝐌𝐏𝐀𝐍𝐘 𝐋𝐄𝐕𝐄𝐋 𝐔𝐏 〕━━━╮
┃ 🏢 \`${company.name}\` reached *Level \`${company.level}\`*!
┃
┃ ✨ XP :: \`${company.xp.toLocaleString()}\`
┃ 🏦 Treasury :: \`$${company.treasury.toLocaleString()}\`
┃ 👥 Capacity :: \`${Math.min(MAX_EMPLOYEES, company.level + 5)}\` employees
┃
┃ Keep funding your workers and growing the company.
╰━━━━━━━━━━━━━━━━━━━━╯`);
    }

    // ── INFO ──────────────────────────────────────────────────────────────────
    if (sub === "info" || !args[0]) {
      const company = await getCompany(sender);
      if (!company) return reply("❌ You don't own a company yet!\n\nUse \`.company buy <name> <1-5>\` to get started.\nType \`.company help\` for info.");

      resetDailyFunding(company);
      const paydayResult = await tryPayday(company, sender);
      const freshCompany = await getCompany(sender) || company;
      const ownerName = await getRegisteredName(sender, "Company owner");

      const employeeNames = freshCompany.employees?.length
        ? await Promise.all(freshCompany.employees.map(getEmployeeName))
        : [];
      const empList = employeeNames.length
        ? employeeNames.map((name, i) =>
            `  \`${i + 1}.\` \`${name}\` — Salary: \`$${freshCompany.employees[i].salary.toLocaleString()}\`/day`
          ).join("\n")
        : "  None — use \`.company hire @user <salary>\`";

      const totalSalary = freshCompany.employees?.reduce((s, e) => s + (e.salary || 0), 0) || 0;
      const companyLevel = Number(freshCompany.level || 1);
      const nextUpgrade = companyLevel < COMPANY_MAX_LEVEL ? companyLevelRequirement(companyLevel) : null;
      const nextPayday  = freshCompany.lastPayday
        ? Math.max(0, Math.ceil((freshCompany.lastPayday + PAYDAY_INTERVAL - Date.now()) / 3600000))
        : 24;

      let paydayMsg = "";
      if (paydayResult.paid)        paydayMsg = `\n\n✅ *PAYDAY executed!* Paid \`$${paydayResult.totalSalary.toLocaleString()}\` to \`${freshCompany.employees?.length}\` employees.`;
      else if (paydayResult.broke)  paydayMsg = `\n\n⚠️ *Payday overdue!* Need \`$${paydayResult.totalSalary.toLocaleString()}\` — top up your wallet!`;

      return reply(
`${freshCompany.tierEmoji} *${freshCompany.name.toUpperCase()}*

📊 Tier       : \`${freshCompany.tierLabel}\`
✨ Level      : \`${companyLevel}\`/\`${COMPANY_MAX_LEVEL}\` · XP \`${(freshCompany.xp || 0).toLocaleString()}\`
👤 Owner      : \`${ownerName}\`
💼 Employees  : \`${freshCompany.employees?.length || 0}\`/\`${Math.min(MAX_EMPLOYEES, companyLevel + 5)}\`
💸 Daily Cost : \`$${totalSalary.toLocaleString()}\`
🏦 Treasury   : \`$${(freshCompany.treasury || 0).toLocaleString()}\`
⏰ Next Payday: in \`${nextPayday}h\`
💰 Total Paid : \`$${(freshCompany.totalPaid || 0).toLocaleString()}\`

👥 *Staff:*
${empList}

${nextUpgrade ? `⬆️ Next level: \`${nextUpgrade.level}\` · \`${nextUpgrade.xp}\` XP · \`$${nextUpgrade.treasury.toLocaleString()}\` treasury · \`${nextUpgrade.employees}\` employees` : "🏆 Maximum company level reached."}${paydayMsg}`
      );
    }

    // ── WORK ──────────────────────────────────────────────────────────────────
    if (sub === "work") {
      const company = await getCompanyForEmployee(sender);
      if (!company) {
        return reply(
          "❌ You are not on a company staff yet.\n\n" +
          "Ask a company owner to hire you with \`.company hire @user <salary>\`."
        );
      }

      const employee = (company.employees || []).find(e => e.jid === sender);
      if (!employee) return reply("❌ You are not on a company staff yet.");

      const now = Date.now();
      const sinceLastShift = now - (employee.lastWork || 0);
      if (sinceLastShift < COMPANY_WORK_COOLDOWN) {
        const minutes = Math.ceil((COMPANY_WORK_COOLDOWN - sinceLastShift) / 60000);
        return reply(
          `⏰ *Shift cooldown*\n\n` +
          `You can work at \`${company.name}\` again in \`${minutes}\` minute${minutes === 1 ? "" : "s"}.`
        );
      }

      const salary = employee.salary || 0;
      const treasury = Number(company.treasury || 0);
      if (treasury < salary) {
        return reply(
          `⚠️ *Company payroll is short!*\n\n` +
          `Your salary is \`$${salary.toLocaleString()}\`, but the company treasury only has ` +
          `\`$${treasury.toLocaleString()}\`.\n\n` +
          `Ask the owner to use \`.company fund <amount>\` to add irreversible payroll funds.`
        );
      }

      const worker = await getUser(sender);
      worker.money = (worker.money || 0) + salary;
      await saveUser(sender, worker);
      await addHistory(sender, "company_shift", salary, `Worked a shift at ${company.name}`);

      company.treasury = treasury - salary;
      company.totalPaid = (company.totalPaid || 0) + salary;
      company.xp = (company.xp || 0) + 1;
      employee.lastWork = now;
      await saveCompany(company);

      const employeeName = await getEmployeeName(employee);
      return reply(
        `✅ *SHIFT COMPLETE!*\n\n` +
        `🏢 Company : \`${company.name}\`\n` +
        `👤 Worker  : \`${employeeName}\`\n` +
        `💰 Earned  : \`$${salary.toLocaleString()}\`\n` +
        `💰 Balance : \`$${worker.money.toLocaleString()}\`\n` +
        `🏦 Treasury: \`$${company.treasury.toLocaleString()}\`\n\n` +
        "⏰ You can work again in `9` minutes."
      );
    }

    // ── HIRE ──────────────────────────────────────────────────────────────────
    if (sub === "hire") {
      const company = await getCompany(sender);
      if (!company) return reply("❌ You don't own a company! Buy one with \`.company buy <name> <1-5>\`");

      if ((company.employees?.length || 0) >= MAX_EMPLOYEES) {
        return reply(`❌ Your company is full! Max \`${MAX_EMPLOYEES}\` employees.\n\nFire someone with \`.company fire @user\``);
      }

      // Parse @mention and salary
      const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const salary = parseAmount((args[args.length - 1] || "").toLowerCase(), 0);

      if (!mentionedJids.length) return reply("❌ Usage: \`.company hire @user <salary>\`\n✦ Shorthand: `10k` / `5m` / `1b`");
      if (isNaN(salary) || salary < 1000) return reply("❌ Minimum salary is `$1,000`.\n\nUsage: \`.company hire @user <salary>\`\n✦ Shorthand: `10k` / `5m` / `1b`");

      const targetJid = mentionedJids[0];
      if (targetJid === sender) return reply("❌ You can't hire yourself!");
      if (!await isRegistered(targetJid)) {
        return reply("❌ That user must register first before joining a company.");
      }

      // Check not already hired
      if (company.employees?.some(e => e.jid === targetJid)) {
        return reply(`❌ \`${await getRegisteredName(targetJid)}\` is already an employee!`);
      }

      const targetName = await getRegisteredName(targetJid);
      company.employees = company.employees || [];
      company.employees.push({
        jid:      targetJid,
        name:     targetName,
        salary,
        hiredAt:  Date.now(),
      });

      await saveCompany(company);

      return await sock.sendMessage(jid, {
        text:
`✅ *Employee Hired!*

🏢 Company : \`${company.name}\`
👤 Employee: \`${targetName}\`
💰 Salary  : \`$${salary.toLocaleString()}\`/day
👥 Staff   : \`${company.employees.length}\`/\`${MAX_EMPLOYEES}\`

Salary paid automatically every 24 hours!`,
        mentions: [targetJid],
      }, { quoted: msg });
    }

    // ── FIRE ──────────────────────────────────────────────────────────────────
    if (sub === "fire") {
      const company = await getCompany(sender);
      if (!company) return reply("❌ You don't own a company!");

      const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentionedJids.length) return reply("❌ Usage: \`.company fire @user\`");

      const targetJid = mentionedJids[0];
      const idx       = (company.employees || []).findIndex(e => e.jid === targetJid);

      if (idx === -1) return reply(`❌ \`${await getRegisteredName(targetJid)}\` is not your employee!`);

      const fired = company.employees.splice(idx, 1)[0];
      const firedName = await getEmployeeName(fired);
      await saveCompany(company);

      return await sock.sendMessage(jid, {
        text:
`🔴 *Employee Fired!*

🏢 Company : \`${company.name}\`
👤 Fired   : \`${firedName}\`
👥 Staff   : \`${company.employees.length}\`/\`${MAX_EMPLOYEES}\``,
        mentions: [targetJid],
      }, { quoted: msg });
    }

    // ── SALARY ────────────────────────────────────────────────────────────────
    if (sub === "salary") {
      const company = await getCompany(sender);
      if (!company) return reply("❌ You don't own a company!");

      const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const newSalary = parseAmount((args[args.length - 1] || "").toLowerCase(), 0);

      if (!mentionedJids.length || isNaN(newSalary) || newSalary < 1000) {
        return reply("❌ Usage: \`.company salary @user <amount>\`\nMinimum salary: `$1,000`\n✦ Shorthand: `10k` / `5m` / `1b`");
      }

      const targetJid = mentionedJids[0];
      const emp = (company.employees || []).find(e => e.jid === targetJid);
      if (!emp) return reply(`❌ \`${await getRegisteredName(targetJid)}\` is not your employee!`);

      const oldSalary = emp.salary;
      emp.salary = newSalary;
      const employeeName = await getEmployeeName(emp);
      await saveCompany(company);

      return await sock.sendMessage(jid, {
        text:
`💰 *Salary Updated!*

👤 Employee : \`${employeeName}\`
📉 Old Salary: \`$${oldSalary.toLocaleString()}\`
📈 New Salary: \`$${newSalary.toLocaleString()}\``,
        mentions: [targetJid],
      }, { quoted: msg });
    }

    // ── EMPLOYEES ─────────────────────────────────────────────────────────────
    if (sub === "employees" || sub === "staff") {
      const company = await getCompany(sender);
      if (!company) return reply("❌ You don't own a company!");

      if (!company.employees?.length) {
        return reply(`🏢 \`${company.name}\` has no employees yet.\n\nHire with \`.company hire @user <salary>\``);
      }

      const names = await Promise.all(company.employees.map(getEmployeeName));
      const list = company.employees.map((e, i) =>
        `\`${i + 1}.\` \`${names[i]}\` — \`$${e.salary.toLocaleString()}\`/day`
      ).join("\n");

      const total = company.employees.reduce((s, e) => s + e.salary, 0);

      return await sock.sendMessage(jid, {
        text:
`🏢 *${company.name} — STAFF LIST*

${list}

👥 Total: \`${company.employees.length}\`/\`${MAX_EMPLOYEES}\` employees
💸 Total daily cost: \`$${total.toLocaleString()}\``,
      }, { quoted: msg });
    }

    // ── SELL ──────────────────────────────────────────────────────────────────
    if (sub === "sell") {
      const company = await getCompany(sender);
      if (!company) return reply("❌ You don't own a company to sell!");

      const refund = Math.floor(company.price * SELL_RATE);
      const user   = await getUser(sender);
      user.money   = (user.money || 0) + refund;
      await saveUser(sender, user);
      await addHistory(sender, "company_sell", refund, `Sold company: ${company.name}`);

      // Release all employees automatically before deleting
      const firedCount = company.employees?.length || 0;

      // Delete company document
      const col = await Col.companies();
      await col.deleteOne({ ownerId: sender });

      return reply(
`💸 *COMPANY SOLD!*

🏢 Company : \`${company.name}\`
📊 Tier    : \`${company.tierLabel}\`
💰 Refund  : \`$${refund.toLocaleString()}\` (\`${(SELL_RATE * 100).toFixed(0)}%\` of \`$${company.price.toLocaleString()}\`)
💰 Balance : \`$${user.money.toLocaleString()}\`${firedCount > 0 ? `\n👥 Released : \`${firedCount}\` employee${firedCount === 1 ? "" : "s"} automatically` : ""}

_The remaining ${100 - SELL_RATE * 100}% is lost — selling a company is never full value._

Use \`.company buy\` to start a new one.`
      );
    }

    // ── LEADERBOARD ───────────────────────────────────────────────────────────
    if (sub === "leaderboard" || sub === "lb" || sub === "top") {
      const col  = await Col.companies();
      const top  = await col.find({}).sort({ totalPaid: -1 }).limit(5).toArray();

      if (!top.length) return reply("📊 No companies registered yet!\n\nBe the first with \`.company buy\`");

      const rows = await Promise.all(top.map(async (c) => {
        const ownerName = await getRegisteredName(c.ownerId);
        const empCount = c.employees?.length || 0;
        return {
          name: c.name,
          value: c.totalPaid || 0,
          valueText: `${c.tierEmoji} \`${c.tierLabel}\` · 👥 \`${empCount}\`/\`${MAX_EMPLOYEES}\` · 💸 \`$${(c.totalPaid || 0).toLocaleString()}\` · 👤 \`${ownerName}\``,
        };
      }));
      return reply(formatAnimeLeaderboard({
        title: "COMPANY LEADERS",
        subtitle: "COMPANY LEADERBOARD",
        rows,
        valueIcon: "🏢",
        valueLabel: "𝐓𝐎𝐓𝐀𝐋 𝐏𝐀𝐈𝐃",
        footer: "🌸 𝐁𝐔𝐒𝐈𝐍𝐄𝐒𝐒 𝐋𝐄𝐆𝐄𝐍𝐃𝐒",
      }));
    }

    // ── LEAVE ─────────────────────────────────────────────────────────────────
    if (sub === "leave") {
      const company = await getCompanyForEmployee(sender);
      if (!company) {
        return reply(
          "❌ You are not employed at any company.\n\n" +
          "Get hired with \`.company hire @you <salary>\` from a company owner."
        );
      }

      const idx = (company.employees || []).findIndex(e => e.jid === sender);
      if (idx === -1) return reply("❌ You are not listed as an employee of that company.");

      const emp = company.employees[idx];
      const employeeName = await getEmployeeName(emp);
      company.employees.splice(idx, 1);
      await saveCompany(company);

      return reply(
`🚪 *You have left ${company.name}!*

👤 Employee : \`${employeeName}\`
🏢 Company  : \`${company.name}\`
👥 Staff    : \`${company.employees.length}\`/\`${MAX_EMPLOYEES}\`

You are now free to join another company.`
      );
    }

    // ── WORK ──────────────────────────────────────────────────────────────────
    if (sub === "work") {
      const company = await getCompanyForEmployee(sender);
      if (!company) return reply("❌ You are not employed at any company!");

      const now = Date.now();
      const lastWork = company.lastWorkTimes?.[sender] || 0;
      if (now - lastWork < COMPANY_WORK_COOLDOWN) {
        const remaining = Math.ceil((COMPANY_WORK_COOLDOWN - (now - lastWork)) / 1000);
        return reply(`⏳ *Work Cooldown!* Wait \`${remaining}s\` before your next shift at ${company.name}.`);
      }

      const emp = company.employees.find(e => e.jid === sender);
      const salary = emp.salary || 1000;
      const workPay = Math.floor(salary * 0.25 + Math.random() * (salary * 0.1)); // 25-35% of daily salary per shift

      if ((company.treasury || 0) < workPay) {
        return reply(`❌ *${company.name} is bankrupt!* The treasury is empty and cannot pay your shift.`);
      }

      const user = await getUser(sender);
      user.money = (user.money || 0) + workPay;
      company.treasury -= workPay;
      company.lastWorkTimes = { ...(company.lastWorkTimes || {}), [sender]: now };
      company.xp = (company.xp || 0) + 1;

      await saveUser(sender, user);
      await saveCompany(company);
      await addHistory(sender, "company_work", workPay, `Shift at ${company.name}`);

      return reply(
`🛠️ *SHIFT COMPLETED!*

🏢 Company : \`${company.name}\`
💰 Earned  : \`$${workPay.toLocaleString()}\`
🏦 Treasury: \`$${company.treasury.toLocaleString()}\`
✨ Company XP: \`${company.xp.toLocaleString()}\`

*Next shift in 9 minutes.*`);
    }

    return reply("❌ Unknown command.\n\nType \`.company help\` for all commands.");
  },
};
