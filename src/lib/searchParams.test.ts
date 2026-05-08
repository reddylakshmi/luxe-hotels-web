import { describe, it, expect } from "vitest";
import { picker, pickFirst } from "./searchParams";

describe("pickFirst", () => {
  it("returns the value when the key is a single string", () => {
    expect(pickFirst({ q: "Paris" }, "q")).toBe("Paris");
  });

  it("returns the first value when the key is repeated (?q=a&q=b)", () => {
    expect(pickFirst({ q: ["a", "b"] }, "q")).toBe("a");
  });

  it("returns undefined when the key is absent", () => {
    expect(pickFirst({}, "q")).toBeUndefined();
  });

  it("returns undefined when the key is explicitly undefined", () => {
    expect(pickFirst({ q: undefined }, "q")).toBeUndefined();
  });

  it("returns the empty string when the key is set to an empty string", () => {
    // Passing through is intentional — the caller decides whether empty
    // is meaningful.
    expect(pickFirst({ q: "" }, "q")).toBe("");
  });
});

describe("picker", () => {
  it("returns a function that closes over the params", () => {
    const pick = picker({ a: "1", b: ["x", "y"] });
    expect(pick("a")).toBe("1");
    expect(pick("b")).toBe("x");
    expect(pick("missing")).toBeUndefined();
  });
});
