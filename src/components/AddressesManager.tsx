"use client";

// Addresses section with full CRUD: add a new address, edit any row, set
// the primary, remove a row. Symmetry with PaymentsManager — one piece
// of client state ("formMode": null | "add" | { edit: id }) decides
// whether the form is shown and what data prefills it. Per-row buttons
// for Set as primary / Remove are plain <form> elements posting to
// server actions, so they work without JS.

import { useState, useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { GuestAddress } from "@/types/graphql";
import {
  addAddressAction,
  updateAddressAction,
  removeAddressAction,
  setPrimaryAddressAction,
  type AddressFormState,
} from "@/lib/accountActions";
import {
  ADDRESS_TYPES,
  addressLabel,
  formatAddressLine,
  sortPrimaryFirst,
} from "@/lib/account";
import { COUNTRIES_ALPHABETICAL } from "@/lib/countries";
import { Section, EmptyState } from "./AccountSections";

type FormMode = null | { kind: "add" } | { kind: "edit"; id: string };
const initialState: AddressFormState = { ok: false };

export function AddressesManager({ addresses }: { addresses: GuestAddress[] }) {
  const ordered = sortPrimaryFirst(addresses);
  const [mode, setMode] = useState<FormMode>(null);
  const description =
    ordered.length === 0
      ? "Save an address to speed up future bookings."
      : `${ordered.length} on file.`;

  return (
    <Section
      id="addresses"
      title="Addresses"
      description={description}
      action={
        mode === null ? (
          <button
            type="button"
            onClick={() => setMode({ kind: "add" })}
            className="text-sm text-goldDeep hover:underline whitespace-nowrap"
          >
            + Add an address
          </button>
        ) : null
      }
    >
      {mode?.kind === "add" && <AddressForm onDone={() => setMode(null)} />}

      {ordered.length === 0 && mode?.kind !== "add" ? (
        <EmptyState message="No addresses on file yet." />
      ) : (
        <ul>
          {ordered.map((a) =>
            mode?.kind === "edit" && mode.id === a.id ? (
              <li
                key={a.id}
                className="border-b border-ink/8 last:border-0 bg-cream/30"
              >
                <AddressForm initial={a} onDone={() => setMode(null)} />
              </li>
            ) : (
              <AddressRow
                key={a.id}
                address={a}
                disabled={mode !== null}
                onEdit={() => setMode({ kind: "edit", id: a.id })}
              />
            ),
          )}
        </ul>
      )}
    </Section>
  );
}

// ── Display row with per-row server-action forms ─────────────────────────

function AddressRow({
  address,
  disabled,
  onEdit,
}: {
  address: GuestAddress;
  disabled: boolean;
  onEdit: () => void;
}) {
  return (
    <li className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 px-6 py-4 border-b border-ink/8 last:border-0">
      <div className="text-xs uppercase tracking-[0.18em] text-ink/55 sm:w-44 sm:shrink-0 flex items-center gap-2">
        <span>{addressLabel(address.type)}</span>
        {address.isPrimary && (
          <span className="inline-block px-1.5 py-0.5 text-[10px] tracking-[0.14em] bg-goldDeep/15 text-goldDeep rounded-sm">
            PRIMARY
          </span>
        )}
      </div>
      <div className="text-sm text-ink/90 flex-1">{formatAddressLine(address)}</div>
      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          className="text-goldDeep hover:underline disabled:opacity-40"
        >
          Edit
        </button>
        {!address.isPrimary && (
          <form action={setPrimaryAddressAction}>
            <input type="hidden" name="addressId" value={address.id} />
            <RowButton variant="link" disabled={disabled}>Set as primary</RowButton>
          </form>
        )}
        <form
          action={removeAddressAction}
          onSubmit={(e) => {
            const ok = confirm(`Remove ${addressLabel(address.type)} address?`);
            if (!ok) e.preventDefault();
          }}
        >
          <input type="hidden" name="addressId" value={address.id} />
          <RowButton variant="danger" disabled={disabled}>Remove</RowButton>
        </form>
      </div>
    </li>
  );
}

function RowButton({
  variant,
  children,
  disabled,
}: {
  variant: "link" | "danger";
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const cls =
    variant === "danger"
      ? "text-red-700 hover:underline disabled:opacity-40"
      : "text-goldDeep hover:underline disabled:opacity-40";
  return (
    <button type="submit" disabled={pending || disabled} className={cls}>
      {pending ? "…" : children}
    </button>
  );
}

// ── Add / edit form (shared) ─────────────────────────────────────────────

function AddressForm({
  initial,
  onDone,
}: {
  initial?: GuestAddress;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState(
    initial ? updateAddressAction : addAddressAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onDone();
    }
  }, [state.ok, onDone]);

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      className="px-6 py-5 space-y-4"
    >
      {initial && <input type="hidden" name="addressId" value={initial.id} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldSelect
          id="type"
          name="type"
          label="Type"
          defaultValue={initial?.type ?? "HOME"}
          error={state.errors?.type}
        >
          {ADDRESS_TYPES.map((t) => (
            <option key={t} value={t}>
              {addressLabel(t)}
            </option>
          ))}
        </FieldSelect>
        <FieldInput
          id="line1"
          name="line1"
          label="Street address"
          defaultValue={initial?.line1 ?? ""}
          autoComplete="address-line1"
          error={state.errors?.line1}
        />
        <FieldInput
          id="line2"
          name="line2"
          label="Apt / suite (optional)"
          defaultValue={initial?.line2 ?? ""}
          autoComplete="address-line2"
        />
        <FieldInput
          id="city"
          name="city"
          label="City"
          defaultValue={initial?.city ?? ""}
          autoComplete="address-level2"
          error={state.errors?.city}
        />
        <FieldInput
          id="stateCode"
          name="stateCode"
          label="State / region (optional)"
          defaultValue={initial?.stateCode ?? ""}
          autoComplete="address-level1"
        />
        <FieldInput
          id="postalCode"
          name="postalCode"
          label="Postal code (optional)"
          defaultValue={initial?.postalCode ?? ""}
          autoComplete="postal-code"
        />
        <FieldSelect
          id="countryCode"
          name="countryCode"
          label="Country"
          defaultValue={initial?.countryCode ?? "US"}
          autoComplete="country"
          error={state.errors?.countryCode}
        >
          {COUNTRIES_ALPHABETICAL.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.code})
            </option>
          ))}
        </FieldSelect>
        <label className="flex items-end gap-2 pb-2 sm:pb-3">
          <input
            id="isPrimary"
            name="isPrimary"
            type="checkbox"
            defaultChecked={initial?.isPrimary ?? false}
            disabled={initial?.isPrimary ?? false}
            className="accent-goldDeep"
          />
          <span className="text-sm text-ink/80">
            {initial?.isPrimary ? "Primary address" : "Set as primary"}
          </span>
        </label>
      </div>

      {state.formError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
          {state.formError}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <SaveButton editing={Boolean(initial)} />
        <button
          type="button"
          onClick={onDone}
          className="text-sm text-ink/65 hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function FieldInput({
  id,
  name,
  label,
  defaultValue,
  autoComplete,
  error,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  autoComplete?: string;
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
        className={[
          "w-full border bg-white px-3 py-2 text-sm focus:outline-none",
          error ? "border-red-500 focus:border-red-600" : "border-ink/15 focus:border-goldDeep",
        ].join(" ")}
      />
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

function FieldSelect({
  id,
  name,
  label,
  defaultValue,
  autoComplete,
  error,
  children,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  autoComplete?: string;
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
        autoComplete={autoComplete}
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

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary px-6 py-2 disabled:opacity-50"
    >
      {pending ? "Saving…" : editing ? "Save changes" : "Save address"}
    </button>
  );
}
