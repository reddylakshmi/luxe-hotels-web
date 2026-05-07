import { describe, it, expect } from "vitest";
import { fromSearchParams, withDefaults } from "./search";

describe("fromSearchParams — filters", () => {
  it("parses price range numerically", () => {
    const r = fromSearchParams({ minNightlyRate: "200", maxNightlyRate: "400" });
    expect(r.minNightlyRate).toBe(200);
    expect(r.maxNightlyRate).toBe(400);
  });

  it("treats empty strings as 'unset' rather than NaN", () => {
    const r = fromSearchParams({ minNightlyRate: "", maxNightlyRate: "" });
    expect(r.minNightlyRate).toBeUndefined();
    expect(r.maxNightlyRate).toBeUndefined();
  });

  it("ignores non-numeric input", () => {
    const r = fromSearchParams({ minNightlyRate: "abc", maxNightlyRate: "$500" });
    expect(r.minNightlyRate).toBeUndefined();
    expect(r.maxNightlyRate).toBeUndefined();
  });

  it("supports floating-point rates", () => {
    const r = fromSearchParams({ minNightlyRate: "199.50" });
    expect(r.minNightlyRate).toBe(199.5);
  });

  it("parses boolean flags", () => {
    const r = fromSearchParams({
      hasPool: "true", hasSpa: "false", hasGolf: "1", hasFreeBreakfast: "0", petsAllowed: undefined,
    });
    expect(r.hasPool).toBe(true);
    expect(r.hasSpa).toBe(false);
    expect(r.hasGolf).toBe(true);
    expect(r.hasFreeBreakfast).toBe(false);
    expect(r.petsAllowed).toBeUndefined();
  });

  it("parses comma-separated multi-value fields (brandIds, brandTiers)", () => {
    const r = fromSearchParams({
      brandIds: "brand-mai-001,brand-aur-001",
      brandTiers: "LUXURY,PREMIUM",
    });
    expect(r.brandIds).toEqual(["brand-mai-001", "brand-aur-001"]);
    expect(r.brandTiers).toEqual(["LUXURY", "PREMIUM"]);
  });

  it("parses repeated array params (?brandIds=a&brandIds=b)", () => {
    const r = fromSearchParams({ brandIds: ["brand-mai-001", "brand-aur-001"] });
    expect(r.brandIds).toEqual(["brand-mai-001", "brand-aur-001"]);
  });

  it("parses minStarRating + minGuestRating with the right numeric type", () => {
    const r = fromSearchParams({ minStarRating: "4", minGuestRating: "8.5" });
    expect(r.minStarRating).toBe(4);
    expect(r.minGuestRating).toBe(8.5);
  });

  it("validates and rejects an unknown sortBy", () => {
    expect(fromSearchParams({ sortBy: "FAKE" }).sortBy).toBeUndefined();
    expect(fromSearchParams({ sortBy: "REVIEWS" }).sortBy).toBe("REVIEWS");
  });

  it("accepts the six supported sort keys", () => {
    for (const k of ["DISTANCE", "PRICE_LOW_TO_HIGH", "CITY", "BRAND", "GUEST_RATING", "REVIEWS"]) {
      expect(fromSearchParams({ sortBy: k }).sortBy).toBe(k);
    }
  });

  it("rejects sort keys that are no longer in the UI vocabulary", () => {
    // STAR_RATING and NAME used to be in the dropdown — keep them out of the
    // accepted set after the sort-options redesign.
    expect(fromSearchParams({ sortBy: "STAR_RATING" }).sortBy).toBeUndefined();
    expect(fromSearchParams({ sortBy: "NAME" }).sortBy).toBeUndefined();
  });
});

describe("withDefaults — filters fan through", () => {
  it("preserves price + amenity filters when defaulting dates/guests", () => {
    const r = withDefaults({
      destination: "Paris",
      minNightlyRate: 250,
      maxNightlyRate: 600,
      minStarRating: 5,
      hasPool: true,
      brandTiers: ["LUXURY"],
    });
    expect(r.minNightlyRate).toBe(250);
    expect(r.maxNightlyRate).toBe(600);
    expect(r.minStarRating).toBe(5);
    expect(r.hasPool).toBe(true);
    expect(r.brandTiers).toEqual(["LUXURY"]);
    // Defaults still apply for the search-bar state.
    expect(r.rooms).toBeGreaterThanOrEqual(1);
    expect(r.adults).toBeGreaterThanOrEqual(1);
  });

  it("a brand-scoped search keeps its brandId alongside other filters", () => {
    const r = withDefaults({
      brandId: "brand-mai-001",
      destination: "Paris",
      minNightlyRate: 300,
      hasFreeBreakfast: true,
    });
    expect(r.brandId).toBe("brand-mai-001");
    expect(r.minNightlyRate).toBe(300);
    expect(r.hasFreeBreakfast).toBe(true);
  });
});
