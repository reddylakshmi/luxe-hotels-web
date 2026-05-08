import { describe, it, expect } from "vitest";
import {
  formatMemberSince,
  formatCardExpiry,
  isCardExpired,
  paymentLabel,
  addressLabel,
  formatAddressLine,
  primaryAddress,
  defaultPaymentMethod,
  sortPrimaryFirst,
} from "./account";
import type { GuestAddress, PaymentMethodSummary } from "@/types/graphql";

const addr = (over: Partial<GuestAddress> = {}): GuestAddress => ({
  id: "a-1",
  type: "HOME",
  line1: "123 Powell St",
  line2: null,
  city: "San Francisco",
  stateCode: "CA",
  postalCode: "94102",
  countryCode: "US",
  isPrimary: false,
  ...over,
});

const pm = (over: Partial<PaymentMethodSummary> = {}): PaymentMethodSummary => ({
  id: "pm-1",
  type: "CREDIT_CARD",
  brand: "Visa",
  lastFour: "4242",
  holderName: "Sophia Chen",
  expiryMonth: 12,
  expiryYear: 2026,
  isDefault: false,
  ...over,
});

describe("formatMemberSince", () => {
  it("formats an ISO date as 'Member since Month Year'", () => {
    expect(formatMemberSince("2023-03-15T10:00:00Z")).toBe("Member since March 2023");
  });
  it("works for a Date-only ISO", () => {
    expect(formatMemberSince("2020-01-01")).toBe("Member since January 2020");
  });
  it("returns null for null/undefined", () => {
    expect(formatMemberSince(null)).toBeNull();
    expect(formatMemberSince(undefined)).toBeNull();
  });
  it("returns null for unparseable input", () => {
    expect(formatMemberSince("not-a-date")).toBeNull();
  });
});

describe("formatCardExpiry", () => {
  it("zero-pads month + uses 2-digit year", () => {
    expect(formatCardExpiry(1, 2026)).toBe("01/26");
    expect(formatCardExpiry(12, 2027)).toBe("12/27");
  });
  it("handles year %100 == 0 (e.g. 2100)", () => {
    expect(formatCardExpiry(6, 2100)).toBe("06/00");
  });
});

describe("isCardExpired", () => {
  it("is false on the last day of the expiry month", () => {
    // Card expires 03/26. 2026-03-31 23:59:58 → still valid.
    expect(isCardExpired(3, 2026, new Date("2026-03-31T23:59:58Z"))).toBe(false);
  });
  it("is true on the 1st of the next month", () => {
    expect(isCardExpired(3, 2026, new Date("2026-04-01T00:00:01Z"))).toBe(true);
  });
  it("is false for a future year", () => {
    expect(isCardExpired(1, 2030, new Date("2026-05-08T12:00:00Z"))).toBe(false);
  });
});

describe("paymentLabel", () => {
  it("formats brand + last four", () => {
    expect(paymentLabel("Visa", "4242")).toBe("Visa •••• 4242");
  });
  it("falls back to 'Card' when brand missing", () => {
    expect(paymentLabel(null, "4242")).toBe("Card •••• 4242");
    expect(paymentLabel("", "4242")).toBe("Card •••• 4242");
  });
  it("falls back to bullet placeholder when lastFour missing", () => {
    expect(paymentLabel("Amex", null)).toBe("Amex •••• ••••");
  });
});

describe("addressLabel", () => {
  it("maps known types to title case", () => {
    expect(addressLabel("HOME")).toBe("Home");
    expect(addressLabel("WORK")).toBe("Work");
    expect(addressLabel("BILLING")).toBe("Billing");
    expect(addressLabel("OTHER")).toBe("Other");
  });
  it("title-cases unknown types", () => {
    expect(addressLabel("vacation")).toBe("Vacation");
    expect(addressLabel("PARENTAL")).toBe("Parental");
  });
  it("returns 'Address' for missing input", () => {
    expect(addressLabel(null)).toBe("Address");
    expect(addressLabel(undefined)).toBe("Address");
  });
});

describe("formatAddressLine", () => {
  it("renders a complete US address single-line", () => {
    expect(formatAddressLine(addr())).toBe("123 Powell St, San Francisco, CA 94102, US");
  });
  it("includes line2 when present", () => {
    expect(formatAddressLine(addr({ line2: "Apt 4B" }))).toBe(
      "123 Powell St, Apt 4B, San Francisco, CA 94102, US",
    );
  });
  it("skips missing state and zip cleanly", () => {
    expect(
      formatAddressLine(addr({ stateCode: null, postalCode: null })),
    ).toBe("123 Powell St, San Francisco, US");
  });
  it("works with only city + country", () => {
    expect(
      formatAddressLine(
        addr({ line1: "", line2: null, stateCode: null, postalCode: null }),
      ),
    ).toBe("San Francisco, US");
  });
});

describe("primaryAddress", () => {
  it("returns null on empty input", () => {
    expect(primaryAddress([])).toBeNull();
  });
  it("prefers isPrimary", () => {
    const home = addr({ id: "h", type: "HOME", isPrimary: false });
    const work = addr({ id: "w", type: "WORK", isPrimary: true });
    expect(primaryAddress([home, work])?.id).toBe("w");
  });
  it("falls back to HOME when no isPrimary", () => {
    const work = addr({ id: "w", type: "WORK" });
    const home = addr({ id: "h", type: "HOME" });
    expect(primaryAddress([work, home])?.id).toBe("h");
  });
  it("falls back to first when no HOME and no isPrimary", () => {
    const work = addr({ id: "w", type: "WORK" });
    const other = addr({ id: "o", type: "OTHER" });
    expect(primaryAddress([work, other])?.id).toBe("w");
  });
});

describe("defaultPaymentMethod", () => {
  it("returns null on empty input", () => {
    expect(defaultPaymentMethod([])).toBeNull();
  });
  it("prefers isDefault", () => {
    const visa = pm({ id: "v", isDefault: false });
    const amex = pm({ id: "a", brand: "Amex", isDefault: true });
    expect(defaultPaymentMethod([visa, amex])?.id).toBe("a");
  });
  it("falls back to first when none isDefault", () => {
    const visa = pm({ id: "v", isDefault: false });
    const amex = pm({ id: "a", brand: "Amex", isDefault: false });
    expect(defaultPaymentMethod([visa, amex])?.id).toBe("v");
  });
});

describe("sortPrimaryFirst", () => {
  it("moves primary/default to the front, preserving the rest", () => {
    const items = [
      { id: "a", isPrimary: false },
      { id: "b", isPrimary: true },
      { id: "c", isPrimary: false },
    ];
    expect(sortPrimaryFirst(items).map((x) => x.id)).toEqual(["b", "a", "c"]);
  });
  it("is a no-op when nothing is primary", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(sortPrimaryFirst(items).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
  it("does not mutate the input", () => {
    const items = [{ id: "a", isDefault: false }, { id: "b", isDefault: true }];
    const before = [...items];
    sortPrimaryFirst(items);
    expect(items).toEqual(before);
  });
});
