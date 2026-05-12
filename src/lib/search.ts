// Search-bar input handling. Centralised here so the home page, brand pages,
// and the search results page share the same parsing/serialising rules.

import { fromSearchParams as guestsFrom, toSearchParams as guestsTo, DEFAULT_GUESTS } from "@/lib/guests";
import { resolveStay } from "@/lib/stay";
import type { StayWindow } from "@/lib/stay";

export type SearchInput = {
  /** Free-text destination — matches hotel name OR city via HotelFilter.query. */
  destination?: string;
  /** ISO date YYYY-MM-DD. */
  checkIn?: string;
  /** ISO date YYYY-MM-DD. */
  checkOut?: string;
  /** Whole nights between checkIn and checkOut. */
  nights?: number;
  /** Adult guest count. */
  adults?: number;
  /** Children count. */
  children?: number;
  /** Each child's age (length === children). */
  childAges?: number[];
  /** Number of rooms requested. */
  rooms?: number;
  /** Optional brand to scope the search to. */
  brandId?: string;
  // ── Result-page filters ──
  brandIds?: string[];
  brandTiers?: string[];
  minStarRating?: number;
  minGuestRating?: number;
  hasPool?: boolean;
  hasSpa?: boolean;
  hasGolf?: boolean;
  hasFreeBreakfast?: boolean;
  petsAllowed?: boolean;
  minNightlyRate?: number;
  maxNightlyRate?: number;
  sortBy?: SortKey;
  // ── Special-rate selection from the home-page picker ──
  /** RatePlanType code (e.g. AAA_CAA, SENIOR, CORPORATE). Defaults to
   *  BEST_AVAILABLE which is the "Lowest Regular Rate" option. */
  specialRateCode?: string;
  /** Free-text code captured when the guest chose Corp/Promo. */
  corporateCode?: string;
  /** True when the guest selected "Use Points / Awards". */
  usePoints?: boolean;
};

/** UI-facing keys that map 1:1 onto the GraphQL HotelSortField enum. */
export type SortKey =
        | "DISTANCE"
        | "PRICE_LOW_TO_HIGH"
        | "CITY"
        | "BRAND"
        | "GUEST_RATING"
        | "REVIEWS";

export type ResolvedSearch = SearchInput & StayWindow & {
  rooms: number;
  adults: number;
  children: number;
  childAges: number[];
  destination: string;
  brandId: string;
};

/**
 * Apply the same defaulting the server applies, so home → /search and brand →
 * /search both produce identical filter inputs when the user leaves fields
 * blank.
 */
export function withDefaults(input: SearchInput): ResolvedSearch {
  const stay = resolveStay({ checkIn: input.checkIn, checkOut: input.checkOut, nights: input.nights });
  const guests = guestsFrom({
    rooms: input.rooms != null ? String(input.rooms) : undefined,
    adults: input.adults != null ? String(input.adults) : undefined,
    children: input.children != null ? String(input.children) : undefined,
    childAges: input.childAges?.join(","),
  });
  return {
    destination: (input.destination ?? "").trim(),
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    nights: stay.nights,
    rooms: guests.rooms,
    adults: guests.adults,
    children: guests.children,
    childAges: guests.childAges,
    brandId: (input.brandId ?? "").trim(),
    brandIds: input.brandIds,
    brandTiers: input.brandTiers,
    minStarRating: input.minStarRating,
    minGuestRating: input.minGuestRating,
    hasPool: input.hasPool,
    hasSpa: input.hasSpa,
    hasGolf: input.hasGolf,
    hasFreeBreakfast: input.hasFreeBreakfast,
    petsAllowed: input.petsAllowed,
    minNightlyRate: input.minNightlyRate,
    maxNightlyRate: input.maxNightlyRate,
    sortBy: input.sortBy,
    specialRateCode: input.specialRateCode,
    corporateCode: input.corporateCode,
    usePoints: input.usePoints,
  };
}

export function buildSearchUrl(input: SearchInput): string {
  const norm = withDefaults(input);
  const sp = new URLSearchParams();
  if (norm.destination) sp.set("destination", norm.destination);
  sp.set("checkIn", norm.checkIn);
  sp.set("checkOut", norm.checkOut);
  for (const [k, v] of Object.entries(
          guestsTo({
            rooms: norm.rooms, adults: norm.adults,
            children: norm.children, childAges: norm.childAges,
          }))) sp.set(k, v);
  if (norm.brandId) sp.set("brandId", norm.brandId);
  return `/search?${sp.toString()}`;
}

/** Convert NEXT_URL searchParams (Record<string, string|string[]>) to SearchInput. */
export function fromSearchParams(p: Record<string, string | string[] | undefined>): SearchInput {
  const pick = (k: string) => (Array.isArray(p[k]) ? p[k]?.[0] : (p[k] as string | undefined));
  const pickAll = (k: string) => {
    const v = p[k];
    if (Array.isArray(v)) return v.flatMap((s) => s.split(","));
    if (typeof v === "string" && v.length > 0) return v.split(",");
    return undefined;
  };
  const nightsStr = pick("nights");
  const guests = guestsFrom(p);
  return {
    destination: pick("destination"),
    checkIn: pick("checkIn"),
    checkOut: pick("checkOut"),
    nights: nightsStr ? parseInt(nightsStr, 10) : undefined,
    rooms: guests.rooms,
    adults: guests.adults,
    children: guests.children,
    childAges: guests.childAges,
    brandId: pick("brandId"),
    brandIds: pickAll("brandIds"),
    brandTiers: pickAll("brandTiers"),
    minStarRating: parseIntOpt(pick("minStarRating")),
    minGuestRating: parseFloatOpt(pick("minGuestRating")),
    hasPool: parseBoolOpt(pick("hasPool")),
    hasSpa: parseBoolOpt(pick("hasSpa")),
    hasGolf: parseBoolOpt(pick("hasGolf")),
    hasFreeBreakfast: parseBoolOpt(pick("hasFreeBreakfast")),
    petsAllowed: parseBoolOpt(pick("petsAllowed")),
    minNightlyRate: parseFloatOpt(pick("minNightlyRate")),
    maxNightlyRate: parseFloatOpt(pick("maxNightlyRate")),
    sortBy: parseSortKey(pick("sortBy")),
    specialRateCode: pick("specialRateCode"),
    corporateCode: pick("corporateCode"),
    usePoints: parseBoolOpt(pick("usePoints")),
  };
}

const SORT_KEYS: ReadonlySet<SortKey> = new Set([
  "DISTANCE", "PRICE_LOW_TO_HIGH", "CITY", "BRAND", "GUEST_RATING", "REVIEWS",
]);

function parseSortKey(v: string | undefined): SortKey | undefined {
  if (!v) return undefined;
  return SORT_KEYS.has(v as SortKey) ? (v as SortKey) : undefined;
}

function parseIntOpt(v: string | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseFloatOpt(v: string | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseBoolOpt(v: string | undefined): boolean | undefined {
  if (v == null) return undefined;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return undefined;
}

// Re-export so callers don't have to import from two modules.
export { DEFAULT_GUESTS };
