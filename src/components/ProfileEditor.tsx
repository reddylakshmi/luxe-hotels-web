"use client";

// Profile section with an inline-revealable edit form. The form posts to
// updateProfileAction (server action), which validates with the same pure
// helpers exercised by lib/account.test.ts and revalidates /account on
// success — no client-side data store, just RSC + Server Actions.
//
// Schema-supported edits: phone, dateOfBirth, nationality. Name + email
// + locale prefs aren't exposed by updateGuestProfile, so we render them
// as immutable display fields.

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { GuestProfile } from "@/types/graphql";
import { updateProfileAction, type UpdateProfileState } from "@/lib/accountActions";
import { Section, Field } from "./AccountSections";
import { COUNTRIES_ALPHABETICAL } from "@/lib/countries";

const initialState: UpdateProfileState = { ok: false };

export function ProfileEditor({ guest }: { guest: GuestProfile }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updateProfileAction, initialState);

  // When the action returns ok, snap back to display mode. The page is
  // already revalidated server-side so the new values flow in on the
  // next render.
  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state.ok]);

  return (
    <Section
      id="profile"
      title="Profile"
      description={editing ? "Update your contact details." : "Your account essentials."}
      action={
        !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-goldDeep hover:underline whitespace-nowrap"
          >
            Edit
          </button>
        ) : null
      }
    >
      {editing ? (
        <ProfileForm guest={guest} state={state} action={formAction} onCancel={() => setEditing(false)} />
      ) : (
        <ProfileDisplay guest={guest} />
      )}
    </Section>
  );
}

// ── Display ──────────────────────────────────────────────────────────────

function ProfileDisplay({ guest }: { guest: GuestProfile }) {
  const fullName = [guest.name.title, guest.name.firstName, guest.name.lastName]
    .filter(Boolean)
    .join(" ");
  const dob = guest.dateOfBirth
    ? new Date(guest.dateOfBirth).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";

  return (
    <dl>
      <Field label="Name" value={fullName || "—"} />
      <Field label="Email" value={guest.email} />
      <Field label="Phone" value={guest.phone || "—"} />
      <Field label="Date of birth" value={dob} />
      <Field label="Nationality" value={guest.nationality || "—"} />
      <Field label="Language" value={guest.languagePreference?.toUpperCase() || "—"} />
      <Field label="Currency" value={guest.currencyPreference || "—"} />
      <Field
        label="Loyalty number"
        value={guest.externalIds?.loyaltyNumber || "Not enrolled"}
      />
    </dl>
  );
}

// ── Edit form ────────────────────────────────────────────────────────────

function ProfileForm({
  guest,
  state,
  action,
  onCancel,
}: {
  guest: GuestProfile;
  state: UpdateProfileState;
  action: (formData: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form action={action} noValidate className="px-6 py-5 space-y-5">
      <Input
        id="phone"
        name="phone"
        label="Phone"
        type="tel"
        defaultValue={guest.phone ?? ""}
        autoComplete="tel"
        placeholder="+1-415-555-0101"
        error={state.errors?.phone}
      />
      <Input
        id="dateOfBirth"
        name="dateOfBirth"
        label="Date of birth"
        type="date"
        defaultValue={guest.dateOfBirth ?? ""}
        error={state.errors?.dateOfBirth}
      />
      <Select
        id="nationality"
        name="nationality"
        label="Nationality"
        defaultValue={guest.nationality ?? ""}
        error={state.errors?.nationality}
      >
        <option value="">—</option>
        {COUNTRIES_ALPHABETICAL.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name} ({c.code})
          </option>
        ))}
      </Select>

      {state.formError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
          {state.formError}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <SaveButton />
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-ink/65 hover:text-ink"
        >
          Cancel
        </button>
        <p className="text-xs text-ink/45 ml-auto">
          Name + email aren&apos;t self-serve yet. Contact concierge to update.
        </p>
      </div>
    </form>
  );
}

// ── Form primitives ──────────────────────────────────────────────────────

function Input({
  id,
  name,
  label,
  type = "text",
  defaultValue,
  autoComplete,
  placeholder,
  error,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
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
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={[
          "w-full max-w-md border bg-white px-3 py-2 text-sm focus:outline-none",
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
          "w-full max-w-md border bg-white px-3 py-2 text-sm focus:outline-none",
          error ? "border-red-500 focus:border-red-600" : "border-ink/15 focus:border-goldDeep",
        ].join(" ")}
      >
        {children}
      </select>
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary px-6 py-2 disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}
