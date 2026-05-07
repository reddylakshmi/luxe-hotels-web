"use client";

// Booking guest picker — rooms, adults, children (+ ages). Logic lives in
// lib/guests.ts. The popover is portaled via <Popover>, so it floats above
// every other element and never gets clipped.

import { useRef, useState } from "react";
import {
  DEFAULT_GUESTS,
  type GuestState,
  MAX_CHILD_AGE,
  MAX_GUESTS_PER_ROOM,
  MAX_ROOMS,
  MIN_CHILD_AGE,
  MIN_ROOMS,
  decAdults,
  decChildren,
  decRooms,
  incAdults,
  incChildren,
  incRooms,
  maxAdults,
  maxChildren,
  setChildAge,
  summarise,
} from "@/lib/guests";
import { Popover } from "./Popover";

export function GuestPicker({
                              initial,
                              theme = "cream",
                            }: {
  initial?: GuestState;
  theme?: "cream" | "ink";
}) {
  const [state, setState] = useState<GuestState>(initial ?? DEFAULT_GUESTS);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const fieldBg = theme === "ink" ? "bg-ink/40 text-cream" : "bg-cream text-ink";
  const labelClr = theme === "ink" ? "text-cream/70" : "text-ink/60";

  return (
          <div className={`relative ${fieldBg}`}>
            {/* Hidden inputs that get serialised by the parent <form>. */}
            <input type="hidden" name="rooms" value={state.rooms} />
            <input type="hidden" name="adults" value={state.adults} />
            {state.children > 0 && (
                    <>
                      <input type="hidden" name="children" value={state.children} />
                      <input type="hidden" name="childAges" value={state.childAges.join(",")} />
                    </>
            )}

            <button
                    ref={triggerRef}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    className="w-full text-left px-5 py-3 block focus:outline-none"
            >
              <div className={`text-[10px] uppercase tracking-[0.2em] ${labelClr} mb-1`}>Guests</div>
              <div className="text-sm py-1 truncate">{summarise(state)}</div>
            </button>

            <Popover
                    anchorRef={triggerRef}
                    open={open}
                    onClose={() => setOpen(false)}
                    align="end"
                    widthPx={340}
                    ariaLabel="Pick guests"
            >
              <div className="p-6">
                <Stepper
                        label="Rooms"
                        hint={`Max ${MAX_ROOMS}`}
                        value={state.rooms}
                        min={MIN_ROOMS}
                        max={MAX_ROOMS}
                        onDec={() => setState(decRooms)}
                        onInc={() => setState(incRooms)}
                />
                <Stepper
                        label="Adults"
                        hint={`Ages 18+ · Max ${MAX_GUESTS_PER_ROOM} total guests/room`}
                        value={state.adults}
                        min={state.rooms}
                        max={maxAdults(state)}
                        onDec={() => setState(decAdults)}
                        onInc={() => setState(incAdults)}
                />
                <Stepper
                        label="Children"
                        hint="Ages 0–17 · age-based rates may be available"
                        value={state.children}
                        min={0}
                        max={maxChildren(state)}
                        onDec={() => setState(decChildren)}
                        onInc={() => setState(incChildren)}
                />

                {state.children > 0 && (
                        <div className="mt-2 pt-4 border-t border-ink/10">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-ink/60 mb-3">
                            Age of each child at check-in
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {state.childAges.map((age, i) => (
                                    <label key={i} className="flex items-center justify-between gap-2 text-sm">
                                      <span className="text-ink/70">Child {i + 1}</span>
                                      <select
                                              value={age}
                                              onChange={(e) =>
                                                      setState((s) => setChildAge(s, i, parseInt(e.target.value, 10)))
                                              }
                                              className="bg-cream border border-ink/20 px-2 py-1 text-sm focus:border-ink outline-none"
                                              aria-label={`Age of child ${i + 1}`}
                                      >
                                        {Array.from({ length: MAX_CHILD_AGE - MIN_CHILD_AGE + 1 }).map((_, n) => {
                                          const v = MIN_CHILD_AGE + n;
                                          return (
                                                  <option key={v} value={v}>
                                                    {v === 0 ? "<1 year" : `${v} ${v === 1 ? "year" : "years"}`}
                                                  </option>
                                          );
                                        })}
                                      </select>
                                    </label>
                            ))}
                          </div>
                        </div>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                          type="button"
                          onClick={() => setOpen(false)}
                          className="text-xs uppercase tracking-[0.2em] border border-ink/30 px-4 py-2 hover:border-ink hover:bg-ink hover:text-cream transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </Popover>
          </div>
  );
}

function Stepper({
                   label,
                   hint,
                   value,
                   min,
                   max,
                   onDec,
                   onInc,
                 }: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onDec: () => void;
  onInc: () => void;
}) {
  const decDisabled = value <= min;
  const incDisabled = value >= max;
  return (
          <div className="flex items-center justify-between py-3 border-b border-ink/5 last:border-b-0">
            <div className="pr-4">
              <div className="font-medium text-sm">{label}</div>
              <div className="text-xs text-ink/55 mt-0.5 leading-snug">{hint}</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                      type="button"
                      onClick={onDec}
                      disabled={decDisabled}
                      aria-label={`Decrease ${label.toLowerCase()}`}
                      className="w-8 h-8 border border-ink/30 hover:border-ink disabled:opacity-30 disabled:hover:border-ink/30 disabled:cursor-not-allowed flex items-center justify-center"
              >
                –
              </button>
              <span className="font-medium tabular-nums text-base w-5 text-center">{value}</span>
              <button
                      type="button"
                      onClick={onInc}
                      disabled={incDisabled}
                      aria-label={`Increase ${label.toLowerCase()}`}
                      className="w-8 h-8 border border-ink/30 hover:border-ink disabled:opacity-30 disabled:hover:border-ink/30 disabled:cursor-not-allowed flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
  );
}
