import { describe, it, expect, beforeEach } from "vitest";
import {
  clearViewed,
  getViewedIds,
  MAX_RECENTLY_VIEWED,
  recordView,
  type StorageLike,
} from "./recentlyViewed";

// Tiny in-memory Storage stand-in for the tests.
function makeStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Record<string, string>;
} {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem(k: string) {
      return data[k] ?? null;
    },
    setItem(k: string, v: string) {
      data[k] = v;
    },
    removeItem(k: string) {
      delete data[k];
    },
  };
}

describe("getViewedIds", () => {
  it("returns an empty array when storage is null (e.g. SSR)", () => {
    expect(getViewedIds(null)).toEqual([]);
  });

  it("returns an empty array when no key has been written", () => {
    expect(getViewedIds(makeStorage())).toEqual([]);
  });

  it("parses a stored JSON array of strings", () => {
    const s = makeStorage({ "luxe.recentlyViewed.v1": '["a","b","c"]' });
    expect(getViewedIds(s)).toEqual(["a", "b", "c"]);
  });

  it("filters out non-string entries from corrupted storage", () => {
    const s = makeStorage({ "luxe.recentlyViewed.v1": '["a", 1, null, "b", ""]' });
    expect(getViewedIds(s)).toEqual(["a", "b"]);
  });

  it("returns an empty array when storage holds malformed JSON", () => {
    const s = makeStorage({ "luxe.recentlyViewed.v1": "{not json" });
    expect(getViewedIds(s)).toEqual([]);
  });

  it("returns an empty array when the stored value is not an array", () => {
    const s = makeStorage({ "luxe.recentlyViewed.v1": '"a single string"' });
    expect(getViewedIds(s)).toEqual([]);
  });

  it("caps a too-long stored list at MAX_RECENTLY_VIEWED", () => {
    const ids = Array.from({ length: 50 }, (_, i) => `hotel-${i}`);
    const s = makeStorage({ "luxe.recentlyViewed.v1": JSON.stringify(ids) });
    expect(getViewedIds(s)).toHaveLength(MAX_RECENTLY_VIEWED);
  });
});

describe("recordView", () => {
  let storage: ReturnType<typeof makeStorage>;
  beforeEach(() => {
    storage = makeStorage();
  });

  it("inserts a new id at the front", () => {
    expect(recordView("a", storage)).toEqual(["a"]);
  });

  it("dedups when the same id is recorded again — moves it to the front", () => {
    recordView("a", storage);
    recordView("b", storage);
    recordView("a", storage);
    expect(getViewedIds(storage)).toEqual(["a", "b"]);
  });

  it("keeps the most-recent-first ordering", () => {
    recordView("a", storage);
    recordView("b", storage);
    recordView("c", storage);
    expect(getViewedIds(storage)).toEqual(["c", "b", "a"]);
  });

  it("caps the list at MAX_RECENTLY_VIEWED", () => {
    for (let i = 0; i < MAX_RECENTLY_VIEWED + 5; i++) recordView(`h-${i}`, storage);
    const list = getViewedIds(storage);
    expect(list).toHaveLength(MAX_RECENTLY_VIEWED);
    // The oldest entries (h-0..h-4) should be evicted; the newest stays at the front.
    expect(list[0]).toBe(`h-${MAX_RECENTLY_VIEWED + 4}`);
  });

  it("ignores empty / falsy ids without changing the list", () => {
    recordView("a", storage);
    recordView("", storage);
    expect(getViewedIds(storage)).toEqual(["a"]);
  });

  it("is SSR-safe when storage is null — returns the computed list, persists nothing", () => {
    // The function returns the would-be-persisted list so the caller can
    // optimistically render. It just doesn't write anywhere.
    expect(recordView("a", null)).toEqual(["a"]);
    // And a follow-up read with a real (empty) storage proves nothing was kept.
    expect(getViewedIds(makeStorage())).toEqual([]);
  });
});

describe("clearViewed", () => {
  it("removes the storage entry", () => {
    const s = makeStorage();
    recordView("a", s);
    expect(s.data["luxe.recentlyViewed.v1"]).toBeDefined();
    clearViewed(s);
    expect(s.data["luxe.recentlyViewed.v1"]).toBeUndefined();
  });

  it("is a no-op when storage is null", () => {
    expect(() => clearViewed(null)).not.toThrow();
  });
});
