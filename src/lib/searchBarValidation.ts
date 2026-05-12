// Pure validator for the home-page search bar. Four rules:
//   1. Destination is required — the autocomplete supports typing
//      free-text + selecting a suggestion; either way `destination`
//      must end up non-empty.
//   2. Both check-in and check-out are required, and the resulting
//      window must produce at least 1 night (checkOut > checkIn).
//   3. Dates must be calendar-parseable. The picker enforces shape
//      but a paste / edge-case could deliver YYYY-MM-DD strings
//      that don't actually exist (e.g. 2026-02-30) — Date.parse
//      catches those.
//   4. Check-in must be today or later. You can't book a hotel
//      for a date that's already in the past — Marriott's reference
//      surfaces this inline, so we do too. The `today` param is
//      threaded for tests so they can pin a deterministic clock.
//
// Returns a field-keyed error map. Empty object means "submit OK".

export type SearchSubmitInput = {
  destination?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  /** Pin "today" for deterministic tests. Production callers omit
   *  and the validator reads the current date in UTC. */
  today?: string;
};

export type SearchSubmitErrors = Partial<
  Record<"destination" | "checkIn" | "checkOut", string>
>;

export function validateSearchSubmit(
  input: SearchSubmitInput,
): SearchSubmitErrors {
  const errors: SearchSubmitErrors = {};

  const dest = (input.destination ?? "").trim();
  if (!dest) {
    errors.destination = "Tell us where you're going — city, hotel, region, or country.";
  }

  const checkIn = (input.checkIn ?? "").trim();
  const checkOut = (input.checkOut ?? "").trim();
  const today = (input.today ?? todayISO()).trim();

  if (!checkIn) {
    errors.checkIn = "Pick a check-in date.";
  } else if (!isParseableDate(checkIn)) {
    errors.checkIn = "Check-in isn't a valid date.";
  } else if (checkIn < today) {
    // YYYY-MM-DD lex-orders the same as calendar-orders, so a
    // direct string compare is correct and avoids timezone games.
    errors.checkIn = "Check-in can't be in the past.";
  }

  if (!checkOut) {
    errors.checkOut = "Pick a check-out date.";
  } else if (!isParseableDate(checkOut)) {
    errors.checkOut = "Check-out isn't a valid date.";
  }

  // Only validate ordering if both individual dates parsed —
  // otherwise the message would compound on top of a syntax error.
  if (
    !errors.checkIn &&
    !errors.checkOut &&
    checkIn &&
    checkOut &&
    checkOut <= checkIn
  ) {
    errors.checkOut = "Check-out must be after check-in.";
  }

  return errors;
}

/** UTC-stable today in YYYY-MM-DD. UTC avoids the "user in
 *  Auckland just past midnight UTC books for yesterday LA-time"
 *  edge case where local-tz arithmetic disagrees with the server. */
function todayISO(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Strict YYYY-MM-DD calendar check. Date.parse accepts a lot of
 * shapes ("12/25") — we want exactly the picker's format.
 * Returns true only when:
 *   - matches the ISO shape
 *   - parses to a real calendar date (no Feb 30, no month 13)
 */
function isParseableDate(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  // Round-trip through Date: if it normalises to a different
  // day-of-month, the input wasn't a real calendar date.
  const ts = Date.UTC(y, mo - 1, d);
  const back = new Date(ts);
  return (
    back.getUTCFullYear() === y &&
    back.getUTCMonth() + 1 === mo &&
    back.getUTCDate() === d
  );
}
