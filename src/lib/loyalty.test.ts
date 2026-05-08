import { describe, it, expect } from "vitest";
import {
  LOYALTY_TIERS,
  tierLabel,
  tierIndex,
  tierBadgeTone,
  formatPoints,
  formatPointsDelta,
  transactionLabel,
  tierProgressPctClamped,
  nightsToNextTierText,
  pointsToCashUSD,
  clampPointsRedemption,
  USD_PER_POINT,
  POINTS_REDEMPTION_STEP,
} from "./loyalty";

describe("LOYALTY_TIERS", () => {
  it("orders the six tiers from MEMBER to AMBASSADOR", () => {
    expect(LOYALTY_TIERS).toEqual([
      "MEMBER", "SILVER", "GOLD", "PLATINUM", "TITANIUM", "AMBASSADOR",
    ]);
  });
});

describe("tierLabel", () => {
  it("title-cases known tiers", () => {
    expect(tierLabel("GOLD")).toBe("Gold");
    expect(tierLabel("AMBASSADOR")).toBe("Ambassador");
  });
  it("handles null + undefined", () => {
    expect(tierLabel(null)).toBe("—");
    expect(tierLabel(undefined)).toBe("—");
  });
});

describe("tierIndex", () => {
  it("returns the position in the tier ladder", () => {
    expect(tierIndex("MEMBER")).toBe(0);
    expect(tierIndex("GOLD")).toBe(2);
    expect(tierIndex("AMBASSADOR")).toBe(5);
  });
  it("returns -1 for unknown tiers", () => {
    expect(tierIndex("BRONZE")).toBe(-1);
    expect(tierIndex(null)).toBe(-1);
  });
});

describe("tierBadgeTone", () => {
  it("returns a non-empty class string for every defined tier", () => {
    for (const t of LOYALTY_TIERS) {
      expect(tierBadgeTone(t)).toMatch(/\S/);
    }
  });
  it("falls back to a neutral tone for unknown input", () => {
    expect(tierBadgeTone("PEWTER")).toMatch(/text-ink/);
  });
});

describe("formatPoints", () => {
  it("uses thousands separators and a 'pts' suffix", () => {
    expect(formatPoints(87500)).toBe("87,500 pts");
    expect(formatPoints(1234567)).toBe("1,234,567 pts");
  });
  it("rounds fractional input", () => {
    expect(formatPoints(99.6)).toBe("100 pts");
  });
  it("returns em-dash for null/undefined/NaN", () => {
    expect(formatPoints(null)).toBe("—");
    expect(formatPoints(undefined)).toBe("—");
    expect(formatPoints(NaN)).toBe("—");
  });
});

describe("formatPointsDelta", () => {
  it("prefixes earnings with +", () => {
    expect(formatPointsDelta("EARN_STAY", 5000)).toBe("+5,000 pts");
    expect(formatPointsDelta("EARN_BONUS", 250)).toBe("+250 pts");
  });
  it("prefixes redemptions / expirations with a real minus sign", () => {
    expect(formatPointsDelta("REDEEM", 2000)).toMatch(/^−/);
    expect(formatPointsDelta("EXPIRE", 1000)).toMatch(/^−/);
    expect(formatPointsDelta("GIFT_OUT", 500)).toMatch(/^−/);
  });
  it("treats unknown types as earnings (defensive)", () => {
    expect(formatPointsDelta("MYSTERY", 100)).toBe("+100 pts");
  });
  it("ignores the sign of the input — it's already classified by type", () => {
    expect(formatPointsDelta("REDEEM", -2000)).toBe("−2,000 pts");
    expect(formatPointsDelta("REDEEM", 2000)).toBe("−2,000 pts");
  });
});

describe("transactionLabel", () => {
  it("maps known transaction types to friendly labels", () => {
    expect(transactionLabel("EARN_STAY")).toBe("Stay");
    expect(transactionLabel("EARN_BONUS")).toBe("Bonus");
    expect(transactionLabel("REDEEM_CERTIFICATE")).toBe("Certificate redemption");
  });
  it("falls back to title-cased enum name for unknown types", () => {
    expect(transactionLabel("AWARDED_BY_GM")).toBe("Awarded By Gm");
  });
});

describe("tierProgressPctClamped", () => {
  it("clamps to [0,100]", () => {
    expect(tierProgressPctClamped(-5, "GOLD")).toBe(0);
    expect(tierProgressPctClamped(56, "GOLD")).toBe(56);
    expect(tierProgressPctClamped(120, "GOLD")).toBe(100);
  });
  it("returns 100 when there's no next tier (top of ladder)", () => {
    expect(tierProgressPctClamped(0, null)).toBe(100);
    expect(tierProgressPctClamped(null, null)).toBe(100);
    expect(tierProgressPctClamped(undefined, undefined)).toBe(100);
  });
  it("returns 0 for missing pct when next tier exists", () => {
    expect(tierProgressPctClamped(null, "PLATINUM")).toBe(0);
    expect(tierProgressPctClamped(NaN, "PLATINUM")).toBe(0);
  });
});

describe("pointsToCashUSD", () => {
  it("uses the standard $0.007/point rate by default", () => {
    expect(pointsToCashUSD(1000)).toBe(7);
    expect(pointsToCashUSD(50000)).toBe(350);
  });
  it("rounds to two decimal places", () => {
    expect(pointsToCashUSD(143)).toBe(1.0); // 1.001 → 1
    expect(pointsToCashUSD(157)).toBe(1.1); // 1.099 → 1.1
  });
  it("returns 0 for null / undefined / non-positive / NaN", () => {
    expect(pointsToCashUSD(null)).toBe(0);
    expect(pointsToCashUSD(undefined)).toBe(0);
    expect(pointsToCashUSD(0)).toBe(0);
    expect(pointsToCashUSD(-100)).toBe(0);
    expect(pointsToCashUSD(NaN)).toBe(0);
  });
  it("respects a custom rate", () => {
    expect(pointsToCashUSD(1000, 0.01)).toBe(10);
  });
});

describe("clampPointsRedemption", () => {
  it("snaps down to the 1,000-point step", () => {
    expect(clampPointsRedemption(12_345, 100_000, 1_000)).toBe(12_000);
    expect(clampPointsRedemption(999, 100_000, 1_000)).toBe(0);
  });
  it("caps at the available balance", () => {
    expect(clampPointsRedemption(50_000, 25_500, 1_000)).toBe(25_000);
  });
  it("caps at what the booking total can absorb", () => {
    // total $70 ÷ $0.007 = 10,000 points max
    expect(clampPointsRedemption(50_000, 100_000, 70)).toBe(10_000);
  });
  it("returns 0 for non-positive / non-finite inputs", () => {
    expect(clampPointsRedemption(0, 100_000, 1_000)).toBe(0);
    expect(clampPointsRedemption(-5, 100_000, 1_000)).toBe(0);
    expect(clampPointsRedemption(NaN, 100_000, 1_000)).toBe(0);
    expect(clampPointsRedemption(50_000, 0, 1_000)).toBe(0);
    expect(clampPointsRedemption(50_000, 100_000, 0)).toBe(0);
  });
  it("respects a custom rate-per-point", () => {
    // total $100 ÷ $0.01 = 10,000 max at the higher rate
    expect(clampPointsRedemption(50_000, 100_000, 100, 0.01)).toBe(10_000);
  });
});

describe("USD_PER_POINT + POINTS_REDEMPTION_STEP", () => {
  it("are sane constants", () => {
    expect(USD_PER_POINT).toBeGreaterThan(0);
    expect(USD_PER_POINT).toBeLessThan(0.05); // sanity
    expect(POINTS_REDEMPTION_STEP).toBe(1000);
  });
});

describe("nightsToNextTierText", () => {
  it("formats with singular vs plural", () => {
    expect(nightsToNextTierText(1, "PLATINUM")).toBe("1 night to Platinum");
    expect(nightsToNextTierText(22, "PLATINUM")).toBe("22 nights to Platinum");
  });
  it("returns null at the top of the ladder", () => {
    expect(nightsToNextTierText(5, null)).toBeNull();
    expect(nightsToNextTierText(null, "PLATINUM")).toBeNull();
    expect(nightsToNextTierText(0, "PLATINUM")).toBeNull();
  });
});
