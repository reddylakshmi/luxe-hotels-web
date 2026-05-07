import { describe, it, expect } from "vitest";
import {
  buildMonthGrid,
  compareISO,
  isComplete,
  isInRange,
  isoAddDays,
  nextMonth,
  nightsBetweenISO,
  pickDay,
  prevMonth,
  rangeFrom,
  resetRange,
  todayISO,
  WEEKDAY_LABELS,
} from "./dateRange";

describe("ISO helpers", () => {
  it("isoAddDays adds days correctly across month/year boundaries", () => {
    expect(isoAddDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(isoAddDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(isoAddDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("nightsBetweenISO returns whole nights", () => {
    expect(nightsBetweenISO("2026-09-01", "2026-09-04")).toBe(3);
    expect(nightsBetweenISO("2026-09-01", "2026-09-01")).toBe(0);
  });

  it("nightsBetweenISO is non-negative for inverted input", () => {
    expect(nightsBetweenISO("2026-09-04", "2026-09-01")).toBe(0);
  });

  it("compareISO orders dates lexically", () => {
    expect(compareISO("2026-01-01", "2026-12-31")).toBe(-1);
    expect(compareISO("2026-09-04", "2026-09-04")).toBe(0);
  });

  it("todayISO returns yyyy-mm-dd format", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("buildMonthGrid", () => {
  it("returns 6 weeks of 7 days = 42 cells", () => {
    const grid = buildMonthGrid(2026, 8); // September 2026 (month 0-indexed)
    expect(grid.weeks).toHaveLength(6);
    expect(grid.weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("first cell is Monday and last is Sunday (Mon-first weeks)", () => {
    const grid = buildMonthGrid(2026, 8);
    // Sept 1 2026 is a Tuesday (UTC); Mon-first means the row starts on Aug 31.
    expect(grid.weeks[0][0].iso).toBe("2026-08-31");
    expect(grid.weeks[5][6].iso).toBe("2026-10-11");
  });

  it("cells outside the rendered month are flagged inMonth=false", () => {
    const grid = buildMonthGrid(2026, 8);
    expect(grid.weeks[0][0].inMonth).toBe(false); // Aug 31
    const sept1 = grid.weeks[0][1];
    expect(sept1.iso).toBe("2026-09-01");
    expect(sept1.inMonth).toBe(true);
  });

  it("flags isToday on the matching cell", () => {
    const today = "2026-09-15";
    const grid = buildMonthGrid(2026, 8, today);
    const flat = grid.weeks.flat();
    expect(flat.filter((d) => d.isToday)).toHaveLength(1);
    expect(flat.find((d) => d.isToday)?.iso).toBe(today);
  });

  it("flags isPast for days before today", () => {
    const today = "2026-09-15";
    const grid = buildMonthGrid(2026, 8, today);
    const flat = grid.weeks.flat();
    expect(flat.find((d) => d.iso === "2026-09-01")?.isPast).toBe(true);
    expect(flat.find((d) => d.iso === "2026-09-15")?.isPast).toBe(false);
    expect(flat.find((d) => d.iso === "2026-09-16")?.isPast).toBe(false);
  });

  it("label is human-readable (Month Year)", () => {
    expect(buildMonthGrid(2026, 8).label).toBe("September 2026");
    expect(buildMonthGrid(2026, 0).label).toBe("January 2026");
  });

  it("weekday labels are Mon→Sun", () => {
    expect(WEEKDAY_LABELS).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });
});

describe("nextMonth / prevMonth", () => {
  it("rolls over December → January", () => {
    expect(nextMonth(2026, 11)).toEqual({ year: 2027, month: 0 });
  });

  it("rolls back January → December", () => {
    expect(prevMonth(2026, 0)).toEqual({ year: 2025, month: 11 });
  });

  it("walks forward inside a year", () => {
    expect(nextMonth(2026, 5)).toEqual({ year: 2026, month: 6 });
  });
});

describe("range selection", () => {
  it("first click sets check-in and switches to selecting check-out", () => {
    const next = pickDay(resetRange(), "2026-09-01");
    expect(next).toEqual({ checkIn: "2026-09-01", checkOut: null, selecting: "out" });
  });

  it("second click after check-in fills check-out", () => {
    let s = resetRange();
    s = pickDay(s, "2026-09-01");
    s = pickDay(s, "2026-09-04");
    expect(s).toEqual({ checkIn: "2026-09-01", checkOut: "2026-09-04", selecting: "in" });
    expect(isComplete(s)).toBe(true);
  });

  it("clicking a date earlier than check-in becomes a new check-in", () => {
    let s = resetRange();
    s = pickDay(s, "2026-09-10");
    s = pickDay(s, "2026-09-05"); // earlier
    expect(s).toEqual({ checkIn: "2026-09-05", checkOut: null, selecting: "out" });
  });

  it("clicking the same date as check-in resets the picker", () => {
    let s = resetRange();
    s = pickDay(s, "2026-09-10");
    s = pickDay(s, "2026-09-10");
    expect(s).toEqual({ checkIn: "2026-09-10", checkOut: null, selecting: "out" });
  });

  it("after a complete range, next click starts a new range", () => {
    let s = resetRange();
    s = pickDay(s, "2026-09-01");
    s = pickDay(s, "2026-09-04");
    s = pickDay(s, "2026-12-15");
    expect(s).toEqual({ checkIn: "2026-12-15", checkOut: null, selecting: "out" });
  });

  it("isInRange is exclusive of endpoints", () => {
    expect(isInRange("2026-09-01", "2026-09-01", "2026-09-04")).toBe(false);
    expect(isInRange("2026-09-04", "2026-09-01", "2026-09-04")).toBe(false);
    expect(isInRange("2026-09-02", "2026-09-01", "2026-09-04")).toBe(true);
    expect(isInRange("2026-09-02", null, null)).toBe(false);
  });

  it("rangeFrom prefills state with selecting=out when only check-in known", () => {
    expect(rangeFrom("2026-09-01", null)).toEqual({
      checkIn: "2026-09-01", checkOut: null, selecting: "out",
    });
  });

  it("rangeFrom prefills selecting=in when both dates known", () => {
    expect(rangeFrom("2026-09-01", "2026-09-04")).toEqual({
      checkIn: "2026-09-01", checkOut: "2026-09-04", selecting: "in",
    });
  });
});
