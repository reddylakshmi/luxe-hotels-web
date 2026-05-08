"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { findTripAction, type FindTripState } from "@/lib/tripsActions";
import { TripCard } from "./TripCard";

const initialState: FindTripState = { ok: false };

export function FindReservationForm() {
  const [state, formAction] = useFormState(findTripAction, initialState);

  return (
    <>
      <form
        action={formAction}
        noValidate
        className="grid md:grid-cols-[2fr_1fr_auto] gap-3 items-end"
      >
        <Field
          id="confirmationNumber"
          name="confirmationNumber"
          label="Confirmation Number"
          placeholder="LUX-2025-100001"
          required
        />
        <Field
          id="lastName"
          name="lastName"
          label="Last Name"
          placeholder="Optional"
        />
        <SubmitButton />
      </form>

      {state.error && !state.reservation && (
        <div role="alert" className="mt-6 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3">
          {state.error}
        </div>
      )}
      {state.formError && (
        <div role="alert" className="mt-6 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3">
          {state.formError}
        </div>
      )}

      {state.reservation && (
        <div className="mt-8">
          <div className="eyebrow mb-3">Found</div>
          <TripCard reservation={state.reservation} />
        </div>
      )}

      <p className="mt-8 text-sm text-ink/60">
        Or{" "}
        <Link href="/sign-in" className="text-goldDeep underline hover:no-underline">
          sign in
        </Link>{" "}
        to see all of your trips at once.
      </p>
    </>
  );
}

function Field({
  id,
  name,
  label,
  placeholder,
  required,
}: {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
        {label}
      </span>
      <input
        id={id}
        name={name}
        type="text"
        placeholder={placeholder}
        required={required}
        className="w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-goldDeep"
      />
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary px-6 py-2 text-sm disabled:opacity-50">
      {pending ? "Looking up…" : "Find Trip"}
    </button>
  );
}
