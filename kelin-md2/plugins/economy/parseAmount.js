/**
 * parseAmount — shared amount parser for all betting/gambling commands.
 *
 * Supports:
 *   "all"           → user's full wallet balance
 *   "half"          → half of wallet balance
 *   Plain numbers   → "5000", "5,000"
 *   Shorthand       → "10k" (10,000) | "10m" (10,000,000) | "1b" (1,000,000,000)
 *                     Decimal shorthands also work: "1.5k", "2.5m"
 *
 * Returns the resolved integer amount, or NaN if the input is unrecognisable.
 *
 * @param {string} raw        - The raw user input (args[n])
 * @param {number} userMoney  - Current wallet balance (needed for "all"/"half")
 * @returns {number}
 */
export function parseAmount(raw, userMoney = 0) {
  if (!raw || typeof raw !== "string") return NaN;

  const input = raw.trim().toLowerCase().replace(/,/g, "");

  if (input === "all")  return Math.floor(userMoney);
  if (input === "half") return Math.floor(userMoney / 2);

  // Shorthand suffixes
  const SUFFIXES = { k: 1_000, m: 1_000_000, b: 1_000_000_000 };
  const match = input.match(/^(\d+(?:\.\d+)?)([kmb])$/);
  if (match) {
    const num    = parseFloat(match[1]);
    const mult   = SUFFIXES[match[2]];
    return Math.floor(num * mult);
  }

  // Plain integer (strip anything non-numeric)
  const plain = parseInt(input.replace(/\D/g, ""), 10);
  return plain;
}

/**
 * Formats a number back into the most readable shorthand.
 * e.g. 10000 → "10k", 2500000 → "2.5m"
 * Used in help text so users see examples in the same notation they type.
 *
 * @param {number} n
 * @returns {string}
 */
export function formatShorthand(n) {
  if (n >= 1_000_000_000) return `${+(n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "")}b`;
  if (n >= 1_000_000)     return `${+(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}m`;
  if (n >= 1_000)         return `${+(n / 1_000).toFixed(2).replace(/\.?0+$/, "")}k`;
  return `${n}`;
}
