// Pure helpers for /account/loyalty. No React, no DOM, no fetch — every
// branch covered by lib/loyalty.test.ts so the formatting + tier maths
// stay stable as the page evolves. The visual treatments (tone classes
// applied to badges) sit here too so the test pin them, not just the
// component snapshot.

export const LOYALTY_TIERS = [
  "MEMBER",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "TITANIUM",
  "AMBASSADOR",
] as const;
export type LoyaltyTier = (typeof LOYALTY_TIERS)[number];

const TIER_INDEX = new Map<string, number>(LOYALTY_TIERS.map((t, i) => [t, i]));

/** Human label for a tier — "Gold", "Member", etc. */
export function tierLabel(tier: string | null | undefined): string {
  if (!tier) return "—";
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

/**
 * Compare two tiers — returns the index in LOYALTY_TIERS, or -1 for
 * unknown values. Useful for "is the projected tier higher than the
 * current one" checks.
 */
export function tierIndex(tier: string | null | undefined): number {
  if (!tier) return -1;
  return TIER_INDEX.get(tier) ?? -1;
}

/**
 * Tailwind class string for a tier badge. The palette mirrors the
 * physical-world tier metaphor (silver / gold / platinum / titanium)
 * while staying cream-friendly. AMBASSADOR gets the deepest, rarest
 * tone since it sits at the top.
 */
export function tierBadgeTone(tier: string | null | undefined): string {
  switch (tier) {
    case "MEMBER":
      return "bg-ink/5 text-ink/80 border-ink/15";
    case "SILVER":
      return "bg-ink/8 text-ink border-ink/25";
    case "GOLD":
      return "bg-goldDeep/15 text-goldDeep border-goldDeep/40";
    case "PLATINUM":
      return "bg-emerald-50 text-emerald-800 border-emerald-300";
    case "TITANIUM":
      return "bg-sky-50 text-sky-800 border-sky-300";
    case "AMBASSADOR":
      return "bg-ink text-cream border-ink";
    default:
      return "bg-ink/5 text-ink/70 border-ink/15";
  }
}

/** Format an integer point balance with thousands separators + suffix. */
export function formatPoints(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n).toLocaleString("en-US")} pts`;
}

/**
 * Format a transaction's point delta: positive transactions get a "+"
 * prefix, redemptions / expirations / gift-outs get a U+2212 minus
 * (looks better than ASCII "-" next to the digit). Display points are
 * always non-negative; the schema's `points` field is already signed
 * but defensive coding here means we tolerate either convention.
 */
export function formatPointsDelta(type: string, points: number): string {
  const isDebit = DEBIT_TX_TYPES.has(type);
  const abs = Math.abs(Math.round(points));
  return `${isDebit ? "−" : "+"}${abs.toLocaleString("en-US")} pts`;
}

const DEBIT_TX_TYPES = new Set([
  "REDEEM",
  "REDEEM_CERTIFICATE",
  "REDEEM_TRANSFER",
  "EXPIRE",
  "GIFT_OUT",
]);

const TX_LABEL: Record<string, string> = {
  EARN_STAY: "Stay",
  EARN_BONUS: "Bonus",
  EARN_TRANSFER: "Points transfer in",
  EARN_PARTNER: "Partner activity",
  EARN_PURCHASE: "Points purchase",
  EARN_GIFT: "Gift received",
  REDEEM: "Redemption",
  REDEEM_CERTIFICATE: "Certificate redemption",
  REDEEM_TRANSFER: "Points transfer out",
  EXPIRE: "Expiration",
  ADJUST: "Adjustment",
  AWARD: "Award",
  GIFT_OUT: "Gift sent",
  GIFT_IN: "Gift received",
};

/** Friendly label for a `TransactionType` enum value. */
export function transactionLabel(type: string): string {
  return TX_LABEL[type] ?? toTitleCase(type.replace(/_/g, " "));
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Clamp the server-reported tier-progress percentage to [0,100] for
 * use as a CSS width. Falls back to 100 when the guest is at the top
 * tier (`nextTier` null) so the bar reads "complete" rather than
 * empty.
 */
export function tierProgressPctClamped(
  pct: number | null | undefined,
  nextTier: string | null | undefined,
): number {
  if (!nextTier) return 100;
  if (pct == null || Number.isNaN(pct)) return 0;
  return Math.max(0, Math.min(100, pct));
}

// ── Points redemption (booking flow) ────────────────────────────────────

/** Industry-standard rate-per-point used for the demo conversion. Real
 *  conversion comes from the schema's pointsValuation query — this is
 *  the client-side preview while the slider moves. */
export const USD_PER_POINT = 0.007;

/** Slider step + minimum redemption increment. Most loyalty programs
 *  redeem in 1,000-point chunks; we follow that convention so the
 *  cash-equivalent always lands on a clean dollar amount. */
export const POINTS_REDEMPTION_STEP = 1000;

/** Convert points to USD at the standard demo rate. Returns 0 for
 *  non-positive / non-finite input. */
export function pointsToCashUSD(
  points: number | null | undefined,
  ratePerPoint: number = USD_PER_POINT,
): number {
  if (points == null || !Number.isFinite(points) || points <= 0) return 0;
  return Math.round(points * ratePerPoint * 100) / 100;
}

/**
 * Clamp a requested redemption to the bounds available to the guest:
 *   • not below 0
 *   • not above their available balance
 *   • not above what the booking total can absorb (no over-redemption)
 *   • snapped down to the nearest POINTS_REDEMPTION_STEP
 */
export function clampPointsRedemption(
  requested: number,
  availableBalance: number,
  bookingTotalUSD: number,
  ratePerPoint: number = USD_PER_POINT,
): number {
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  if (!Number.isFinite(availableBalance) || availableBalance <= 0) return 0;
  if (!Number.isFinite(bookingTotalUSD) || bookingTotalUSD <= 0) return 0;
  const maxAffordable = Math.floor(bookingTotalUSD / ratePerPoint);
  const ceiling = Math.min(availableBalance, maxAffordable);
  const clamped = Math.min(requested, ceiling);
  return Math.floor(clamped / POINTS_REDEMPTION_STEP) * POINTS_REDEMPTION_STEP;
}

/**
 * "22 nights to Platinum" — null when there's no next tier (top of the
 * ladder) or when the server didn't supply a count. UI callers should
 * fall back to "Top tier achieved" or similar when this returns null.
 */
export function nightsToNextTierText(
  nights: number | null | undefined,
  nextTier: string | null | undefined,
): string | null {
  if (!nextTier || nights == null || nights <= 0) return null;
  const noun = nights === 1 ? "night" : "nights";
  return `${nights} ${noun} to ${tierLabel(nextTier)}`;
}
