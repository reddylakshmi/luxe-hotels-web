"use client";

// Wraps the tab strip + per-tab room list as a single client island,
// keeping the surrounding /rates page a server component. Owns the
// active-tab state (seeded from the URL hash) and only renders the
// matching slice — the inactive tab's RoomRateCards don't even
// mount, so their internal `useState` (rate-plan expand toggle) +
// effects don't pay the cost.

import { useEffect, useState } from "react";
import { RoomRateCard } from "./RoomRateCard";
import { RatesTabStrip, rateTabFromHash } from "./RatesTabStrip";
import { rateTabLabel, type RateTabId } from "@/lib/ratesTabs";
import type { RoomAvailability } from "@/types/graphql";

export function RatesTabbedList({
  roomsByTab,
  focusRoomId,
  nights,
  showTaxes,
  hotelId,
  hotelName,
  checkIn,
  checkOut,
  adults,
  children,
  childAges,
  rooms,
  specialRateCode,
  corporateCode,
  usePoints,
}: {
  roomsByTab: Record<RateTabId, RoomAvailability[]>;
  focusRoomId?: string | null;
  nights: number;
  showTaxes: boolean;
  hotelId: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  childAges?: number[];
  rooms: number;
  specialRateCode?: string;
  corporateCode?: string;
  usePoints?: boolean;
}) {
  // Seed from the URL hash so deep-links (?#deals) land on the
  // right tab on first render. Falls through to "standard" on
  // anything we don't recognise.
  const [active, setActive] = useState<RateTabId>("standard");

  useEffect(() => {
    setActive(rateTabFromHash(window.location.hash));
  }, []);

  // Count rooms per tab for the strip's badge.
  const badges: Record<RateTabId, number> = {
    standard: roomsByTab.standard.length,
    deals: roomsByTab.deals.length,
  };

  const visibleRooms = roomsByTab[active];

  return (
    <>
      <RatesTabStrip active={active} onChange={setActive} badges={badges} />

      <div
        id={`rates-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`rates-tab-${active}`}
        className="flex flex-col gap-6"
      >
        {visibleRooms.length === 0 ? (
          <div className="border border-ink/10 bg-cream/40 p-10 text-center text-ink/60">
            No {rateTabLabel(active).toLowerCase()} are available for the
            selected stay. Try the other tab or adjust your dates.
          </div>
        ) : (
          visibleRooms.map((room) => (
            <RoomRateCard
              key={`${active}-${room.roomType.id}`}
              room={room}
              nights={nights}
              showTaxes={showTaxes}
              hotelId={hotelId}
              hotelName={hotelName}
              checkIn={checkIn}
              checkOut={checkOut}
              defaultExpanded={focusRoomId === room.roomType.id}
              adults={adults}
              children={children}
              childAges={childAges}
              rooms={rooms}
              specialRateCode={specialRateCode}
              corporateCode={corporateCode}
              usePoints={usePoints}
            />
          ))
        )}
      </div>
    </>
  );
}
