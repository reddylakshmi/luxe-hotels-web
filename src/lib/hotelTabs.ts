// Hotel-detail tab state — pure helpers used by the HotelTabs client
// component. Living here lets vitest exercise every branch (hash parsing,
// keyboard navigation, validation) without rendering React.

export const HOTEL_TABS = [
  { id: "overview",    label: "Overview" },
  { id: "rooms",       label: "Rooms & Suites" },
  { id: "experiences", label: "Experiences" },
  { id: "meetings",    label: "Meetings" },
  { id: "location",    label: "Location" },
] as const;

export type HotelTabId = (typeof HOTEL_TABS)[number]["id"];

const VALID_IDS = new Set<string>(HOTEL_TABS.map((t) => t.id));

/** Type guard — narrows a string to a known tab id. */
export function isValidTabId(s: string | null | undefined): s is HotelTabId {
  return typeof s === "string" && VALID_IDS.has(s);
}

/**
 * Pull the active tab out of a URL hash like "#rooms" or "rooms".
 * Returns null when the hash is empty / unknown — the caller falls back
 * to the default tab (overview) so deep-linking with a stale id never
 * shows a blank panel.
 */
export function parseTabFromHash(hash: string | null | undefined): HotelTabId | null {
  if (!hash) return null;
  const id = hash.replace(/^#/, "").trim().toLowerCase();
  return isValidTabId(id) ? id : null;
}

/**
 * Map a keyboard event to the next tab id, per the WAI-ARIA tab pattern:
 *   ArrowRight / ArrowDown — wraps to the next tab
 *   ArrowLeft  / ArrowUp   — wraps to the previous tab
 *   Home                   — first tab
 *   End                    — last tab
 *   anything else          — null (caller leaves focus where it is)
 */
export function navigateKey(key: string, current: HotelTabId): HotelTabId | null {
  const idx = HOTEL_TABS.findIndex((t) => t.id === current);
  if (idx < 0) return HOTEL_TABS[0].id;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return HOTEL_TABS[(idx + 1) % HOTEL_TABS.length].id;
    case "ArrowLeft":
    case "ArrowUp":
      return HOTEL_TABS[(idx - 1 + HOTEL_TABS.length) % HOTEL_TABS.length].id;
    case "Home":
      return HOTEL_TABS[0].id;
    case "End":
      return HOTEL_TABS[HOTEL_TABS.length - 1].id;
    default:
      return null;
  }
}

/** Default tab when the URL hash is empty / invalid. */
export const DEFAULT_TAB_ID: HotelTabId = "overview";
