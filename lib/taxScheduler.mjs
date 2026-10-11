/**
 * KELIN MD — Tax Scheduler
 *
 * Every 48 hours, all registered users are taxed 10% of their wallet (money)
 * and 10% of their bank balance.  The deduction is applied atomically with
 * MongoDB's $mul operator — no per-user load/save loop needed.
 *
 * Last-run timestamp is persisted in the `config` collection
 * ({ _id: "taxScheduler", lastRun: <epoch ms> }) so a bot restart never
 * double-taxes users who were collected recently.
 */

import { getDb } from "./mongo.mjs";
import { log }   from "./logger.mjs";
import {
  HIGH_WEALTH_TAX_RATE,
  STANDARD_TAX_RATE,
  TAX_WEALTH_THRESHOLD,
  wealthTaxExpression,
} from "./taxRules.mjs";

const TAX_INTERVAL_MS  = 48 * 60 * 60 * 1000; // 48 hours
const CONFIG_ID        = "taxScheduler";

let _taxTimer = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

async function getLastRun() {
  try {
    const db  = await getDb();
    const doc = await db.collection("config").findOne({ _id: CONFIG_ID });
    return doc?.lastRun ?? 0;
  } catch {
    return 0;
  }
}

async function setLastRun(ts) {
  try {
    const db = await getDb();
    await db.collection("config").updateOne(
      { _id: CONFIG_ID },
      { $set: { lastRun: ts } },
      { upsert: true }
    );
  } catch (err) {
    log("warn", `[tax] Failed to save lastRun: ${err.message}`);
  }
}

// ── Core tax collection ───────────────────────────────────────────────────────

async function collectTax() {
  const now = Date.now();
  log(
    "info",
    `[tax] 🏛️  Collecting progressive ${STANDARD_TAX_RATE * 100}%/${HIGH_WEALTH_TAX_RATE * 100}% tax ` +
    `(20% at $${fmt(TAX_WEALTH_THRESHOLD)} total wealth)...`,
  );

  try {
    const db = await getDb();
    const taxRate = wealthTaxExpression();
    const wealth = {
      $add: [
        { $ifNull: ["$money", 0] },
        { $ifNull: ["$bank", 0] },
      ],
    };
    const afterTaxMoney = {
      $floor: {
        $multiply: [
          { $ifNull: ["$money", 0] },
          { $subtract: [1, taxRate] },
        ],
      },
    };
    const afterTaxBank = {
      $floor: {
        $multiply: [
          { $ifNull: ["$bank", 0] },
          { $subtract: [1, taxRate] },
        ],
      },
    };

    // Preview each bracket before changing any balances.
    const agg = await db.collection("users").aggregate([
      { $match: { registered: true } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          highWealthCount: {
            $sum: { $cond: [{ $gte: [wealth, TAX_WEALTH_THRESHOLD] }, 1, 0] },
          },
          taxedMoney: {
            $sum: { $subtract: [{ $ifNull: ["$money", 0] }, afterTaxMoney] },
          },
          taxedBank: {
            $sum: { $subtract: [{ $ifNull: ["$bank", 0] }, afterTaxBank] },
          },
        },
      },
    ]).toArray();

    const { count = 0, highWealthCount = 0, taxedMoney = 0, taxedBank = 0 } = agg[0] ?? {};

    // The rate expression is evaluated against each user's pre-tax wallet + bank.
    const result = await db.collection("users").updateMany(
      { registered: true },
      [{ $set: {
        money: afterTaxMoney,
        bank: afterTaxBank,
        totalWealth: { $add: [afterTaxMoney, afterTaxBank] },
      }}]
    );

    await setLastRun(now);

    log(
      "info",
      `[tax] ✅  Tax collected from ${result.modifiedCount}/${count} users ` +
      `(${count - highWealthCount} at 10%, ${highWealthCount} at 20%). ` +
      `Wallet: −${fmt(taxedMoney)} | Bank: −${fmt(taxedBank)}`
    );
  } catch (err) {
    log("error", `[tax] Collection failed: ${err.message}`);
  }
}

// ── Scheduler entry point ────────────────────────────────────────────────────

/**
 * Call once from index.js after MongoDB is connected.
 * Schedules the first run based on when the last run happened,
 * then repeats every 48 hours.
 */
export async function startTaxScheduler() {
  const lastRun = await getLastRun();
  const elapsed = Date.now() - lastRun;
  const delay   = Math.max(0, TAX_INTERVAL_MS - elapsed);

  const hUntil = Math.round(delay / (60 * 60 * 1000));
  log(
    "info",
    delay === 0
      ? "[tax] ⚡ Running overdue tax collection now..."
      : `[tax] ⏰  Next tax collection in ~${hUntil}h`
  );

  // First run: either immediately (overdue) or after remaining cooldown
  const runAndSchedule = async () => {
    await collectTax();
    // After the first run, repeat every 48 h exactly
    if (_taxTimer) clearInterval(_taxTimer);
    _taxTimer = setInterval(collectTax, TAX_INTERVAL_MS);
  };

  if (delay === 0) {
    await runAndSchedule();
  } else {
    setTimeout(runAndSchedule, delay);
  }
}
