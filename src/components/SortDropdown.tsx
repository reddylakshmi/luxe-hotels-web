"use client";

// Sort-by control. A native <select> kept in a tiny client island so
// changing the value navigates without a full <form> submit. The select
// updates the URL via history.replaceState-equivalent (a real link click).

import { useRef } from "react";
import type { SortKey } from "@/lib/search";

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "DISTANCE",          label: "Distance" },
  { value: "PRICE_LOW_TO_HIGH", label: "Price (low to high)" },
  { value: "CITY",              label: "City (A → Z)" },
  { value: "BRAND",             label: "Brand (A → Z)" },
  { value: "GUEST_RATING",      label: "Guest rating (high → low)" },
  { value: "REVIEWS",           label: "Number of reviews" },
];

export function SortDropdown({
                               currentSortBy,
                               currentSearchParams,
                             }: {
  currentSortBy?: SortKey;
  /** All current URL params (excluding sortBy) so we can rebuild the URL. */
  currentSearchParams: Record<string, string | string[] | undefined>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
          <form ref={formRef} action="/search" method="get" className="flex items-center gap-3">
            <CarryAll params={currentSearchParams} />
            <label
                    htmlFor="sortBy"
                    className="text-[10px] uppercase tracking-[0.2em] text-ink/55 whitespace-nowrap"
            >
              Sort by
            </label>
            <select
                    id="sortBy"
                    name="sortBy"
                    defaultValue={currentSortBy ?? ""}
                    onChange={() => formRef.current?.submit()}
                    className="bg-cream border border-ink/20 px-3 py-2 text-sm leading-tight focus:border-ink outline-none cursor-pointer min-w-[200px]"
            >
              {OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
              ))}
            </select>
          </form>
  );
}

function CarryAll({ params }: { params: Record<string, string | string[] | undefined> }) {
  const out: React.ReactNode[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (k === "sortBy" || v == null || v === "") continue;
    if (Array.isArray(v)) {
      v.forEach((vv, i) => out.push(<input key={`${k}-${i}`} type="hidden" name={k} value={vv} />));
    } else {
      out.push(<input key={k} type="hidden" name={k} value={v} />);
    }
  }
  return <>{out}</>;
}
