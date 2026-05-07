import { describe, it, expect } from "vitest";
import {
  DEFAULT_LEAD_DAYS,
  DEFAULT_NIGHTS,
  MAX_NIGHTS,
  MIN_NIGHTS,
  fmtDate,
  nightsBetween,
  resolveStay,
} from "./stay";

const TODAY = new Date("2026-05-07T00:00:00Z");

describe("nightsBetween", () => {
  it("counts nights between two ISO dates", () => {
    expect(nightsBetween("2026-09-01", "2026-09-04")).toBe(3);
    expect(nightsBetween("2026-09-04", "2026-09-04")).toBe(0);
  });

  it("returns 0 on invalid input", () => {
    expect(nightsBetween("nope", "2026-09-04")).toBe(0);
    expect(nightsBetween("2026-09-04", "nope")).toBe(0);
  });

  it("returns 0 (not negative) when range is reversed", () => {
    expect(nightsBetween("2026-09-04", "2026-09-01")).toBe(0);
  });
});

describe("resolveStay", () => {
  it("with no input, defaults check-in 30 days out and stays 3 nights", () => {
    const s = resolveStay({}, TODAY);
    expect(s.checkIn).toBe("2026-06-06"); // +30 days
    expect(s.checkOut).toBe("2026-06-09"); // +3 nights
    expect(s.nights).toBe(DEFAULT_NIGHTS);
  });

  it("checkIn-only computes checkOut from default nights", () => {
    const s = resolveStay({ checkIn: "2026-09-01" }, TODAY);
    expect(s.checkIn).toBe("2026-09-01");
    expect(s.checkOut).toBe("2026-09-04");
    expect(s.nights).toBe(3);
  });

  it("checkIn + nights computes checkOut", () => {
    const s = resolveStay({ checkIn: "2026-09-01", nights: 5 }, TODAY);
    expect(s.checkOut).toBe("2026-09-06");
    expect(s.nights).toBe(5);
  });

  it("both checkIn + checkOut: dates win, nights is recomputed", () => {
    const s = resolveStay({ checkIn: "2026-09-01", checkOut: "2026-09-08", nights: 999 }, TODAY);
    expect(s.checkOut).toBe("2026-09-08");
    expect(s.nights).toBe(7);
  });

  it("nights only defaults check-in to lead-time and stays N nights", () => {
    const s = resolveStay({ nights: 5 }, TODAY);
    // today + 30 = 2026-06-06
    expect(s.checkIn).toBe("2026-06-06");
    expect(s.checkOut).toBe("2026-06-11");
    expect(s.nights).toBe(5);
  });

  it("checkOut-only walks backward by default nights", () => {
    const s = resolveStay({ checkOut: "2026-09-10", nights: 4 }, TODAY);
    expect(s.checkIn).toBe("2026-09-06");
    expect(s.nights).toBe(4);
  });

  it("checkIn in the past is pushed forward to today", () => {
    const s = resolveStay({ checkIn: "2020-01-01", nights: 2 }, TODAY);
    expect(s.checkIn).toBe("2026-05-07");
    expect(s.checkOut).toBe("2026-05-09");
  });

  it("checkOut before checkIn falls back to checkIn + requested nights", () => {
    const s = resolveStay({ checkIn: "2026-09-10", checkOut: "2026-09-01", nights: 2 }, TODAY);
    expect(s.checkIn).toBe("2026-09-10");
    expect(s.checkOut).toBe("2026-09-12");
    expect(s.nights).toBe(2);
  });

  it("clamps nights to MIN_NIGHTS", () => {
    const s = resolveStay({ checkIn: "2026-09-01", nights: 0 }, TODAY);
    expect(s.nights).toBe(MIN_NIGHTS);
  });

  it("clamps nights to MAX_NIGHTS", () => {
    const s = resolveStay({ checkIn: "2026-09-01", nights: 999 }, TODAY);
    expect(s.nights).toBe(MAX_NIGHTS);
  });

  it("nights as a string is parsed", () => {
    const s = resolveStay({ checkIn: "2026-09-01", nights: "7" }, TODAY);
    expect(s.nights).toBe(7);
  });

  it("malformed dates are ignored", () => {
    const s = resolveStay({ checkIn: "invalid" }, TODAY);
    expect(s.checkIn).toBe("2026-06-06"); // fell back to default lead-time
  });

  it("DEFAULT_LEAD_DAYS / DEFAULT_NIGHTS constants are exposed", () => {
    expect(DEFAULT_LEAD_DAYS).toBe(30);
    expect(DEFAULT_NIGHTS).toBe(3);
  });
});

describe("fmtDate", () => {
  it("formats ISO into a human-readable string", () => {
    // Use Sept 15 to avoid month-boundary timezone surprises in toLocaleDateString.
    expect(fmtDate("2026-09-15")).toMatch(/Sep/);
  });

  it("returns the input when not parseable", () => {
    expect(fmtDate("not-a-date")).toBe("not-a-date");
  });
});
