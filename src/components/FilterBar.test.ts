// Pure-function tests for the filter-bar carry-forward logic. These pin the
// guarantee that applying any single filter pill preserves every other
// active filter — the bug we just fixed.

import { describe, it, expect } from "vitest";
import { buildHiddenFilterInputs, type FilterState } from "./FilterBar";

const baseState: FilterState = {
  destination: "Paris",
  checkIn: "2026-09-01",
  checkOut: "2026-09-04",
  rooms: 1,
  adults: 1,
  children: 0,
  childAges: [],
};

const lookup = (inputs: { name: string; value: string }[], name: string) =>
        inputs.find((i) => i.name === name)?.value;

describe("buildHiddenFilterInputs — search-bar context", () => {
  it("emits destination, dates, guests for the empty filter state", () => {
    const out = buildHiddenFilterInputs(baseState);
    expect(lookup(out, "destination")).toBe("Paris");
    expect(lookup(out, "checkIn")).toBe("2026-09-01");
    expect(lookup(out, "checkOut")).toBe("2026-09-04");
    expect(lookup(out, "rooms")).toBe("1");
    expect(lookup(out, "adults")).toBe("1");
  });

  it("does not emit children or childAges when children = 0", () => {
    const out = buildHiddenFilterInputs(baseState);
    expect(lookup(out, "children")).toBeUndefined();
    expect(lookup(out, "childAges")).toBeUndefined();
  });

  it("emits children + childAges when children > 0", () => {
    const out = buildHiddenFilterInputs({ ...baseState, children: 2, childAges: [4, 11] });
    expect(lookup(out, "children")).toBe("2");
    expect(lookup(out, "childAges")).toBe("4,11");
  });

  it("emits brandId when the search is brand-scoped", () => {
    const out = buildHiddenFilterInputs({ ...baseState, brandId: "brand-mai-001" });
    expect(lookup(out, "brandId")).toBe("brand-mai-001");
  });
});

describe("buildHiddenFilterInputs — preserves all active filters", () => {
  // The state with every kind of filter applied.
  const fullState: FilterState = {
    ...baseState,
    minStarRating: 5,
    minGuestRating: 9,
    brandTiers: ["LUXURY", "PREMIUM"],
    brandIds: ["brand-mai-001", "brand-aur-001"],
    minNightlyRate: 200,
    maxNightlyRate: 800,
    hasPool: true,
    hasSpa: true,
    hasGolf: false,
    hasFreeBreakfast: true,
    petsAllowed: true,
  };

  it("carries forward every filter when nothing is excluded", () => {
    const out = buildHiddenFilterInputs(fullState);
    expect(lookup(out, "minStarRating")).toBe("5");
    expect(lookup(out, "minGuestRating")).toBe("9");
    expect(lookup(out, "brandTiers")).toBe("LUXURY,PREMIUM");
    expect(lookup(out, "brandIds")).toBe("brand-mai-001,brand-aur-001");
    expect(lookup(out, "minNightlyRate")).toBe("200");
    expect(lookup(out, "maxNightlyRate")).toBe("800");
    expect(lookup(out, "hasPool")).toBe("true");
    expect(lookup(out, "hasSpa")).toBe("true");
    expect(lookup(out, "hasFreeBreakfast")).toBe("true");
    expect(lookup(out, "petsAllowed")).toBe("true");
  });

  it("does NOT emit boolean flags that are false", () => {
    const out = buildHiddenFilterInputs(fullState);
    // hasGolf is false in fullState
    expect(lookup(out, "hasGolf")).toBeUndefined();
  });

  it("excludes the price keys when PriceFilter is the active pill", () => {
    const out = buildHiddenFilterInputs(fullState, ["minNightlyRate", "maxNightlyRate"]);
    expect(lookup(out, "minNightlyRate")).toBeUndefined();
    expect(lookup(out, "maxNightlyRate")).toBeUndefined();
    // Other filters survive.
    expect(lookup(out, "minStarRating")).toBe("5");
    expect(lookup(out, "brandTiers")).toBe("LUXURY,PREMIUM");
    expect(lookup(out, "hasPool")).toBe("true");
  });

  it("excludes brandIds when BrandFilter is the active pill", () => {
    const out = buildHiddenFilterInputs(fullState, ["brandIds"]);
    expect(lookup(out, "brandIds")).toBeUndefined();
    // Tier and other filters still flow through.
    expect(lookup(out, "brandTiers")).toBe("LUXURY,PREMIUM");
    expect(lookup(out, "hasPool")).toBe("true");
  });

  it("excludes brandTiers when TierFilter is the active pill", () => {
    const out = buildHiddenFilterInputs(fullState, ["brandTiers"]);
    expect(lookup(out, "brandTiers")).toBeUndefined();
    expect(lookup(out, "brandIds")).toBe("brand-mai-001,brand-aur-001");
  });

  it("excludes minGuestRating when GuestRatingFilter is the active pill", () => {
    const out = buildHiddenFilterInputs(fullState, ["minGuestRating"]);
    expect(lookup(out, "minGuestRating")).toBeUndefined();
    expect(lookup(out, "minStarRating")).toBe("5");
  });

  it("excludes ALL amenity flags when AmenitiesFilter is the active pill", () => {
    const amenityKeys = ["hasFreeBreakfast", "hasPool", "hasSpa", "hasGolf", "petsAllowed"];
    const out = buildHiddenFilterInputs(fullState, amenityKeys);
    for (const k of amenityKeys) {
      expect(lookup(out, k)).toBeUndefined();
    }
    // Non-amenity filters survive.
    expect(lookup(out, "brandTiers")).toBe("LUXURY,PREMIUM");
    expect(lookup(out, "minStarRating")).toBe("5");
    expect(lookup(out, "minNightlyRate")).toBe("200");
  });
});

describe("buildHiddenFilterInputs — edge cases", () => {
  it("handles undefined arrays gracefully", () => {
    const out = buildHiddenFilterInputs({ ...baseState, brandIds: undefined, brandTiers: undefined });
    expect(lookup(out, "brandIds")).toBeUndefined();
    expect(lookup(out, "brandTiers")).toBeUndefined();
  });

  it("handles empty arrays gracefully", () => {
    const out = buildHiddenFilterInputs({ ...baseState, brandIds: [], brandTiers: [] });
    expect(lookup(out, "brandIds")).toBeUndefined();
    expect(lookup(out, "brandTiers")).toBeUndefined();
  });

  it("doesn't double-emit when the same key is excluded but not set", () => {
    // Even if excluding lists a key that's not in active, no error should occur.
    const out = buildHiddenFilterInputs(baseState, ["minNightlyRate"]);
    expect(out.find((i) => i.name === "minNightlyRate")).toBeUndefined();
  });

  it("preserves order of keys for deterministic form output", () => {
    const out = buildHiddenFilterInputs({ ...baseState, hasPool: true, hasSpa: true });
    const names = out.map((i) => i.name);
    // destination should come before pool/spa.
    expect(names.indexOf("destination")).toBeLessThan(names.indexOf("hasPool"));
    expect(names.indexOf("hasPool")).toBeLessThan(names.indexOf("hasSpa"));
  });
});
