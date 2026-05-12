import { describe, it, expect } from "vitest";
import type { GuestState } from "./guests";
import {
  DEFAULT_GUESTS,
  MAX_CHILD_AGE,
  MAX_GUESTS_PER_ROOM,
  MAX_ROOMS,
  MIN_CHILD_AGE,
  MIN_ROOMS,
  decAdults,
  decChildren,
  decRooms,
  fromSearchParams,
  incAdults,
  incChildren,
  incRooms,
  maxAdults,
  maxChildren,
  setChildAge,
  summarise,
  toSearchParams,
  totalGuests,
} from "./guests";

describe("guests — defaults", () => {
  it("default state is the smallest valid party (1 room, 1 adult, 0 children)", () => {
    expect(DEFAULT_GUESTS).toEqual({ rooms: 1, adults: 1, children: 0, childAges: [] });
    expect(MIN_ROOMS).toBe(1);
  });
});

describe("incAdults / decAdults", () => {
  it("incrementing adults stays within room capacity", () => {
    let s = DEFAULT_GUESTS;
    for (let i = 0; i < 10; i++) s = incAdults(s);
    expect(s.adults).toBe(MAX_GUESTS_PER_ROOM); // capped at 8 with 1 room
  });

  it("incrementing is capped by combined capacity (rooms × 8) when children are present", () => {
    const initial: GuestState = { rooms: 2, adults: 5, children: 11, childAges: Array(11).fill(8) };
    expect(maxAdults(initial)).toBe(MAX_GUESTS_PER_ROOM * 2 - 11); // 5
    const next = incAdults(initial);
    expect(next.adults).toBe(5); // already at max
  });

  it("decrementing cannot drop below 1 adult per room", () => {
    let s: GuestState = { ...DEFAULT_GUESTS, rooms: 2, adults: 2 };
    s = decAdults(s);
    expect(s.adults).toBe(2); // floor is rooms × 1
    s = decAdults(s);
    expect(s.adults).toBe(2);
  });

  it("decrementing works above the floor", () => {
    let s: GuestState = { rooms: 1, adults: 4, children: 0, childAges: [] };
    s = decAdults(s);
    expect(s.adults).toBe(3);
  });

  it("cannot drop adults below the default 1", () => {
    let s = DEFAULT_GUESTS;
    s = decAdults(s);
    expect(s).toEqual(DEFAULT_GUESTS);
  });
});

describe("incChildren / decChildren", () => {
  it("each child gets a default age", () => {
    let s = DEFAULT_GUESTS;
    s = incChildren(s);
    expect(s.children).toBe(1);
    expect(s.childAges).toHaveLength(1);
    expect(s.childAges[0]).toBeGreaterThanOrEqual(MIN_CHILD_AGE);
    expect(s.childAges[0]).toBeLessThanOrEqual(MAX_CHILD_AGE);
  });

  it("decrementing removes the trailing child age", () => {
    let s: GuestState = { ...DEFAULT_GUESTS, children: 3, childAges: [4, 9, 12] };
    s = decChildren(s);
    expect(s.children).toBe(2);
    expect(s.childAges).toEqual([4, 9]);
  });

  it("cannot go below 0 children", () => {
    let s = DEFAULT_GUESTS;
    s = decChildren(s);
    expect(s.children).toBe(0);
    expect(s.childAges).toEqual([]);
  });

  it("respects the rooms × 8 combined cap", () => {
    let s: GuestState = { rooms: 1, adults: 2, children: 0, childAges: [] };
    expect(maxChildren(s)).toBe(6); // 8 - 2 adults
    for (let i = 0; i < 10; i++) s = incChildren(s);
    expect(s.children).toBe(6);
    expect(s.childAges).toHaveLength(6);
    expect(totalGuests(s)).toBe(MAX_GUESTS_PER_ROOM);
  });
});

describe("incRooms / decRooms", () => {
  it("incRooms is capped at MAX_ROOMS", () => {
    let s = DEFAULT_GUESTS;
    for (let i = 0; i < MAX_ROOMS + 5; i++) s = incRooms(s);
    expect(s.rooms).toBe(MAX_ROOMS);
  });

  it("decRooms is floored at MIN_ROOMS = 1", () => {
    let s = DEFAULT_GUESTS;
    s = decRooms(s);
    expect(s.rooms).toBe(MIN_ROOMS);
    expect(MIN_ROOMS).toBe(1);
  });

  it("incRooms does NOT auto-bump adults — picker is capacity, not enforcement", () => {
    // Reported as a UX bug: a guest who chose 1 adult and then
    // bumped rooms to 2 saw the adult count silently jump to 2.
    // The "≥1 adult per room" floor is now a submit-side concern
    // (when the booking actually needs that guarantee), not a
    // picker-side auto-correction. Lets the guest book 2 rooms
    // with 1 adult — common when paying for an adjoining room
    // while staying in one, or pre-booking for a group leader.
    let s: GuestState = { rooms: 1, adults: 1, children: 0, childAges: [] };
    s = incRooms(s);
    expect(s.rooms).toBe(2);
    expect(s.adults).toBe(1);
  });

  it("incRooms keeps existing adults when already above the floor", () => {
    let s: GuestState = { rooms: 1, adults: 4, children: 0, childAges: [] };
    s = incRooms(s);
    expect(s.rooms).toBe(2);
    expect(s.adults).toBe(4);
  });

  it("decRooms trims children first when over capacity", () => {
    let s: GuestState = { rooms: 2, adults: 5, children: 11, childAges: Array(11).fill(7) };
    s = decRooms(s);
    expect(s.rooms).toBe(1);
    expect(s.adults).toBe(5);
    expect(s.children).toBe(3);
    expect(s.childAges).toHaveLength(3);
    expect(totalGuests(s)).toBe(8);
  });

  it("decRooms trims adults if children alone don't free enough seats", () => {
    let s: GuestState = { rooms: 2, adults: 14, children: 0, childAges: [] };
    s = decRooms(s);
    expect(s.rooms).toBe(1);
    expect(s.adults).toBe(MAX_GUESTS_PER_ROOM);
  });

  it("decRooms preserves the per-room adult floor", () => {
    let s: GuestState = { rooms: 3, adults: 3, children: 0, childAges: [] };
    s = decRooms(s);
    expect(s.rooms).toBe(2);
    expect(s.adults).toBeGreaterThanOrEqual(2);
  });
});

describe("setChildAge", () => {
  it("clamps to the legal age range", () => {
    let s: GuestState = { ...DEFAULT_GUESTS, children: 1, childAges: [5] };
    expect(setChildAge(s, 0, 99).childAges[0]).toBe(MAX_CHILD_AGE);
    expect(setChildAge(s, 0, -3).childAges[0]).toBe(MIN_CHILD_AGE);
  });

  it("ignores invalid indices", () => {
    const s: GuestState = { ...DEFAULT_GUESTS, children: 1, childAges: [5] };
    expect(setChildAge(s, 99, 12)).toEqual(s);
    expect(setChildAge(s, -1, 12)).toEqual(s);
  });

  it("only mutates the targeted index", () => {
    const s: GuestState = { ...DEFAULT_GUESTS, children: 3, childAges: [4, 8, 12] };
    const next = setChildAge(s, 1, 6);
    expect(next.childAges).toEqual([4, 6, 12]);
  });
});

describe("toSearchParams / fromSearchParams round-trip", () => {
  it("round-trips the default", () => {
    const round = fromSearchParams(toSearchParams(DEFAULT_GUESTS));
    expect(round).toEqual(DEFAULT_GUESTS);
  });

  it("round-trips a simple case", () => {
    const s = { rooms: 2, adults: 4, children: 0, childAges: [] };
    const round = fromSearchParams(toSearchParams(s));
    expect(round).toEqual(s);
  });

  it("round-trips with children + ages", () => {
    const s = { rooms: 2, adults: 3, children: 2, childAges: [4, 11] };
    const round = fromSearchParams(toSearchParams(s));
    expect(round).toEqual(s);
  });

  it("does not include children/ages when children = 0", () => {
    const out = toSearchParams({ rooms: 1, adults: 2, children: 0, childAges: [] });
    expect(out).not.toHaveProperty("children");
    expect(out).not.toHaveProperty("childAges");
  });

  it("clamps malformed input to legal values", () => {
    const round = fromSearchParams({ rooms: "99", adults: "0", children: "9", childAges: "200,-5" });
    expect(round.rooms).toBe(MAX_ROOMS);
    expect(round.adults).toBeGreaterThanOrEqual(1);
    expect(round.children).toBeLessThanOrEqual(round.rooms * MAX_GUESTS_PER_ROOM - round.adults);
    expect(round.childAges.every((a) => a >= MIN_CHILD_AGE && a <= MAX_CHILD_AGE)).toBe(true);
  });

  it("pads childAges to match children when fewer ages provided", () => {
    const round = fromSearchParams({ rooms: "1", adults: "2", children: "3", childAges: "5" });
    expect(round.children).toBe(3);
    expect(round.childAges).toHaveLength(3);
  });

  it("trims childAges when too many provided", () => {
    const round = fromSearchParams({ rooms: "1", adults: "2", children: "1", childAges: "4,7,10" });
    expect(round.children).toBe(1);
    expect(round.childAges).toEqual([4]);
  });

  it("ignores unparseable children value", () => {
    const round = fromSearchParams({ rooms: "1", adults: "2", children: "not-a-number" });
    expect(round.children).toBe(0);
    expect(round.childAges).toEqual([]);
  });
});

describe("summarise", () => {
  it("singular vs plural", () => {
    expect(summarise({ rooms: 1, adults: 1, children: 0, childAges: [] }))
            .toBe("1 adult · 1 room");
    expect(summarise({ rooms: 2, adults: 3, children: 1, childAges: [5] }))
            .toBe("3 adults · 1 child · 2 rooms");
    expect(summarise({ rooms: 1, adults: 2, children: 2, childAges: [3, 9] }))
            .toBe("2 adults · 2 children · 1 room");
  });
});
