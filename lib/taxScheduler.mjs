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

const TAX_RATE_PERCENT = 10;           // % taken from wallet + bank
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
  log("info", "[tax] 🏛️  Collecting 10% tax from all registered members...");

  try {
    const db = await getDb();

    // Count + total preview BEFORE deduction (for the log)
    const agg = await db.collection("users").aggregate([
      { $match: { registered: true } },
      {
        $group: {
          _id:        null,
          count:      { $sum: 1 },
          totalMoney: { $sum: "$money" },
          totalBank:  { $sum: "$bank" },
        },
      },
    ]).toArray();

    const { count = 0, totalMoney = 0, totalBank = 0 } = agg[0] ?? {};
    const taxedMoney = totalMoney * (TAX_RATE_PERCENT / 100);
    const taxedBank  = totalBank  * (TAX_RATE_PERCENT / 100);

    // Apply 10% deduction atomically using $mul (multiply by 0.9)
    const multiplier = 1 - TAX_RATE_PERCENT / 100; // 0.90
    const result = await db.collection("users").updateMany(
      { registered: true },
      { $mul: { money: multiplier, bank: multiplier } }
    );

    // Clamp any sub-cent floats to integer (floor) — avoids floating-point drift
    await db.collection("users").updateMany(
      { registered: true },
      [{ $set: {
        money: { $floor: ["$money"] },
        bank:  { $floor: ["$bank"]  },
      }}]
    );

    await setLastRun(now);

    log(
      "info",
      `[tax] ✅  Tax collected from ${result.modifiedCount}/${count} users. ` +
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
