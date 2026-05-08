import { describe, it, expect } from "vitest";
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
} from "./savedPicker";
import type { SavedPaymentMethod } from "@/app/hotels/[id]/book/page";

const addr = (overrides: Partial<SavedAddress> = {}): SavedAddress => ({
  id: "addr-1", type: "HOME", line1: "123 Powell St", line2: null,
  city: "San Francisco", stateCode: "CA", postalCode: "94102",
  countryCode: "US", isPrimary: false,
  ...overrides,
});

const pm = (overrides: Partial<SavedPaymentMethod> = {}): SavedPaymentMethod => ({
  id: "pm-1", type: "CREDIT_CARD", brand: "Visa", lastFour: "4242",
  holderName: "Sophia Chen", expiryMonth: 12, expiryYear: 2026, isDefault: false,
  ...overrides,
});

describe("defaultAddressId", () => {
  it("returns MANUAL_ADDRESS_ID for empty/null input", () => {
    expect(defaultAddressId([])).toBe(MANUAL_ADDRESS_ID);
    expect(defaultAddressId(null)).toBe(MANUAL_ADDRESS_ID);
    expect(defaultAddressId(undefined)).toBe(MANUAL_ADDRESS_ID);
  });

  it("returns the primary address when present", () => {
    expect(
      defaultAddressId([
        addr({ id: "a", isPrimary: false }),
        addr({ id: "b", isPrimary: true }),
        addr({ id: "c", isPrimary: false }),
      ]),
    ).toBe("b");
  });

  it("falls back to the first address when none is marked primary", () => {
    expect(
      defaultAddressId([
        addr({ id: "a", isPrimary: false }),
        addr({ id: "b", isPrimary: false }),
      ]),
    ).toBe("a");
  });
});

describe("defaultPaymentMethodId", () => {
  it("returns MANUAL_PAYMENT_ID for empty/null", () => {
    expect(defaultPaymentMethodId([])).toBe(MANUAL_PAYMENT_ID);
    expect(defaultPaymentMethodId(null)).toBe(MANUAL_PAYMENT_ID);
  });

  it("returns the default payment method when present", () => {
    expect(
      defaultPaymentMethodId([
        pm({ id: "p1", isDefault: false }),
        pm({ id: "p2", isDefault: true }),
      ]),
    ).toBe("p2");
  });

  it("falls back to the first method when none is default", () => {
    expect(
      defaultPaymentMethodId([
        pm({ id: "p1", isDefault: false }),
        pm({ id: "p2", isDefault: false }),
      ]),
    ).toBe("p1");
  });
});

describe("summariseAddress", () => {
  it("joins line1, city, state postal, country with commas", () => {
    expect(summariseAddress(addr())).toBe(
      "123 Powell St, San Francisco, CA 94102, US",
    );
  });

  it("includes line2 when present", () => {
    expect(summariseAddress(addr({ line2: "Apt 4B" }))).toBe(
      "123 Powell St, Apt 4B, San Francisco, CA 94102, US",
    );
  });

  it("skips empty parts (no double commas)", () => {
    expect(
      summariseAddress(addr({ stateCode: null, postalCode: null })),
    ).toBe("123 Powell St, San Francisco, US");
  });
});

describe("summarisePaymentMethod", () => {
  it("formats brand, last-4, and expiry MM/YYYY", () => {
    expect(summarisePaymentMethod(pm())).toBe("Visa •••• 4242 — exp 12/2026");
  });

  it("zero-pads single-digit months", () => {
    expect(summarisePaymentMethod(pm({ expiryMonth: 6, expiryYear: 2027 })))
      .toBe("Visa •••• 4242 — exp 06/2027");
  });
});

describe("manual sentinel guards", () => {
  it("isManualAddress recognises the sentinel id", () => {
    expect(isManualAddress(MANUAL_ADDRESS_ID)).toBe(true);
    expect(isManualAddress("addr-real")).toBe(false);
  });

  it("isManualPayment recognises the sentinel id", () => {
    expect(isManualPayment(MANUAL_PAYMENT_ID)).toBe(true);
    expect(isManualPayment("pm-real")).toBe(false);
  });
});
