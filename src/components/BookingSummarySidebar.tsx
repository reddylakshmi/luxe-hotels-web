"use client";

// Right-column summary on the booking page. Sticky on desktop so the user
// always sees what they're paying for as they scroll the form. Includes
// the room photo, room type, "Room details" link (reuses the same modal
// used on the rate-list page), stay window, guest counts, member-rate
// label when applicable, "Edit Stay Details" back-link, and a Summary of
// Charges block.

import { useState } from "react";
import Link from "next/link";
import { fmtDate } from "@/lib/stay";
import type { ChargeSummary } from "@/lib/bookingValidation";
import { FALLBACK_ROOM_IMAGE_URL } from "@/lib/constants";
import { formatAmount } from "@/lib/money";
import type { RoomAvailability, Rate } from "@/types/graphql";
import { RoomDetailsModal } from "./RoomDetailsModal";

export function BookingSummarySidebar({
  hotelName,
  rateRoom,
  selectedRate,
  charges,
  checkIn,
  checkOut,
  nights,
  rooms,
  adults,
  children,
  editStayHref,
  pointsRedeemed = 0,
  loyaltyDiscount = 0,
}: {
  hotelName: string;
  rateRoom: RoomAvailability["roomType"];
  selectedRate: Rate | null;
  charges: ChargeSummary;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  adults: number;
  children: number;
  editStayHref: string;
  /** Points the guest is redeeming on this booking. Drives the
   *  "Loyalty redemption" line in the summary; 0 hides the row. */
  pointsRedeemed?: number;
  /** Cash impact of the redemption in the booking's currency. */
  loyaltyDiscount?: number;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const isMember = selectedRate?.ratePlan.type === "MEMBER_RATE";
  const money = (n: number) => formatAmount(n, charges.currency);

  return (
    <aside className="md:sticky md:top-6 self-start border border-ink/10 bg-white">
      {/* Room photo */}
      <div className="aspect-[4/3] bg-ink/5">
        <img
          src={FALLBACK_ROOM_IMAGE_URL}
          alt={rateRoom.name}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-5 space-y-4">
        {/* Room type */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">Guest Room</div>
          <h3 className="font-serif text-xl">{rateRoom.name}</h3>
          <button
            onClick={() => setShowDetails(true)}
            type="button"
            className="text-xs text-goldDeep underline hover:no-underline mt-1"
          >
            Room details →
          </button>
        </div>

        {/* Stay info */}
        <dl className="text-sm border-t border-ink/10 pt-4 space-y-2">
          <Row label="Check-in" value={fmtDate(checkIn)} />
          <Row label="Check-out" value={fmtDate(checkOut)} />
          <Row
            label="Stay"
            value={`${nights} night${nights === 1 ? "" : "s"}`}
          />
          <Row
            label="Rooms / Guests"
            value={`${rooms} room${rooms === 1 ? "" : "s"} · ${adults} adult${adults === 1 ? "" : "s"}${
              children > 0 ? `, ${children} child${children === 1 ? "" : "ren"}` : ""
            }`}
          />
        </dl>

        {/* Member exclusive label */}
        {isMember && (
          <div className="border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs px-3 py-2">
            Member Exclusive Offer · Fully Refundable
          </div>
        )}

        <Link href={editStayHref} className="text-xs text-goldDeep underline hover:no-underline block">
          Edit Stay Details →
        </Link>

        {/* Summary of charges */}
        <div className="border-t border-ink/10 pt-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-2">
            Summary of Charges
          </div>
          <dl className="text-sm space-y-1">
            <Row label="Subtotal" value={money(charges.subtotal)} />
            <Row label="Taxes" value={money(charges.taxes)} />
            <Row label="Fees" value={money(charges.fees)} />
            {pointsRedeemed > 0 && loyaltyDiscount > 0 && (
              <div className="flex justify-between items-baseline gap-3 text-goldDeep">
                <dt>
                  Loyalty redemption
                  <span className="block text-[10px] tracking-[0.18em] uppercase text-ink/45">
                    {pointsRedeemed.toLocaleString()} pts
                  </span>
                </dt>
                <dd className="text-right tabular-nums">
                  −{money(loyaltyDiscount)}
                </dd>
              </div>
            )}
          </dl>
          <div className="mt-3 pt-3 border-t border-ink/10 flex items-baseline justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="font-serif text-xl">
              {money(Math.max(0, charges.total - (loyaltyDiscount || 0)))}
            </span>
          </div>
          {selectedRate && selectedRate.pointsEarned > 0 && (
            <p className="text-xs text-ink/60 mt-2">
              Earn {selectedRate.pointsEarned.toLocaleString()} points this stay.
            </p>
          )}
        </div>
      </div>

      {showDetails && (
        <RoomDetailsModal
          room={rateRoom}
          hotelName={hotelName}
          onClose={() => setShowDetails(false)}
        />
      )}
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <dt className="text-ink/65">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
