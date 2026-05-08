import { describe, it, expect } from "vitest";
import { imageUrl } from "./image";

describe("imageUrl", () => {
  it("returns the default picsum URL when given no input", () => {
    expect(imageUrl(undefined)).toBe("https://picsum.photos/seed/luxe-default/1200/800");
    expect(imageUrl(null)).toBe("https://picsum.photos/seed/luxe-default/1200/800");
  });

  it("respects custom width and height", () => {
    expect(imageUrl(undefined, { w: 400, h: 300 }))
      .toBe("https://picsum.photos/seed/luxe-default/400/300");
  });

  it("rewrites placeholder cdn.luxe.com URLs to picsum with a deterministic seed", () => {
    const a = imageUrl("https://cdn.luxe.com/paris/exterior.jpg");
    const b = imageUrl("https://cdn.luxe.com/paris/exterior.jpg");
    expect(a).toBe(b); // same input → same image
    expect(a).toMatch(/^https:\/\/picsum\.photos\/seed\/\d+\/1200\/800$/);
  });

  it("rewrites the content.luxehotels.example placeholder host too", () => {
    const u = imageUrl("https://content.luxehotels.example/hotel/abc.jpg");
    expect(u).toMatch(/^https:\/\/picsum\.photos\/seed\/\d+\//);
  });

  it("different placeholder URLs produce different seeds (high probability)", () => {
    const a = imageUrl("https://cdn.luxe.com/a.jpg");
    const b = imageUrl("https://cdn.luxe.com/b.jpg");
    expect(a).not.toBe(b);
  });

  it("passes through real URLs unchanged", () => {
    const real = "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900";
    expect(imageUrl(real)).toBe(real);
  });

  it("seed values fall in the 1..1000 range (per the implementation contract)", () => {
    for (let i = 0; i < 50; i++) {
      const u = imageUrl(`https://cdn.luxe.com/sample-${i}.jpg`);
      const seed = Number(u.match(/seed\/(\d+)\//)?.[1] ?? "0");
      expect(seed).toBeGreaterThanOrEqual(1);
      expect(seed).toBeLessThanOrEqual(1000);
    }
  });
});
