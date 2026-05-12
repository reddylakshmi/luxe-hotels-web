// Serialises the booking context (stay window + guest counts +
// currency) into a URL query string that every "go to rates / book"
// link can share. Centralising this kills a class of bugs where one
// transition drops `rooms`, another drops `children`, a third drops
// `currency`, and the booking page falls back to defaults — losing
// the user's input three screens upstream.

import { toSearchParams as guestsToSearchParams, type GuestState } from "./guests";
import type { StayWindow } from "./stay";

export type StayLinkContext = {
  stay: StayWindow;
  guests: GuestState;
  /** Optional. When unset the consumer's currency dropdown stays at
   *  the page default; including it in the URL means the rate page
   *  opens in the same currency the user already chose. */
  currency?: string;
  /** RatePlanType code from the home-page Special Rate picker
   *  (e.g. AAA_CAA, SENIOR). Omitted when default
   *  (BEST_AVAILABLE) so the URL stays tidy. */
  specialRateCode?: string;
  /** Free-text Corp/Promo code captured when specialRateCode is
   *  CORPORATE. */
  corporateCode?: string;
  /** True when the guest elected "Use Points / Awards". */
  usePoints?: boolean;
};

/**
 * Build the query-string payload (no leading `?`) carrying the full
 * booking context forward across page transitions. Returns the empty
 * string when the context is the default + missing — keeps link
 * URLs on the home page short.
 *
 * Shape:
 *   checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
 *   &rooms=N&adults=N
 *   &children=N&childAges=A,B,C   (omitted when children=0)
 *   &currency=USD                  (omitted when not provided)
 */
export function serializeStayLink(ctx: StayLinkContext): string {
  const params = new URLSearchParams();
  if (ctx.stay.checkIn) params.set("checkIn", ctx.stay.checkIn);
  if (ctx.stay.checkOut) params.set("checkOut", ctx.stay.checkOut);
  for (const [k, v] of Object.entries(guestsToSearchParams(ctx.guests))) {
    params.set(k, v);
  }
  if (ctx.currency) params.set("currency", ctx.currency);
  // Carry the home-page picker selections forward. Default
  // BEST_AVAILABLE is treated as "no filter" so the URL stays
  // tidy on every link that has no explicit selection.
  if (ctx.specialRateCode && ctx.specialRateCode !== "BEST_AVAILABLE") {
    params.set("specialRateCode", ctx.specialRateCode);
  }
  if (ctx.corporateCode && ctx.specialRateCode === "CORPORATE") {
    params.set("corporateCode", ctx.corporateCode);
  }
  if (ctx.usePoints) params.set("usePoints", "true");
  return params.toString();
}

/**
 * Combine an existing path with a serialised stay-link suffix. Use
 * for clarity at call sites:
 *
 *   <Link href={stayLink(`/hotels/${id}/rates`, ctx)}>Check rates</Link>
 *
 * Returns the bare path (no `?`) when the suffix is empty so the URL
 * doesn't get a trailing `?`.
 */
export function stayLink(path: string, ctx: StayLinkContext): string {
  const qs = serializeStayLink(ctx);
  return qs ? `${path}?${qs}` : path;
}
