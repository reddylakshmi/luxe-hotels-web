// Pure helpers for the booking form's "saved address" + "saved payment
// method" radio selectors. Picking the default + computing the
// description string is keyed by enough fields that the UI can stay
// stupid and just render — no side-effects, no DOM, no React.

import type { GuestProfile } from "@/types/graphql";
import type { SavedPaymentMethod } from "@/app/hotels/[id]/book/page";

export type SavedAddress = GuestProfile["addresses"][number];

/** "MANUAL" sentinel id means "type a different address from scratch". */
export const MANUAL_ADDRESS_ID = "__manual__";
export const MANUAL_PAYMENT_ID = "__manual__";

/** Pick the address to start with — the primary, else the first, else MANUAL. */
export function defaultAddressId(addresses: SavedAddress[] | undefined | null): string {
  if (!addresses || addresses.length === 0) return MANUAL_ADDRESS_ID;
  return (addresses.find((a) => a.isPrimary) ?? addresses[0]).id;
}

/** Pick the payment method to start with — the default, else the first, else MANUAL. */
export function defaultPaymentMethodId(
  methods: SavedPaymentMethod[] | undefined | null,
): string {
  if (!methods || methods.length === 0) return MANUAL_PAYMENT_ID;
  return (methods.find((m) => m.isDefault) ?? methods[0]).id;
}

/**
 * "123 Powell St, San Francisco, CA 94102, US" — single-line address line
 * for a radio-list label. Skips empty parts so partial addresses don't
 * render double commas.
 */
export function summariseAddress(address: SavedAddress): string {
  const parts = [
    address.line1,
    address.line2 ?? undefined,
    address.city,
    [address.stateCode ?? undefined, address.postalCode ?? undefined]
      .filter(Boolean)
      .join(" "),
    address.countryCode,
  ].filter((p): p is string => Boolean(p && p.trim().length > 0));
  return parts.join(", ");
}

/**
 * "Visa •••• 4242 — exp 12/2026" — primary descriptor for a payment
 * method radio row. Holder name and "default" badge are rendered
 * separately so the UI can style them.
 */
export function summarisePaymentMethod(method: SavedPaymentMethod): string {
  const m = method.expiryMonth.toString().padStart(2, "0");
  return `${method.brand} •••• ${method.lastFour} — exp ${m}/${method.expiryYear}`;
}

export function isManualAddress(id: string): boolean {
  return id === MANUAL_ADDRESS_ID;
}
export function isManualPayment(id: string): boolean {
  return id === MANUAL_PAYMENT_ID;
}
