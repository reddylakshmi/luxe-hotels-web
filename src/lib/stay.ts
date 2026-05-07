// Stay-window logic. Centralised so the home compact picker, the full search
// bar, and the search results page all interpret check-in / check-out / nights
// the same way.

export const MIN_NIGHTS = 1;
export const MAX_NIGHTS = 30;
export const DEFAULT_NIGHTS = 3;
/** How many days from "today" we default the check-in to when the user
 *  hasn't picked one yet — long enough that it's never in the past
 *  but close enough that prices feel relevant. */
export const DEFAULT_LEAD_DAYS = 30;

export type StayWindow = {
  /** ISO date YYYY-MM-DD. */
  checkIn: string;
  /** ISO date YYYY-MM-DD. */
  checkOut: string;
  /** Whole nights between checkIn and checkOut. */
  nights: number;
};

/**
 * Resolve a stay window from any combination of partial inputs:
 *
 *  • All three given → checkOut wins; nights is recomputed.
 *  • checkIn + nights → checkOut = checkIn + nights.
 *  • checkOut + nights → checkIn = checkOut − nights.
 *  • checkIn only → checkOut = checkIn + DEFAULT_NIGHTS.
 *  • Nights only → checkIn = today + DEFAULT_LEAD_DAYS, checkOut = checkIn + nights.
 *  • Nothing → defaults all the way down.
 *
 * Validation: clamps nights to [MIN_NIGHTS, MAX_NIGHTS] and pushes any
 * checkIn that's in the past forward to today.
 */
export function resolveStay(
        input: { checkIn?: string; checkOut?: string; nights?: number | string },
        now: Date = new Date(),
): StayWindow {
  const today = startOfDay(now);
  const inDate = parseISO(input.checkIn);
  const outDate = parseISO(input.checkOut);
  const requestedNights = clampNights(toNumber(input.nights));

  let checkIn: Date;
  let checkOut: Date;

  if (inDate && outDate) {
    // Both given — let dates win, recompute nights.
    checkIn = max(inDate, today);
    checkOut = outDate;
    if (!isAfter(checkOut, checkIn)) {
      checkOut = addDays(checkIn, requestedNights ?? DEFAULT_NIGHTS);
    }
  } else if (inDate && !outDate) {
    checkIn = max(inDate, today);
    checkOut = addDays(checkIn, requestedNights ?? DEFAULT_NIGHTS);
  } else if (!inDate && outDate) {
    const n = requestedNights ?? DEFAULT_NIGHTS;
    checkOut = outDate;
    checkIn = addDays(checkOut, -n);
    if (isBefore(checkIn, today)) {
      checkIn = today;
      checkOut = addDays(checkIn, n);
    }
  } else {
    checkIn = addDays(today, DEFAULT_LEAD_DAYS);
    checkOut = addDays(checkIn, requestedNights ?? DEFAULT_NIGHTS);
  }

  const nights = clampNights(daysBetween(checkIn, checkOut)) ?? DEFAULT_NIGHTS;
  // After clamping nights, snap checkOut to match — guarantees the window is
  // self-consistent.
  const finalCheckOut = addDays(checkIn, nights);

  return {
    checkIn: toISO(checkIn),
    checkOut: toISO(finalCheckOut),
    nights,
  };
}

/** Whole-night count between two ISO dates. Returns 0 when invalid. */
export function nightsBetween(checkInISO: string, checkOutISO: string): number {
  const a = parseISO(checkInISO);
  const b = parseISO(checkOutISO);
  if (!a || !b) return 0;
  return Math.max(0, daysBetween(a, b));
}

/** Format an ISO date for human display. */
export function fmtDate(iso: string): string {
  const d = parseISO(iso);
  if (!d) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ── helpers ──────────────────────────────────────────────────────────────────

function clampNights(n: number | undefined): number | undefined {
  if (n == null || !Number.isFinite(n)) return undefined;
  return Math.max(MIN_NIGHTS, Math.min(MAX_NIGHTS, Math.round(n)));
}

function toNumber(v: number | string | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseISO(s: string | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function max(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}
