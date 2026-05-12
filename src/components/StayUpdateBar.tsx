"use client";

// Editable stay-and-guests bar for the rate-list page. The user can
// change dates / rooms+guests / special rate / corp-promo code /
// "Use Points" and submit Update — the form re-renders the same
// /hotels/[id]/rates URL with the new params. The picker controls
// match the home-page SearchBar so the guest can re-tune their
// selection inline without back-navigating.
//
// Client-rendered so the SpecialRatePicker can be controlled
// (without `useState` here the picker's hidden input would never
// reflect a change). Child inputs that don't need React state
// (DateRangePicker, GuestPicker, the Use Points checkbox) still
// round-trip via plain form-data; we only hold state for the
// fields that need it.

import { useState } from "react";
import { DateRangePicker } from "./DateRangePicker";
import { GuestPicker } from "./GuestPicker";
import { SpecialRatePicker, type SpecialRate } from "./SpecialRatePicker";

type Defaults = {
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  adults: number;
  children: number;
  childAges: number[];
};

export function StayUpdateBar({
  hotelId,
  defaults,
  usePoints,
  showTaxes,
  currency,
  specialRates,
  specialRateCode: initialSpecialRateCode,
  corporateCode: initialCorporateCode,
}: {
  hotelId: string;
  defaults: Defaults;
  usePoints: boolean;
  showTaxes: boolean;
  currency: string;
  /** Catalogue of special-rate options, fetched server-side by the
   *  rates page. When provided + non-empty the form renders the
   *  picker dropdown; falls through gracefully when omitted. */
  specialRates?: SpecialRate[];
  /** Currently-selected RatePlanType code (defaults to
   *  BEST_AVAILABLE — the "Lowest Regular Rate" option). */
  specialRateCode?: string;
  /** Free-text Corp/Promo code captured when specialRateCode is
   *  CORPORATE. */
  corporateCode?: string;
}) {
  const hasPicker = specialRates && specialRates.length > 0;
  const [specialRateCode, setSpecialRateCode] = useState(
    initialSpecialRateCode ?? "BEST_AVAILABLE",
  );
  const [corporateCode, setCorporateCode] = useState(initialCorporateCode ?? "");

  return (
    <section className="bg-cream border-b border-ink/10">
      <div className="container-x py-6">
        <form
          action={`/hotels/${hotelId}/rates`}
          method="get"
          className={[
            "grid grid-cols-1 items-end gap-4",
            hasPicker
              ? "md:grid-cols-[1.2fr_1.2fr_1.2fr_auto_auto]"
              : "md:grid-cols-[1.4fr_1.4fr_auto_auto]",
          ].join(" ")}
        >
          {/* Stay dates */}
          <DateRangePicker
            defaultCheckIn={defaults.checkIn}
            defaultCheckOut={defaults.checkOut}
            theme="cream"
          />

          {/* Rooms and Guests */}
          <GuestPicker
            initial={{
              rooms: defaults.rooms,
              adults: defaults.adults,
              children: defaults.children,
              childAges: defaults.childAges,
            }}
            theme="cream"
          />

          {/* Special-rate dropdown — controlled by this component
              so the hidden specialRateCode input reflects clicks.
              Catalogue arrives from the federated specialRates
              query; matches the home-page picker exactly. */}
          {hasPicker && (
            <SpecialRatePicker
              theme="cream"
              options={specialRates}
              value={specialRateCode}
              onChange={setSpecialRateCode}
              corporateCode={corporateCode}
              onCorporateCodeChange={setCorporateCode}
            />
          )}

          {/* Use Points checkbox — match the home-page picker's
              "true" string so the URL contract stays uniform
              end-to-end. */}
          <label className="flex items-center gap-2 cursor-pointer h-12 px-4 border border-ink/15 bg-cream/95">
            <input
              type="checkbox"
              name="usePoints"
              value="true"
              defaultChecked={usePoints}
              className="w-4 h-4 accent-goldDeep"
            />
            <span className="text-sm">Use Points (Rewards)</span>
          </label>

          {/* Hidden carry-forward state. specialRateCode +
              corporateCode are emitted by SpecialRatePicker itself
              (see its own <input type="hidden">). */}
          <input type="hidden" name="currency" value={currency} />
          {showTaxes && <input type="hidden" name="showTaxes" value="1" />}

          <button type="submit" className="btn-primary h-12 px-8 whitespace-nowrap">
            Update
          </button>
        </form>
      </div>
    </section>
  );
}
