// Pure-function validators for the Complete Your Booking form.
//
// All public exports are pure: same input → same output, no side effects,
// no React, no DOM. That keeps the booking form trivially testable in
// vitest and makes the validation logic reusable on a future server
// action / API handler.
//
// Field-level validators return either an error string or undefined. The
// aggregate validators return a Result<T> shape: { ok: true, value: T }
// on success, { ok: false, errors: Record<string, string> } on failure.

import { findCountry } from "./countries";
import { hasStateDropdown } from "./states";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

// ── Field-level validators ──────────────────────────────────────────────

/** RFC-5322 lite: good enough for typo detection without becoming pedantic. */
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateRequired(value: string | undefined, label: string): string | undefined {
  if (!value || value.trim().length === 0) return `${label} is required`;
  return undefined;
}

export function validateEmail(value: string | undefined): string | undefined {
  const required = validateRequired(value, "Email");
  if (required) return required;
  if (!EMAIL_RE.test(value!.trim())) return "Enter a valid email address";
  return undefined;
}

/**
 * Phone validator — accepts an optional `+` and country code, then 7–15 digits
 * (the E.164 max). Spaces, dashes, and parentheses are tolerated; the digit
 * count is what matters.
 */
export function validatePhone(value: string | undefined): string | undefined {
  const required = validateRequired(value, "Mobile");
  if (required) return required;
  const digits = value!.replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return "Enter a valid mobile number";
  }
  return undefined;
}

export function validateZip(value: string | undefined, countryCode: string | undefined): string | undefined {
  const required = validateRequired(value, "Zip code");
  if (required) return required;
  const country = findCountry(countryCode);
  if (!country) return undefined;
  return country.zipRegex.test(value!.trim()) ? undefined : "Enter a valid zip / postal code";
}

/**
 * State/region validator — only required when the country has a formal
 * subdivision system we curate (US/CA/AU/IN/MX/BR). For other countries the
 * field is free text and may be empty.
 */
export function validateState(value: string | undefined, countryCode: string | undefined): string | undefined {
  if (!hasStateDropdown(countryCode)) return undefined;
  return validateRequired(value, "State");
}

/** Member number is optional; when provided it must be alphanumeric ≥ 6 chars. */
export function validateMemberNumber(value: string | undefined): string | undefined {
  if (!value || value.trim().length === 0) return undefined;
  if (!/^[A-Za-z0-9]{6,20}$/.test(value.trim())) {
    return "Member number must be 6–20 letters/digits";
  }
  return undefined;
}

// ── Payment validators ─────────────────────────────────────────────────

/**
 * Luhn check — the standard credit-card mod-10 checksum. Accepts a string
 * with or without spaces / dashes; returns true iff the digits pass.
 */
export function isLuhnValid(cardNumber: string): boolean {
  const digits = cardNumber.replace(/[^\d]/g, "");
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function validateCardNumber(value: string | undefined): string | undefined {
  const required = validateRequired(value, "Card number");
  if (required) return required;
  if (!isLuhnValid(value!)) return "Enter a valid card number";
  return undefined;
}

/**
 * Detect card brand from the BIN range. Lightweight — covers the four common
 * brands (Visa, Mastercard, Amex, Discover); other cards return null and the
 * UI shows a generic icon.
 */
export function cardBrand(value: string | undefined): "VISA" | "MC" | "AMEX" | "DISCOVER" | null {
  if (!value) return null;
  const d = value.replace(/[^\d]/g, "");
  if (/^4/.test(d)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "MC";
  if (/^3[47]/.test(d)) return "AMEX";
  if (/^6(?:011|5)/.test(d)) return "DISCOVER";
  return null;
}

/**
 * Validate expiry month (1–12) + 2-or-4-digit year, ensuring the date is
 * not in the past relative to {@code now}. Caller passes the clock so the
 * test can pin a fixed reference.
 */
export function validateExpiry(
  month: string | undefined,
  year: string | undefined,
  now: Date = new Date(),
): string | undefined {
  const monthRequired = validateRequired(month, "Expiry month");
  if (monthRequired) return monthRequired;
  const yearRequired = validateRequired(year, "Expiry year");
  if (yearRequired) return yearRequired;

  const m = parseInt(month!, 10);
  if (!Number.isFinite(m) || m < 1 || m > 12) return "Invalid expiry month";

  const y4 = year!.length === 2 ? 2000 + parseInt(year!, 10) : parseInt(year!, 10);
  if (!Number.isFinite(y4)) return "Invalid expiry year";

  const expiryEnd = new Date(y4, m, 0, 23, 59, 59); // last day of expiry month
  if (expiryEnd.getTime() < now.getTime()) return "Card has expired";
  return undefined;
}

export function validateCvv(value: string | undefined, brand: ReturnType<typeof cardBrand>): string | undefined {
  const required = validateRequired(value, "CVV");
  if (required) return required;
  const expectedLen = brand === "AMEX" ? 4 : 3;
  if (!new RegExp(`^\\d{${expectedLen}}$`).test(value!.trim())) {
    return brand === "AMEX" ? "CVV must be 4 digits" : "CVV must be 3 digits";
  }
  return undefined;
}

// ── Aggregate validators ──────────────────────────────────────────────

export type GuestInformation = {
  firstName: string;
  lastName: string;
  email: string;
  memberNumber?: string;
  phoneCountry: string; // country code for the phone prefix
  mobile: string;
  country: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
};

export type PaymentInformation = {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  billingZip: string;
};

export function validateGuestInformation(input: GuestInformation): ValidationResult<GuestInformation> {
  const errors: Record<string, string> = {};
  const set = (k: keyof GuestInformation, msg: string | undefined) => {
    if (msg) errors[k as string] = msg;
  };
  set("firstName", validateRequired(input.firstName, "First name"));
  set("lastName", validateRequired(input.lastName, "Last name"));
  set("email", validateEmail(input.email));
  set("memberNumber", validateMemberNumber(input.memberNumber));
  set("mobile", validatePhone(input.mobile));
  set("country", validateRequired(input.country, "Country"));
  set("addressLine1", validateRequired(input.addressLine1, "Address"));
  set("city", validateRequired(input.city, "City"));
  set("state", validateState(input.state, input.country));
  set("zip", validateZip(input.zip, input.country));
  return Object.keys(errors).length === 0 ? { ok: true, value: input } : { ok: false, errors };
}

export function validatePaymentInformation(
  input: PaymentInformation,
  now: Date = new Date(),
): ValidationResult<PaymentInformation> {
  const errors: Record<string, string> = {};
  const set = (k: keyof PaymentInformation, msg: string | undefined) => {
    if (msg) errors[k as string] = msg;
  };
  set("cardNumber", validateCardNumber(input.cardNumber));
  const expiryErr = validateExpiry(input.expiryMonth, input.expiryYear, now);
  if (expiryErr) {
    errors.expiryMonth = expiryErr;
  }
  set("cvv", validateCvv(input.cvv, cardBrand(input.cardNumber)));
  set("billingZip", validateRequired(input.billingZip, "Billing zip"));
  return Object.keys(errors).length === 0 ? { ok: true, value: input } : { ok: false, errors };
}

// ── Charge math (pure) ─────────────────────────────────────────────────

/**
 * Booking price summary — all derived numbers in one place so the sidebar,
 * the special-offer banner, and the confirmation page render the same
 * totals from the same primitive inputs.
 */
export type ChargeSummary = {
  subtotal: number;
  taxes: number;
  fees: number;
  total: number;
  statementCreditAmountUsd: number;
  totalAfterStatementCredit: number;
  currency: string;
};

export function computeChargeSummary({
  subtotal,
  taxes,
  fees,
  currency,
  statementCreditUsd = 250,
  fxRateToUsd = 1,
}: {
  subtotal: number;
  taxes: number;
  fees: number;
  currency: string;
  statementCreditUsd?: number;
  fxRateToUsd?: number;
}): ChargeSummary {
  const total = subtotal + taxes + fees;
  // Convert the USD-denominated credit into the booking currency so
  // the deduction and the total share a unit.
  const credit = statementCreditUsd * fxRateToUsd;
  const totalAfterStatementCredit = Math.max(0, total - credit);
  return {
    subtotal,
    taxes,
    fees,
    total,
    statementCreditAmountUsd: statementCreditUsd,
    totalAfterStatementCredit,
    currency,
  };
}

// ── Hold timer (pure) ──────────────────────────────────────────────────

export const HOLD_DURATION_MINUTES = 14;

/** Convert a remaining-seconds count into MM:SS for the timer pill. */
export function formatHoldTime(remainingSeconds: number): string {
  const safe = Math.max(0, Math.floor(remainingSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
