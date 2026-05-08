"use client";

// Records the current hotel id in the per-device "recently viewed" list.
// Mounted at the top of every hotel-related server component
// (/hotels/[id], /hotels/[id]/rates, /hotels/[id]/book) so the user only
// has to land on the page once for the home-page section to learn about it.
//
// Renders nothing — invisible behavioural tracker.

import { useEffect } from "react";
import { recordView } from "@/lib/recentlyViewed";

export function RecentlyViewedTracker({ hotelId }: { hotelId: string }) {
  useEffect(() => {
    if (!hotelId) return;
    recordView(hotelId);
  }, [hotelId]);
  return null;
}
