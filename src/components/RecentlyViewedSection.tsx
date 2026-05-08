"use client";

// "Recently Viewed Hotels" section on the home page. Reads the
// per-device list of hotel ids from localStorage on mount, fetches the
// matching hotel cards via the federated router, and renders them in
// the same insertion order (most-recent-first).
//
// The home page is a server component — this section is the client-only
// island that hydrates after first paint. When there's nothing to show
// (first-time visitor, cleared list, fetch error) the component renders
// nothing — no empty-state placeholder, no layout shift.

import Link from "next/link";
import { useEffect, useState } from "react";
import { gqlFetch } from "@/lib/graphql";
import { RECENTLY_VIEWED_QUERY } from "@/lib/queries";
import { clearViewed, getViewedIds } from "@/lib/recentlyViewed";
import type { HotelCard as HotelCardType } from "@/types/graphql";
import { HotelCard } from "./HotelCard";

type Resp = { hotels: { edges: { node: HotelCardType }[] } };

export function RecentlyViewedSection() {
  const [hotels, setHotels] = useState<HotelCardType[] | null>(null);

  useEffect(() => {
    const ids = getViewedIds();
    if (ids.length === 0) {
      setHotels([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await gqlFetch<Resp>(RECENTLY_VIEWED_QUERY, { ids });
        if (cancelled) return;
        // Server returns matching hotels in some internal order; restore
        // the user's most-recent-first order by walking the input list.
        const byId = new Map(data.hotels.edges.map((e) => [e.node.id, e.node]));
        const ordered = ids
          .map((id) => byId.get(id))
          .filter((h): h is HotelCardType => Boolean(h));
        setHotels(ordered);
      } catch {
        if (!cancelled) setHotels([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (hotels === null || hotels.length === 0) return null;

  return (
    <section className="container-x py-20 md:py-24 border-t border-ink/10">
      <div className="flex items-end justify-between mb-10 gap-6 flex-wrap">
        <div>
          <div className="eyebrow mb-3">For you</div>
          <h2 className="font-serif text-4xl md:text-5xl">Recently Viewed Hotels</h2>
          <p className="text-ink/65 text-sm mt-2">Pick up where you left off.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearViewed();
            setHotels([]);
          }}
          className="text-xs text-ink/55 underline hover:no-underline"
        >
          Clear
        </button>
      </div>

      {/* Horizontal carousel on small screens, 4-up grid on large. */}
      <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 overflow-x-auto md:overflow-visible -mx-6 px-6 md:mx-0 md:px-0 snap-x snap-mandatory">
        {hotels.map((h) => (
          <div
            key={h.id}
            className="snap-start shrink-0 w-72 md:w-auto"
          >
            <HotelCard hotel={h} />
          </div>
        ))}
      </div>

      {hotels.length >= 4 && (
        <div className="mt-8 text-right">
          <Link
            href="/hotels"
            className="text-sm text-goldDeep underline hover:no-underline"
          >
            View all hotels →
          </Link>
        </div>
      )}
    </section>
  );
}
