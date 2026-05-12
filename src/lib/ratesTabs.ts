// Pure tab-classification helpers for /hotels/[id]/rates. The page
// renders two tabs — Standard Rates and Deals & Packages — and each
// tab shows the matching subset of every room's rate plans. The
// schema's RatePlanType enum names which bucket a rate belongs in.
//
// Mapping (matches the rate-plan generator in subgraph-pricing):
//   • Standard  — BAR / BEST_AVAILABLE, ADVANCE_PURCHASE
//                 (publicly-bookable, non-promotional rates)
//   • Deals     — MEMBER_RATE, AAA_CAA, SENIOR, GOVERNMENT,
//                 CORPORATE, PROMOTION, PACKAGE, GROUP, REDEMPTION
//                 (member-exclusives + negotiated + bundled)
//
// Anything we don't recognise drops into Deals so a future
// rate-plan code can't silently disappear from the UI.

export const RATE_TABS = ["standard", "deals"] as const;
export type RateTabId = (typeof RATE_TABS)[number];

const STANDARD_CODES: ReadonlySet<string> = new Set([
  "BEST_AVAILABLE",
  "BAR", // legacy alias some seeds use
  "ADVANCE_PURCHASE",
]);

export function classifyRatePlan(typeOrCode: string | null | undefined): RateTabId {
  if (!typeOrCode) return "deals";
  return STANDARD_CODES.has(typeOrCode.toUpperCase()) ? "standard" : "deals";
}

/**
 * Split a single room's rate plans into Standard vs Deals buckets.
 * Returns the same Rate objects (no clone) so downstream renderers
 * keep their rateToken identity for the Book Now deep-link.
 */
export function partitionRates<R extends { ratePlan: { type?: string | null; code?: string | null } }>(
  rates: R[],
): Record<RateTabId, R[]> {
  const out: Record<RateTabId, R[]> = { standard: [], deals: [] };
  for (const rate of rates) {
    // The schema models ratePlan.type as the enum; some legacy
    // resolvers populate `code` instead. Either is fine — both
    // get classified through the same set.
    const tab = classifyRatePlan(rate.ratePlan?.type ?? rate.ratePlan?.code);
    out[tab].push(rate);
  }
  return out;
}

/**
 * Apply {@link partitionRates} to every room in a list, returning a
 * tab-keyed view where each room's `rates` array is the matching
 * subset. Rooms with zero rates in a given tab are dropped from
 * that tab's list — keeps "Deals & Packages" from showing empty
 * cards when a room has no member/package rate plan.
 */
export function partitionRoomsByTab<
  Room extends { rates: { ratePlan: { type?: string | null; code?: string | null } }[] }
>(rooms: Room[]): Record<RateTabId, Room[]> {
  const buckets: Record<RateTabId, Room[]> = { standard: [], deals: [] };
  for (const room of rooms) {
    const split = partitionRates(room.rates);
    for (const tab of RATE_TABS) {
      if (split[tab].length === 0) continue;
      buckets[tab].push({ ...room, rates: split[tab] });
    }
  }
  return buckets;
}

/**
 * Friendly label for each tab — display lives in one place so any
 * future copy change is one edit.
 */
export function rateTabLabel(tab: RateTabId): string {
  switch (tab) {
    case "standard":
      return "Standard Rates";
    case "deals":
      return "Deals & Packages";
  }
}
