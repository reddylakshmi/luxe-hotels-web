import { describe, it, expect } from "vitest";
import {
  cardBrand,
  CARD_MAX_DIGITS,
  CARD_MIN_DIGITS,
  computeChargeSummary,
  countCardDigits,
  formatCardForDisplay,
  formatHoldTime,
  HOLD_DURATION_MINUTES,
  isLuhnValid,
  validateCardNumber,
  validateCvv,
  validateEmail,
  validateExpiry,
  validateGuestInformation,
  validateMemberNumber,
  validatePaymentInformation,
  validatePhone,
  validateRequired,
  validateState,
  validateZip,
  type GuestInformation,
  type PaymentInformation,
} from "./bookingValidation";

const guest = (overrides: Partial<GuestInformation> = {}): GuestInformation => ({
  firstName: "Aria",
  lastName: "Patel",
  email: "aria@example.com",
  memberNumber: "",
  phoneCountry: "US",
  mobile: "+14155551234",
  country: "US",
  addressLine1: "123 Park Ave",
  addressLine2: "",
  city: "New York",
  state: "NY",
  zip: "10022",
  ...overrides,
});

const payment = (overrides: Partial<PaymentInformation> = {}): PaymentInformation => ({
  cardNumber: "4242 4242 4242 4242", // valid Visa test number
  expiryMonth: "12",
  expiryYear: "2030",
  cvv: "123",
  billingZip: "10022",
  ...overrides,
});

// ── Required field ──────────────────────────────────────────────────────

describe("validateRequired", () => {
  it("rejects empty string", () => {
    expect(validateRequired("", "Email")).toBe("Email is required");
  });

  it("rejects whitespace-only", () => {
    expect(validateRequired("   ", "Email")).toBe("Email is required");
  });

  it("accepts a real value", () => {
    expect(validateRequired("hello", "Email")).toBeUndefined();
  });
});

// ── Email ───────────────────────────────────────────────────────────────

describe("validateEmail", () => {
  it.each([
    "guest@example.com",
    "first.last+tag@hotel.co.uk",
    "test_123@subdomain.example.com",
  ])("accepts %s", (value) => {
    expect(validateEmail(value)).toBeUndefined();
  });

  it.each(["bad", "bad@", "bad@example", "@example.com", "no-at-sign"])(
    "rejects %s",
    (value) => {
      expect(validateEmail(value)).toBe("Enter a valid email address");
    },
  );

  it("requires the field", () => {
    expect(validateEmail(undefined)).toBe("Email is required");
  });
});

// ── Phone ───────────────────────────────────────────────────────────────

describe("validatePhone", () => {
  it("accepts a typical international number", () => {
    expect(validatePhone("+1 (415) 555-1234")).toBeUndefined();
  });

  it("accepts a 7-digit minimum", () => {
    expect(validatePhone("1234567")).toBeUndefined();
  });

  it("rejects too few digits", () => {
    expect(validatePhone("123")).toBe("Enter a valid mobile number");
  });

  it("rejects too many digits", () => {
    expect(validatePhone("1234567890123456")).toBe("Enter a valid mobile number");
  });
});

// ── Zip / postal code (country-aware) ───────────────────────────────────

describe("validateZip", () => {
  it("accepts US ZIP", () => {
    expect(validateZip("10022", "US")).toBeUndefined();
    expect(validateZip("10022-1234", "US")).toBeUndefined();
  });

  it("rejects malformed US ZIP", () => {
    expect(validateZip("ABC", "US")).toBe("Enter a valid zip / postal code");
  });

  it("accepts UK postcode", () => {
    expect(validateZip("SW1A 1AA", "GB")).toBeUndefined();
    expect(validateZip("M1 1AE", "GB")).toBeUndefined();
  });

  it("accepts Canadian postcode with or without space", () => {
    expect(validateZip("M5V 3A8", "CA")).toBeUndefined();
    expect(validateZip("M5V3A8", "CA")).toBeUndefined();
  });

  it("accepts 6-digit Indian PIN", () => {
    expect(validateZip("500081", "IN")).toBeUndefined();
  });

  it("rejects an Indian PIN that's too short", () => {
    expect(validateZip("12345", "IN")).toBe("Enter a valid zip / postal code");
  });

  it("falls through cleanly for unknown countries", () => {
    // No regex configured → only the required-field check runs.
    expect(validateZip("anything", "ZZ")).toBeUndefined();
  });
});

// ── State / region ──────────────────────────────────────────────────────

describe("validateState", () => {
  it("requires state for US", () => {
    expect(validateState("", "US")).toBe("State is required");
  });

  it("requires state for India", () => {
    expect(validateState("", "IN")).toBe("State is required");
  });

  it("does not require state for France (free-text fallback)", () => {
    expect(validateState("", "FR")).toBeUndefined();
  });
});

// ── Member number ───────────────────────────────────────────────────────

describe("validateMemberNumber", () => {
  it("accepts an empty value (it's optional)", () => {
    expect(validateMemberNumber("")).toBeUndefined();
    expect(validateMemberNumber(undefined)).toBeUndefined();
  });

  it("rejects too-short codes", () => {
    expect(validateMemberNumber("ABC12")).toBe("Member number must be 6–20 letters/digits");
  });

  it("rejects symbols", () => {
    expect(validateMemberNumber("ABC-123")).toBe("Member number must be 6–20 letters/digits");
  });

  it("accepts a 6-char alphanumeric", () => {
    expect(validateMemberNumber("ABC123")).toBeUndefined();
  });
});

// ── Card-number formatter (typing simulation) ──────────────────────────

describe("formatCardForDisplay", () => {
  it("groups raw digits into 4s separated by single spaces", () => {
    expect(formatCardForDisplay("4242424242424242")).toBe("4242 4242 4242 4242");
  });

  it("is idempotent on already-formatted input", () => {
    const formatted = "4242 4242 4242 4242";
    expect(formatCardForDisplay(formatted)).toBe(formatted);
  });

  it("strips dashes, dots, and other separators", () => {
    expect(formatCardForDisplay("4242-4242-4242-4242")).toBe("4242 4242 4242 4242");
    expect(formatCardForDisplay("4242.4242.4242.4242")).toBe("4242 4242 4242 4242");
    expect(formatCardForDisplay("4242   4242   4242   4242")).toBe("4242 4242 4242 4242");
  });

  it("formats partial inputs (no trailing space artefacts)", () => {
    expect(formatCardForDisplay("")).toBe("");
    expect(formatCardForDisplay("4")).toBe("4");
    expect(formatCardForDisplay("42")).toBe("42");
    expect(formatCardForDisplay("4242")).toBe("4242");
    expect(formatCardForDisplay("42425")).toBe("4242 5");
    expect(formatCardForDisplay("4242 5678")).toBe("4242 5678");
  });

  it("formats a 15-digit Amex correctly (4-4-4-3 grouping)", () => {
    expect(formatCardForDisplay("378282246310005")).toBe("3782 8224 6310 005");
  });

  it("formats a 17-digit Discover (5 groups: 4-4-4-4-1)", () => {
    expect(formatCardForDisplay("12345678901234567")).toBe("1234 5678 9012 3456 7");
  });

  it("formats a 19-digit number (5 groups: 4-4-4-4-3) — the max", () => {
    expect(formatCardForDisplay("1234567890123456789")).toBe("1234 5678 9012 3456 789");
  });

  it("caps the digit count at CARD_MAX_DIGITS even if more are typed/pasted", () => {
    const tooMany = "1".repeat(CARD_MAX_DIGITS + 5);
    expect(countCardDigits(formatCardForDisplay(tooMany))).toBe(CARD_MAX_DIGITS);
  });

  it("handles null/undefined gracefully (returns empty string)", () => {
    expect(formatCardForDisplay(undefined)).toBe("");
    expect(formatCardForDisplay(null)).toBe("");
  });

  // The bug suspected by the user: type a 16-digit Visa one digit at a time
  // and verify every intermediate state formats cleanly. Previously the
  // regex+trim flavour could lose a trailing space and let cursor logic
  // drop a digit in some browsers; this test pins the new behaviour.
  it("simulating digit-by-digit Visa entry produces all 16 digits", () => {
    let value = "";
    for (const d of "4242424242424242") {
      value = formatCardForDisplay(value + d);
    }
    expect(value).toBe("4242 4242 4242 4242");
    expect(countCardDigits(value)).toBe(16);
    expect(isLuhnValid(value)).toBe(true);
  });

  it("simulating Amex paste then trailing typed digits keeps all 15", () => {
    let value = formatCardForDisplay("3782822463"); // first 10 pasted
    expect(countCardDigits(value)).toBe(10);
    for (const d of "10005") {
      value = formatCardForDisplay(value + d);
    }
    expect(countCardDigits(value)).toBe(15);
    expect(value).toBe("3782 8224 6310 005");
    expect(isLuhnValid(value)).toBe(true);
  });
});

describe("countCardDigits", () => {
  it("counts only digit characters", () => {
    expect(countCardDigits("4242 4242 4242 4242")).toBe(16);
    expect(countCardDigits("3782-8224-6310-005")).toBe(15);
    expect(countCardDigits("")).toBe(0);
    expect(countCardDigits(undefined)).toBe(0);
  });
});

// ── Luhn / card number ──────────────────────────────────────────────────

describe("isLuhnValid + validateCardNumber", () => {
  it.each([
    "4242 4242 4242 4242",
    "5555 5555 5555 4444",
    "378282246310005",      // Amex test number
    "6011 1111 1111 1117",  // Discover test number
  ])("accepts valid: %s", (n) => {
    expect(isLuhnValid(n)).toBe(true);
    expect(validateCardNumber(n)).toBeUndefined();
  });

  it("rejects a transposed digit", () => {
    expect(isLuhnValid("4242 4242 4242 4243")).toBe(false);
    expect(validateCardNumber("4242 4242 4242 4243")).toBe("Enter a valid card number");
  });

  it("rejects a too-short number with a digit count in the message", () => {
    expect(validateCardNumber("4242")).toMatch(/too short/);
    expect(validateCardNumber("4242")).toContain("4/13");
  });

  it("rejects a too-long number with a digit count in the message", () => {
    expect(validateCardNumber("1".repeat(20))).toMatch(/too long/);
  });

  it("rejects a length-valid number that fails Luhn (e.g. the placeholder)", () => {
    // The literal "1234 5678 9012 3456" is 16 digits but doesn't pass Luhn —
    // exactly the trap the old placeholder text invited.
    expect(validateCardNumber("1234 5678 9012 3456")).toBe("Enter a valid card number");
  });
});

// ── Card brand detection ────────────────────────────────────────────────

describe("cardBrand", () => {
  it("detects Visa", () => {
    expect(cardBrand("4242 4242 4242 4242")).toBe("VISA");
  });

  it("detects Mastercard (5x)", () => {
    expect(cardBrand("5555 5555 5555 4444")).toBe("MC");
  });

  it("detects Mastercard (2x)", () => {
    expect(cardBrand("2223 4444 5555 6661")).toBe("MC");
  });

  it("detects Amex", () => {
    expect(cardBrand("378282246310005")).toBe("AMEX");
  });

  it("detects Discover", () => {
    expect(cardBrand("6011 1111 1111 1117")).toBe("DISCOVER");
  });

  it("returns null for unknown BIN", () => {
    expect(cardBrand("9999 9999 9999 9999")).toBeNull();
  });
});

// ── Expiry ──────────────────────────────────────────────────────────────

describe("validateExpiry", () => {
  const fixedNow = new Date("2026-05-07T12:00:00Z");

  it("accepts a future date in 4-digit-year format", () => {
    expect(validateExpiry("12", "2030", fixedNow)).toBeUndefined();
  });

  it("accepts a future date in 2-digit-year format", () => {
    expect(validateExpiry("12", "30", fixedNow)).toBeUndefined();
  });

  it("rejects a past month within the same year", () => {
    expect(validateExpiry("01", "2026", fixedNow)).toBe("Card has expired");
  });

  it("accepts the current month edge case", () => {
    expect(validateExpiry("05", "2026", fixedNow)).toBeUndefined();
  });

  it("rejects month=0 or month=13", () => {
    expect(validateExpiry("0", "2030", fixedNow)).toBe("Invalid expiry month");
    expect(validateExpiry("13", "2030", fixedNow)).toBe("Invalid expiry month");
  });

  it("requires both fields", () => {
    expect(validateExpiry("", "2030", fixedNow)).toBe("Expiry month is required");
    expect(validateExpiry("12", "", fixedNow)).toBe("Expiry year is required");
  });
});

// ── CVV (brand-aware) ───────────────────────────────────────────────────

describe("validateCvv", () => {
  it("requires 3 digits for Visa/MC/Discover", () => {
    expect(validateCvv("123", "VISA")).toBeUndefined();
    expect(validateCvv("12", "VISA")).toBe("CVV must be 3 digits");
    expect(validateCvv("1234", "VISA")).toBe("CVV must be 3 digits");
  });

  it("requires 4 digits for Amex", () => {
    expect(validateCvv("1234", "AMEX")).toBeUndefined();
    expect(validateCvv("123", "AMEX")).toBe("CVV must be 4 digits");
  });

  it("rejects non-digits", () => {
    expect(validateCvv("12a", "VISA")).toBe("CVV must be 3 digits");
  });

  it("requires the field", () => {
    expect(validateCvv("", "VISA")).toBe("CVV is required");
  });
});

// ── Aggregate: guest information ────────────────────────────────────────

describe("validateGuestInformation", () => {
  it("returns ok for a valid input", () => {
    const r = validateGuestInformation(guest());
    expect(r.ok).toBe(true);
  });

  it("collects multiple field errors at once", () => {
    const r = validateGuestInformation(
      guest({ email: "bad", mobile: "1", zip: "ABC", state: "" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toMatchObject({
        email: expect.any(String),
        mobile: expect.any(String),
        zip: expect.any(String),
        state: expect.any(String),
      });
    }
  });

  it("does not require state when country has no formal subdivisions", () => {
    const r = validateGuestInformation(
      guest({ country: "FR", state: "", zip: "75008" }),
    );
    expect(r.ok).toBe(true);
  });
});

// ── Aggregate: payment ──────────────────────────────────────────────────

describe("validatePaymentInformation", () => {
  const fixedNow = new Date("2026-05-07T12:00:00Z");

  it("returns ok for a valid Visa input", () => {
    const r = validatePaymentInformation(payment(), fixedNow);
    expect(r.ok).toBe(true);
  });

  it("requires Amex CVV to be 4 digits", () => {
    const r = validatePaymentInformation(
      payment({ cardNumber: "378282246310005", cvv: "123" }),
      fixedNow,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.cvv).toBe("CVV must be 4 digits");
    }
  });

  it("rejects expired cards", () => {
    const r = validatePaymentInformation(
      payment({ expiryMonth: "01", expiryYear: "2026" }),
      fixedNow,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.expiryMonth).toBe("Card has expired");
    }
  });
});

// ── Charge math ─────────────────────────────────────────────────────────

describe("computeChargeSummary", () => {
  it("derives total = subtotal + taxes + fees", () => {
    const s = computeChargeSummary({
      subtotal: 1000, taxes: 100, fees: 20, currency: "USD",
    });
    expect(s.total).toBe(1120);
  });

  it("subtracts the $250 statement credit (default) from the total", () => {
    const s = computeChargeSummary({
      subtotal: 1000, taxes: 100, fees: 20, currency: "USD",
    });
    expect(s.totalAfterStatementCredit).toBe(870);
  });

  it("clamps the after-credit total at zero (never negative)", () => {
    const s = computeChargeSummary({
      subtotal: 100, taxes: 0, fees: 0, currency: "USD",
    });
    expect(s.totalAfterStatementCredit).toBe(0);
  });

  it("converts the credit into a non-USD currency via the FX factor", () => {
    // 1 USD = 0.93 EUR → $250 credit ≈ 232.5 EUR.
    const s = computeChargeSummary({
      subtotal: 500, taxes: 0, fees: 0, currency: "EUR", fxRateToUsd: 0.93,
    });
    expect(s.totalAfterStatementCredit).toBeCloseTo(500 - 250 * 0.93, 2);
  });
});

// ── Hold timer formatter ────────────────────────────────────────────────

describe("formatHoldTime", () => {
  it("formats minutes:seconds", () => {
    expect(formatHoldTime(14 * 60)).toBe("14:00");
    expect(formatHoldTime(60)).toBe("01:00");
    expect(formatHoldTime(59)).toBe("00:59");
  });

  it("clamps negative values at 00:00", () => {
    expect(formatHoldTime(-5)).toBe("00:00");
  });

  it("HOLD_DURATION_MINUTES is 14 (Marriott convention)", () => {
    expect(HOLD_DURATION_MINUTES).toBe(14);
  });
});
