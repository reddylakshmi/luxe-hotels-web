import { describe, expect, it } from "vitest";
import { DEFAULT_GUESTS } from "./guests";
import { resolveStay } from "./stay";
import { serializeStayLink, stayLink } from "./stayLink";

const stay = resolveStay({ checkIn: "2026-08-01", checkOut: "2026-08-04" });

describe("serializeStayLink", () => {
  it("carries dates + rooms + adults at minimum", () => {
    const qs = serializeStayLink({ stay, guests: { ...DEFAULT_GUESTS, rooms: 2, adults: 4 } });
    expect(qs).toContain("checkIn=2026-08-01");
    expect(qs).toContain("checkOut=2026-08-04");
    expect(qs).toContain("rooms=2");
    expect(qs).toContain("adults=4");
  });

  it("omits children + childAges when children=0", () => {
    const qs = serializeStayLink({ stay, guests: DEFAULT_GUESTS });
    expect(qs).not.toContain("children=");
    expect(qs).not.toContain("childAges=");
  });

  it("includes children + childAges when set", () => {
    const qs = serializeStayLink({
      stay,
      guests: { rooms: 2, adults: 4, children: 2, childAges: [6, 11] },
    });
    expect(qs).toContain("children=2");
    expect(qs).toContain("childAges=6%2C11"); // URLSearchParams encodes commas
  });

  it("includes currency when provided", () => {
    const qs = serializeStayLink({ stay, guests: DEFAULT_GUESTS, currency: "EUR" });
    expect(qs).toContain("currency=EUR");
  });

  it("omits currency when undefined (avoids forcing a default downstream)", () => {
    const qs = serializeStayLink({ stay, guests: DEFAULT_GUESTS });
    expect(qs).not.toContain("currency=");
  });

  it("carries specialRateCode through when not the default", () => {
    const qs = serializeStayLink({
      stay, guests: DEFAULT_GUESTS, specialRateCode: "AAA_CAA",
    });
    expect(qs).toContain("specialRateCode=AAA_CAA");
  });

  it("omits specialRateCode when it's the default BEST_AVAILABLE", () => {
    // BEST_AVAILABLE == "no filter applied" — keeps URLs tidy on
    // the common case where the guest didn't pick anything.
    const qs = serializeStayLink({
      stay, guests: DEFAULT_GUESTS, specialRateCode: "BEST_AVAILABLE",
    });
    expect(qs).not.toContain("specialRateCode=");
  });

  it("carries corporateCode only when paired with CORPORATE rate", () => {
    const withCorp = serializeStayLink({
      stay, guests: DEFAULT_GUESTS,
      specialRateCode: "CORPORATE", corporateCode: "ACME-2026",
    });
    expect(withCorp).toContain("specialRateCode=CORPORATE");
    expect(withCorp).toContain("corporateCode=ACME-2026");

    const orphanCode = serializeStayLink({
      stay, guests: DEFAULT_GUESTS,
      specialRateCode: "AAA_CAA", corporateCode: "leftover-stale-value",
    });
    expect(orphanCode).not.toContain("corporateCode=");
  });

  it("carries usePoints=true when set", () => {
    const on = serializeStayLink({ stay, guests: DEFAULT_GUESTS, usePoints: true });
    expect(on).toContain("usePoints=true");
    const off = serializeStayLink({ stay, guests: DEFAULT_GUESTS, usePoints: false });
    expect(off).not.toContain("usePoints=");
  });
});

describe("stayLink", () => {
  it("composes path + querystring", () => {
    const url = stayLink("/hotels/abc/rates", {
      stay,
      guests: { ...DEFAULT_GUESTS, rooms: 2 },
    });
    expect(url).toMatch(/^\/hotels\/abc\/rates\?/);
    expect(url).toContain("rooms=2");
  });

  it("preserves dates + guests even when currency is omitted", () => {
    const url = stayLink("/hotels/abc/rates", {
      stay,
      guests: { ...DEFAULT_GUESTS, rooms: 2, adults: 4 },
    });
    expect(url).toContain("checkIn=2026-08-01");
    expect(url).toContain("rooms=2");
    expect(url).not.toContain("currency=");
  });
});
