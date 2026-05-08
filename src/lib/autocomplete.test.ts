import { describe, it, expect } from "vitest";
import {
  destinationFor,
  flattenGroups,
  groupSuggestions,
  nextHighlightedIndex,
  SUGGESTION_GROUP_ORDER,
} from "./autocomplete";
import type { DestinationSuggestion } from "@/types/graphql";

const city = (label: string, country = "France"): DestinationSuggestion => ({
  type: "CITY", label, sublabel: `${country} · 1 hotel`,
  city: label, country, countryCode: "FR",
});

const country = (label: string): DestinationSuggestion => ({
  type: "COUNTRY", label, sublabel: "5 hotels", country: label, countryCode: "FR",
});

const hotel = (label: string, id = "prop-x"): DestinationSuggestion => ({
  type: "HOTEL", label, sublabel: "5 Avenue Montaigne, Paris, France",
  hotelId: id, hotelSlug: "x", city: "Paris", country: "France", countryCode: "FR",
});

describe("groupSuggestions", () => {
  it("groups items by type in canonical order (CITY, COUNTRY, HOTEL)", () => {
    const out = groupSuggestions([
      hotel("The Grand Palais Paris"),
      country("France"),
      city("Paris"),
    ]);
    expect(out.map((g) => g.type)).toEqual(["CITY", "COUNTRY", "HOTEL"]);
  });

  it("skips empty groups", () => {
    expect(groupSuggestions([city("Paris")]).map((g) => g.type)).toEqual(["CITY"]);
    expect(groupSuggestions([])).toEqual([]);
  });

  it("preserves original order within each group", () => {
    const out = groupSuggestions([city("Paris"), city("Provence")]);
    expect(out[0].items.map((i) => i.label)).toEqual(["Paris", "Provence"]);
  });

  it("uses human-readable headings", () => {
    const out = groupSuggestions([city("Paris"), country("France"), hotel("X")]);
    expect(out.map((g) => g.heading)).toEqual(["Cities", "Countries", "Hotels"]);
  });
});

describe("flattenGroups", () => {
  it("returns items in display order across groups", () => {
    const groups = groupSuggestions([
      hotel("H1"), country("France"), city("Paris"), hotel("H2"),
    ]);
    expect(flattenGroups(groups).map((i) => i.label)).toEqual([
      "Paris", "France", "H1", "H2",
    ]);
  });
});

describe("nextHighlightedIndex", () => {
  it("starts at 0 when going down from no selection", () => {
    expect(nextHighlightedIndex(-1, 5, "down")).toBe(0);
  });

  it("starts at the last item when going up from no selection", () => {
    expect(nextHighlightedIndex(-1, 5, "up")).toBe(4);
  });

  it("wraps around at the bottom", () => {
    expect(nextHighlightedIndex(4, 5, "down")).toBe(0);
  });

  it("wraps around at the top", () => {
    expect(nextHighlightedIndex(0, 5, "up")).toBe(4);
  });

  it("returns -1 when the list is empty", () => {
    expect(nextHighlightedIndex(0, 0, "down")).toBe(-1);
  });
});

describe("destinationFor", () => {
  it("returns the city name for a CITY suggestion", () => {
    expect(destinationFor(city("Paris"))).toEqual({ text: "Paris" });
  });

  it("returns the country name for a COUNTRY suggestion", () => {
    expect(destinationFor(country("France"))).toEqual({ text: "France" });
  });

  it("returns the hotel name and id for a HOTEL suggestion", () => {
    expect(destinationFor(hotel("The Grand Palais Paris", "prop-paris-001"))).toEqual({
      text: "The Grand Palais Paris",
      hotelId: "prop-paris-001",
    });
  });

  it("falls back to the label when city/country is missing", () => {
    const fallback: DestinationSuggestion = { type: "CITY", label: "Paris" };
    expect(destinationFor(fallback)).toEqual({ text: "Paris" });
  });
});

describe("SUGGESTION_GROUP_ORDER constant", () => {
  it("lists exactly the three suggestion types", () => {
    expect(SUGGESTION_GROUP_ORDER).toHaveLength(3);
    expect(new Set(SUGGESTION_GROUP_ORDER)).toEqual(
      new Set(["CITY", "COUNTRY", "HOTEL"]),
    );
  });
});
