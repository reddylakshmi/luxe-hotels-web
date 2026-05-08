import { describe, it, expect } from "vitest";
import { COUNTRIES, COUNTRIES_ALPHABETICAL, findCountry } from "./countries";

describe("COUNTRIES", () => {
  it("contains every region the platform serves (53 entries)", () => {
    expect(COUNTRIES).toHaveLength(53);
  });

  it("uses ISO 3166-1 alpha-2 codes (2 uppercase letters)", () => {
    for (const c of COUNTRIES) {
      expect(c.code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("has unique country codes", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every entry has a usable phone code in E.164 form", () => {
    for (const c of COUNTRIES) {
      expect(c.phoneCode).toMatch(/^\+\d{1,4}$/);
    }
  });

  it("every entry has an ISO-4217 currency code", () => {
    for (const c of COUNTRIES) {
      expect(c.currency).toMatch(/^[A-Z]{3}$/);
    }
  });

  it("every zipRegex is a valid RegExp", () => {
    for (const c of COUNTRIES) {
      expect(c.zipRegex).toBeInstanceOf(RegExp);
    }
  });
});

describe("findCountry", () => {
  it("looks up by exact code", () => {
    expect(findCountry("US")?.name).toBe("United States");
    expect(findCountry("IN")?.name).toBe("India");
  });

  it("is case-insensitive on input", () => {
    expect(findCountry("us")?.code).toBe("US");
    expect(findCountry("In")?.code).toBe("IN");
  });

  it("returns undefined for unknown codes", () => {
    expect(findCountry("ZZ")).toBeUndefined();
    expect(findCountry("")).toBeUndefined();
    expect(findCountry(undefined)).toBeUndefined();
  });
});

describe("COUNTRIES_ALPHABETICAL", () => {
  it("contains the same set as COUNTRIES", () => {
    expect(COUNTRIES_ALPHABETICAL).toHaveLength(COUNTRIES.length);
    const orig = new Set(COUNTRIES.map((c) => c.code));
    const sorted = new Set(COUNTRIES_ALPHABETICAL.map((c) => c.code));
    expect(sorted).toEqual(orig);
  });

  it("is sorted by display name", () => {
    for (let i = 1; i < COUNTRIES_ALPHABETICAL.length; i++) {
      expect(
        COUNTRIES_ALPHABETICAL[i - 1].name.localeCompare(COUNTRIES_ALPHABETICAL[i].name),
      ).toBeLessThanOrEqual(0);
    }
  });
});

describe("COUNTRIES — zip-pattern correctness", () => {
  // Spot-check that the zip regexes accept canonical examples for a few
  // popular markets. Full coverage of the regex per country would be
  // overkill; this guards the most common cases people will type.
  it.each<[string, string]>([
    ["US", "10022"],
    ["US", "10022-1234"],
    ["GB", "SW1A 1AA"],
    ["GB", "M1 1AE"],
    ["CA", "M5V 3A8"],
    ["FR", "75008"],
    ["DE", "80331"],
    ["IN", "500081"],
    ["JP", "100-0005"],
    ["AU", "2000"],
    ["BR", "01001-000"],
    ["MX", "11000"],
  ])("accepts %s zip %s", (code, zip) => {
    const c = findCountry(code);
    expect(c).toBeDefined();
    expect(c!.zipRegex.test(zip)).toBe(true);
  });

  it.each<[string, string]>([
    ["US", "ABCDE"],
    ["GB", "12345"],
    ["IN", "12345"],
    ["JP", "12-345"],
  ])("rejects %s zip %s", (code, zip) => {
    expect(findCountry(code)!.zipRegex.test(zip)).toBe(false);
  });
});
