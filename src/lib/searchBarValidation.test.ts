import { describe, expect, it } from "vitest";
import { validateSearchSubmit } from "./searchBarValidation";

describe("validateSearchSubmit", () => {
  it("accepts a complete + well-ordered submission", () => {
    expect(
      validateSearchSubmit({
        destination: "Paris",
        checkIn: "2026-08-01",
        checkOut: "2026-08-04",
      }),
    ).toEqual({});
  });

  it("flags an empty destination", () => {
    const errors = validateSearchSubmit({
      destination: "",
      checkIn: "2026-08-01",
      checkOut: "2026-08-04",
    });
    expect(errors.destination).toMatch(/where you're going/i);
  });

  it("treats whitespace-only destination as empty", () => {
    expect(
      validateSearchSubmit({
        destination: "   ",
        checkIn: "2026-08-01",
        checkOut: "2026-08-04",
      }).destination,
    ).toBeDefined();
  });

  it("flags missing check-in / check-out", () => {
    const errors = validateSearchSubmit({
      destination: "Tokyo",
      checkIn: "",
      checkOut: "",
    });
    expect(errors.checkIn).toMatch(/check-in/i);
    expect(errors.checkOut).toMatch(/check-out/i);
  });

  it("rejects calendar-invalid dates (Feb 30)", () => {
    expect(
      validateSearchSubmit({
        destination: "Tokyo",
        checkIn: "2026-02-30",
        checkOut: "2026-03-05",
      }).checkIn,
    ).toBeDefined();
  });

  it("rejects month 13", () => {
    expect(
      validateSearchSubmit({
        destination: "Tokyo",
        checkIn: "2026-01-01",
        checkOut: "2026-13-05",
      }).checkOut,
    ).toBeDefined();
  });

  it("rejects non-ISO date shapes (e.g. 12/25)", () => {
    expect(
      validateSearchSubmit({
        destination: "Tokyo",
        checkIn: "12/25",
        checkOut: "2026-12-26",
      }).checkIn,
    ).toBeDefined();
  });

  it("flags check-out same-day or before check-in", () => {
    const same = validateSearchSubmit({
      destination: "Tokyo",
      checkIn: "2026-08-01",
      checkOut: "2026-08-01",
    });
    expect(same.checkOut).toMatch(/after check-in/i);

    const inverted = validateSearchSubmit({
      destination: "Tokyo",
      checkIn: "2026-08-10",
      checkOut: "2026-08-01",
    });
    expect(inverted.checkOut).toMatch(/after check-in/i);
  });

  it("does not double-up the ordering error when a date is itself invalid", () => {
    // Cascade prevention — if checkIn is "not a date", we don't want
    // an *additional* error about ordering.
    const errors = validateSearchSubmit({
      destination: "Tokyo",
      checkIn: "garbage",
      checkOut: "2026-08-01",
    });
    expect(errors.checkIn).toBeDefined();
    expect(errors.checkOut).toBeUndefined();
  });

  it("accepts the minimum 1-night stay", () => {
    expect(
      validateSearchSubmit({
        destination: "Tokyo",
        checkIn: "2026-08-01",
        checkOut: "2026-08-02",
        // The default test fixtures here use 2026 dates which are
        // in the future from the suite's deterministic baseline,
        // so the past-date guard doesn't fire.
        today: "2025-01-01",
      }),
    ).toEqual({});
  });

  it("rejects check-in dates in the past", () => {
    // The today param is pinned so the test stays deterministic
    // regardless of when CI runs. Real callers omit it and the
    // validator reads UTC today on its own.
    const errors = validateSearchSubmit({
      destination: "Tokyo",
      checkIn: "2026-01-01",
      checkOut: "2026-01-05",
      today: "2026-05-15",
    });
    expect(errors.checkIn).toMatch(/can't be in the past/i);
  });

  it("accepts a check-in on today exactly", () => {
    expect(
      validateSearchSubmit({
        destination: "Tokyo",
        checkIn: "2026-05-15",
        checkOut: "2026-05-16",
        today: "2026-05-15",
      }),
    ).toEqual({});
  });

  it("accepts a check-in one day before today is rejected", () => {
    const errors = validateSearchSubmit({
      destination: "Tokyo",
      checkIn: "2026-05-14",
      checkOut: "2026-05-16",
      today: "2026-05-15",
    });
    expect(errors.checkIn).toMatch(/past/i);
  });

  it("treats null / undefined inputs the same as empty strings", () => {
    expect(
      validateSearchSubmit({
        destination: null,
        checkIn: undefined,
        checkOut: null,
      }),
    ).toEqual({
      destination: expect.any(String),
      checkIn: expect.any(String),
      checkOut: expect.any(String),
    });
  });

  it("accepts leap-day check-in (Feb 29 of a leap year)", () => {
    expect(
      validateSearchSubmit({
        destination: "Tokyo",
        // 2028 is a leap year — Feb 29 must be accepted.
        checkIn: "2028-02-29",
        checkOut: "2028-03-01",
      }),
    ).toEqual({});
  });

  it("rejects Feb 29 of a non-leap year", () => {
    expect(
      validateSearchSubmit({
        destination: "Tokyo",
        checkIn: "2026-02-29",
        checkOut: "2026-03-01",
      }).checkIn,
    ).toBeDefined();
  });
});
