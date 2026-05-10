import { describe, expect, it } from "vitest";
import {
  capacityFit,
  formatMatchScore,
  formatStayWindow,
  labelCategory,
  labelEventType,
  labelSetup,
  matchTone,
  nightsBetween,
  sortCapacityStyles,
  toSearchVariables,
  validateMeetingsSearch,
} from "./meetings";

describe("labelSetup", () => {
  it("renders friendly labels for known styles", () => {
    expect(labelSetup("THEATER")).toBe("Theater");
    expect(labelSetup("U_SHAPE")).toBe("U-shape");
    expect(labelSetup("HOLLOW_SQUARE")).toBe("Hollow square");
  });

  it("falls through to the raw enum for unknown values", () => {
    expect(labelSetup("FUTURE_LAYOUT")).toBe("FUTURE_LAYOUT");
  });
});

describe("labelCategory + labelEventType", () => {
  it("formats categories", () => {
    expect(labelCategory("BALLROOM")).toBe("Ballroom");
    expect(labelCategory("MEETING_ROOM")).toBe("Meeting room");
    expect(labelCategory("UNKNOWN")).toBe("UNKNOWN");
  });

  it("formats event types", () => {
    expect(labelEventType("BOARD_RETREAT")).toBe("Board retreat");
    expect(labelEventType("SOCIAL_GALA")).toBe("Social gala");
    expect(labelEventType("CRYPTOPARTY")).toBe("CRYPTOPARTY");
  });
});

describe("capacityFit", () => {
  const caps = [
    { setup: "THEATER", capacity: 480 },
    { setup: "BANQUET", capacity: 320 },
    { setup: "CLASSROOM", capacity: 240 },
    { setup: "U_SHAPE", capacity: 60 },
  ];

  it("picks the snuggest layout that still fits the headcount", () => {
    // 200 attendees: CLASSROOM (240) is the smallest fit — beats
    // BANQUET (320) and THEATER (480). Reception/Theater still
    // listed in the matrix but the picked "best" is the tightest.
    const fit = capacityFit(caps, 200);
    expect(fit.fits).toBe(true);
    expect(fit.best?.setup).toBe("CLASSROOM");
    expect(fit.shortfall).toBe(0);
  });

  it("falls back to the largest layout when nothing fits", () => {
    const fit = capacityFit(caps, 600);
    expect(fit.fits).toBe(false);
    expect(fit.best?.setup).toBe("THEATER");
    expect(fit.shortfall).toBe(120);
  });

  it("filters by setup when one is specified", () => {
    const fit = capacityFit(caps, 50, "U_SHAPE");
    expect(fit.fits).toBe(true);
    expect(fit.best?.setup).toBe("U_SHAPE");
  });

  it("returns no-fit when the requested setup is missing", () => {
    const fit = capacityFit(caps, 30, "COCKTAIL");
    expect(fit.fits).toBe(false);
    expect(fit.best).toBeNull();
  });

  it("treats zero or negative attendees as no-fit", () => {
    expect(capacityFit(caps, 0).fits).toBe(false);
    expect(capacityFit(caps, -5).fits).toBe(false);
  });

  it("handles empty capacity rows", () => {
    expect(capacityFit([], 50)).toEqual({ fits: false, best: null, shortfall: 50 });
  });
});

describe("sortCapacityStyles", () => {
  it("orders rows for display priority (theater + reception first)", () => {
    const rows = [
      { setup: "BOARDROOM", capacity: 24 },
      { setup: "THEATER", capacity: 480 },
      { setup: "RECEPTION", capacity: 600 },
      { setup: "U_SHAPE", capacity: 60 },
    ];
    const sorted = sortCapacityStyles(rows);
    expect(sorted.map((r) => r.setup)).toEqual([
      "THEATER",
      "RECEPTION",
      "BOARDROOM",
      "U_SHAPE",
    ]);
  });

  it("keeps unknown setups at the end without throwing", () => {
    const rows = [
      { setup: "WEIRD_NEW_LAYOUT", capacity: 10 },
      { setup: "THEATER", capacity: 100 },
    ];
    const sorted = sortCapacityStyles(rows);
    expect(sorted[0].setup).toBe("THEATER");
    expect(sorted[1].setup).toBe("WEIRD_NEW_LAYOUT");
  });
});

describe("validateMeetingsSearch", () => {
  it("accepts a complete input", () => {
    const errors = validateMeetingsSearch({
      startDate: "2026-08-01",
      endDate: "2026-08-03",
      attendees: 100,
    });
    expect(errors).toEqual({});
  });

  it("flags missing dates", () => {
    const errors = validateMeetingsSearch({ attendees: 100 });
    expect(errors.startDate).toBeDefined();
    expect(errors.endDate).toBeDefined();
  });

  it("flags inverted ranges", () => {
    const errors = validateMeetingsSearch({
      startDate: "2026-08-10",
      endDate: "2026-08-01",
      attendees: 100,
    });
    expect(errors.endDate).toBe("End must be on or after start");
  });

  it("flags missing or out-of-bounds attendees", () => {
    expect(
      validateMeetingsSearch({ startDate: "2026-08-01", endDate: "2026-08-02" })
        .attendees,
    ).toBe("Enter a headcount");
    expect(
      validateMeetingsSearch({
        startDate: "2026-08-01",
        endDate: "2026-08-02",
        attendees: 1,
      }).attendees,
    ).toBe("Minimum 2 attendees");
    expect(
      validateMeetingsSearch({
        startDate: "2026-08-01",
        endDate: "2026-08-02",
        attendees: 6000,
      }).attendees,
    ).toBe("Maximum 5,000 attendees per RFP");
  });
});

describe("toSearchVariables", () => {
  it("emits only the required fields when optionals are absent", () => {
    expect(
      toSearchVariables({
        startDate: "2026-08-01",
        endDate: "2026-08-03",
        attendees: 100,
      }),
    ).toEqual({ startDate: "2026-08-01", endDate: "2026-08-03", attendees: 100 });
  });

  it("includes setup + cities when provided", () => {
    expect(
      toSearchVariables({
        startDate: "2026-08-01",
        endDate: "2026-08-03",
        attendees: 100,
        setup: "THEATER",
        cities: ["Paris", "London"],
      }),
    ).toEqual({
      startDate: "2026-08-01",
      endDate: "2026-08-03",
      attendees: 100,
      setup: "THEATER",
      cities: ["Paris", "London"],
    });
  });

  it("drops empty city arrays so the network log stays tight", () => {
    expect(
      toSearchVariables({
        startDate: "2026-08-01",
        endDate: "2026-08-03",
        attendees: 100,
        cities: [],
      }),
    ).toEqual({ startDate: "2026-08-01", endDate: "2026-08-03", attendees: 100 });
  });
});

describe("formatMatchScore + matchTone", () => {
  it("caps display at 99% unless score is exactly 1", () => {
    expect(formatMatchScore(0.5)).toBe("50% match");
    expect(formatMatchScore(0.998)).toBe("99% match");
    expect(formatMatchScore(1)).toBe("100% match");
  });

  it("handles non-finite scores defensively", () => {
    expect(formatMatchScore(Number.NaN)).toBe("—");
    expect(formatMatchScore(Number.POSITIVE_INFINITY)).toBe("—");
  });

  it("buckets tone by threshold", () => {
    expect(matchTone(0.95)).toBe("great");
    expect(matchTone(0.8)).toBe("good");
    expect(matchTone(0.5)).toBe("stretch");
    expect(matchTone(Number.NaN)).toBe("stretch");
  });
});

describe("nightsBetween + formatStayWindow", () => {
  it("counts nights inclusively", () => {
    expect(nightsBetween("2026-08-01", "2026-08-04")).toBe(3);
  });

  it("returns 1 for empty / inverted ranges", () => {
    expect(nightsBetween("2026-08-04", "2026-08-04")).toBe(1);
    expect(nightsBetween("2026-08-04", "2026-08-01")).toBe(1);
  });

  it("formats the window in UTC so timezone never shifts the day", () => {
    expect(formatStayWindow("2026-08-01", "2026-08-04")).toBe(
      "Aug 1, 2026 → Aug 4, 2026",
    );
  });

  it("falls back to the raw ISO when parsing fails", () => {
    expect(formatStayWindow("not-a-date", "2026-08-04")).toContain("not-a-date");
  });
});
