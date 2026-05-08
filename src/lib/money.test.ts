import { describe, it, expect } from "vitest";
import { formatAmount, formatMoney, parseMoneyAmount } from "./money";

describe("parseMoneyAmount", () => {
  it("parses a numeric string to a finite number", () => {
    expect(parseMoneyAmount({ amount: "123.45", currency: "USD" })).toBe(123.45);
  });

  it("returns 0 when the input is null or undefined", () => {
    expect(parseMoneyAmount(null)).toBe(0);
    expect(parseMoneyAmount(undefined)).toBe(0);
  });

  it("returns 0 when the amount is unparseable", () => {
    expect(parseMoneyAmount({ amount: "not-a-number", currency: "USD" })).toBe(0);
  });

  it("accepts plain { amount } shapes too (e.g., taxesAndFees children)", () => {
    expect(parseMoneyAmount({ amount: "9.99" })).toBe(9.99);
  });
});

describe("formatMoney", () => {
  it("formats with two decimals and the currency suffix", () => {
    expect(formatMoney({ amount: "1234.5", currency: "USD" })).toBe("1,234.50 USD");
  });

  it("returns empty string for null/undefined", () => {
    expect(formatMoney(null)).toBe("");
    expect(formatMoney(undefined)).toBe("");
  });
});

describe("formatAmount", () => {
  it("formats raw numbers with the same rules", () => {
    expect(formatAmount(1234.5, "EUR")).toBe("1,234.50 EUR");
    expect(formatAmount(0, "USD")).toBe("0.00 USD");
  });
});
