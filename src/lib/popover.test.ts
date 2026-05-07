import { describe, it, expect } from "vitest";
import { clamp, placePopover, type Rect } from "./popover";

const VP = { width: 1440, height: 900 };
const ANCHOR_BASE: Rect = { top: 100, left: 200, right: 600, bottom: 140, width: 400, height: 40 };

describe("placePopover", () => {
  it("places popover just below the anchor when there's room", () => {
    const p = placePopover(ANCHOR_BASE, { width: 320, height: 200 }, VP);
    expect(p.top).toBe(140 + 8);
    expect(p.flipped).toBe(false);
  });

  it("aligns end to the anchor's right edge by default", () => {
    const p = placePopover(ANCHOR_BASE, { width: 320, height: 200 }, VP);
    expect(p.left).toBe(600 - 320); // anchor.right − width
  });

  it("aligns start to the anchor's left edge when requested", () => {
    const p = placePopover(ANCHOR_BASE, { width: 320, height: 200 }, VP, "start");
    expect(p.left).toBe(200);
  });

  it("clamps to the right viewport edge when popover would overflow", () => {
    // Anchor sits near the right; aligning popover.left = anchor.left would
    // push it past the viewport. Clamp pulls it back.
    const anchor: Rect = { ...ANCHOR_BASE, left: 1100, right: 1300, width: 200 };
    const p = placePopover(anchor, { width: 500, height: 200 }, VP, "start");
    // Cannot exceed viewport.width − width − margin = 1440 − 500 − 8 = 932.
    expect(p.left).toBe(932);
  });

  it("clamps to the left viewport edge", () => {
    const anchor: Rect = { ...ANCHOR_BASE, left: -50, right: 100, width: 150 };
    const p = placePopover(anchor, { width: 400, height: 200 }, VP, "start");
    expect(p.left).toBe(8); // edge margin
  });

  it("flips above the anchor when there's not enough room below", () => {
    const anchor: Rect = { ...ANCHOR_BASE, top: 700, bottom: 740 }; // close to bottom
    const p = placePopover(anchor, { width: 320, height: 400 }, VP);
    expect(p.flipped).toBe(true);
    expect(p.top).toBe(700 - 400 - 8);
  });

  it("does not flip when both above and below are tight (prefers below)", () => {
    const anchor: Rect = { ...ANCHOR_BASE, top: 400, bottom: 440 };
    const p = placePopover(anchor, { width: 320, height: 200 }, VP);
    expect(p.flipped).toBe(false);
  });

  it("never returns coordinates that are below 0", () => {
    const tinyVP = { width: 320, height: 480 };
    const anchor: Rect = { top: 0, left: 0, right: 320, bottom: 40, width: 320, height: 40 };
    const p = placePopover(anchor, { width: 600, height: 600 }, tinyVP);
    expect(p.top).toBeGreaterThanOrEqual(0);
    expect(p.left).toBeGreaterThanOrEqual(0);
  });
});

describe("clamp", () => {
  it("clamps to bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});
