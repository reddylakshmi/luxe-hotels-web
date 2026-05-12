import { describe, expect, it } from "vitest";
import { truncateExcerpt } from "./truncate";

describe("truncateExcerpt", () => {
  it("returns the original text when it fits under the limit", () => {
    const text = "A short excerpt";
    expect(truncateExcerpt(text, 160)).toBe(text);
  });

  it("breaks at a word boundary before the limit and appends an ellipsis", () => {
    const text =
      "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi";
    const out = truncateExcerpt(text, 60);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(61);
    // Stronger guarantee than "doesn't end with a letter": the
    // tokens before the ellipsis must be a strict prefix of the
    // source's tokens — i.e. the cut never slices through a word.
    const outTokens = out.slice(0, -1).trim().split(/\s+/);
    const srcTokens = text.split(/\s+/);
    expect(srcTokens.slice(0, outTokens.length)).toEqual(outTokens);
  });

  it("hard-cuts when the substring has no whitespace (one giant token)", () => {
    const token = "x".repeat(200);
    const out = truncateExcerpt(token, 50);
    expect(out).toBe("x".repeat(50) + "…");
  });

  it("strips trailing punctuation from the clipped tail", () => {
    const text = "Wow. So many features. Such design. Really great. Yes.".repeat(4);
    const out = truncateExcerpt(text, 30);
    // Whatever the cut, the character just before the ellipsis
    // should not be punctuation.
    expect(out).not.toMatch(/[.,;:!?]…$/);
    expect(out.endsWith("…")).toBe(true);
  });

  it("returns empty string for null / undefined / empty input", () => {
    expect(truncateExcerpt(null)).toBe("");
    expect(truncateExcerpt(undefined)).toBe("");
    expect(truncateExcerpt("")).toBe("");
    expect(truncateExcerpt("   ")).toBe("");
  });

  it("trims leading/trailing whitespace before measuring length", () => {
    const text = "   Already short   ";
    expect(truncateExcerpt(text, 50)).toBe("Already short");
  });

  it("defaults max to 160 chars", () => {
    const text = "x".repeat(300);
    const out = truncateExcerpt(text);
    expect(out.length).toBeLessThanOrEqual(161);
  });
});
