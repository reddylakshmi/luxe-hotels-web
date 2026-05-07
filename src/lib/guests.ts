// Guest selection state for the "Find a hotel" booking form.
//
// Product spec — based on common luxury-hotel booking flows
// (Marriott / Four Seasons / Ritz-Carlton):
//
//   • Rooms:    1 – 9 (each booking is one reservation per room)
//   • Adults:   1 – 8 per room (must have ≥ 1 adult per room)
//   • Children: 0 – 7 per room, ages 0 – 17 (each child carries an age
//                because age-tier rates may apply)
//   • Combined total guests per room must be ≤ 8
//
// All state mutations go through the helpers in this file so the rules
// stay in one place and are independently unit-tested.

// A booking always needs at least 1 room and 1 adult, so the picker opens at
// 1/1/0 — the smallest valid travelling party. The user can only step up
// from there.
export const MIN_ROOMS = 1;
export const MAX_ROOMS = 9;
export const MIN_ADULTS_PER_ROOM = 1;
export const MAX_GUESTS_PER_ROOM = 8;
export const MIN_CHILD_AGE = 0;
export const MAX_CHILD_AGE = 17;
export const DEFAULT_CHILD_AGE = 8;

export type GuestState = {
  rooms: number;
  adults: number;
  children: number;
  childAges: number[];
};

/** Smallest valid travelling party. */
export const DEFAULT_GUESTS: GuestState = {
  rooms: 1,
  adults: 1,
  children: 0,
  childAges: [],
};

// ── Constraints ──────────────────────────────────────────────────────────────

export function maxAdults(state: GuestState): number {
  // Total guest cap is rooms × 8; subtract children that are already added.
  return Math.max(MIN_ADULTS_PER_ROOM * state.rooms, state.rooms * MAX_GUESTS_PER_ROOM - state.children);
}

export function minAdults(state: GuestState): number {
  return MIN_ADULTS_PER_ROOM * state.rooms;
}

export function maxChildren(state: GuestState): number {
  return Math.max(0, state.rooms * MAX_GUESTS_PER_ROOM - state.adults);
}

export function totalGuests(state: GuestState): number {
  return state.adults + state.children;
}

export function totalCapacity(state: GuestState): number {
  return state.rooms * MAX_GUESTS_PER_ROOM;
}

// ── Mutations (pure) ─────────────────────────────────────────────────────────

export function incRooms(state: GuestState): GuestState {
  if (state.rooms >= MAX_ROOMS) return state;
  const nextRooms = state.rooms + 1;
  // Adding a room raises the adult floor (1/room). Bump only if we'd otherwise
  // violate the floor — leave existing adult counts above the floor alone.
  const cap = nextRooms * MAX_GUESTS_PER_ROOM - state.children;
  const adults = Math.min(Math.max(state.adults, MIN_ADULTS_PER_ROOM * nextRooms), cap);
  return { ...state, rooms: nextRooms, adults };
}

export function decRooms(state: GuestState): GuestState {
  if (state.rooms <= MIN_ROOMS) return state;
  const nextRooms = state.rooms - 1;
  const cap = nextRooms * MAX_GUESTS_PER_ROOM;
  // Trim children first (least painful UX), then adults if still over capacity.
  let children = state.children;
  let childAges = state.childAges;
  let adults = state.adults;
  while (adults + children > cap && children > 0) {
    children -= 1;
    childAges = childAges.slice(0, children);
  }
  while (adults + children > cap && adults > MIN_ADULTS_PER_ROOM * nextRooms) {
    adults -= 1;
  }
  // Make sure we still meet the per-room adult floor.
  adults = Math.max(adults, MIN_ADULTS_PER_ROOM * nextRooms);
  return { ...state, rooms: nextRooms, adults, children, childAges };
}

export function incAdults(state: GuestState): GuestState {
  if (state.adults >= maxAdults(state)) return state;
  return { ...state, adults: state.adults + 1 };
}

export function decAdults(state: GuestState): GuestState {
  if (state.adults <= minAdults(state)) return state;
  return { ...state, adults: state.adults - 1 };
}

export function incChildren(state: GuestState): GuestState {
  if (state.children >= maxChildren(state)) return state;
  return {
    ...state,
    children: state.children + 1,
    childAges: [...state.childAges, DEFAULT_CHILD_AGE],
  };
}

export function decChildren(state: GuestState): GuestState {
  if (state.children <= 0) return state;
  return {
    ...state,
    children: state.children - 1,
    childAges: state.childAges.slice(0, state.children - 1),
  };
}

export function setChildAge(state: GuestState, index: number, age: number): GuestState {
  if (index < 0 || index >= state.children) return state;
  const clamped = clamp(Math.round(age), MIN_CHILD_AGE, MAX_CHILD_AGE);
  const childAges = state.childAges.slice();
  childAges[index] = clamped;
  return { ...state, childAges };
}

// ── URL ⇄ state ──────────────────────────────────────────────────────────────

/**
 * Serialise state into URL-friendly params. Children ages are joined with
 * commas: ?adults=2&children=2&childAges=4,9. Returns only the keys that
 * differ from the defaults so URLs stay tidy.
 */
export function toSearchParams(state: GuestState): Record<string, string> {
  const out: Record<string, string> = {
    rooms: String(state.rooms),
    adults: String(state.adults),
  };
  if (state.children > 0) {
    out.children = String(state.children);
    out.childAges = state.childAges.join(",");
  }
  return out;
}

/**
 * Parse loosely — missing / malformed inputs collapse to defaults so
 * a clipped URL never blows up the page.
 */
export function fromSearchParams(params: Record<string, string | string[] | undefined>): GuestState {
  const pick = (k: string) => (Array.isArray(params[k]) ? params[k]?.[0] : (params[k] as string | undefined));

  const rooms = clamp(int(pick("rooms"), DEFAULT_GUESTS.rooms), MIN_ROOMS, MAX_ROOMS);
  let adults = clamp(int(pick("adults"), DEFAULT_GUESTS.adults), MIN_ADULTS_PER_ROOM * rooms, rooms * MAX_GUESTS_PER_ROOM);
  let children = clamp(int(pick("children"), 0), 0, rooms * MAX_GUESTS_PER_ROOM - adults);
  const ages = (pick("childAges") ?? "")
          .split(",")
          .map((s) => parseInt(s, 10))
          .filter((n) => Number.isFinite(n))
          .map((n) => clamp(n, MIN_CHILD_AGE, MAX_CHILD_AGE));
  let childAges: number[];
  if (ages.length === children) {
    childAges = ages;
  } else if (ages.length < children) {
    childAges = [...ages, ...Array(children - ages.length).fill(DEFAULT_CHILD_AGE)];
  } else {
    childAges = ages.slice(0, children);
  }
  if (adults + children > rooms * MAX_GUESTS_PER_ROOM) {
    children = rooms * MAX_GUESTS_PER_ROOM - adults;
    childAges = childAges.slice(0, children);
  }
  return { rooms, adults, children, childAges };
}

/** Short summary: "2 adults · 1 child · 1 room". */
export function summarise(state: GuestState): string {
  const parts: string[] = [];
  parts.push(`${state.adults} adult${state.adults === 1 ? "" : "s"}`);
  if (state.children > 0) parts.push(`${state.children} child${state.children === 1 ? "" : "ren"}`);
  parts.push(`${state.rooms} room${state.rooms === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

// ── Internals ────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

function int(s: string | undefined, fallback: number): number {
  if (s == null || s === "") return fallback;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}
