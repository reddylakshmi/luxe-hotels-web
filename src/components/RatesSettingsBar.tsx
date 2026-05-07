"use client";

// Currency selector + "Show with taxes and fees" toggle on the rate-list
// page. Both flip URL state; the page re-renders server-side with the new
// settings so prices stay in sync with what the user picked.

import { useRouter, useSearchParams } from "next/navigation";

type StayLite = { checkIn: string; checkOut: string; nights: number };
type GuestsLite = { rooms: number; adults: number; children: number; childAges: number[] };

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AED", "INR"];

export function RatesSettingsBar({
  hotelId,
  currency,
  showTaxes,
  usePoints,
  stay,
  guests,
}: {
  hotelId: string;
  currency: string;
  showTaxes: boolean;
  usePoints: boolean;
  stay: StayLite;
  guests: GuestsLite;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function rebuild(updates: Record<string, string | undefined>): string {
    const next = new URLSearchParams(params.toString());
    // Always carry stay + guests so the data fetch parameters are stable.
    next.set("checkIn", stay.checkIn);
    next.set("checkOut", stay.checkOut);
    next.set("rooms", String(guests.rooms));
    next.set("adults", String(guests.adults));
    next.set("children", String(guests.children));
    if (guests.childAges.length) next.set("childAges", guests.childAges.join(","));
    if (usePoints) next.set("usePoints", "1");
    next.set("currency", currency);
    if (showTaxes) next.set("showTaxes", "1");
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) next.delete(k);
      else next.set(k, v);
    }
    return `/hotels/${hotelId}/rates?${next.toString()}`;
  }

  return (
    <div className="flex items-center gap-5 flex-wrap text-sm">
      <label className="flex items-center gap-2">
        <span className="text-ink/70">Currency</span>
        <select
          value={currency}
          onChange={(e) => router.push(rebuild({ currency: e.target.value }))}
          className="border border-ink/15 bg-cream px-3 py-2 text-sm focus:outline-none focus:border-goldDeep"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showTaxes}
          onChange={(e) => router.push(rebuild({ showTaxes: e.target.checked ? "1" : undefined }))}
          className="w-4 h-4 accent-goldDeep"
        />
        <span>Show with taxes and fees</span>
      </label>
    </div>
  );
}
