"use client";

// Two-tab strip for /hotels/[id]/rates:
//   • Standard Rates
//   • Deals & Packages
//
// Hash-synced URL so `/rates#deals` deep-links to the second tab
// (matches the existing HotelTabs pattern on /hotels/[id]). Keyboard
// nav follows the WAI-ARIA tablist spec: ←/→ between tabs, Home/End
// jump to first/last. Activation is automatic on focus — feels
// natural in a two-tab layout.

import { useEffect, useState } from "react";
import { RATE_TABS, rateTabLabel, type RateTabId } from "@/lib/ratesTabs";

const TAB_FROM_HASH: Record<string, RateTabId> = {
  "#standard": "standard",
  "#deals": "deals",
  "#packages": "deals", // ergonomic alias
};

export function RatesTabStrip({
  active,
  onChange,
  badges,
}: {
  active: RateTabId;
  onChange: (next: RateTabId) => void;
  /** Optional per-tab count (matched rooms) shown as a small chip
   *  next to the label. Helps the guest see at a glance which tab
   *  has results. */
  badges?: Record<RateTabId, number>;
}) {
  // Sync on hash change so deep-links like /rates#deals open the
  // right tab on mount + react to back/forward navigation.
  useEffect(() => {
    function read() {
      const t = TAB_FROM_HASH[window.location.hash.toLowerCase()];
      if (t) onChange(t);
    }
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [onChange]);

  function onKey(e: React.KeyboardEvent) {
    const idx = RATE_TABS.indexOf(active);
    if (idx < 0) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = RATE_TABS[(idx - 1 + RATE_TABS.length) % RATE_TABS.length];
      go(next);
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = RATE_TABS[(idx + 1) % RATE_TABS.length];
      go(next);
    } else if (e.key === "Home") {
      e.preventDefault();
      go(RATE_TABS[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      go(RATE_TABS[RATE_TABS.length - 1]);
    }
  }

  function go(next: RateTabId) {
    onChange(next);
    if (typeof window !== "undefined") {
      // Push (vs replace) so back-button restores the prior tab.
      window.history.pushState(null, "", `#${next}`);
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Rate type"
      onKeyDown={onKey}
      className="flex items-center gap-6 border-b border-ink/15 mb-6"
    >
      {RATE_TABS.map((tab) => {
        const isActive = tab === active;
        const count = badges?.[tab];
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`rates-tab-${tab}`}
            aria-selected={isActive}
            aria-controls={`rates-panel-${tab}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => go(tab)}
            className={[
              "py-3 -mb-px border-b-2 text-sm uppercase tracking-[0.18em] transition-colors",
              isActive
                ? "border-goldDeep text-ink"
                : "border-transparent text-ink/55 hover:text-ink",
            ].join(" ")}
          >
            {rateTabLabel(tab)}
            {count != null && (
              <span className="ml-2 text-xs text-ink/45 normal-case tracking-normal">
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Read-only mapping export for the page consumer that wants to
 * persist + restore the initial tab from the URL hash without
 * mounting the component first.
 */
export function rateTabFromHash(hash: string | null | undefined): RateTabId {
  if (!hash) return "standard";
  return TAB_FROM_HASH[hash.toLowerCase()] ?? "standard";
}
