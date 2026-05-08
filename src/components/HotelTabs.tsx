"use client";

// Hotel-detail tabs.
//
// Replaces the long-scroll layout (jump-to-anchor links + every section
// stacked top-to-bottom) with a sticky tab bar that swaps the panel
// below it in place — guests can compare Rooms ↔ Experiences without
// scrolling back to the tab strip.
//
// Implements the WAI-ARIA tab pattern:
//   role="tablist" + role="tab" + role="tabpanel"
//   roving tabindex (only the active tab is in the tab order)
//   aria-selected / aria-controls / aria-labelledby wired up
//   keyboard nav (←/→/↑/↓ wrap; Home/End jump) handled by lib/hotelTabs.navigateKey
//
// URL-hash sync makes /hotels/X#meetings deep-linkable and survives
// back/forward navigation. Pure logic for parsing/keys lives in
// lib/hotelTabs (38 vitest cases).

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_TAB_ID,
  HOTEL_TABS,
  navigateKey,
  parseTabFromHash,
  type HotelTabId,
} from "@/lib/hotelTabs";

export function HotelTabs({
  panels,
  primaryAction,
}: {
  panels: Record<HotelTabId, ReactNode>;
  /** Optional CTA rendered to the right of the tab strip (e.g. "Book a Room"). */
  primaryAction?: ReactNode;
}) {
  const [active, setActive] = useState<HotelTabId>(DEFAULT_TAB_ID);
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<HotelTabId, HTMLButtonElement | null>>>({});

  // Hash sync — initial read + listen for hashchange (back/forward).
  useEffect(() => {
    const fromHash = parseTabFromHash(window.location.hash);
    if (fromHash) setActive(fromHash);
    function onHashChange() {
      const next = parseTabFromHash(window.location.hash);
      if (next) setActive(next);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function selectTab(id: HotelTabId, fromKeyboard = false) {
    setActive(id);
    // replaceState (not pushState) so each tab click doesn't fill the
    // history stack — back arrow returns to where the user came from.
    if (typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState(null, "", `#${id}`);
    }
    if (fromKeyboard) {
      // ARIA spec: focus follows selection on keyboard nav so screen
      // readers announce the new tab.
      tabRefs.current[id]?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const next = navigateKey(e.key, active);
    if (next) {
      e.preventDefault();
      selectTab(next, true);
    }
  }

  return (
    <>
      {/* Sticky tab strip + (optional) primary CTA */}
      <div className="border-b border-ink/10 sticky top-16 bg-cream z-30">
        <div className="container-x py-4 flex items-center justify-between gap-6">
          <div
            ref={tablistRef}
            role="tablist"
            aria-label="Hotel sections"
            onKeyDown={onKeyDown}
            className="flex gap-2 md:gap-6 text-sm overflow-x-auto"
          >
            {HOTEL_TABS.map((t) => {
              const isActive = active === t.id;
              return (
                <button
                  key={t.id}
                  id={`tab-${t.id}`}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  aria-controls={`panel-${t.id}`}
                  tabIndex={isActive ? 0 : -1}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  onClick={() => selectTab(t.id)}
                  className={[
                    "whitespace-nowrap px-1 py-2 border-b-2 transition-colors",
                    "focus:outline-none focus-visible:text-goldDeep",
                    isActive
                      ? "border-goldDeep text-ink font-medium"
                      : "border-transparent text-ink/60 hover:text-ink",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          {primaryAction && (
            <div className="shrink-0">{primaryAction}</div>
          )}
        </div>
      </div>

      {/* Panels — non-active panels are kept in the DOM (hidden) so SEO
          crawlers see all the hotel's content and screen readers can
          rely on the role=tabpanel + hidden contract. */}
      {HOTEL_TABS.map((t) => (
        <div
          key={t.id}
          id={`panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${t.id}`}
          hidden={active !== t.id}
        >
          {panels[t.id]}
        </div>
      ))}
    </>
  );
}
