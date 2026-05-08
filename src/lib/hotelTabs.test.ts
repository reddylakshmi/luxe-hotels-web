import { describe, it, expect } from "vitest";
import {
  DEFAULT_TAB_ID,
  HOTEL_TABS,
  isValidTabId,
  navigateKey,
  parseTabFromHash,
  type HotelTabId,
} from "./hotelTabs";

describe("HOTEL_TABS constant", () => {
  it("declares exactly the five canonical tabs in order", () => {
    expect(HOTEL_TABS.map((t) => t.id)).toEqual([
      "overview", "rooms", "experiences", "meetings", "location",
    ]);
  });

  it("has a non-empty human-readable label for each tab", () => {
    for (const t of HOTEL_TABS) {
      expect(t.label).toMatch(/\S/);
    }
  });

  it("DEFAULT_TAB_ID is overview (the always-renderable first panel)", () => {
    expect(DEFAULT_TAB_ID).toBe("overview");
  });
});

describe("isValidTabId", () => {
  it.each<HotelTabId>(["overview", "rooms", "experiences", "meetings", "location"])(
    "accepts %s",
    (id) => {
      expect(isValidTabId(id)).toBe(true);
    },
  );

  it.each(["", "bogus", "ROOMS", "rooms ", null, undefined])(
    "rejects %s",
    (v) => {
      expect(isValidTabId(v as string | null | undefined)).toBe(false);
    },
  );
});

describe("parseTabFromHash", () => {
  it("parses with leading #", () => {
    expect(parseTabFromHash("#rooms")).toBe("rooms");
  });

  it("parses without leading #", () => {
    expect(parseTabFromHash("rooms")).toBe("rooms");
  });

  it("is case-insensitive", () => {
    expect(parseTabFromHash("#Rooms")).toBe("rooms");
    expect(parseTabFromHash("#LOCATION")).toBe("location");
  });

  it("trims surrounding whitespace inside the hash fragment", () => {
    expect(parseTabFromHash("#  rooms  ")).toBe("rooms");
  });

  it.each([null, undefined, "", "#", "#unknown", "#abc"])(
    "returns null for %s",
    (h) => {
      expect(parseTabFromHash(h as string | null | undefined)).toBeNull();
    },
  );
});

describe("navigateKey — WAI-ARIA tab pattern", () => {
  it("ArrowRight advances to the next tab", () => {
    expect(navigateKey("ArrowRight", "overview")).toBe("rooms");
    expect(navigateKey("ArrowRight", "rooms")).toBe("experiences");
  });

  it("ArrowRight wraps from the last tab to the first", () => {
    expect(navigateKey("ArrowRight", "location")).toBe("overview");
  });

  it("ArrowLeft moves to the previous tab", () => {
    expect(navigateKey("ArrowLeft", "rooms")).toBe("overview");
    expect(navigateKey("ArrowLeft", "experiences")).toBe("rooms");
  });

  it("ArrowLeft wraps from the first tab to the last", () => {
    expect(navigateKey("ArrowLeft", "overview")).toBe("location");
  });

  it("ArrowDown / ArrowUp behave like ArrowRight / ArrowLeft", () => {
    expect(navigateKey("ArrowDown", "overview")).toBe("rooms");
    expect(navigateKey("ArrowUp", "rooms")).toBe("overview");
  });

  it("Home jumps to the first tab regardless of current", () => {
    expect(navigateKey("Home", "meetings")).toBe("overview");
  });

  it("End jumps to the last tab", () => {
    expect(navigateKey("End", "rooms")).toBe("location");
  });

  it.each(["Tab", "Enter", " ", "Escape", "a", ""])(
    "ignores unrelated key %s and returns null",
    (key) => {
      expect(navigateKey(key, "overview")).toBeNull();
    },
  );

  it("falls back to overview when current is somehow unknown", () => {
    expect(navigateKey("ArrowRight", "bogus" as HotelTabId)).toBe("overview");
  });
});
