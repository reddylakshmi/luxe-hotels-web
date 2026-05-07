// Pure logic for the date-range calendar picker.
// All functions take/return ISO date strings (YYYY-MM-DD) and never depend on
// Date objects with timezone surprises. Tested in dateRange.test.ts.

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** A single day cell in the calendar grid. */
export type DayCell = {
  /** ISO yyyy-mm-dd. */
  iso: string;
  /** 1-31. */
  dayOfMonth: number;
  /** True if the day belongs to the rendered month (vs. spillover from prev/next). */
  inMonth: boolean;
  /** True if the day is strictly before "today". */
  isPast: boolean;
  /** True if the day equals "today". */
  isToday: boolean;
};

/** A month-view: weekday header + grid of cells covering full weeks. */
export type MonthGrid = {
  year: number;
  /** 0–11 (matching JS Date). */
  month: number;
  label: string;
  /** Rows × 7 columns; each row is one calendar week (Mon→Sun). */
  weeks: DayCell[][];
};

// ── ISO helpers ──────────────────────────────────────────────────────────────

export function todayISO(now: Date = new Date()): string {
  return toISO(startOfDay(now));
}

export function isoAddDays(iso: string, n: number): string {
  const d = parseISO(iso);
  if (!d) return iso;
  return toISO(addDays(d, n));
}

export function nightsBetweenISO(checkIn: string, checkOut: string): number {
  const a = parseISO(checkIn);
  const b = parseISO(checkOut);
  if (!a || !b) return 0;
  return Math.max(0, daysBetween(a, b));
}

export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ── Month grid ───────────────────────────────────────────────────────────────

/** Build a 6-week grid (always 42 cells) for the given month. Mon-first weeks. */
export function buildMonthGrid(year: number, month: number, today: string = todayISO()): MonthGrid {
  const first = new Date(Date.UTC(year, month, 1));
  const startWeekday = (first.getUTCDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const gridStart = addDays(first, -startWeekday);

  const weeks: DayCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(gridStart, w * 7 + d);
      const iso = toISO(date);
      row.push({
        iso,
        dayOfMonth: date.getUTCDate(),
        inMonth: date.getUTCMonth() === month && date.getUTCFullYear() === year,
        isPast: iso < today,
        isToday: iso === today,
      });
    }
    weeks.push(row);
  }
  return {
    year,
    month,
    label: `${MONTH_LABELS[month]} ${year}`,
    weeks,
  };
}

export function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
}

export function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}

// ── Range selection ──────────────────────────────────────────────────────────

export type RangeState = {
  checkIn: string | null;
  checkOut: string | null;
  /** Which slot the next click will fill. */
  selecting: "in" | "out";
};

/** True if the user has finished choosing a valid window. */
export function isComplete(state: RangeState): boolean {
  return !!state.checkIn && !!state.checkOut && state.checkIn < state.checkOut;
}

/** True if `iso` is strictly inside `[checkIn, checkOut]` (exclusive of endpoints). */
export function isInRange(iso: string, checkIn: string | null, checkOut: string | null): boolean {
  if (!checkIn || !checkOut) return false;
  return iso > checkIn && iso < checkOut;
}

/**
 * Drive the picker's state from a click on a specific date. Encodes the
 * standard pattern used by Booking.com / Marriott / Airbnb:
 *
 *  • If we're picking the check-in (or the user reset), set check-in and
 *    start picking the check-out.
 *  • If we're picking the check-out and the date is on or before check-in,
 *    treat it as a fresh check-in instead.
 *  • Otherwise it's a valid check-out → finish the range.
 */
export function pickDay(state: RangeState, iso: string): RangeState {
  if (state.selecting === "in" || !state.checkIn) {
    return { checkIn: iso, checkOut: null, selecting: "out" };
  }
  if (iso <= state.checkIn) {
    return { checkIn: iso, checkOut: null, selecting: "out" };
  }
  return { checkIn: state.checkIn, checkOut: iso, selecting: "in" };
}

/** Reset to an empty pickable state. */
export function resetRange(): RangeState {
  return { checkIn: null, checkOut: null, selecting: "in" };
}

/** Initial state given known defaults. */
export function rangeFrom(checkIn: string | null, checkOut: string | null): RangeState {
  return { checkIn, checkOut, selecting: checkIn && !checkOut ? "out" : "in" };
}

// ── Internal date helpers ────────────────────────────────────────────────────

function parseISO(s: string): Date | null {
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
