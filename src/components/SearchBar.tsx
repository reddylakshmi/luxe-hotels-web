"use client";

// Search bar mounted on the home page, brand pages, and the
// /search results header. Submits to /search via router.push so the
// component can run client-side validation first.
//
// Two variants:
//   • "compact" — Destination + Stay dates + Find hotel (small surfaces).
//   • "full"    — adds Rooms/Guests, Special Rate, Use Points.
//
// Server-rendered parent passes `specialRates` (the federated
// catalogue from queries.SPECIAL_RATES_QUERY). When the prop is
// empty, the picker + checkbox row degrades gracefully — keeps the
// compact variant compact and lets pages that haven't wired the
// catalogue still render.
//
// Validation is pure (lib/searchBarValidation) — keeps the path-of-
// submission focused: read FormData, run the validator, route or
// re-render with inline error text. The child input components stay
// untouched so their existing tests keep passing.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { withDefaults } from "@/lib/search";
import { GuestPicker } from "./GuestPicker";
import { DateRangePicker } from "./DateRangePicker";
import { DestinationAutocomplete } from "./DestinationAutocomplete";
import { SpecialRatePicker, type SpecialRate } from "./SpecialRatePicker";
import {
  validateSearchSubmit,
  type SearchSubmitErrors,
} from "@/lib/searchBarValidation";

type Defaults = {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  rooms?: number;
  adults?: number;
  children?: number;
  childAges?: number[];
  specialRateCode?: string;
  usePoints?: boolean;
  corporateCode?: string;
};

export function SearchBar({
  brandId,
  brandName,
  defaults,
  theme = "cream",
  variant = "full",
  specialRates,
}: {
  brandId?: string;
  brandName?: string;
  defaults?: Defaults;
  theme?: "cream" | "ink";
  variant?: "compact" | "full";
  /** When provided + variant="full", renders the Special Rate dropdown
   *  and Use Points checkbox. Pages that don't fetch the catalogue
   *  can omit this — the picker row degrades gracefully. */
  specialRates?: SpecialRate[];
}) {
  const router = useRouter();
  const d = withDefaults({ ...defaults, brandId });
  const [pending, startTransition] = useTransition();

  const [specialRateCode, setSpecialRateCode] = useState(
    defaults?.specialRateCode ?? "BEST_AVAILABLE",
  );
  const [corporateCode, setCorporateCode] = useState(defaults?.corporateCode ?? "");
  const [usePoints, setUsePoints] = useState(defaults?.usePoints ?? false);
  const [errors, setErrors] = useState<SearchSubmitErrors>({});

  const fieldBg = theme === "ink" ? "bg-ink/40 text-cream" : "bg-cream text-ink";
  const labelClr = theme === "ink" ? "text-cream/70" : "text-ink/60";
  const containerCls =
    theme === "ink"
      ? "border border-cream/15 bg-ink/30 backdrop-blur"
      : "bg-cream/95 backdrop-blur shadow-2xl shadow-black/20 border border-ink/10";

  const gridCls =
    variant === "compact"
      ? "grid grid-cols-1 md:grid-cols-[1.4fr_1.4fr_auto] gap-px"
      : specialRates && specialRates.length > 0
        ? "grid grid-cols-1 md:grid-cols-[1.2fr_1.3fr_1.1fr_1.1fr_auto] gap-px"
        : "grid grid-cols-1 md:grid-cols-[1.3fr_1.4fr_1.2fr_auto] gap-px";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Each child input exposes its value via a `name=` form field —
    // DestinationAutocomplete writes to `destination`, DateRangePicker
    // writes to `checkIn`/`checkOut`, GuestPicker to `rooms`/`adults`/
    // `children`/`childAges`. Reading them via FormData keeps the
    // SearchBar non-invasive — the existing components' tests stay
    // green and we don't have to thread change callbacks through.
    const fd = new FormData(e.currentTarget);
    const destination = (fd.get("destination") ?? "").toString().trim();
    const checkIn = (fd.get("checkIn") ?? "").toString().trim();
    const checkOut = (fd.get("checkOut") ?? "").toString().trim();

    const errs = validateSearchSubmit({ destination, checkIn, checkOut });
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Scroll the form's first invalid input into view — the named
      // fields are inside the children; rely on the form's natural
      // tab order to surface the first error.
      requestAnimationFrame(() => {
        const formEl = e.currentTarget as HTMLFormElement | null;
        if (!formEl) return;
        const firstName = Object.keys(errs)[0];
        const target = formEl.querySelector<HTMLInputElement>(`[name="${firstName}"]`);
        target?.focus();
      });
      return;
    }

    // Build the /search URL with everything we just validated plus
    // the SearchBar-owned state (special rate, points, brand).
    const params = new URLSearchParams();
    params.set("destination", destination);
    params.set("checkIn", checkIn);
    params.set("checkOut", checkOut);
    for (const k of ["rooms", "adults", "children", "childAges"]) {
      const v = fd.get(k);
      if (v != null && String(v) !== "") params.set(k, String(v));
    }
    if (brandId) params.set("brandId", brandId);
    if (specialRateCode && specialRateCode !== "BEST_AVAILABLE") {
      params.set("specialRateCode", specialRateCode);
    }
    if (corporateCode.trim() && specialRateCode === "CORPORATE") {
      params.set("corporateCode", corporateCode.trim());
    }
    if (usePoints) params.set("usePoints", "true");
    startTransition(() => router.push(`/search?${params.toString()}`));
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`${gridCls} ${containerCls}`}
      aria-label={brandName ? `Find a ${brandName} hotel` : "Find a hotel"}
      noValidate
    >
      {brandId && <input type="hidden" name="brandId" value={brandId} />}

      <div className="relative">
        <DestinationAutocomplete
          name="destination"
          defaultValue={d.destination}
          placeholder="City, hotel, region…"
          theme={theme}
        />
        {errors.destination && (
          <p role="alert" className="text-xs text-red-600 px-5 pb-2 -mt-1">
            {errors.destination}
          </p>
        )}
      </div>

      <div className="relative">
        <DateRangePicker
          theme={theme}
          defaultCheckIn={d.checkIn}
          defaultCheckOut={d.checkOut}
        />
        {(errors.checkIn || errors.checkOut) && (
          <p role="alert" className="text-xs text-red-600 px-5 pb-2 -mt-1">
            {errors.checkIn ?? errors.checkOut}
          </p>
        )}
      </div>

      {variant === "full" && (
        <GuestPicker
          theme={theme}
          initial={{
            rooms: d.rooms,
            adults: d.adults,
            children: d.children,
            childAges: d.childAges,
          }}
        />
      )}

      {variant === "full" && specialRates && specialRates.length > 0 && (
        <SpecialRatePicker
          theme={theme}
          options={specialRates}
          value={specialRateCode}
          onChange={setSpecialRateCode}
          corporateCode={corporateCode}
          onCorporateCodeChange={setCorporateCode}
        />
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary justify-center md:rounded-none md:py-0 md:h-full md:px-8 disabled:opacity-60"
        aria-label="Search"
      >
        {pending ? "Searching…" : "Find a hotel"}
      </button>

      {/* Use Points checkbox lives BELOW the picker row so the grid
          stays one-line on desktop. Tucked at the form level so it's
          always visible regardless of the special-rate selection. */}
      {variant === "full" && specialRates && specialRates.length > 0 && (
        <label
          className={`col-span-full px-5 py-2 text-xs ${fieldBg} ${labelClr} flex items-center gap-2 cursor-pointer`}
        >
          <input
            type="checkbox"
            checked={usePoints}
            onChange={(e) => setUsePoints(e.target.checked)}
            className="w-4 h-4 accent-goldDeep"
          />
          <span>Use Points / Awards for this stay</span>
        </label>
      )}
    </form>
  );
}
