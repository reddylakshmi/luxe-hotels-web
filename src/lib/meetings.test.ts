import { describe, expect, it } from "vitest";
import {
  capacityFit,
  draftToSubmitVariables,
  formatMatchScore,
  formatStayWindow,
  isRfpCancellable,
  labelCategory,
  labelEventType,
  labelRfpStatus,
  labelRfpStep,
  labelSetup,
  matchTone,
  nextStep,
  nightsBetween,
  prevStep,
  rfpStatusTone,
  sortCapacityStyles,
  toSearchVariables,
  validateBasicsStep,
  validateContactStep,
  validateMeetingsSearch,
  validateRfpStep,
  validateSpacesStep,
  type RfpDraft,
} from "./meetings";

const draft: RfpDraft = {
  eventName: "Pinnacle Q3 Offsite",
  eventType: "BOARD_RETREAT",
  startDate: "2026-09-01",
  endDate: "2026-09-03",
  attendees: 40,
  guestRoomsPerNight: 45,
  spaceRequirements: [
    {
      name: "Plenary",
      setup: "U_SHAPE",
      attendees: 40,
      durationHours: 8,
      startTime: "09:00",
    },
  ],
  cateringRequirements: "Plated dinner each evening, vegetarian-forward",
  additionalRequirements: "Concierge airport transfers",
  organizer: "Sophia Chen",
  organization: "Pinnacle Ventures",
  contactEmail: "sophia@pinnacle.example",
  contactPhone: "+1-415-555-0101",
};

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

describe("RFP wizard step validators", () => {
  it("validateBasicsStep accepts a complete draft", () => {
    expect(validateBasicsStep(draft)).toEqual({});
  });

  it("validateBasicsStep flags missing fields", () => {
    const errors = validateBasicsStep({
      ...draft,
      eventName: "  ",
      attendees: 0,
      startDate: "",
    });
    expect(errors.eventName).toBeDefined();
    expect(errors.attendees).toBeDefined();
    expect(errors.startDate).toBeDefined();
  });

  it("validateBasicsStep flags inverted date range", () => {
    expect(
      validateBasicsStep({ ...draft, startDate: "2026-09-10", endDate: "2026-09-01" })
        .endDate,
    ).toBe("End must be on or after start");
  });

  it("validateBasicsStep clamps attendees range", () => {
    expect(validateBasicsStep({ ...draft, attendees: 1 }).attendees).toContain("Minimum");
    expect(validateBasicsStep({ ...draft, attendees: 6000 }).attendees).toContain("Maximum");
  });

  it("validateSpacesStep requires at least one row", () => {
    expect(validateSpacesStep({ ...draft, spaceRequirements: [] }).spaceRequirements)
      .toBeDefined();
  });

  it("validateSpacesStep flags per-row errors with indexed keys", () => {
    const errors = validateSpacesStep({
      ...draft,
      spaceRequirements: [
        { name: "", setup: "THEATER" as const, attendees: 0, durationHours: 0 },
      ],
    });
    expect(errors["space.0.name"]).toBeDefined();
    expect(errors["space.0.attendees"]).toBeDefined();
    expect(errors["space.0.durationHours"]).toBeDefined();
  });

  it("validateSpacesStep rejects malformed start time", () => {
    const errors = validateSpacesStep({
      ...draft,
      spaceRequirements: [
        {
          name: "Plenary",
          setup: "U_SHAPE",
          attendees: 40,
          durationHours: 8,
          startTime: "9am",
        },
      ],
    });
    expect(errors["space.0.startTime"]).toBe("Use HH:MM");
  });

  it("validateContactStep flags missing + bad email/phone", () => {
    const errors = validateContactStep({
      ...draft,
      organizer: "",
      contactEmail: "not-an-email",
      contactPhone: "abc",
    });
    expect(errors.organizer).toBeDefined();
    expect(errors.contactEmail).toBeDefined();
    expect(errors.contactPhone).toBeDefined();
  });

  it("validateRfpStep on review aggregates earlier steps", () => {
    const errors = validateRfpStep("review", { ...draft, eventName: "", contactEmail: "x" });
    expect(errors.eventName).toBeDefined();
    expect(errors.contactEmail).toBeDefined();
  });

  it("nextStep + prevStep are bounded to the step list", () => {
    expect(nextStep("review")).toBe("review");
    expect(prevStep("basics")).toBe("basics");
    expect(nextStep("basics")).toBe("spaces");
    expect(prevStep("review")).toBe("contact");
  });

  it("labelRfpStep covers every step", () => {
    expect(labelRfpStep("basics")).toBe("Event basics");
    expect(labelRfpStep("review")).toBe("Review & submit");
  });
});

describe("draftToSubmitVariables", () => {
  it("emits the wire shape with required fields populated", () => {
    const vars = draftToSubmitVariables(draft, ["prop-paris-001"]);
    expect(vars).toMatchObject({
      organizer: "Sophia Chen",
      eventName: "Pinnacle Q3 Offsite",
      attendees: 40,
      preferredHotelIds: ["prop-paris-001"],
      cateringRequirements: "Plated dinner each evening, vegetarian-forward",
    });
  });

  it("drops empty optional text fields", () => {
    const vars = draftToSubmitVariables(
      { ...draft, cateringRequirements: "  ", additionalRequirements: "" },
      ["prop-paris-001"],
    );
    expect(vars).not.toHaveProperty("cateringRequirements");
    expect(vars).not.toHaveProperty("additionalRequirements");
  });

  it("includes guestRoomsPerNight only when positive", () => {
    expect(
      draftToSubmitVariables({ ...draft, guestRoomsPerNight: null }, ["x"]),
    ).not.toHaveProperty("guestRoomsPerNight");
    expect(
      draftToSubmitVariables({ ...draft, guestRoomsPerNight: 0 }, ["x"]),
    ).not.toHaveProperty("guestRoomsPerNight");
    expect(
      draftToSubmitVariables({ ...draft, guestRoomsPerNight: 12 }, ["x"]),
    ).toMatchObject({ guestRoomsPerNight: 12 });
  });
});

describe("RFP status tone + cancellability", () => {
  it("buckets statuses into tones", () => {
    expect(rfpStatusTone("DRAFT")).toBe("draft");
    expect(rfpStatusTone("SUBMITTED")).toBe("active");
    expect(rfpStatusTone("PROPOSAL_SENT")).toBe("active");
    expect(rfpStatusTone("ACCEPTED")).toBe("won");
    expect(rfpStatusTone("CANCELLED")).toBe("lost");
    expect(rfpStatusTone("UNKNOWN")).toBe("neutral");
  });

  it("formats labels", () => {
    expect(labelRfpStatus("PROPOSAL_SENT")).toBe("Proposal sent");
    expect(labelRfpStatus("UNHANDLED")).toBe("UNHANDLED");
  });

  it("only allows guest-side cancel for in-flight statuses", () => {
    expect(isRfpCancellable("SUBMITTED")).toBe(true);
    expect(isRfpCancellable("PROPOSAL_SENT")).toBe(true);
    expect(isRfpCancellable("ACCEPTED")).toBe(false);
    expect(isRfpCancellable("CANCELLED")).toBe(false);
  });
});
