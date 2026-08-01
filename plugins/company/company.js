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
 */
import { getUser, saveUser, requireRegistration, addHistory, isRegistered } from "../economy/database.js";
import { parseAmount } from "../economy/parseAmount.js";
import { getDb } from "../../lib/mongo.mjs";
import { generateCompanyCard } from "../../lib/companyCanvas.mjs";

const COMPANY_TIERS = [
  { tier: 1, label: "Startup",           price: 1_000_000_000,  emoji: "🏪" },
  { tier: 2, label: "Small Business",    price: 2_000_000_000,  emoji: "🏬" },
  { tier: 3, label: "Medium Company",    price: 3_000_000_000,  emoji: "🏢" },
  { tier: 4, label: "Large Corporation", price: 4_000_000_000,  emoji: "🏙️" },
  { tier: 5, label: "Mega Corporation",  price: 5_000_000_000,  emoji: "🌆" },
];

const MAX_EMPLOYEES   = 6;
const PAYDAY_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const COMPANY_WORK_COOLDOWN = 9 * 60 * 1000; // 9 min between company shifts
const SELL_RATE       = 0.40; // get 40% back on sell — it's a distressed sale

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

  const owner = await getUser(ownerJid);
  const totalSalary = company.employees.reduce((s, e) => s + (e.salary || 0), 0);

  if ((owner.money || 0) < totalSalary) return { paid: false, broke: true, totalSalary };

  // Deduct from owner
  owner.money -= totalSalary;
  await saveUser(ownerJid, owner);
  await addHistory(ownerJid, "company_payday", -totalSalary, `Payday: ${company.employees.length} employees`);

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
  description: "Run your own company — hire staff and grow your empire!",
  usage: ".company buy <name> <tier 1-5> | .company info | .company hire @user <salary> | .company work | .company fire @user",

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const sub   = (args[0] || "info").toLowerCase();

    // ── HELP ─────────────────────────────────────────────────────────────────
    if (sub === "help") {
      const tierList = COMPANY_TIERS.map(t =>
        `  ${t.emoji} *Tier ${t.tier}* — ${t.label} — $${t.price.toLocaleString()}`
      ).join("\n");

      return reply(
`🏢 *BIT-LIFE COMPANY SYSTEM*

Build and run your own company!

💰 *Company Tiers:*
${tierList}

📋 *Commands:*
  *.company buy <name> <1-5>*   — Buy a company
  *.company info*               — View your company
  *.company hire @user <salary>*— Hire an employee (max 6)
  *.company fire @user*         — Fire an employee
  *.company salary @user <amt>* — Update employee salary
  *.company employees*          — List your staff
    *.company work*               — Work a shift as an employee
  *.company sell*               — Sell company (40% back, employees released automatically)
  *.company leaderboard*        — Top 5 companies

🕐 Salaries are paid automatically every 24 hours!`
      );
    }

    // ── BUY ───────────────────────────────────────────────────────────────────
    if (sub === "buy") {
      const existing = await getCompany(sender);
      if (existing) return reply(`❌ You already own *${existing.name}*!\n\nUse *.company info* to view it.`);

      // Parse name and tier
      const tierNum = parseInt(args[args.length - 1]);
      if (isNaN(tierNum) || tierNum < 1 || tierNum > 5) {
        const tierList = COMPANY_TIERS.map(t =>
          `  ${t.emoji} Tier ${t.tier} — ${t.label} — $${t.price.toLocaleString()}`
        ).join("\n");
        return reply(`❌ Usage: *.company buy <name> <tier 1-5>*\n\nTiers:\n${tierList}`);
      }

      const name = args.slice(1, -1).join(" ").trim();
      if (!name || name.length < 2) return reply("❌ Enter a company name.\n\nExample: *.company buy Kelin Corp 2*");
      if (name.length > 40) return reply("❌ Company name must be under 40 characters.");

      const tier = COMPANY_TIERS[tierNum - 1];
      const user = await getUser(sender);

      if ((user.money || 0) < tier.price) {
        return reply(
`❌ *Insufficient funds!*

${tier.emoji} ${tier.label} costs $${tier.price.toLocaleString()}
Your wallet: $${(user.money || 0).toLocaleString()}`
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

🏢 Name   : *${name}*
📊 Tier   : ${tier.label}
💰 Paid   : $${tier.price.toLocaleString()}
💵 Balance: $${user.money.toLocaleString()}

*Next steps:*
• *.company hire @user <salary>* — Hire up to ${MAX_EMPLOYEES} employees
• Salaries auto-pay every 24 hours
• *.company sell* — Sell for ${(SELL_RATE * 100).toFixed(0)}% back`,
        }, { quoted: msg });
      } catch {
        // Canvas failed — fall back to text
        return reply(
`${tier.emoji} *COMPANY PURCHASED!*

🏢 Name   : *${name}*
📊 Tier   : ${tier.label}
💰 Paid   : $${tier.price.toLocaleString()}
💵 Balance: $${user.money.toLocaleString()}

*Next steps:*
• *.company hire @user <salary>* — Hire up to ${MAX_EMPLOYEES} employees
• Salaries auto-pay every 24 hours
• *.company sell* — Sell for ${(SELL_RATE * 100).toFixed(0)}% back`
        );
      }
      return;
    }

    // ── INFO ──────────────────────────────────────────────────────────────────
    if (sub === "info" || !args[0]) {
      const company = await getCompany(sender);
      if (!company) return reply("❌ You don't own a company yet!\n\nUse *.company buy <name> <1-5>* to get started.\nType *.company help* for info.");

      const paydayResult = await tryPayday(company, sender);
      const freshCompany = await getCompany(sender) || company;
      const ownerName = await getRegisteredName(sender, "Company owner");

      const employeeNames = freshCompany.employees?.length
        ? await Promise.all(freshCompany.employees.map(getEmployeeName))
        : [];
      const empList = employeeNames.length
        ? employeeNames.map((name, i) =>
            `  ${i + 1}. ${name} — Salary: $${freshCompany.employees[i].salary.toLocaleString()}/day`
          ).join("\n")
        : "  None — use *.company hire @user <salary>*";

      const totalSalary = freshCompany.employees?.reduce((s, e) => s + (e.salary || 0), 0) || 0;
      const nextPayday  = freshCompany.lastPayday
        ? Math.max(0, Math.ceil((freshCompany.lastPayday + PAYDAY_INTERVAL - Date.now()) / 3600000))
        : 24;

      let paydayMsg = "";
      if (paydayResult.paid)        paydayMsg = `\n\n✅ *PAYDAY executed!* Paid $${paydayResult.totalSalary.toLocaleString()} to ${freshCompany.employees?.length} employees.`;
      else if (paydayResult.broke)  paydayMsg = `\n\n⚠️ *Payday overdue!* Need $${paydayResult.totalSalary.toLocaleString()} — top up your wallet!`;

      return reply(
`${freshCompany.tierEmoji} *${freshCompany.name.toUpperCase()}*

📊 Tier       : ${freshCompany.tierLabel}
👤 Owner      : ${ownerName}
💼 Employees  : ${freshCompany.employees?.length || 0}/${MAX_EMPLOYEES}
💸 Daily Cost : $${totalSalary.toLocaleString()}
⏰ Next Payday: in ${nextPayday}h
💰 Total Paid : $${(freshCompany.totalPaid || 0).toLocaleString()}

👥 *Staff:*
${empList}${paydayMsg}`
      );
    }

    // ── HIRE ──────────────────────────────────────────────────────────────────
    if (sub === "work") {
      const company = await getCompanyForEmployee(sender);
      if (!company) {
        return reply(
          "❌ You are not on a company staff yet.\n\n" +
          "Ask a company owner to hire you with *.company hire @user <salary>*."
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
          `You can work at *${company.name}* again in *${minutes} minute${minutes === 1 ? "" : "s"}*.`
        );
      }

      const owner = await getUser(company.ownerId);
      const salary = employee.salary || 0;
      if ((owner.money || 0) < salary) {
        return reply(
          `⚠️ *Company payroll is short!*\n\n` +
          `Your salary is $${salary.toLocaleString()}, but *${await getRegisteredName(company.ownerId, "the owner")}* ` +
          "does not have enough money in the company wallet yet."
        );
      }

      owner.money -= salary;
      await saveUser(company.ownerId, owner);
      await addHistory(company.ownerId, "company_shift", -salary, `Paid an employee at ${company.name}`);

      const worker = await getUser(sender);
      worker.money = (worker.money || 0) + salary;
      await saveUser(sender, worker);
      await addHistory(sender, "company_shift", salary, `Worked a shift at ${company.name}`);

      employee.lastWork = now;
      await saveCompany(company);

      const employeeName = await getEmployeeName(employee);
      return reply(
        `✅ *SHIFT COMPLETE!*\n\n` +
        `🏢 Company : *${company.name}*\n` +
        `👤 Worker  : *${employeeName}*\n` +
        `💰 Earned  : *$${salary.toLocaleString()}*\n` +
        `💵 Balance : $${worker.money.toLocaleString()}\n\n` +
        "⏰ You can work again in 9 minutes."
      );
    }

    if (sub === "hire") {
      const company = await getCompany(sender);
      if (!company) return reply("❌ You don't own a company! Buy one with *.company buy <name> <1-5>*");

      if ((company.employees?.length || 0) >= MAX_EMPLOYEES) {
        return reply(`❌ Your company is full! Max ${MAX_EMPLOYEES} employees.\n\nFire someone with *.company fire @user*`);
      }

      // Parse @mention and salary
      const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const salary = parseAmount((args[args.length - 1] || "").toLowerCase(), 0);

      if (!mentionedJids.length) return reply("❌ Usage: *.company hire @user <salary>*\n✦ Shorthand: 10k / 5m / 1b");
      if (isNaN(salary) || salary < 1000) return reply("❌ Minimum salary is $1,000.\n\nUsage: *.company hire @user <salary>*\n✦ Shorthand: 10k / 5m / 1b");

      const targetJid = mentionedJids[0];
      if (targetJid === sender) return reply("❌ You can't hire yourself!");
      if (!await isRegistered(targetJid)) {
        return reply("❌ That user must register first before joining a company.");
      }

      // Check not already hired
      if (company.employees?.some(e => e.jid === targetJid)) {
        return reply(`❌ *${await getRegisteredName(targetJid)}* is already an employee!`);
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

🏢 Company : ${company.name}
👤 Employee: *${targetName}*
💰 Salary  : $${salary.toLocaleString()}/day
👥 Staff   : ${company.employees.length}/${MAX_EMPLOYEES}

Salary paid automatically every 24 hours!`,
        mentions: [targetJid],
      }, { quoted: msg });
    }

    // ── FIRE ──────────────────────────────────────────────────────────────────
    if (sub === "fire") {
      const company = await getCompany(sender);
      if (!company) return reply("❌ You don't own a company!");

      const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentionedJids.length) return reply("❌ Usage: *.company fire @user*");

      const targetJid = mentionedJids[0];
      const idx       = (company.employees || []).findIndex(e => e.jid === targetJid);

      if (idx === -1) return reply(`❌ *${await getRegisteredName(targetJid)}* is not your employee!`);

      const fired = company.employees.splice(idx, 1)[0];
      const firedName = await getEmployeeName(fired);
      await saveCompany(company);

      return await sock.sendMessage(jid, {
        text:
`🔴 *Employee Fired!*

🏢 Company : ${company.name}
👤 Fired   : *${firedName}*
👥 Staff   : ${company.employees.length}/${MAX_EMPLOYEES}`,
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
        return reply("❌ Usage: *.company salary @user <amount>*\nMinimum salary: $1,000\n✦ Shorthand: 10k / 5m / 1b");
      }

      const targetJid = mentionedJids[0];
      const emp = (company.employees || []).find(e => e.jid === targetJid);
      if (!emp) return reply(`❌ *${await getRegisteredName(targetJid)}* is not your employee!`);

      const oldSalary = emp.salary;
      emp.salary = newSalary;
      const employeeName = await getEmployeeName(emp);
      await saveCompany(company);

      return await sock.sendMessage(jid, {
        text:
`💰 *Salary Updated!*

👤 Employee : *${employeeName}*
📉 Old Salary: $${oldSalary.toLocaleString()}
📈 New Salary: $${newSalary.toLocaleString()}`,
        mentions: [targetJid],
      }, { quoted: msg });
    }

    // ── EMPLOYEES ─────────────────────────────────────────────────────────────
    if (sub === "employees" || sub === "staff") {
      const company = await getCompany(sender);
      if (!company) return reply("❌ You don't own a company!");

      if (!company.employees?.length) {
        return reply(`🏢 *${company.name}* has no employees yet.\n\nHire with *.company hire @user <salary>*`);
      }

      const names = await Promise.all(company.employees.map(getEmployeeName));
      const list = company.employees.map((e, i) =>
        `${i + 1}. *${names[i]}* — $${e.salary.toLocaleString()}/day`
      ).join("\n");

      const total = company.employees.reduce((s, e) => s + e.salary, 0);

      return await sock.sendMessage(jid, {
        text:
`🏢 *${company.name} — STAFF LIST*

${list}

👥 Total: ${company.employees.length}/${MAX_EMPLOYEES} employees
💸 Total daily cost: $${total.toLocaleString()}`,
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

🏢 Company : *${company.name}*
📊 Tier    : ${company.tierLabel}
💰 Refund  : *$${refund.toLocaleString()}* (${(SELL_RATE * 100).toFixed(0)}% of $${company.price.toLocaleString()})
💵 Balance : $${user.money.toLocaleString()}${firedCount > 0 ? `\n👥 Released : ${firedCount} employee${firedCount === 1 ? "" : "s"} automatically` : ""}

_The remaining ${100 - SELL_RATE * 100}% is lost — selling a company is never full value._

Use *.company buy* to start a new one.`
      );
    }

    // ── LEADERBOARD ───────────────────────────────────────────────────────────
    if (sub === "leaderboard" || sub === "lb" || sub === "top") {
      const col  = await Col.companies();
      const top  = await col.find({}).sort({ totalPaid: -1 }).limit(5).toArray();

      if (!top.length) return reply("📊 No companies registered yet!\n\nBe the first with *.company buy*");

      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
      const rows   = await Promise.all(top.map(async (c, i) => {
        const ownerName = await getRegisteredName(c.ownerId);
        const empCount = c.employees?.length || 0;
        return (
          `${medals[i]} *${c.name}*\n` +
          `   ${c.tierEmoji} ${c.tierLabel} • 👥 ${empCount}/${MAX_EMPLOYEES} staff\n` +
          `   💸 Total paid: $${(c.totalPaid || 0).toLocaleString()}\n` +
          `   👤 Owner: ${ownerName}`
        );
      })).then(items => items.join("\n\n"));

      return reply(
`🏆 *COMPANY LEADERBOARD*
_Top 5 by total salary paid_

${rows}

> Your company's ranking is based on how much you've paid your employees total.`
      );
    }

    return reply("❌ Unknown command.\n\nType *.company help* for all commands.");
  },
};
