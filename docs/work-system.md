# Fast-Paced Work System

The `.work` command is tuned for gameplay sessions rather than real-world
hours. A player can claim one shift every 10 minutes, subject to energy.

## Player-facing commands

- `.work` — claim a shift and receive an itemized paystub
- `.work jobs` — view entry, mid-level, and high-tier careers
- `.work <job>` — apply for an unlocked career or promote into it
- `.work status` — view energy, career XP, completed shifts, and wallet
- `.work rest` — restore 25 energy, with a 5-minute rest cooldown
- `.work eat <item>` — consume a food/recovery item from inventory

## Recommended user document schema

These fields live on the existing `users` document:

```js
{
  job: null,              // new players choose an entry-level job first
  lastWork: 0,            // epoch milliseconds; 10-minute shift cooldown
  lastRest: 0,            // epoch milliseconds; 5-minute rest cooldown
  energy: 100,             // clamped to 0..100
  completedShifts: 0,
  workXp: 0,               // career XP, separate from RPG XP
  workLastEvent: {
    key: "standardShift",
    label: "Standard shift",
    amount: 0,
    ts: 0
  },
  lastWorkPaystub: {
    jobKey: "fastFoodWorker",
    gross: 4000,
    net: 3600,
    tax: 400,
    event: "Standard shift",
    description: "Fast Food Worker: Standard shift",
    ts: 0
  }
}
```

`money`, `xp`, `inventory`, and `history` remain the existing economy fields.
Shift claims use a conditional database update so concurrent messages cannot
create duplicate paychecks.

## Economy balancing notes

1. **Balance by hourly output, not per-shift output.** Six shifts per hour is
   the practical maximum. Current base pay ranges from $3,800–$5,200 for
   entry-level, $9,000–$12,000 for mid-level, and $16,000–$20,000 for high-tier
   jobs. Positive events are capped so gross pay always stays below $30,000.
2. **Keep the 10% payroll tax visible.** The paystub shows gross pay, tax, and
   net pay so the deduction feels fair instead of surprising.
3. **Use energy as a soft limit.** Current jobs consume 16–35 energy, rest
   restores 25, and food restores 15–60. This lets an active player continue
   playing without making recovery free or unlimited.
4. **Gate promotions with multiple costs.** Shift count represents time played,
   career XP represents mastery, and education/gear items create money sinks.
5. **Keep positive event value below 15% of expected hourly income.** The
   standard event table is 3% quarterly bonus and 10% over-time tips; penalties
   offset part of that value.
6. **Review inflation weekly.** Compare total work income with shop spending,
   transfers, gambling payouts, and tax collections. If balances rise too fast,
   reduce base pay or event rates before increasing taxes.