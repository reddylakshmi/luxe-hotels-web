// Pure helpers for the /account page. No React, no DOM, no fetch — all
// branches exercised by lib/account.test.ts so the formatting stays
// stable as the page evolves.

import type { GuestAddress, PaymentMethodSummary } from "@/types/graphql";

/** "Member since March 2023". Returns null if the date is unparseable. */
export function formatMemberSince(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // Format in UTC so a "2020-01-01" date string doesn't slip back to
  // "December 2019" for viewers west of Greenwich.
  const month = d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  const year = d.toLocaleDateString("en-US", { year: "numeric", timeZone: "UTC" });
  return `Member since ${month} ${year}`;
}

/** "12/26" — month is 1-indexed (1..12). Year is full year, displayed 2-digit. */
export function formatCardExpiry(month: number, year: number): string {
  const mm = String(month).padStart(2, "0");
  const yy = String(year % 100).padStart(2, "0");
  return `${mm}/${yy}`;
}

/**
 * True if the card's expiry is in the past relative to `now`.
 * A card expiring in month M is valid through the LAST day of M.
 */
export function isCardExpired(month: number, year: number, now: Date = new Date()): boolean {
  // Last instant of the expiry month, in UTC so tests stay deterministic
  // across timezones. Date.UTC(y, m, 0) is the last day of month m-1, so
  // we pass `month` (1-indexed) directly to land on the end of that month.
  const expiryMs = Date.UTC(year, month, 0, 23, 59, 59, 999);
  return expiryMs < now.getTime();
}

/** "Visa •••• 4242". Brand falls back to "Card" when missing. */
export function paymentLabel(
  brand: string | null | undefined,
  lastFour: string | null | undefined,
): string {
  const b = brand && brand.trim() ? brand : "Card";
  const last = lastFour && lastFour.trim() ? lastFour : "••••";
  return `${b} •••• ${last}`;
}

/** Human-readable address-type label. Falls back to title-cased input. */
export function addressLabel(type: string | null | undefined): string {
  if (!type) return "Address";
  const map: Record<string, string> = { HOME: "Home", WORK: "Work", BILLING: "Billing", OTHER: "Other" };
  return map[type.toUpperCase()] ?? titleCase(type);
}

/**
 * "123 Powell St, San Francisco, CA 94102, US" — single-line summary.
 * Skips empty parts. countryCode is always shown last when present.
 */
export function formatAddressLine(addr: GuestAddress): string {
  const cityState = [addr.city, addr.stateCode].filter(Boolean).join(", ");
  const cityStateZip = [cityState, addr.postalCode].filter(Boolean).join(" ");
  return [addr.line1, addr.line2, cityStateZip, addr.countryCode]
    .filter((s) => s && String(s).trim())
    .join(", ");
}

/**
 * Pick the address to feature first. Preference: isPrimary → HOME → first.
 * Returns null on empty input.
 */
export function primaryAddress(addresses: GuestAddress[]): GuestAddress | null {
  if (!addresses.length) return null;
  return (
    addresses.find((a) => a.isPrimary) ??
    addresses.find((a) => a.type?.toUpperCase() === "HOME") ??
    addresses[0]
  );
}

/**
 * Pick the default payment method. Preference: isDefault → first.
 * Returns null on empty input.
 */
export function defaultPaymentMethod(
  payments: PaymentMethodSummary[],
): PaymentMethodSummary | null {
  if (!payments.length) return null;
  return payments.find((p) => p.isDefault) ?? payments[0];
}

/**
 * Sort a list so the primary/default sits first, then the rest in original order.
 * Stable: ties preserve input order.
 */
export function sortPrimaryFirst<T extends { isPrimary?: boolean; isDefault?: boolean }>(
  items: T[],
): T[] {
  const score = (x: T) => (x.isPrimary || x.isDefault ? 0 : 1);
  return [...items].sort((a, b) => score(a) - score(b));
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Edit form validators ─────────────────────────────────────────────────
//
// Pure, no DOM, no fetch. Each one returns an error message or undefined
// so the caller can fold them into a single field-error object.

/** Phone is optional. When present, accept loose international shape. */
export function validateOptionalPhone(value: string | undefined): string | undefined {
  if (!value || !value.trim()) return undefined;
  // Accept digits, spaces, dots, dashes, parens, and a single leading +.
  // 7+ digits keeps it permissive but catches obvious typos.
  const v = value.trim();
  if (!/^\+?[\d\s().-]{7,}$/.test(v)) return "Enter a valid phone number";
  const digits = v.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return "Enter a valid phone number";
  return undefined;
}

/**
 * Date of birth is optional. When present, must be a real date in the
 * past, with a sane age window so a typo'd "2099" or "1800" gets caught.
 */
export function validateDateOfBirth(
  value: string | undefined,
  now: Date = new Date(),
): string | undefined {
  if (!value || !value.trim()) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Use the date picker (YYYY-MM-DD)";
  const ms = Date.parse(value + "T00:00:00Z");
  if (Number.isNaN(ms)) return "Enter a valid date";
  const dob = new Date(ms);
  // Age window: must be on a calendar day strictly before today (UTC),
  // and at most 120 years in the past.
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (dob.getTime() >= todayUTC) return "Date of birth must be in the past";
  const ageYears = (now.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (ageYears > 120) return "Enter a valid date of birth";
  return undefined;
}

/** ISO 3166-1 alpha-2: two ASCII letters. Optional. */
export function validateCountryCode(value: string | undefined): string | undefined {
  if (!value || !value.trim()) return undefined;
  if (!/^[A-Za-z]{2}$/.test(value.trim())) return "Use a 2-letter country code (e.g. US, GB)";
  return undefined;
}

/** Composite: returns a field-keyed error map for the profile-edit form. */
export type ProfileEditInput = {
  phone?: string;
  dateOfBirth?: string;
  nationality?: string;
};
export type ProfileEditErrors = Partial<Record<keyof ProfileEditInput, string>>;

export function validateProfileEdit(input: ProfileEditInput): ProfileEditErrors {
  const errors: ProfileEditErrors = {};
  const phone = validateOptionalPhone(input.phone);
  if (phone) errors.phone = phone;
  const dob = validateDateOfBirth(input.dateOfBirth);
  if (dob) errors.dateOfBirth = dob;
  const nat = validateCountryCode(input.nationality);
  if (nat) errors.nationality = nat;
  return errors;
}

/**
 * Composite for the add-card form. Card-number / expiry are validated by
 * the existing booking-flow helpers — we only own the surrounding shape
 * here (holderName required, expiry-month/year derivation).
 */
export type AddCardInput = {
  holderName?: string;
  cardNumber?: string;
  expiry?: string; // "MM/YY" or "MM/YYYY"
  setDefault?: boolean;
};
export type AddCardErrors = Partial<Record<"holderName" | "cardNumber" | "expiry", string>>;

/**
 * Parse "MM/YY" or "MM/YYYY" → { month, year } as numbers, or null on invalid shape.
 * Two-digit years are interpreted as 20YY (no card industry uses 19YY).
 */
export function parseExpiry(raw: string | undefined): { month: number; year: number } | null {
  if (!raw) return null;
  const m = raw.replace(/\s/g, "").match(/^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const yearRaw = Number(m[2]);
  if (month < 1 || month > 12) return null;
  const year = m[2].length === 2 ? 2000 + yearRaw : yearRaw;
  return { month, year };
}
