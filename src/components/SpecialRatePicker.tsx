"use client";

// Single-select "Special Rate" dropdown for the home-page search
// bar. Populated from the federated `specialRates` query (catalogue
// + display labels + per-row "requires a code" flag), so the labels
// stay one schema-level source of truth instead of being duplicated
// across the bundle.
//
// The dropdown panel is rendered through React Portal at
// document.body so it floats above everything else and can never
// be clipped by an ancestor's `overflow-hidden` or a sibling
// section. (The hero on `/` uses overflow-hidden to clip its
// background image — without the portal, a dropdown opened near
// the bottom of the hero gets cut in half by the Featured Hotels
// section below.) Position is computed from the trigger button's
// bounding rect so the dropdown follows the trigger on resize +
// scroll while open.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  // Defer portal mount until client hydration to avoid SSR mismatch.
  useEffect(() => setMounted(true), []);

  // Recompute panel position from the trigger's bounding rect each
  // time we open + on scroll/resize while open. createPortal alone
  // doesn't position the panel — we have to drive that ourselves.
  const recalc = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    setCoords({
      top: r.bottom + window.scrollY + 8,
      left: r.left + window.scrollX,
      width: r.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    recalc();
  }, [open, recalc]);

  useEffect(() => {
    if (!open) return;
    function onScrollResize() {
      recalc();
    }
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [open, recalc]);

  // Outside-click + Escape dismissal.
  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        triggerRef.current?.contains(t) ||
        panelRef.current?.contains(t)
      ) return;
      setOpen(false);
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
    <div className={`relative px-5 py-3 ${fieldBg}`}>
      <div className={`text-[10px] uppercase tracking-[0.2em] ${labelClr} mb-1`}>
        Special Rate
      </div>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full text-left text-sm flex items-center justify-between gap-2 focus:outline-none"
      >
        <span className="truncate">{selected?.label ?? "Select rate"}</span>
        <span aria-hidden className="text-ink/40 text-xs">▾</span>
      </button>

      {/* Corp/Promo code input — visible only when the selected
          rate flags requiresCode=true. */}
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

      {/* Render the dropdown panel through a portal so an ancestor's
          overflow-hidden / stacking context can never clip it. */}
      {mounted && open && coords && createPortal(
        <ul
          ref={panelRef}
          role="listbox"
          aria-label="Special rate"
          style={{
            position: "absolute",
            top: coords.top,
            left: coords.left,
            width: coords.width,
            zIndex: 60,
          }}
          className="bg-cream border border-ink/15 shadow-xl text-ink max-h-96 overflow-auto"
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
        </ul>,
        document.body,
      )}

      {/* Hidden inputs so the picker round-trips via form-data when
          a parent component reads FormData on submit. */}
      <input type="hidden" name="specialRateCode" value={value} />
      {selected?.requiresCode && (
        <input type="hidden" name="corporateCode" value={corporateCode} />
      )}
    </div>
  );
}
