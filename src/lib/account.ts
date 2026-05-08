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
