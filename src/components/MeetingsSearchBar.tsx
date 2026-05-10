"use client";

// Search input for /meetings — start date, end date, attendees, and
// optional setup style. Submitting builds a URL the server page reads
// back via picker() so the page stays cacheable + back-button friendly.
// The same shape powers the page's empty/initial state via defaults.

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  SETUP_STYLES,
  labelSetup,
  validateMeetingsSearch,
  type MeetingsSearchInput,
} from "@/lib/meetings";

export function MeetingsSearchBar({
  initial,
  hotelId,
}: {
  initial?: Partial<MeetingsSearchInput>;
  /** Optional — when present we narrow the search to this single hotel
   *  (used by the deep-link from the /hotels/[id] Meetings tab). */
  hotelId?: string;
}) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [attendees, setAttendees] = useState(
    initial?.attendees != null ? String(initial.attendees) : "",
  );
  const [setup, setSetup] = useState<string>(initial?.setup ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAttendees = attendees ? Number(attendees) : NaN;
    const next: Partial<MeetingsSearchInput> = {
      startDate,
      endDate,
      attendees: Number.isFinite(parsedAttendees) ? parsedAttendees : undefined,
      setup: (setup || undefined) as MeetingsSearchInput["setup"],
    };
    const found = validateMeetingsSearch(next);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setErrors({});
    const params = new URLSearchParams({
      startDate: next.startDate!,
      endDate: next.endDate!,
      attendees: String(next.attendees!),
    });
    if (next.setup) params.set("setup", next.setup);
    if (hotelId) params.set("hotelId", hotelId);
    router.push(`/meetings?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_1fr_auto] gap-3 items-end bg-cream/95 border border-ink/10 p-4 md:p-5"
    >
      <Field id="startDate" label="Start" error={errors.startDate}>
        <input
          id="startDate"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className={inputCls(errors.startDate)}
        />
      </Field>
      <Field id="endDate" label="End" error={errors.endDate}>
        <input
          id="endDate"
          type="date"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) => setEndDate(e.target.value)}
          className={inputCls(errors.endDate)}
        />
      </Field>
      <Field id="attendees" label="Attendees" error={errors.attendees}>
        <input
          id="attendees"
          type="number"
          min={2}
          max={5000}
          inputMode="numeric"
          value={attendees}
          onChange={(e) => setAttendees(e.target.value)}
          className={inputCls(errors.attendees)}
        />
      </Field>
      <Field id="setup" label="Setup (optional)">
        <select
          id="setup"
          value={setup}
          onChange={(e) => setSetup(e.target.value)}
          className={inputCls()}
        >
          <option value="">Any layout</option>
          {SETUP_STYLES.map((s) => (
            <option key={s} value={s}>
              {labelSetup(s)}
            </option>
          ))}
        </select>
      </Field>
      <button
        type="submit"
        className="btn-primary px-6 py-2 h-[40px] mt-[18px] md:mt-0"
      >
        Find venues
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
        {label}
      </span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

function inputCls(error?: string): string {
  return [
    "w-full border bg-white px-3 py-2 text-sm focus:outline-none",
    error ? "border-red-500 focus:border-red-600" : "border-ink/15 focus:border-goldDeep",
  ].join(" ");
}
