"use client";

// "Use Luxe points" panel that drops into the booking form between Guest
// Information and Payment. Owned by BookingForm so the redeemed-points
// value rides along on submit (currently into the confirmation URL —
// the booking flow itself is a demo prototype, no createReservation
// call). Sliders and number-input stay in sync; "Apply max" lets the
// guest dump the maximum allowable redemption with one click.

import { useState, useEffect } from "react";
import {
  POINTS_REDEMPTION_STEP,
  USD_PER_POINT,
  clampPointsRedemption,
  formatPoints,
  pointsToCashUSD,
} from "@/lib/loyalty";

export function BookingPointsPanel({
  available,
  totalUSD,
  bookingCurrency,
  pointsToRedeem,
  onChange,
}: {
  /** Guest's current available points balance from myLoyaltyAccount. */
  available: number;
  /** Booking total expressed in USD (or near-equivalent). Used to cap
   *  the redemption so the guest can't over-redeem. Real systems would
   *  hit the schema's pointsValuation query in the booking currency —
   *  the demo uses a fixed USD_PER_POINT preview. */
  totalUSD: number;
  /** Currency the booking is actually charged in. Anything other than
   *  USD gets a "≈" disclaimer next to the saved amount since the
   *  preview is a USD approximation. */
  bookingCurrency: string;
  /** Authoritative redemption value owned by the parent form. */
  pointsToRedeem: number;
  onChange: (next: number) => void;
}) {
  // Local input mirror lets the guest type "12345" without instant
  // snap-down; we re-clamp on blur and on slider release.
  const [draft, setDraft] = useState<string>(String(pointsToRedeem));
  useEffect(() => {
    setDraft(String(pointsToRedeem));
  }, [pointsToRedeem]);

  const max = Math.max(
    0,
    Math.floor(
      Math.min(available, Math.floor(totalUSD / USD_PER_POINT)) /
        POINTS_REDEMPTION_STEP,
    ) * POINTS_REDEMPTION_STEP,
  );
  const cashSavedUSD = pointsToCashUSD(pointsToRedeem);
  const isApprox = bookingCurrency !== "USD";

  function commit(next: number) {
    onChange(clampPointsRedemption(next, available, totalUSD));
  }

  return (
    <fieldset className="border border-goldDeep/30 bg-cream/40 px-5 py-5 mb-6">
      <legend className="px-2 text-[10px] uppercase tracking-[0.3em] text-goldDeep">
        Luxe points
      </legend>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-4">
        <div>
          <div className="text-sm text-ink/85">
            Redeem points to lower the total you owe at check-in.
          </div>
          <div className="text-xs text-ink/55 mt-1">
            {formatPoints(available)} available · 1,000 pts ≈ $
            {(POINTS_REDEMPTION_STEP * USD_PER_POINT).toFixed(2)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => commit(max)}
          disabled={max === 0 || pointsToRedeem === max}
          className="text-xs uppercase tracking-[0.18em] text-goldDeep hover:underline disabled:opacity-40"
        >
          Apply max
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          aria-label="Points to redeem"
          type="range"
          min={0}
          max={max}
          step={POINTS_REDEMPTION_STEP}
          value={pointsToRedeem}
          onChange={(e) => commit(Number(e.target.value))}
          disabled={max === 0}
          className="flex-1 accent-goldDeep"
        />
        <div className="flex items-baseline gap-2">
          <input
            aria-label="Points to redeem (numeric input)"
            type="number"
            min={0}
            max={max}
            step={POINTS_REDEMPTION_STEP}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit(Number(draft) || 0)}
            disabled={max === 0}
            className="w-28 border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-goldDeep tabular-nums"
          />
          <span className="text-xs text-ink/55">pts</span>
        </div>
      </div>

      <div className="flex items-baseline justify-between mt-4 pt-3 border-t border-ink/10">
        <div className="text-sm text-ink/70">
          {pointsToRedeem > 0
            ? `Redeeming ${formatPoints(pointsToRedeem)}`
            : max === 0
              ? "Not enough points to redeem on this stay."
              : "Slide to apply points."}
        </div>
        <div className="font-serif text-lg text-goldDeep tabular-nums whitespace-nowrap">
          {pointsToRedeem > 0 ? (
            <>
              {isApprox ? "≈ " : ""}−${cashSavedUSD.toFixed(2)} {isApprox && "USD"}
            </>
          ) : (
            <span className="text-ink/40">—</span>
          )}
        </div>
      </div>

      {pointsToRedeem > 0 && (
        <p className="mt-3 text-xs text-ink/55">
          {isApprox
            ? "Final discount converts to your booking currency at check-in."
            : "Discount applied at check-in."}{" "}
          You&apos;ll have {formatPoints(available - pointsToRedeem)} remaining after this stay.
        </p>
      )}
    </fieldset>
  );
}
