// Money helpers — the GraphQL Money scalar arrives as { amount: string,
// currency: string } and pages keep parseFloat-ing the amount inline.
// Centralising the parse + format calls here avoids drift in formatting
// rules (decimals, locale) and makes the call sites self-documenting.

import type { Money } from "@/types/graphql";

/** Parse a {@link Money} amount into a finite number. NaN → 0. */
export function parseMoneyAmount(money: Money | { amount: string } | null | undefined): number {
  if (!money) return 0;
  const n = parseFloat(money.amount);
  return Number.isFinite(n) ? n : 0;
}

/** Format a Money value as "1,234.56 USD" — the way every booking screen wants it. */
export function formatMoney(money: Money | null | undefined): string {
  if (!money) return "";
  const n = parseMoneyAmount(money);
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${money.currency}`;
}

/** Format a raw number + currency pair. Same rules as {@link formatMoney}. */
export function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}
