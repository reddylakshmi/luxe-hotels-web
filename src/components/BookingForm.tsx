"use client";

// Master booking form for /hotels/[id]/book.
//
// Owns all form state in a single useReducer-backed object so child
// sections (guest info, payment, requests) can reach into it without
// prop drilling. Validation is handled by pure functions in
// lib/bookingValidation; the form simply collects whatever errors come
// back and renders them inline.
//
// On submit the form posts via a hidden field-only form to a Next.js
// route that creates a booking reference and redirects to the
// confirmation page. We avoid <form action={...}> so the validation can
// short-circuit synchronously without round-tripping the network.

import { useMemo, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES_ALPHABETICAL, findCountry } from "@/lib/countries";
import { hasStateDropdown, statesForCountry } from "@/lib/states";
import {
  cardBrand,
  CARD_MAX_DIGITS,
  countCardDigits,
  formatCardForDisplay,
  validateGuestInformation,
  validatePaymentInformation,
  type GuestInformation,
  type PaymentInformation,
} from "@/lib/bookingValidation";
import { CvvHelper } from "./CvvHelper";

type FormState = {
  guest: GuestInformation;
  payment: PaymentInformation;
  requests: string;
  ada: boolean;
};

type Action =
  | { type: "guest"; field: keyof GuestInformation; value: string }
  | { type: "payment"; field: keyof PaymentInformation; value: string }
  | { type: "requests"; value: string }
  | { type: "ada"; value: boolean };

const blankGuest: GuestInformation = {
  firstName: "", lastName: "", email: "", memberNumber: "",
  phoneCountry: "US", mobile: "",
  country: "US", addressLine1: "", addressLine2: "",
  city: "", state: "", zip: "",
};

const blankPayment: PaymentInformation = {
  cardNumber: "", expiryMonth: "", expiryYear: "", cvv: "", billingZip: "",
};

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case "guest":
      return { ...state, guest: { ...state.guest, [action.field]: action.value } };
    case "payment":
      return { ...state, payment: { ...state.payment, [action.field]: action.value } };
    case "requests":
      return { ...state, requests: action.value };
    case "ada":
      return { ...state, ada: action.value };
    default:
      return state;
  }
}

export function BookingForm({
  bookingHref,
  hotelId,
  rateToken,
  ratePlanCode,
  roomId,
}: {
  bookingHref: string;
  hotelId: string;
  rateToken: string;
  ratePlanCode: string;
  roomId: string;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    guest: blankGuest,
    payment: blankPayment,
    requests: "",
    ada: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const setGuest = (field: keyof GuestInformation, value: string) =>
    dispatch({ type: "guest", field, value });
  const setPayment = (field: keyof PaymentInformation, value: string) =>
    dispatch({ type: "payment", field, value });

  const country = findCountry(state.guest.country);
  const states = useMemo(() => statesForCountry(state.guest.country), [state.guest.country]);
  const stateIsDropdown = hasStateDropdown(state.guest.country);
  const detectedBrand = cardBrand(state.payment.cardNumber);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const guestResult = validateGuestInformation(state.guest);
    const paymentResult = validatePaymentInformation(state.payment);
    const merged: Record<string, string> = {};
    if (!guestResult.ok) Object.assign(merged, prefix(guestResult.errors, "guest."));
    if (!paymentResult.ok) Object.assign(merged, prefix(paymentResult.errors, "payment."));

    if (Object.keys(merged).length > 0) {
      setErrors(merged);
      setSubmitting(false);
      // Scroll to the first invalid field for a11y.
      const firstKey = Object.keys(merged)[0].replace(/^(guest|payment)\./, "");
      requestAnimationFrame(() => {
        document.getElementById(firstKey)?.focus();
      });
      return;
    }

    setErrors({});
    // For the demo we generate the reference client-side and pass to the
    // confirmation page via URL. A real flow would POST to a server action.
    const ref = generateBookingReference();
    const params = new URLSearchParams({
      ref,
      rateToken,
      ratePlanCode,
      roomId,
      firstName: state.guest.firstName,
      lastName: state.guest.lastName,
      email: state.guest.email,
    });
    router.push(`/hotels/${hotelId}/book/confirmation?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* ── Sign-in shortcut ──────────────────────────────────────── */}
      <a
        id="sign-in"
        href="#sign-in"
        className="inline-block mb-6 text-sm text-goldDeep underline hover:no-underline"
      >
        Sign in for faster booking →
      </a>

      {/* ── Guest information ────────────────────────────────────── */}
      <Section title="Guest Information" subtitle="All fields are required unless otherwise stated.">
        <Grid>
          <Field id="firstName" label="First Name" error={errors["guest.firstName"]}>
            <input
              id="firstName"
              autoComplete="given-name"
              value={state.guest.firstName}
              onChange={(e) => setGuest("firstName", e.target.value)}
              className={inputCls(errors["guest.firstName"])}
            />
          </Field>
          <Field id="lastName" label="Last Name" error={errors["guest.lastName"]}>
            <input
              id="lastName"
              autoComplete="family-name"
              value={state.guest.lastName}
              onChange={(e) => setGuest("lastName", e.target.value)}
              className={inputCls(errors["guest.lastName"])}
            />
          </Field>

          <Field id="email" label="Email" error={errors["guest.email"]} className="md:col-span-2">
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={state.guest.email}
              onChange={(e) => setGuest("email", e.target.value)}
              className={inputCls(errors["guest.email"])}
            />
          </Field>

          <Field id="memberNumber" label="Member Number" optional error={errors["guest.memberNumber"]}>
            <input
              id="memberNumber"
              value={state.guest.memberNumber ?? ""}
              onChange={(e) => setGuest("memberNumber", e.target.value)}
              className={inputCls(errors["guest.memberNumber"])}
            />
          </Field>

          <Field id="mobile" label="Mobile" error={errors["guest.mobile"]}>
            <div className="flex gap-2">
              <span className="px-3 py-2 text-sm bg-ink/5 border border-ink/15 whitespace-nowrap">
                {country?.phoneCode ?? "+1"}
              </span>
              <input
                id="mobile"
                inputMode="tel"
                autoComplete="tel-national"
                value={state.guest.mobile}
                onChange={(e) => setGuest("mobile", e.target.value)}
                className={inputCls(errors["guest.mobile"]) + " flex-1"}
              />
            </div>
          </Field>

          <Field id="country" label="Country" error={errors["guest.country"]} className="md:col-span-2">
            <select
              id="country"
              autoComplete="country"
              value={state.guest.country}
              onChange={(e) => {
                setGuest("country", e.target.value);
                // Reset state when country changes — old value won't be valid.
                setGuest("state", "");
              }}
              className={inputCls(errors["guest.country"])}
            >
              {COUNTRIES_ALPHABETICAL.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field id="addressLine1" label="Address Line 1" error={errors["guest.addressLine1"]} className="md:col-span-2">
            <input
              id="addressLine1"
              autoComplete="address-line1"
              value={state.guest.addressLine1}
              onChange={(e) => setGuest("addressLine1", e.target.value)}
              className={inputCls(errors["guest.addressLine1"])}
            />
          </Field>

          <Field
            id="addressLine2"
            label="Address Line 2"
            optional
            error={errors["guest.addressLine2"]}
            className="md:col-span-2"
          >
            <input
              id="addressLine2"
              autoComplete="address-line2"
              value={state.guest.addressLine2 ?? ""}
              onChange={(e) => setGuest("addressLine2", e.target.value)}
              className={inputCls(errors["guest.addressLine2"])}
            />
          </Field>

          <Field id="city" label="City" error={errors["guest.city"]}>
            <input
              id="city"
              autoComplete="address-level2"
              value={state.guest.city}
              onChange={(e) => setGuest("city", e.target.value)}
              className={inputCls(errors["guest.city"])}
            />
          </Field>

          <Field id="state" label="State" error={errors["guest.state"]} optional={!stateIsDropdown}>
            {stateIsDropdown ? (
              <select
                id="state"
                autoComplete="address-level1"
                value={state.guest.state}
                onChange={(e) => setGuest("state", e.target.value)}
                className={inputCls(errors["guest.state"])}
              >
                <option value="">— Select —</option>
                {states.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="state"
                autoComplete="address-level1"
                value={state.guest.state}
                onChange={(e) => setGuest("state", e.target.value)}
                className={inputCls(errors["guest.state"])}
                placeholder="State / Region (optional)"
              />
            )}
          </Field>

          <Field id="zip" label="Zip Code" error={errors["guest.zip"]}>
            <input
              id="zip"
              autoComplete="postal-code"
              value={state.guest.zip}
              onChange={(e) => setGuest("zip", e.target.value)}
              className={inputCls(errors["guest.zip"])}
            />
          </Field>
        </Grid>
      </Section>

      {/* ── Payment information ──────────────────────────────────── */}
      <Section
        title="Payment Information"
        subtitle="A valid form of payment must be presented at check-in."
      >
        <p className="text-sm text-ink/70 mb-4">Pay Using Credit / Debit Card</p>
        <Grid>
          <Field
            id="cardNumber"
            label="Card Number"
            error={errors["payment.cardNumber"]}
            className="md:col-span-2"
            adornment={
              <span className="flex items-center gap-2">
                <span className="text-ink/45 lowercase tracking-normal">
                  {countCardDigits(state.payment.cardNumber)}/{CARD_MAX_DIGITS} digits
                </span>
                {detectedBrand && <BrandTag brand={detectedBrand} />}
              </span>
            }
          >
            <input
              id="cardNumber"
              inputMode="numeric"
              autoComplete="cc-number"
              // 19 digits + 3 spaces between groups of 4 (worst-case Visa/MC).
              // The actual cap on digits is enforced inside formatCardForDisplay.
              maxLength={CARD_MAX_DIGITS + 4}
              value={state.payment.cardNumber}
              onChange={(e) => setPayment("cardNumber", formatCardForDisplay(e.target.value))}
              className={inputCls(errors["payment.cardNumber"])}
              placeholder="•••• •••• •••• ••••"
            />
          </Field>

          <Field id="expiryMonth" label="Expiry Month" error={errors["payment.expiryMonth"]}>
            <select
              id="expiryMonth"
              autoComplete="cc-exp-month"
              value={state.payment.expiryMonth}
              onChange={(e) => setPayment("expiryMonth", e.target.value)}
              className={inputCls(errors["payment.expiryMonth"])}
            >
              <option value="">MM</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m).padStart(2, "0")}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>
          </Field>

          <Field id="expiryYear" label="Expiry Year" error={errors["payment.expiryYear"]}>
            <select
              id="expiryYear"
              autoComplete="cc-exp-year"
              value={state.payment.expiryYear}
              onChange={(e) => setPayment("expiryYear", e.target.value)}
              className={inputCls(errors["payment.expiryYear"])}
            >
              <option value="">YYYY</option>
              {expiryYears().map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="cvv"
            label="CVV"
            error={errors["payment.cvv"]}
            adornment={<CvvHelper />}
          >
            <input
              id="cvv"
              inputMode="numeric"
              autoComplete="cc-csc"
              maxLength={4}
              value={state.payment.cvv}
              onChange={(e) => setPayment("cvv", e.target.value.replace(/[^\d]/g, ""))}
              className={inputCls(errors["payment.cvv"])}
              placeholder={detectedBrand === "AMEX" ? "1234" : "123"}
            />
          </Field>

          <Field id="billingZip" label="Billing Zip Code" error={errors["payment.billingZip"]}>
            <input
              id="billingZip"
              autoComplete="postal-code"
              value={state.payment.billingZip}
              onChange={(e) => setPayment("billingZip", e.target.value)}
              className={inputCls(errors["payment.billingZip"])}
            />
          </Field>
        </Grid>
      </Section>

      {/* ── Room requests + accessibility ────────────────────────── */}
      <Section title="Room Requests and Accessibility">
        <p className="text-sm text-ink/70 mb-3">
          <strong>Please note Room 1:</strong> Non-commissionable rate.
        </p>
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={state.ada}
            onChange={(e) => dispatch({ type: "ada", value: e.target.checked })}
            className="w-4 h-4 accent-goldDeep"
          />
          <span className="text-sm">I require an accessible (ADA) room.</span>
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
            Special Requests (optional)
          </span>
          <textarea
            value={state.requests}
            onChange={(e) => dispatch({ type: "requests", value: e.target.value })}
            rows={4}
            placeholder="High floor, away from elevator, etc. We'll do our best to accommodate."
            className="w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-goldDeep"
            maxLength={500}
          />
        </label>
      </Section>

      {/* ── Submit ───────────────────────────────────────────────── */}
      <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <p className="text-xs text-ink/60 max-w-md">
          By selecting <strong>Book Now</strong>, I agree to the booking terms and the
          hotel&rsquo;s cancellation policy.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary px-8 py-3 disabled:opacity-50"
        >
          {submitting ? "Booking…" : "Book Now"}
        </button>
      </div>

      {/* ── Hidden context for analytics / form-data submission ── */}
      <input type="hidden" name="rateToken" value={rateToken} />
      <input type="hidden" name="ratePlanCode" value={ratePlanCode} />
      <input type="hidden" name="bookingHref" value={bookingHref} />
    </form>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function generateBookingReference(): string {
  const alpha = "ABCDEFGHIJKLMNPQRSTUVWXYZ";
  const digits = "0123456789";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  return Array.from({ length: 3 }, () => pick(alpha)).join("") +
         Array.from({ length: 6 }, () => pick(digits)).join("");
}

function expiryYears(): number[] {
  const start = new Date().getFullYear();
  return Array.from({ length: 15 }, (_, i) => start + i);
}

function prefix(errors: Record<string, string>, p: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errors)) out[`${p}${k}`] = v;
  return out;
}

function inputCls(error?: string): string {
  return [
    "w-full border bg-white px-3 py-2 text-sm focus:outline-none",
    error ? "border-red-500 focus:border-red-600" : "border-ink/15 focus:border-goldDeep",
  ].join(" ");
}

// ── Layout primitives ────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-ink/10 bg-white p-6 md:p-8 mb-6">
      <h2 className="font-serif text-2xl mb-1">{title}</h2>
      {subtitle && <p className="text-sm text-ink/60 mb-6">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({
  id,
  label,
  optional,
  error,
  className,
  adornment,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  className?: string;
  adornment?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className={`block ${className ?? ""}`}>
      <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
        {label}
        {optional && <span className="lowercase tracking-normal text-ink/45">(optional)</span>}
        {adornment && <span className="ml-auto">{adornment}</span>}
      </span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

function BrandTag({ brand }: { brand: "VISA" | "MC" | "AMEX" | "DISCOVER" }) {
  return (
    <span className="text-[10px] tracking-widest text-ink/65 px-2 py-0.5 border border-ink/15 rounded-sm">
      {brand}
    </span>
  );
}
