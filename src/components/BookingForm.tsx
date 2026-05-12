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

import { useEffect, useMemo, useReducer, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { BookingPointsPanel } from "./BookingPointsPanel";
import { clampPointsRedemption } from "@/lib/loyalty";
import { createReservationAction } from "@/lib/bookingActions";
import {
  defaultAddressId,
  defaultPaymentMethodId,
  isManualAddress,
  isManualPayment,
  MANUAL_ADDRESS_ID,
  MANUAL_PAYMENT_ID,
  summariseAddress,
  summarisePaymentMethod,
  type SavedAddress,
} from "@/lib/savedPicker";
import type { SavedPaymentMethod } from "@/app/hotels/[id]/book/page";

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

/**
 * Merge whatever pre-fill data the page passed in (signed-in guest's
 * profile) on top of the blank shape. Missing fields fall through to the
 * blank defaults so partial profiles never blow up the form.
 */
function buildInitialGuest(prefill?: Partial<GuestInformation>): GuestInformation {
  return { ...blankGuest, ...(prefill ?? {}) };
}

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
  roomTypeId,
  rateToken,
  ratePlanCode,
  roomId,
  checkIn,
  checkOut,
  adults,
  children,
  prefillGuest,
  signedInLabel,
  savedAddresses = [],
  savedPaymentMethods = [],
  loyalty = null,
  bookingTotalUSD = 0,
  bookingCurrency = "USD",
  pointsToRedeem: pointsToRedeemProp,
  onPointsChange,
}: {
  bookingHref: string;
  hotelId: string;
  /** Federated roomType.id — distinct from the URL's roomId param when
   *  the rate-list page used a different identifier; passed through to
   *  the createReservation mutation. */
  roomTypeId: string;
  rateToken: string;
  ratePlanCode: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  /** Pre-fill values seeded from the signed-in guest's profile. */
  prefillGuest?: Partial<GuestInformation>;
  /** Optional banner shown above the form when prefill came from a session. */
  signedInLabel?: string;
  /** Saved addresses on the guest's profile — drives the address picker. */
  savedAddresses?: SavedAddress[];
  /** Saved payment methods on the guest's profile — drives the card picker. */
  savedPaymentMethods?: SavedPaymentMethod[];
  /** Loyalty snapshot enabling the "Redeem points" panel. Null when the
   *  guest isn't enrolled or when the panel shouldn't render. */
  loyalty?: { loyaltyNumber: string; available: number } | null;
  /** Booking total expressed in USD (or near-USD equivalent) for the
   *  redemption cap. The panel uses this to refuse over-redemption. */
  bookingTotalUSD?: number;
  /** Native currency the booking is charged in — drives the disclaimer
   *  on the points-redemption preview when it isn't USD. */
  bookingCurrency?: string;
  /** Optional controlled value for the points panel — pass alongside
   *  onPointsChange to lift the redemption state into a parent so the
   *  sticky summary can react to it. Falls back to internal state when
   *  omitted. */
  pointsToRedeem?: number;
  onPointsChange?: (next: number) => void;
}) {
  const router = useRouter();
  // Build a returnTo for the "Sign in for faster booking" link so the
  // signed-in guest lands back on this exact booking URL with the rate
  // token + selected room intact.
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = `${pathname}${
    searchParams && searchParams.toString().length > 0 ? `?${searchParams.toString()}` : ""
  }`;
  const signInHref = `/sign-in?returnTo=${encodeURIComponent(currentUrl)}`;

  const [state, dispatch] = useReducer(reducer, {
    guest: buildInitialGuest(prefillGuest),
    payment: blankPayment,
    requests: "",
    ada: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Address + payment selectors — when the signed-in guest has saved
  // entries, default to one of them; "manual" sentinel switches the
  // section back to the freeform input fields.
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    () => defaultAddressId(savedAddresses),
  );
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>(
    () => defaultPaymentMethodId(savedPaymentMethods),
  );
  const usingSavedAddress = !isManualAddress(selectedAddressId);
  const usingSavedPayment = !isManualPayment(selectedPaymentId);
  const selectedAddress = savedAddresses.find((a) => a.id === selectedAddressId);
  const selectedPayment = savedPaymentMethods.find((p) => p.id === selectedPaymentId);

  // When the guest picks a saved address, mirror its fields into the
  // form state so the validation + submit-side carry the right values.
  // Wrapped in useEffect so it only runs on actual selection changes.
  useEffect(() => {
    if (!selectedAddress) return;
    setGuest("country", selectedAddress.countryCode);
    setGuest("addressLine1", selectedAddress.line1);
    setGuest("addressLine2", selectedAddress.line2 ?? "");
    setGuest("city", selectedAddress.city);
    setGuest("state", selectedAddress.stateCode ?? "");
    setGuest("zip", selectedAddress.postalCode ?? "");
    // setGuest is stable (dispatch) — no exhaustive-deps issue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddressId]);
  const [submitting, setSubmitting] = useState(false);
  // Controlled when a parent passes pointsToRedeem + onPointsChange,
  // uncontrolled (own state) otherwise. Both branches still re-clamp
  // when balance / booking total move so a stale higher value can't
  // survive a price refresh.
  const [internalPoints, setInternalPoints] = useState(0);
  const isControlled = pointsToRedeemProp != null && !!onPointsChange;
  const pointsToRedeem = isControlled ? pointsToRedeemProp! : internalPoints;
  const setPointsToRedeem = (next: number) => {
    if (isControlled) onPointsChange!(next);
    else setInternalPoints(next);
  };
  useEffect(() => {
    if (!loyalty) return;
    const clamped = clampPointsRedemption(pointsToRedeem, loyalty.available, bookingTotalUSD);
    if (clamped !== pointsToRedeem) setPointsToRedeem(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loyalty, bookingTotalUSD, pointsToRedeem]);

  const setGuest = (field: keyof GuestInformation, value: string) =>
    dispatch({ type: "guest", field, value });
  const setPayment = (field: keyof PaymentInformation, value: string) =>
    dispatch({ type: "payment", field, value });

  const country = findCountry(state.guest.country);
  const states = useMemo(() => statesForCountry(state.guest.country), [state.guest.country]);
  const stateIsDropdown = hasStateDropdown(state.guest.country);
  const detectedBrand = cardBrand(state.payment.cardNumber);

  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const guestResult = validateGuestInformation(state.guest);
    const merged: Record<string, string> = {};
    if (!guestResult.ok) Object.assign(merged, prefix(guestResult.errors, "guest."));
    // Validate payment fields only when the guest is entering a new card.
    // A saved card is already trusted on the guest's profile; no inline
    // re-entry needed.
    if (!usingSavedPayment) {
      const paymentResult = validatePaymentInformation(state.payment);
      if (!paymentResult.ok) Object.assign(merged, prefix(paymentResult.errors, "payment."));
    }

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

    // Hand off to the federated createReservation mutation. The server
    // action carries the guest's bearer token (when signed in), mints a
    // fresh idempotency UUID, and returns the canonical confirmation
    // number — which we hand to the confirmation page via URL.
    const result = await createReservationAction({
      hotelId,
      roomTypeId,
      rateToken,
      checkIn,
      checkOut,
      adults,
      children: children > 0 ? children : undefined,
      specialRequests: state.requests.trim()
        ? [{ category: "OTHER", request: state.requests.trim() }]
        : undefined,
      loyaltyNumber: loyalty?.loyaltyNumber || state.guest.memberNumber || null,
      pointsToRedeem: pointsToRedeem > 0 ? pointsToRedeem : null,
    });

    if (!result.ok) {
      setSubmitting(false);
      setFormError(result.formError);
      // Surface field errors when the resolver returned them — prefixing
      // with "guest." since CreateReservationInput maps to those slots.
      if (result.fieldErrors?.length) {
        const fieldMap: Record<string, string> = {};
        for (const fe of result.fieldErrors) fieldMap[`guest.${fe.field}`] = fe.message;
        setErrors(fieldMap);
      }
      return;
    }

    const params = new URLSearchParams({
      ref: result.confirmationNumber,
      rateToken,
      ratePlanCode,
      roomId,
      firstName: state.guest.firstName,
      lastName: state.guest.lastName,
      email: state.guest.email,
    });
    if (result.pointsRedeemed > 0) {
      params.set("points", String(result.pointsRedeemed));
    }
    // Carry the picker context forward so the confirmation page can
    // show matching chips — the booking URL already has them in the
    // current searchParams, so just copy through.
    const carry = ["specialRateCode", "corporateCode", "usePoints"];
    for (const k of carry) {
      const v = searchParams?.get(k);
      if (v) params.set(k, v);
    }
    router.push(`/hotels/${hotelId}/book/confirmation?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* ── Sign-in state ──────────────────────────────────────────── */}
      {signedInLabel ? (
        <div className="inline-flex items-center gap-2 mb-6 text-sm bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-2">
          <span aria-hidden>✓</span>
          <span>
            Signed in as <strong className="font-medium">{signedInLabel}</strong> — your details are filled in below.
          </span>
        </div>
      ) : (
        <a
          id="sign-in"
          href={signInHref}
          className="inline-block mb-6 text-sm text-goldDeep underline hover:no-underline"
        >
          Sign in for faster booking →
        </a>
      )}

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

          {/* Saved addresses — radio picker. Renders only when the
              signed-in guest has at least one saved address. The form
              still falls through to the manual address fields when the
              guest picks "Use a different address". */}
          {savedAddresses.length > 0 && (
            <fieldset className="md:col-span-2 border border-ink/10 p-4">
              <legend className="px-2 text-[10px] uppercase tracking-[0.2em] text-ink/55">
                Saved Addresses
              </legend>
              <ul className="space-y-2">
                {savedAddresses.map((a) => (
                  <li key={a.id}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="addressChoice"
                        value={a.id}
                        checked={selectedAddressId === a.id}
                        onChange={() => setSelectedAddressId(a.id)}
                        className="mt-1 accent-goldDeep"
                      />
                      <span className="flex-1 text-sm">
                        <span className="block">
                          <span className="font-medium uppercase tracking-[0.15em] text-[10px] text-ink/55 mr-2">
                            {a.type}
                          </span>
                          {a.isPrimary && (
                            <span className="text-[10px] text-emerald-700 border border-emerald-200 bg-emerald-50 px-1.5 py-0.5">
                              Primary
                            </span>
                          )}
                        </span>
                        <span className="block text-ink/80">{summariseAddress(a)}</span>
                      </span>
                      <a
                        href="/account/addresses"
                        className="text-[11px] text-goldDeep underline hover:no-underline whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit
                      </a>
                    </label>
                  </li>
                ))}
                <li>
                  <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-ink/10">
                    <input
                      type="radio"
                      name="addressChoice"
                      value={MANUAL_ADDRESS_ID}
                      checked={selectedAddressId === MANUAL_ADDRESS_ID}
                      onChange={() => setSelectedAddressId(MANUAL_ADDRESS_ID)}
                      className="mt-1 accent-goldDeep"
                    />
                    <span className="text-sm">Use a different address</span>
                  </label>
                </li>
              </ul>
            </fieldset>
          )}

          {/* Manual address fields — collapse to a read-only summary
              when a saved address is selected, expand when "Use a
              different address" is picked or no saved addresses exist. */}
          {!usingSavedAddress && (
          <>
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
          </>
          )}
        </Grid>
      </Section>

      {/* ── Loyalty points redemption ─────────────────────────────── */}
      {loyalty && loyalty.available > 0 && bookingTotalUSD > 0 && (
        <BookingPointsPanel
          available={loyalty.available}
          totalUSD={bookingTotalUSD}
          bookingCurrency={bookingCurrency}
          pointsToRedeem={pointsToRedeem}
          onChange={setPointsToRedeem}
        />
      )}

      {/* ── Payment information ──────────────────────────────────── */}
      <Section
        title="Payment Information"
        subtitle="A valid form of payment must be presented at check-in."
      >
        {/* Saved cards — radio picker for the signed-in guest. Manual
            entry is still available via "Use a different card". */}
        {savedPaymentMethods.length > 0 && (
          <fieldset className="border border-ink/10 p-4 mb-6">
            <legend className="px-2 text-[10px] uppercase tracking-[0.2em] text-ink/55">
              Saved Cards
            </legend>
            <ul className="space-y-2">
              {savedPaymentMethods.map((m) => (
                <li key={m.id}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentChoice"
                      value={m.id}
                      checked={selectedPaymentId === m.id}
                      onChange={() => setSelectedPaymentId(m.id)}
                      className="mt-1 accent-goldDeep"
                    />
                    <span className="flex-1 text-sm">
                      <span className="block font-medium">{summarisePaymentMethod(m)}</span>
                      <span className="block text-ink/65 text-xs">
                        {m.holderName}
                        {m.isDefault && (
                          <span className="ml-2 text-[10px] text-emerald-700 border border-emerald-200 bg-emerald-50 px-1.5 py-0.5">
                            Default
                          </span>
                        )}
                      </span>
                    </span>
                    <a
                      href="/account/payment-methods"
                      className="text-[11px] text-goldDeep underline hover:no-underline whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Edit
                    </a>
                  </label>
                </li>
              ))}
              <li>
                <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-ink/10">
                  <input
                    type="radio"
                    name="paymentChoice"
                    value={MANUAL_PAYMENT_ID}
                    checked={selectedPaymentId === MANUAL_PAYMENT_ID}
                    onChange={() => setSelectedPaymentId(MANUAL_PAYMENT_ID)}
                    className="mt-1 accent-goldDeep"
                  />
                  <span className="text-sm">Use a different card</span>
                </label>
              </li>
            </ul>
          </fieldset>
        )}

        {!usingSavedPayment && (
        <>
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
        </>
        )}
        {usingSavedPayment && selectedPayment && (
          <p className="text-sm text-ink/65">
            Charging <strong className="font-medium">{summarisePaymentMethod(selectedPayment)}</strong>{" "}
            ({selectedPayment.holderName}). Switch to <em>Use a different card</em> above to pay
            with a new one.
          </p>
        )}
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
      {formError && (
        <p
          role="alert"
          className="mt-3 text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2 md:text-right"
        >
          {formError}
        </p>
      )}

      {/* ── Hidden context for analytics / form-data submission ── */}
      <input type="hidden" name="rateToken" value={rateToken} />
      <input type="hidden" name="ratePlanCode" value={ratePlanCode} />
      <input type="hidden" name="bookingHref" value={bookingHref} />
    </form>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

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
