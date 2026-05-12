export const dynamic = "force-dynamic";

import Link from "next/link";
import { gqlFetch } from "@/lib/graphql";
import { RATES_QUERY } from "@/lib/queries";
import type { HotelRates } from "@/types/graphql";
import { resolveStay, fmtDate } from "@/lib/stay";
import { fromSearchParams as guestsFrom } from "@/lib/guests";
import { picker } from "@/lib/searchParams";
import { BrandLogo } from "@/components/BrandLogo";
import { StayUpdateBar } from "@/components/StayUpdateBar";
import { RoomRateCard } from "@/components/RoomRateCard";
import { RatesSettingsBar } from "@/components/RatesSettingsBar";
import { RecentlyViewedTracker } from "@/components/RecentlyViewedTracker";

type Resp = { hotel: HotelRates };

export default async function RatesPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const pick = picker(searchParams);

  const stay = resolveStay({
    checkIn: pick("checkIn"),
    checkOut: pick("checkOut"),
    nights: pick("nights"),
  });
  const guests = guestsFrom(searchParams);
  const usePoints = pick("usePoints") === "1";
  const showTaxes = pick("showTaxes") === "1";
  const currency = pick("currency") || "USD";
  // Set when the user arrives from a "Check rates" button on the hotel
  // detail page — the matching room card opens and scrolls into view.
  const focusRoomId = pick("roomId");

  let data: Resp | null = null;
  let error: string | null = null;
  try {
    data = await gqlFetch<Resp>(RATES_QUERY, {
      id: params.id,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      adults: guests.adults,
      children: guests.children,
      currency,
    });
  } catch (e) {
    error = (e as Error).message;
  }

  if (!data?.hotel || error) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-serif text-3xl mb-4">Hotel not found</h1>
        <p className="text-ink/60 mb-8">{error || "We couldn't load rates for this hotel."}</p>
        <Link href="/hotels" className="btn-primary inline-block">
          Browse all hotels
        </Link>
      </div>
    );
  }

  const hotel = data.hotel;
  const addressBits = [
    hotel.location.address.line1,
    hotel.location.address.line2,
    hotel.location.address.city,
    hotel.location.address.state,
    hotel.location.address.postalCode,
  ].filter(Boolean);
  const rooms = hotel.availability?.roomAvailabilities ?? [];

  return (
    <>
      <RecentlyViewedTracker hotelId={params.id} />
      {/* ── Hotel header ─────────────────────────────────────────────── */}
      <section className="bg-ink text-cream">
        <div className="container-x py-10 md:py-14 flex items-center gap-5">
          <BrandLogo brand={hotel.brand} size="md" />
          <div>
            <div className="eyebrow text-cream/70 mb-1">{hotel.brand.name}</div>
            <h1 className="font-serif text-3xl md:text-4xl leading-tight">{hotel.name}</h1>
            <p className="text-cream/70 text-sm mt-1">{addressBits.join(", ")}</p>
          </div>
        </div>
      </section>

      {/* ── Stay update bar ─────────────────────────────────────────── */}
      <StayUpdateBar
        hotelId={params.id}
        defaults={{
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          nights: stay.nights,
          rooms: guests.rooms,
          adults: guests.adults,
          children: guests.children,
          childAges: guests.childAges,
        }}
        usePoints={usePoints}
        showTaxes={showTaxes}
        currency={currency}
      />

      {/* ── Rate list ───────────────────────────────────────────────── */}
      <section className="container-x py-12">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-6">
          <div>
            <div className="eyebrow mb-2">Booking</div>
            <h2 className="font-serif text-3xl">Select a Room and Rate</h2>
            <p className="text-sm text-ink/60 mt-1">
              {fmtDate(stay.checkIn)} → {fmtDate(stay.checkOut)} · {stay.nights} night
              {stay.nights === 1 ? "" : "s"} · {guests.adults} adult{guests.adults === 1 ? "" : "s"}
              {guests.children > 0 && `, ${guests.children} child${guests.children === 1 ? "" : "ren"}`}
              {guests.rooms > 1 && `, ${guests.rooms} rooms`}
            </p>
          </div>
          <RatesSettingsBar
            hotelId={params.id}
            currency={currency}
            showTaxes={showTaxes}
            usePoints={usePoints}
            stay={stay}
            guests={guests}
          />
        </div>

        {rooms.length === 0 && (
          <div className="border border-ink/10 bg-cream/40 p-10 text-center text-ink/60">
            No rooms are available for the selected dates. Try adjusting your stay dates.
          </div>
        )}

        <div className="flex flex-col gap-6">
          {rooms.map((room) => (
            <RoomRateCard
              key={room.roomType.id}
              room={room}
              nights={hotel.availability?.nights ?? stay.nights}
              showTaxes={showTaxes}
              hotelId={params.id}
              hotelName={hotel.name}
              checkIn={stay.checkIn}
              checkOut={stay.checkOut}
              defaultExpanded={focusRoomId === room.roomType.id}
              adults={guests.adults}
              children={guests.children}
              rooms={guests.rooms}
            />
          ))}
        </div>
      </section>
    </>
  );
}
