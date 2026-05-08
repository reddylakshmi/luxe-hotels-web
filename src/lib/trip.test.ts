import { describe, it, expect } from "vitest";
import {
  formatStayWindow,
  formatCancellationDeadline,
  validateCheckIn,
} from "./trip";

describe("formatStayWindow", () => {
  it("renders a multi-night stay with arrow + nights count", () => {
    expect(formatStayWindow("2026-07-06", "2026-07-11", 5))
      .toBe("Jul 6, 2026 → Jul 11, 2026 · 5 nights");
  });
  it("singular night noun for a 1-night stay", () => {
    expect(formatStayWindow("2026-07-06", "2026-07-07", 1))
      .toBe("Jul 6, 2026 → Jul 7, 2026 · 1 night");
  });
  it("formats in UTC so dates never slip back a day", () => {
    // 2020-01-01 in UTC; in PST this is 2019-12-31, but we always print
    // the UTC calendar day.
    expect(formatStayWindow("2020-01-01", "2020-01-03", 2))
      .toBe("Jan 1, 2020 → Jan 3, 2020 · 2 nights");
  });
});

describe("formatCancellationDeadline", () => {
  it("returns null for null/undefined/empty", () => {
    expect(formatCancellationDeadline(null)).toBeNull();
    expect(formatCancellationDeadline(undefined)).toBeNull();
    expect(formatCancellationDeadline("")).toBeNull();
  });
  it("returns null for unparseable input", () => {
    expect(formatCancellationDeadline("not-a-date")).toBeNull();
  });
  it("starts with 'until' and includes a date + time", () => {
    const out = formatCancellationDeadline("2026-06-30T17:00:00Z");
    expect(out).not.toBeNull();
    // Don't assert a specific time string — the helper deliberately
    // formats in the viewer's local TZ, which varies. Just check shape.
    expect(out!).toMatch(/^until /);
    expect(out!).toMatch(/\d{4}/);
  });
});

describe("validateCheckIn", () => {
  it("returns no errors for a valid form", () => {
    expect(validateCheckIn({
      documentType: "PASSPORT",
      documentNumber: "ABC1234567",
      estimatedArrivalTime: "16:30",
    })).toEqual({});
  });
  it("flags missing document type", () => {
    const e = validateCheckIn({ documentNumber: "ABCD1234" });
    expect(e.documentType).toMatch(/document type/i);
  });
  it("rejects unknown document type", () => {
    const e = validateCheckIn({
      documentType: "BIRTH_CERTIFICATE",
      documentNumber: "ABCD1234",
    });
    expect(e.documentType).toMatch(/document type/i);
  });
  it("flags missing document number", () => {
    const e = validateCheckIn({ documentType: "PASSPORT" });
    expect(e.documentNumber).toMatch(/required/i);
  });
  it("flags too-short document number", () => {
    const e = validateCheckIn({ documentType: "PASSPORT", documentNumber: "X" });
    expect(e.documentNumber).toMatch(/short/i);
  });
  it("treats whitespace-only document number as missing", () => {
    const e = validateCheckIn({
      documentType: "PASSPORT",
      documentNumber: "    ",
    });
    expect(e.documentNumber).toMatch(/required/i);
  });
  it("accepts an empty arrival time (it's optional)", () => {
    const e = validateCheckIn({
      documentType: "PASSPORT",
      documentNumber: "ABCD1234",
      estimatedArrivalTime: "",
    });
    expect(e.estimatedArrivalTime).toBeUndefined();
  });
  it("rejects a malformed arrival time", () => {
    const e = validateCheckIn({
      documentType: "PASSPORT",
      documentNumber: "ABCD1234",
      estimatedArrivalTime: "4 PM",
    });
    expect(e.estimatedArrivalTime).toMatch(/HH:MM/);
  });
  it("accepts 24-hour boundary values", () => {
    expect(validateCheckIn({
      documentType: "PASSPORT", documentNumber: "ABCD1234",
      estimatedArrivalTime: "00:00",
    })).toEqual({});
    expect(validateCheckIn({
      documentType: "PASSPORT", documentNumber: "ABCD1234",
      estimatedArrivalTime: "23:59",
    })).toEqual({});
  });
});
