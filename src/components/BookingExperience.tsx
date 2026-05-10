"use client";

// Two-column wrapper for /hotels/[id]/book — owns the shared
// pointsToRedeem state so BookingForm and BookingSummarySidebar agree
// on the redemption number. The form gets a controlled value +
// onChange callback; the sidebar gets the redeemed point count + the
// cash impact in the booking currency. Server-side props (rate, hotel,
// charges, profile) get threaded through as-is.

import { useState } from "react";
import { BookingForm } from "./BookingForm";
import { BookingSummarySidebar } from "./BookingSummarySidebar";
import { pointsToCashUSD } from "@/lib/loyalty";
import type { ChargeSummary, GuestInformation } from "@/lib/bookingValidation";
import type { Rate, RoomAvailability } from "@/types/graphql";

type SavedAddress = {
  id: string;
  type: string;
  line1?: string | null;
  line2?: string | null;
  city: string;
  stateCode?: string | null;
  postalCode?: string | null;
  countryCode: string;
  isPrimary: boolean;
};

type SavedPaymentMethod = {
  id: string;
  type: string;
  brand?: string | null;
  lastFour: string;
  holderName?: string | null;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
};

export function BookingExperience({
  bookingHref,
  hotelId,
  rateToken,
  ratePlanCode,
  roomId,
  prefillGuest,
  signedInLabel,
  savedAddresses,
  savedPaymentMethods,
  loyalty,
  bookingCurrency,
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
}: {
  bookingHref: string;
  hotelId: string;
  rateToken: string;
  ratePlanCode: string;
  roomId: string;
  prefillGuest?: Partial<GuestInformation>;
  signedInLabel?: string;
  savedAddresses: SavedAddress[];
  savedPaymentMethods: SavedPaymentMethod[];
  loyalty: { loyaltyNumber: string; available: number } | null;
  bookingCurrency: string;
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
}) {
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  // Demo simplification — the loyalty subgraph's pointsValuation query
  // would do this conversion server-side per booking currency. Here we
  // apply the same flat 0.007 rate the BookingPointsPanel previews so
  // the sidebar Total stays in sync.
  const loyaltyDiscount = pointsToCashUSD(pointsToRedeem);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-8">
      <div>
        <BookingForm
          bookingHref={bookingHref}
          hotelId={hotelId}
          roomTypeId={rateRoom.id}
          rateToken={rateToken}
          ratePlanCode={ratePlanCode}
          roomId={roomId}
          checkIn={checkIn}
          checkOut={checkOut}
          adults={adults}
          children={children}
          prefillGuest={prefillGuest}
          signedInLabel={signedInLabel}
          savedAddresses={savedAddresses}
          savedPaymentMethods={savedPaymentMethods}
          loyalty={loyalty}
          bookingTotalUSD={charges.total}
          bookingCurrency={bookingCurrency}
          pointsToRedeem={pointsToRedeem}
          onPointsChange={setPointsToRedeem}
        />
      </div>
      <BookingSummarySidebar
        hotelName={hotelName}
        rateRoom={rateRoom}
        selectedRate={selectedRate}
        charges={charges}
        checkIn={checkIn}
        checkOut={checkOut}
        nights={nights}
        rooms={rooms}
        adults={adults}
        children={children}
        editStayHref={editStayHref}
        pointsRedeemed={pointsToRedeem}
        loyaltyDiscount={loyaltyDiscount}
      />
    </div>
  );
}
