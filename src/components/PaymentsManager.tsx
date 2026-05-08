"use client";

// Payment-methods section with three edit affordances:
//   • Add a card  (collapsing inline form, posted to addPaymentAction)
//   • Set as default per row (server action — no client state needed)
//   • Remove per row (server action with a confirm())
//
// We keep one piece of client state — whether the add-card form is open.
// Per-row buttons are plain <form> elements that submit to server
// actions, so they work without JS too.

import { useState, useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { PaymentMethodSummary } from "@/types/graphql";
import {
  addPaymentAction,
  removePaymentAction,
  setDefaultPaymentAction,
  type AddCardState,
} from "@/lib/accountActions";
import {
  formatCardExpiry,
  isCardExpired,
  paymentLabel,
  sortPrimaryFirst,
} from "@/lib/account";
import { Section, EmptyState } from "./AccountSections";

const initialState: AddCardState = { ok: false };

export function PaymentsManager({ payments }: { payments: PaymentMethodSummary[] }) {
  const ordered = sortPrimaryFirst(payments);
  const [adding, setAdding] = useState(false);
  const description =
    ordered.length === 0
      ? "Save a card to check out faster."
      : `${ordered.length} on file.`;

  return (
    <Section
      id="payment"
      title="Payment methods"
      description={description}
      action={
        !adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-sm text-goldDeep hover:underline whitespace-nowrap"
          >
            + Add a card
          </button>
        ) : null
      }
    >
      {adding && <AddCardForm onDone={() => setAdding(false)} />}

      {ordered.length === 0 && !adding ? (
        <EmptyState message="No payment methods saved yet." />
      ) : (
        <ul>
          {ordered.map((p) => (
            <PaymentRow key={p.id} payment={p} />
          ))}
        </ul>
      )}
    </Section>
  );
}

// ── Row with inline server-action forms for default/remove ───────────────

function PaymentRow({ payment }: { payment: PaymentMethodSummary }) {
  const expired = isCardExpired(payment.expiryMonth, payment.expiryYear);
  return (
    <li className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 px-6 py-4 border-b border-ink/8 last:border-0">
      <div className="text-sm text-ink/90 sm:w-60 sm:shrink-0 flex items-center gap-2">
        <span className="font-medium">{paymentLabel(payment.brand, payment.lastFour)}</span>
        {payment.isDefault && (
          <span className="inline-block px-1.5 py-0.5 text-[10px] tracking-[0.14em] bg-goldDeep/15 text-goldDeep rounded-sm">
            DEFAULT
          </span>
        )}
      </div>
      <div className="text-sm text-ink/70 flex items-baseline gap-3 flex-1">
        <span>{payment.holderName}</span>
        <span aria-hidden className="text-ink/30">·</span>
        <span className={expired ? "text-red-700" : ""}>
          {expired ? "Expired " : "Expires "}
          {formatCardExpiry(payment.expiryMonth, payment.expiryYear)}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        {!payment.isDefault && (
          <form action={setDefaultPaymentAction}>
            <input type="hidden" name="paymentMethodId" value={payment.id} />
            <RowButton variant="link">Set as default</RowButton>
          </form>
        )}
        <form
          action={removePaymentAction}
          onSubmit={(e) => {
            if (!confirm(`Remove ${paymentLabel(payment.brand, payment.lastFour)}?`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="paymentMethodId" value={payment.id} />
          <RowButton variant="danger">Remove</RowButton>
        </form>
      </div>
    </li>
  );
}

function RowButton({
  variant,
  children,
}: {
  variant: "link" | "danger";
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  const cls =
    variant === "danger"
      ? "text-red-700 hover:underline disabled:opacity-50"
      : "text-goldDeep hover:underline disabled:opacity-50";
  return (
    <button type="submit" disabled={pending} className={cls}>
      {pending ? "…" : children}
    </button>
  );
}

// ── Add-card collapsible form ────────────────────────────────────────────

function AddCardForm({ onDone }: { onDone: () => void }) {
  const [state, formAction] = useFormState(addPaymentAction, initialState);
  const formRef = useRef<HTMLFormElement | null>(null);

  // On a successful add the page revalidates server-side; collapse the form.
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
      className="px-6 py-5 border-b border-ink/8 bg-cream/30 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CardInput
          id="holderName"
          name="holderName"
          label="Cardholder name"
          autoComplete="cc-name"
          error={state.errors?.holderName}
        />
        <CardInput
          id="cardNumber"
          name="cardNumber"
          label="Card number"
          autoComplete="cc-number"
          inputMode="numeric"
          placeholder="4242 4242 4242 4242"
          error={state.errors?.cardNumber}
        />
        <CardInput
          id="expiry"
          name="expiry"
          label="Expiry (MM/YY)"
          autoComplete="cc-exp"
          inputMode="numeric"
          placeholder="12/26"
          error={state.errors?.expiry}
        />
        <label className="flex items-end gap-2 pb-2 sm:pb-3">
          <input id="setDefault" name="setDefault" type="checkbox" className="accent-goldDeep" />
          <span className="text-sm text-ink/80">Set as default</span>
        </label>
      </div>

      {state.formError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
          {state.formError}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <SaveCardButton />
        <button
          type="button"
          onClick={onDone}
          className="text-sm text-ink/65 hover:text-ink"
        >
          Cancel
        </button>
        <p className="text-xs text-ink/45 ml-auto">
          Demo only — never enter a real card number.
        </p>
      </div>
    </form>
  );
}

function CardInput({
  id,
  name,
  label,
  autoComplete,
  inputMode,
  placeholder,
  error,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text";
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
        autoComplete={autoComplete}
        inputMode={inputMode}
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

function SaveCardButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary px-6 py-2 disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save card"}
    </button>
  );
}
