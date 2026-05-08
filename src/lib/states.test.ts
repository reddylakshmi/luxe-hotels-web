import { describe, it, expect } from "vitest";
import { hasStateDropdown, statesForCountry } from "./states";

describe("statesForCountry", () => {
  it("returns the 51 US states + DC for US", () => {
    const list = statesForCountry("US");
    expect(list).toHaveLength(51);
    expect(list.some((s) => s.code === "DC")).toBe(true);
    expect(list.some((s) => s.code === "CA")).toBe(true);
    expect(list.some((s) => s.code === "NY")).toBe(true);
  });

  it("returns the 13 Canadian provinces and territories for CA", () => {
    const list = statesForCountry("CA");
    expect(list).toHaveLength(13);
    expect(list.find((s) => s.code === "ON")?.name).toBe("Ontario");
    expect(list.find((s) => s.code === "QC")?.name).toBe("Québec");
  });

  it("returns the 36 Indian states and union territories for IN", () => {
    const list = statesForCountry("IN");
    expect(list).toHaveLength(36);
    expect(list.find((s) => s.code === "TG")?.name).toBe("Telangana");
    expect(list.find((s) => s.code === "MH")?.name).toBe("Maharashtra");
  });

  it("returns the 8 Australian states + territories for AU", () => {
    const list = statesForCountry("AU");
    expect(list).toHaveLength(8);
    expect(list.find((s) => s.code === "NSW")?.name).toBe("New South Wales");
  });

  it("returns the 32 Mexican states for MX", () => {
    expect(statesForCountry("MX")).toHaveLength(32);
  });

  it("returns the 27 Brazilian states for BR", () => {
    expect(statesForCountry("BR")).toHaveLength(27);
  });

  it("is case-insensitive on the country code", () => {
    expect(statesForCountry("us")).toHaveLength(51);
    expect(statesForCountry("Ca")).toHaveLength(13);
  });

  it("returns an empty list for countries without a curated subdivision system", () => {
    expect(statesForCountry("FR")).toEqual([]);
    expect(statesForCountry("JP")).toEqual([]);
    expect(statesForCountry("DE")).toEqual([]);
    expect(statesForCountry(undefined)).toEqual([]);
    expect(statesForCountry("")).toEqual([]);
  });

  it("each entry has a non-blank code and name", () => {
    for (const country of ["US", "CA", "IN", "AU", "MX", "BR"]) {
      for (const s of statesForCountry(country)) {
        expect(s.code).toBeTruthy();
        expect(s.name).toBeTruthy();
      }
    }
  });
});

describe("hasStateDropdown", () => {
  it("is true for the curated countries", () => {
    expect(hasStateDropdown("US")).toBe(true);
    expect(hasStateDropdown("CA")).toBe(true);
    expect(hasStateDropdown("AU")).toBe(true);
    expect(hasStateDropdown("IN")).toBe(true);
    expect(hasStateDropdown("MX")).toBe(true);
    expect(hasStateDropdown("BR")).toBe(true);
  });

  it("is false for everything else", () => {
    expect(hasStateDropdown("FR")).toBe(false);
    expect(hasStateDropdown("GB")).toBe(false);
    expect(hasStateDropdown("DE")).toBe(false);
    expect(hasStateDropdown(undefined)).toBe(false);
  });
});
