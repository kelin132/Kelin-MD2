export const TAX_WEALTH_THRESHOLD = 300_000_000;
export const STANDARD_TAX_RATE = 0.10;
export const HIGH_WEALTH_TAX_RATE = 0.20;

export function taxRateForWealth(wealth) {
  return Number(wealth) >= TAX_WEALTH_THRESHOLD
    ? HIGH_WEALTH_TAX_RATE
    : STANDARD_TAX_RATE;
}

export function wealthTaxExpression() {
  return {
    $cond: [
      {
        $gte: [
          {
            $add: [
              { $ifNull: ["$money", 0] },
              { $ifNull: ["$bank", 0] },
            ],
          },
          TAX_WEALTH_THRESHOLD,
        ],
      },
      HIGH_WEALTH_TAX_RATE,
      STANDARD_TAX_RATE,
    ],
  };
}
