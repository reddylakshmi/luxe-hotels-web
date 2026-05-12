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
