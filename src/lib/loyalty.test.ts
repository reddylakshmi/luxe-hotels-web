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
