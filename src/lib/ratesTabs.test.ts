import { describe, expect, it } from "vitest";
import {
  classifyRatePlan,
  partitionRates,
  partitionRoomsByTab,
  rateTabLabel,
} from "./ratesTabs";

describe("classifyRatePlan", () => {
  it("buckets BAR + BEST_AVAILABLE + ADVANCE_PURCHASE into standard", () => {
    expect(classifyRatePlan("BAR")).toBe("standard");
    expect(classifyRatePlan("BEST_AVAILABLE")).toBe("standard");
    expect(classifyRatePlan("ADVANCE_PURCHASE")).toBe("standard");
  });

  it("buckets member / promotional / package / negotiated into deals", () => {
    expect(classifyRatePlan("MEMBER_RATE")).toBe("deals");
    expect(classifyRatePlan("AAA_CAA")).toBe("deals");
    expect(classifyRatePlan("SENIOR")).toBe("deals");
    expect(classifyRatePlan("CORPORATE")).toBe("deals");
    expect(classifyRatePlan("PACKAGE")).toBe("deals");
    expect(classifyRatePlan("PROMOTION")).toBe("deals");
    expect(classifyRatePlan("GROUP")).toBe("deals");
    expect(classifyRatePlan("REDEMPTION")).toBe("deals");
  });

  it("is case-insensitive (handles legacy lowercase / mixed-case payloads)", () => {
    expect(classifyRatePlan("bar")).toBe("standard");
    expect(classifyRatePlan("Best_Available")).toBe("standard");
  });

  it("fails closed for null / undefined / unknown codes — goes to deals", () => {
    expect(classifyRatePlan(null)).toBe("deals");
    expect(classifyRatePlan(undefined)).toBe("deals");
    expect(classifyRatePlan("FUTURE_RATE_TYPE")).toBe("deals");
  });
});

describe("partitionRates", () => {
  it("splits a mixed array into two buckets keyed by tab", () => {
    const rates = [
      { ratePlan: { type: "BEST_AVAILABLE" } },
      { ratePlan: { type: "MEMBER_RATE" } },
      { ratePlan: { type: "PACKAGE" } },
      { ratePlan: { type: "ADVANCE_PURCHASE" } },
    ];
    const out = partitionRates(rates);
    expect(out.standard).toHaveLength(2);
    expect(out.deals).toHaveLength(2);
  });

  it("falls back to ratePlan.code when type is missing", () => {
    const rates = [
      { ratePlan: { type: null, code: "BAR" } },
      { ratePlan: { type: null, code: "MEMBER" } }, // unknown code → deals
    ];
    const out = partitionRates(rates);
    expect(out.standard).toHaveLength(1);
    expect(out.deals).toHaveLength(1);
  });

  it("returns the same object references — no clone", () => {
    const rate = { ratePlan: { type: "BEST_AVAILABLE" } };
    const out = partitionRates([rate]);
    expect(out.standard[0]).toBe(rate);
  });
});

describe("partitionRoomsByTab", () => {
  it("drops rooms from tabs where they have zero matching rates", () => {
    const rooms = [
      {
        id: "rt-standard-only",
        rates: [{ ratePlan: { type: "BEST_AVAILABLE" } }],
      },
      {
        id: "rt-deals-only",
        rates: [{ ratePlan: { type: "PACKAGE" } }],
      },
      {
        id: "rt-both",
        rates: [
          { ratePlan: { type: "BEST_AVAILABLE" } },
          { ratePlan: { type: "MEMBER_RATE" } },
        ],
      },
    ];
    const out = partitionRoomsByTab(rooms);
    expect(out.standard.map((r) => r.id)).toEqual(["rt-standard-only", "rt-both"]);
    expect(out.deals.map((r) => r.id)).toEqual(["rt-deals-only", "rt-both"]);
  });

  it("returns subset rate arrays, not the full original", () => {
    const rooms = [
      {
        id: "rt-mixed",
        rates: [
          { ratePlan: { type: "BEST_AVAILABLE" } },
          { ratePlan: { type: "MEMBER_RATE" } },
        ],
      },
    ];
    const out = partitionRoomsByTab(rooms);
    expect(out.standard[0].rates).toHaveLength(1);
    expect(out.deals[0].rates).toHaveLength(1);
  });

  it("returns empty arrays when no rooms have any rates", () => {
    expect(partitionRoomsByTab([{ id: "x", rates: [] }])).toEqual({
      standard: [],
      deals: [],
    });
  });
});

describe("rateTabLabel", () => {
  it("renders the display string for each tab id", () => {
    expect(rateTabLabel("standard")).toBe("Standard Rates");
    expect(rateTabLabel("deals")).toBe("Deals & Packages");
  });
});
