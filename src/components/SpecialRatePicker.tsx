"use client";

// Single-select "Special Rate" dropdown for the home-page search
// bar. Populated from the federated `specialRates` query (catalogue
// + display labels + per-row "requires a code" flag), so the labels
// stay one schema-level source of truth instead of being duplicated
// across the bundle.
//
// When the guest picks the Corp/Promo entry, an inline code input
// appears. Use Points lives outside this picker (a sibling checkbox)
// because it's not mutually exclusive with the rate filter — a
// guest can both apply a corporate rate AND elect to redeem points.

import { useEffect, useRef, useState } from "react";

export type SpecialRate = {
  code: string;
  label: string;
  description: string;
  requiresCode: boolean;
};

export function SpecialRatePicker({
  options,
  value,
  onChange,
  corporateCode,
  onCorporateCodeChange,
  theme = "cream",
}: {
  options: SpecialRate[];
  /** Selected RatePlanType code, or `BEST_AVAILABLE` for the default. */
  value: string;
  onChange: (next: string) => void;
  /** Free-text input shown when the selected option has requiresCode=true. */
  corporateCode: string;
  onCorporateCodeChange: (next: string) => void;
  theme?: "cream" | "ink";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.code === value) ?? options[0];
  const fieldBg = theme === "ink" ? "bg-ink/40 text-cream" : "bg-cream text-ink";
  const labelClr = theme === "ink" ? "text-cream/70" : "text-ink/60";

  return (
    <div ref={ref} className={`relative px-5 py-3 ${fieldBg}`}>
      <div className={`text-[10px] uppercase tracking-[0.2em] ${labelClr} mb-1`}>
        Special Rate
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full text-left text-sm flex items-center justify-between gap-2 focus:outline-none"
      >
        <span className="truncate">{selected?.label ?? "Select rate"}</span>
        <span aria-hidden className="text-ink/40 text-xs">▾</span>
      </button>

      {/* When the selected rate requires a code, show the inline input. */}
      {selected?.requiresCode && (
        <input
          type="text"
          value={corporateCode}
          onChange={(e) => onCorporateCodeChange(e.target.value)}
          placeholder="Enter corporate or promo code"
          aria-label="Corporate or promo code"
          className="mt-2 w-full text-xs border-b border-ink/20 bg-transparent py-1 focus:outline-none focus:border-goldDeep"
        />
      )}

      {open && (
        <ul
          role="listbox"
          aria-label="Special rate"
          className="absolute z-30 top-full left-0 right-0 mt-2 bg-cream border border-ink/15 shadow-xl text-ink max-h-80 overflow-auto"
        >
          {options.map((opt) => {
            const isSelected = opt.code === value;
            return (
              <li
                key={opt.code}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.code);
                  setOpen(false);
                }}
                className={[
                  "px-4 py-3 cursor-pointer hover:bg-sand",
                  isSelected && "bg-sand",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-ink/60 mt-0.5">{opt.description}</div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Hidden inputs so the picker round-trips via form-data when the
          parent submits as a multipart form. Today's SearchBar uses
          router.push so these aren't strictly needed, but keeping
          them keeps the picker drop-in for any other form. */}
      <input type="hidden" name="specialRateCode" value={value} />
      {selected?.requiresCode && (
        <input type="hidden" name="corporateCode" value={corporateCode} />
      )}
    </div>
  );
}
