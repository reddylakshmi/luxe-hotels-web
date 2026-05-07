// Search-bar input handling. Centralised here so the home page, brand pages,
// and the search results page share the same parsing/serialising rules.

export type SearchInput = {
  /** Free-text destination — matches hotel name OR city via HotelFilter.query. */
  destination?: string;
  /** ISO date YYYY-MM-DD. */
  checkIn?: string;
  /** ISO date YYYY-MM-DD. */
  checkOut?: string;
  /** Adult guest count. */
  adults?: number;
  /** Optional brand to scope the search to. */
  brandId?: string;
};

const DEFAULT_NIGHTS = 3;
const DEFAULT_LEAD_DAYS = 30;
const DEFAULT_ADULTS = 2;

/**
 * Apply the same defaulting the server applies, so home → /search and brand →
 * /search both produce identical filter inputs when the user leaves fields
 * blank. Defaults: stay 3 nights, 30 days from today, 2 adults.
 */
export function withDefaults(input: SearchInput): Required<SearchInput> & { adults: number } {
  const today = new Date();
  const checkIn = input.checkIn?.trim() || isoOffset(today, DEFAULT_LEAD_DAYS);
  const checkOut = input.checkOut?.trim() || isoOffset(parseISO(checkIn), DEFAULT_NIGHTS);
  return {
    destination: (input.destination ?? "").trim(),
    checkIn,
    checkOut,
    adults: clamp(input.adults ?? DEFAULT_ADULTS, 1, 10),
    brandId: (input.brandId ?? "").trim(),
  };
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = parseISO(checkIn).getTime();
  const b = parseISO(checkOut).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function buildSearchUrl(input: SearchInput): string {
  const norm = withDefaults(input);
  const sp = new URLSearchParams();
  if (norm.destination) sp.set("destination", norm.destination);
  sp.set("checkIn", norm.checkIn);
  sp.set("checkOut", norm.checkOut);
  sp.set("adults", String(norm.adults));
  if (norm.brandId) sp.set("brandId", norm.brandId);
  return `/search?${sp.toString()}`;
}

/** Convert NEXT_URL searchParams (Record<string, string|string[]>) to SearchInput. */
export function fromSearchParams(p: Record<string, string | string[] | undefined>): SearchInput {
  const pick = (k: string) => (Array.isArray(p[k]) ? p[k]?.[0] : (p[k] as string | undefined));
  const adultsRaw = pick("adults");
  return {
    destination: pick("destination"),
    checkIn: pick("checkIn"),
    checkOut: pick("checkOut"),
    adults: adultsRaw ? Number(adultsRaw) : undefined,
    brandId: pick("brandId"),
  };
}

// ── helpers ──────────────────────────────────────────────────────────────

function isoOffset(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}
