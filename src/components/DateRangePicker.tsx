"use client";

// Two-month side-by-side date-range picker. Calendar lives in a Popover
// that's portaled to document.body, so it can never be clipped by sticky
// headers, sibling sections, or hotel-card stacking contexts.

import { useMemo, useRef, useState } from "react";
import {
  buildMonthGrid,
  isComplete,
  isInRange,
  type MonthGrid,
  nextMonth,
  nightsBetweenISO,
  pickDay,
  prevMonth,
  rangeFrom,
  todayISO,
  WEEKDAY_LABELS,
  type RangeState,
} from "@/lib/dateRange";
import { Popover } from "./Popover";

export function DateRangePicker({
                                  defaultCheckIn,
                                  defaultCheckOut,
                                  theme = "cream",
                                }: {
  defaultCheckIn: string;
  defaultCheckOut: string;
  theme?: "cream" | "ink";
}) {
  const today = todayISO();
  const [range, setRange] = useState<RangeState>(rangeFrom(defaultCheckIn, defaultCheckOut));
  const [hover, setHover] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => initialView(defaultCheckIn ?? today));
  const triggerRef = useRef<HTMLButtonElement>(null);

  const left: MonthGrid = useMemo(() => buildMonthGrid(view.year, view.month, today), [view, today]);
  const right: MonthGrid = useMemo(() => {
    const r = nextMonth(view.year, view.month);
    return buildMonthGrid(r.year, r.month, today);
  }, [view, today]);

  const fieldBg = theme === "ink" ? "bg-ink/40 text-cream" : "bg-cream text-ink";
  const labelClr = theme === "ink" ? "text-cream/70" : "text-ink/60";

  const previewEnd =
          range.selecting === "out" && range.checkIn && hover && hover > range.checkIn ? hover : null;

  const onPick = (iso: string) => setRange((s) => pickDay(s, iso));

  const triggerLabel = formatTrigger(range);
  const nights = isComplete(range) ? nightsBetweenISO(range.checkIn!, range.checkOut!) : 0;

  return (
          <div className={`relative ${fieldBg}`}>
            {/* Hidden inputs the parent form will submit. */}
            <input type="hidden" name="checkIn" value={range.checkIn ?? ""} />
            <input type="hidden" name="checkOut" value={range.checkOut ?? ""} />

            <button
                    ref={triggerRef}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    className="w-full text-left px-5 py-3 block focus:outline-none"
            >
              <div className={`text-[10px] uppercase tracking-[0.2em] ${labelClr} mb-1`}>Stay dates</div>
              <div className="text-sm py-1 truncate">
                {triggerLabel}
                {nights > 0 && (
                        <span className={`ml-2 ${theme === "ink" ? "text-cream/55" : "text-ink/55"} text-xs`}>
                  · {nights} night{nights === 1 ? "" : "s"}
                </span>
                )}
              </div>
            </button>

            <Popover
                    anchorRef={triggerRef}
                    open={open}
                    onClose={() => setOpen(false)}
                    align="end"
                    widthPx={680}
                    ariaLabel="Pick stay dates"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <button
                          type="button"
                          onClick={() => setView(prevMonth(view.year, view.month))}
                          aria-label="Previous month"
                          className="w-8 h-8 border border-ink/20 hover:border-ink flex items-center justify-center"
                  >
                    ‹
                  </button>
                  <div className="text-sm tracking-wide text-ink/70">
                    {range.selecting === "in" ? "Select your check-in" : "Select your check-out"}
                  </div>
                  <button
                          type="button"
                          onClick={() => setView(nextMonth(view.year, view.month))}
                          aria-label="Next month"
                          className="w-8 h-8 border border-ink/20 hover:border-ink flex items-center justify-center"
                  >
                    ›
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Month grid={left} range={range} previewEnd={previewEnd} onPick={onPick}
                         onHover={setHover} />
                  <Month grid={right} range={range} previewEnd={previewEnd} onPick={onPick}
                         onHover={setHover} />
                </div>

                <div className="flex items-center justify-between mt-5 pt-4 border-t border-ink/10">
                  <div className="text-sm">{summarise(range, nights)}</div>
                  <div className="flex gap-2">
                    <button
                            type="button"
                            onClick={() => setRange({ checkIn: null, checkOut: null, selecting: "in" })}
                            className="text-xs uppercase tracking-[0.2em] px-3 py-2 text-ink/60 hover:text-ink"
                    >
                      Clear
                    </button>
                    <button
                            type="button"
                            onClick={() => setOpen(false)}
                            disabled={!isComplete(range)}
                            className="text-xs uppercase tracking-[0.2em] px-4 py-2 border border-ink hover:bg-ink hover:text-cream transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </Popover>
          </div>
  );
}

// ── Month grid render ───────────────────────────────────────────────────────

function Month({
                 grid,
                 range,
                 previewEnd,
                 onPick,
                 onHover,
               }: {
  grid: MonthGrid;
  range: RangeState;
  previewEnd: string | null;
  onPick: (iso: string) => void;
  onHover: (iso: string | null) => void;
}) {
  return (
          <div>
            <div className="font-serif text-base mb-3">{grid.label}</div>
            <div className="grid grid-cols-7 text-center text-[10px] uppercase tracking-[0.15em] text-ink/50 mb-2">
              {WEEKDAY_LABELS.map((w) => <div key={w}>{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => onHover(null)}>
              {grid.weeks.flat().map((day) => {
                const isStart = day.iso === range.checkIn;
                const isEnd = day.iso === range.checkOut;
                const inSelected = isInRange(day.iso, range.checkIn, range.checkOut);
                const inPreview = previewEnd
                        ? day.iso > (range.checkIn ?? "") && day.iso < previewEnd
                        : false;
                const disabled = day.isPast || !day.inMonth;

                let cls = "h-9 w-9 mx-auto text-sm flex items-center justify-center transition-colors";
                if (disabled) cls += " text-ink/20 cursor-default";
                else if (isStart || isEnd) cls += " bg-ink text-cream font-medium";
                else if (inSelected) cls += " bg-ink/10 text-ink";
                else if (inPreview) cls += " bg-ink/5 text-ink";
                else cls += " hover:bg-ink/10 cursor-pointer";
                if (day.isToday && !isStart && !isEnd) cls += " ring-1 ring-goldDeep ring-inset";

                return (
                        <button
                                key={day.iso}
                                type="button"
                                disabled={disabled}
                                aria-label={day.iso}
                                aria-selected={isStart || isEnd}
                                onClick={() => !disabled && onPick(day.iso)}
                                onMouseEnter={() => !disabled && onHover(day.iso)}
                                className={cls}
                        >
                          {day.dayOfMonth}
                        </button>
                );
              })}
            </div>
          </div>
  );
}

function formatTrigger(range: RangeState): string {
  if (!range.checkIn && !range.checkOut) return "Add dates";
  const inLabel = range.checkIn ? humanDate(range.checkIn) : "—";
  const outLabel = range.checkOut ? humanDate(range.checkOut) : "—";
  return `${inLabel} → ${outLabel}`;
}

function summarise(range: RangeState, nights: number): string {
  if (!range.checkIn && !range.checkOut) return "Pick a check-in date";
  if (range.checkIn && !range.checkOut) return `${humanDate(range.checkIn)} · pick check-out`;
  return `${humanDate(range.checkIn!)} → ${humanDate(range.checkOut!)} · ${nights} night${nights === 1 ? "" : "s"}`;
}

function humanDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initialView(iso: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return { year: Number(m[1]), month: Number(m[2]) - 1 };
  const d = new Date();
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}
