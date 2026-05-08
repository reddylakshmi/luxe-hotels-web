// Cross-cutting constants shared by multiple components/pages.
//
// Anything that's referenced in 2+ files and would surprise a reader
// when changed in only one of them belongs here.

/**
 * Public placeholder used when a hotel/room has no media of its own
 * (true for every generator + India hotel — the property subgraph emits
 * synthetic CDN URLs that don't actually resolve). Centralised so the
 * fallback is easy to swap and consistent across the rate-list and
 * booking pages.
 */
export const FALLBACK_ROOM_IMAGE_URL =
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900&q=80&auto=format";
