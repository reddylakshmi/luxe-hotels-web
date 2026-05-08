"use client";

// One room card on the rate-list page. Collapsed: shows room name, image,
// "Rates from" lowest nightly. Expanded (after the user clicks View Rates):
// reveals a row per rate plan — Flexible (Most Popular), Member Exclusive,
// Package — each with a Select button that takes the guest to /book.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Rate, RoomAvailability } from "@/types/graphql";
import { FALLBACK_ROOM_IMAGE_URL } from "@/lib/constants";
import { parseMoneyAmount } from "@/lib/money";
import { RoomDetailsModal } from "./RoomDetailsModal";

type LowestRate = { value: number; rate: Rate };

export function RoomRateCard({
  room,
  nights,
  showTaxes,
  hotelId,
  hotelName,
  checkIn,
  checkOut,
  adults,
  children,
  defaultExpanded = false,
}: {
  room: RoomAvailability;
  nights: number;
  showTaxes: boolean;
  hotelId: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  /**
   * If true the rate-plan list opens on first render and the card
   * auto-scrolls into view. Used when the user clicks "Check rates" on a
   * specific room from the hotel detail page so they don't have to find
   * it again on the rate-list.
   */
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showDetails, setShowDetails] = useState(false);
  const articleRef = useRef<HTMLElement>(null);

  // When the user lands here via ?roomId=X, scroll the matching card into
  // view once after first paint. The 240ms delay lets layout settle so the
  // scroll lands accurately.
  useEffect(() => {
    if (!defaultExpanded) return;
    const id = window.setTimeout(() => {
      articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 240);
    return () => window.clearTimeout(id);
  }, [defaultExpanded]);

  const lowest = room.rates.reduce<LowestRate | null>((acc, r) => {
    const v = parseMoneyAmount(r.averageNightlyRate);
    return !acc || v < acc.value ? { value: v, rate: r } : acc;
  }, null);

  const beds = room.roomType.bedConfiguration
    .map((b) => `${b.count} ${b.type.toLowerCase().replace("_", " ")}`)
    .join(", ");

  return (
    <article
      ref={articleRef}
      className="border border-ink/10 bg-white scroll-mt-24"
      data-room-id={room.roomType.id}
    >
      <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-0">
        {/* Left: image — 40% of the row width */}
        <div className="aspect-[4/3] md:aspect-auto md:min-h-[340px] bg-ink/5">
          <img
            src={FALLBACK_ROOM_IMAGE_URL}
            alt={room.roomType.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right: room details */}
        <div className="p-6 md:p-8 flex flex-col">
          {/* Header row: title block on the left, "Room details →" pinned top-right */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-2">Guest Room</div>
              <h3 className="font-serif text-2xl">{room.roomType.name}</h3>
            </div>
            <button
              onClick={() => setShowDetails(true)}
              className="text-xs text-goldDeep underline hover:no-underline whitespace-nowrap"
            >
              Room details →
            </button>
          </div>

          <div className="text-sm text-ink/70 mb-3 flex flex-wrap gap-x-3 gap-y-1">
            {beds && <span>{beds}</span>}
            {room.roomType.sizeSqm && <span>· {room.roomType.sizeSqm} m²</span>}
            {room.roomType.view && <span>· {room.roomType.view}</span>}
            {room.roomType.maxOccupancy && (
              <span>
                · Sleeps {room.roomType.maxOccupancy.adults + room.roomType.maxOccupancy.children}
              </span>
            )}
          </div>

          {/* Bottom: price sits directly to the left of the View Rates CTA */}
          <div className="mt-auto pt-6 flex items-end justify-end gap-6">
            {lowest && (
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">Rates from</div>
                <div className="text-ink">
                  <span className="font-serif text-3xl">
                    {Math.round(getDisplayPrice(lowest.rate, showTaxes, nights)).toLocaleString()}
                  </span>
                  <span className="text-ink/60 text-sm ml-1">
                    {lowest.rate.averageNightlyRate.currency} / night
                  </span>
                  {showTaxes && (
                    <div className="text-[11px] text-ink/55 mt-0.5">Taxes and fees included</div>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="btn-primary text-xs px-5 py-2.5 inline-flex items-center gap-1.5"
              aria-expanded={expanded}
            >
              <span aria-hidden className="text-base leading-none">{expanded ? "−" : "+"}</span>
              {expanded ? "Hide Rates" : "View Rates"}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded rate list */}
      {expanded && (
        <div className="border-t border-ink/10 bg-cream/30">
          <ul className="divide-y divide-ink/10">
            {room.rates.map((rate, idx) => (
              <RateOptionRow
                key={rate.id}
                rate={rate}
                isMostPopular={idx === 0}
                showTaxes={showTaxes}
                nights={nights}
                hotelId={hotelId}
                roomId={room.roomType.id}
                checkIn={checkIn}
                checkOut={checkOut}
                adults={adults}
                children={children}
              />
            ))}
          </ul>
        </div>
      )}

      {showDetails && (
        <RoomDetailsModal
          room={room.roomType}
          hotelName={hotelName}
          onClose={() => setShowDetails(false)}
        />
      )}
    </article>
  );
}

function RateOptionRow({
  rate,
  isMostPopular,
  showTaxes,
  nights,
  hotelId,
  roomId,
  checkIn,
  checkOut,
  adults,
  children,
}: {
  rate: Rate;
  isMostPopular: boolean;
  showTaxes: boolean;
  nights: number;
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
}) {
  const [showRateDetails, setShowRateDetails] = useState(false);
  const price = getDisplayPrice(rate, showTaxes, nights);
  const isMember = rate.ratePlan.type === "MEMBER_RATE";

  const bookHref =
    `/hotels/${hotelId}/book?` +
    new URLSearchParams({
      rateToken: rate.rateToken,
      roomId,
      ratePlanCode: rate.ratePlan.code,
      checkIn,
      checkOut,
      adults: String(adults),
      children: String(children),
    }).toString();

  return (
    <li className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_auto] gap-4 p-6 items-center">
      <div>
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h4 className="font-serif text-lg">{rate.ratePlan.name}</h4>
          {isMostPopular && (
            <span className="text-[10px] uppercase tracking-[0.15em] bg-goldDeep text-cream px-2 py-0.5">
              Most Popular
            </span>
          )}
          {rate.ratePlan.refundable && (
            <span className="text-[11px] text-ink/65">Fully refundable</span>
          )}
        </div>
        {rate.ratePlan.description && (
          <p className="text-sm text-ink/70">{rate.ratePlan.description}</p>
        )}
        <div className="text-[11px] text-ink/55 mt-1">
          {showTaxes ? "Taxes and all fees included" : "Excludes taxes and fees"}
          {isMember && rate.pointsEarned > 0 && (
            <> · Earn {rate.pointsEarned.toLocaleString()} points this stay</>
          )}
        </div>
        <button
          onClick={() => setShowRateDetails((v) => !v)}
          className="text-xs text-goldDeep underline hover:no-underline mt-2"
        >
          See Rate details →
        </button>
        {showRateDetails && (
          <div className="mt-3 text-xs text-ink/70 bg-cream/60 border border-ink/10 p-3">
            <div>
              Subtotal {nights} night{nights === 1 ? "" : "s"}: {rate.taxesAndFees.subtotal.amount}{" "}
              {rate.averageNightlyRate.currency}
            </div>
            <div>
              Taxes: {rate.taxesAndFees.taxes.amount} {rate.averageNightlyRate.currency}
            </div>
            <div>
              Fees: {rate.taxesAndFees.fees.amount} {rate.averageNightlyRate.currency}
            </div>
            <div className="font-medium mt-1 pt-1 border-t border-ink/10">
              Total: {rate.taxesAndFees.total.amount} {rate.averageNightlyRate.currency}
            </div>
            {rate.ratePlan.cancellationPolicy && (
              <div className="mt-2 text-ink/60">
                Cancellation: {rate.ratePlan.cancellationPolicy.description}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-ink">
        <span className="font-serif text-2xl">{Math.round(price).toLocaleString()}</span>
        <span className="text-ink/60 text-sm ml-1">
          {rate.averageNightlyRate.currency} / Night
        </span>
        {showTaxes && (
          <div className="text-[11px] text-ink/55 mt-0.5">
            {rate.totalWithTaxes.amount} {rate.totalWithTaxes.currency} total
          </div>
        )}
      </div>

      <Link href={bookHref} className="btn-primary text-xs px-5 py-2.5 whitespace-nowrap">
        Select
      </Link>
    </li>
  );
}

function getDisplayPrice(rate: Rate, showTaxes: boolean, nights: number): number {
  if (!showTaxes) return parseMoneyAmount(rate.averageNightlyRate);
  // Show all-in nightly average when "Show with taxes and fees" is on.
  return parseMoneyAmount(rate.totalWithTaxes) / Math.max(1, nights);
}
