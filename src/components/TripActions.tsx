"use client";

// Client-side action panel for /trips/[id]. Holds two interactions:
//   • Online check-in — collapsing form (document type, number, ETA)
//     posted to checkInAction. The form only renders when the server
//     said canCheckInOnline; we don't second-guess.
//   • Cancel reservation — confirm() then a form posted to
//     cancelReservationAction. Available when the server said
//     isRefundable + status is still cancellable.
//
// "Modify dates / guests" is a future feature — the schema supports it
// but the UX needs an availability-aware date picker, so the button is
// rendered as a styled link to a placeholder for now.

import { useState, useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  checkInAction,
  cancelReservationAction,
  type CheckInState,
  type CancelState,
} from "@/lib/tripActions";
import { CHECK_IN_DOCUMENT_TYPES } from "@/lib/trip";

const initialCheckIn: CheckInState = { ok: false };
const initialCancel: CancelState = { ok: false };

export function TripActions({
  reservationId,
  canCheckInOnline,
  isRefundable,
  isCancellable,
}: {
  reservationId: string;
  canCheckInOnline: boolean;
  isRefundable: boolean;
  isCancellable: boolean;
}) {
  const [checkInOpen, setCheckInOpen] = useState(false);

  return (
    <div className="space-y-3">
      {canCheckInOnline && !checkInOpen && (
        <button
          type="button"
          onClick={() => setCheckInOpen(true)}
          className="btn-primary w-full text-xs uppercase tracking-[0.2em] py-3"
        >
          Online check-in
        </button>
      )}
      {canCheckInOnline && checkInOpen && (
        <CheckInForm reservationId={reservationId} onCancel={() => setCheckInOpen(false)} />
      )}

      {isCancellable && (
        <CancelTripForm reservationId={reservationId} isRefundable={isRefundable} />
      )}
    </div>
  );
}

// ── Check-in form ───────────────────────────────────────────────────────

function CheckInForm({
  reservationId,
  onCancel,
}: {
  reservationId: string;
  onCancel: () => void;
}) {
  const [state, formAction] = useFormState(checkInAction, initialCheckIn);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onCancel();
    }
  }, [state.ok, onCancel]);

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      className="bg-white border border-ink/15 rounded-sm p-5 space-y-4"
    >
      <input type="hidden" name="reservationId" value={reservationId} />
      <div>
        <h3 className="font-serif text-lg mb-1">Online check-in</h3>
        <p className="text-xs text-ink/55">
          We&apos;ll have your room ready and a digital key waiting on arrival.
        </p>
      </div>
      <Select
        id="documentType"
        name="documentType"
        label="Document type"
        defaultValue=""
        error={state.errors?.documentType}
      >
        <option value="" disabled>—</option>
        {CHECK_IN_DOCUMENT_TYPES.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </Select>
      <Input
        id="documentNumber"
        name="documentNumber"
        label="Document number"
        autoComplete="off"
        error={state.errors?.documentNumber}
      />
      <Input
        id="estimatedArrivalTime"
        name="estimatedArrivalTime"
        label="Estimated arrival time (optional)"
        placeholder="16:30"
        error={state.errors?.estimatedArrivalTime}
      />

      {state.formError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
          {state.formError}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton labelDefault="Confirm check-in" labelPending="Checking in…" />
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-ink/65 hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Cancel-trip form (uses native confirm + a single submit button) ─────

function CancelTripForm({
  reservationId,
  isRefundable,
}: {
  reservationId: string;
  isRefundable: boolean;
}) {
  const [state, formAction] = useFormState(cancelReservationAction, initialCancel);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const ok = confirm(
          isRefundable
            ? "Cancel this reservation? You'll get a full refund."
            : "Cancel this reservation? You may incur a cancellation fee.",
        );
        if (!ok) e.preventDefault();
      }}
      className="border border-ink/10 bg-white rounded-sm p-4 space-y-2"
    >
      <input type="hidden" name="reservationId" value={reservationId} />
      <input type="hidden" name="reason" value="Cancelled from My Trips" />
      <div className="text-xs text-ink/55">
        {isRefundable
          ? "Free cancellation is available for this booking."
          : "A cancellation fee may apply per the rate's policy."}
      </div>
      <SubmitButton
        variant="danger"
        labelDefault="Cancel reservation"
        labelPending="Cancelling…"
      />
      {state.formError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-800 text-xs px-3 py-2">
          {state.formError}
        </div>
      )}
    </form>
  );
}

// ── Form primitives ─────────────────────────────────────────────────────

function Input({
  id,
  name,
  label,
  defaultValue,
  autoComplete,
  placeholder,
  error,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
        {label}
      </span>
      <input
        id={id}
        name={name}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={[
          "w-full border bg-white px-3 py-2 text-sm focus:outline-none",
          error ? "border-red-500 focus:border-red-600" : "border-ink/15 focus:border-goldDeep",
        ].join(" ")}
      />
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

function Select({
  id,
  name,
  label,
  defaultValue,
  error,
  children,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
        {label}
      </span>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className={[
          "w-full border bg-white px-3 py-2 text-sm focus:outline-none",
          error ? "border-red-500 focus:border-red-600" : "border-ink/15 focus:border-goldDeep",
        ].join(" ")}
      >
        {children}
      </select>
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

function SubmitButton({
  labelDefault,
  labelPending,
  variant,
}: {
  labelDefault: string;
  labelPending: string;
  variant?: "danger";
}) {
  const { pending } = useFormStatus();
  const classes =
    variant === "danger"
      ? "w-full text-xs uppercase tracking-[0.2em] py-3 border border-red-700/40 text-red-800 hover:bg-red-50 disabled:opacity-50"
      : "btn-primary w-full text-xs uppercase tracking-[0.2em] py-3 disabled:opacity-50";
  return (
    <button type="submit" disabled={pending} className={classes}>
      {pending ? labelPending : labelDefault}
    </button>
  );
}
