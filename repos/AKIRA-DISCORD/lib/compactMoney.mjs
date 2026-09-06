const UNITS = [
  { value: 1e15, suffix: "q" },
  { value: 1e12, suffix: "t" },
  { value: 1e9, suffix: "b" },
  { value: 1e6, suffix: "m" },
  { value: 1e3, suffix: "k" },
];

function trimDecimal(value) {
  return value.toFixed(1).replace(/\.0$/, "");
}

export function compactMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0";

  const sign = amount < 0 ? "-" : "";
  const absolute = Math.abs(amount);
  const unit = UNITS.find(({ value: threshold }) => absolute >= threshold);

  if (!unit) {
    return `${sign}$${absolute.toLocaleString("en-US", {
      maximumFractionDigits: 1,
    })}`;
  }

  return `${sign}$${trimDecimal(absolute / unit.value)}${unit.suffix}`;
}