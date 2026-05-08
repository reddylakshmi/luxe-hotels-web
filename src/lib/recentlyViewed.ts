// Recently-viewed hotel tracking. Stored in localStorage so the list
// follows the device, not the account — analytics-grade fidelity isn't
// needed and avoiding a server round-trip keeps the home page snappy.
//
// Pure functions wrap the localStorage interaction so the logic can be
// vitest-tested without a real DOM. The tests pass an `in-memory`
// Storage stand-in via the optional `storage` parameter.

const STORAGE_KEY = "luxe.recentlyViewed.v1";
export const MAX_RECENTLY_VIEWED = 12;

/** Anything that quacks like web Storage — we only need three methods. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Some browser modes (private windows, sandboxed iframes) throw on access.
    return null;
  }
}

/**
 * Read the current most-recent-first list of hotel IDs.
 * Returns an empty array on missing / malformed storage rather than
 * throwing — UI code should treat "no entries" the same as "storage
 * unavailable".
 */
export function getViewedIds(storage: StorageLike | null = defaultStorage()): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .slice(0, MAX_RECENTLY_VIEWED);
  } catch {
    return [];
  }
}

/**
 * Insert {@code hotelId} at the front, dedup, and cap. Returns the new
 * list (mostly useful for tests; the DOM caller can ignore it).
 */
export function recordView(
  hotelId: string,
  storage: StorageLike | null = defaultStorage(),
): string[] {
  if (!hotelId) return getViewedIds(storage);
  const existing = getViewedIds(storage);
  const next = [hotelId, ...existing.filter((id) => id !== hotelId)].slice(0, MAX_RECENTLY_VIEWED);
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Quota / privacy mode — silent. The list still renders for the
      // current page; persistence just won't survive the reload.
    }
  }
  return next;
}

/** Wipe the list — used by an optional "clear" affordance on the section. */
export function clearViewed(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // No-op.
  }
}
