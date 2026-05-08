// Pure helpers for the destination autocomplete component.
//
// Keeping these out of the React component lets vitest pin the behaviour
// (debounce timing, keyboard navigation indices, group ordering) without
// rendering anything.

import type { DestinationSuggestion } from "@/types/graphql";

/**
 * Group ordering for the dropdown — cities at the top because they're the
 * broadest match the user is most likely after, then countries, then
 * specific hotels. Mirrors the ranking the backend already applies, but
 * we re-group on the client too so the UI stays correct even if the
 * backend changes its sort order.
 */
export const SUGGESTION_GROUP_ORDER = ["CITY", "COUNTRY", "HOTEL"] as const;

export type SuggestionGroup = {
  type: (typeof SUGGESTION_GROUP_ORDER)[number];
  heading: string;
  items: DestinationSuggestion[];
};

const HEADINGS: Record<(typeof SUGGESTION_GROUP_ORDER)[number], string> = {
  CITY: "Cities",
  COUNTRY: "Countries",
  HOTEL: "Hotels",
};

/** Group suggestions by type, in the canonical order. Skips empty groups. */
export function groupSuggestions(items: DestinationSuggestion[]): SuggestionGroup[] {
  const out: SuggestionGroup[] = [];
  for (const type of SUGGESTION_GROUP_ORDER) {
    const filtered = items.filter((s) => s.type === type);
    if (filtered.length === 0) continue;
    out.push({ type, heading: HEADINGS[type], items: filtered });
  }
  return out;
}

/**
 * Flatten the grouped list back to a 1-D array — used to translate a
 * "highlighted index" from the keyboard handler back to a concrete
 * suggestion regardless of how many groups exist.
 */
export function flattenGroups(groups: SuggestionGroup[]): DestinationSuggestion[] {
  return groups.flatMap((g) => g.items);
}

/**
 * Normalize the highlighted index so it wraps correctly when the user
 * presses ↑/↓. Works on the count of items (not groups) — group headings
 * are not selectable.
 */
export function nextHighlightedIndex(
  current: number,
  count: number,
  direction: "up" | "down",
): number {
  if (count <= 0) return -1;
  if (current < 0) return direction === "down" ? 0 : count - 1;
  return direction === "down"
    ? (current + 1) % count
    : (current - 1 + count) % count;
}

/**
 * Decide the URL to navigate to when a suggestion is selected.
 *
 *   • HOTEL   → /hotels/{id}/rates?…       (skip the search results page)
 *   • CITY    → /search?destination={city} (run the search)
 *   • COUNTRY → /search?destination={country}
 *
 * The caller passes a {@link buildSearchHref} that knows how to assemble
 * the destination + stay/guest params, keeping URL construction in one
 * place ({@link buildSearchUrl} from lib/search).
 */
export function destinationFor(suggestion: DestinationSuggestion): {
  text: string;
  hotelId?: string;
} {
  if (suggestion.type === "HOTEL") {
    return { text: suggestion.label, hotelId: suggestion.hotelId ?? undefined };
  }
  if (suggestion.type === "CITY") {
    return { text: suggestion.city ?? suggestion.label };
  }
  return { text: suggestion.country ?? suggestion.label };
}

/** Default debounce — fires the network call ~200ms after the last keystroke. */
export const DEFAULT_DEBOUNCE_MS = 200;
/** Don't query until the user has typed at least this many characters. */
export const MIN_QUERY_LENGTH = 2;
