// Pure helpers for the Meetings & Events surfaces. Nothing here
// touches React, the network, or React Server Component runtime —
// every function is deterministic so vitest can cover the math
// without rendering.
//
// Names use the same cadence as `lib/account.ts` and `lib/trip.ts`
// (`labelXxx`, `validateXxx`, `formatXxx`) so future readers find the
// right module on intuition alone.

// ── Setup style + capacity ───────────────────────────────────────────────

export const SETUP_STYLES = [
  "THEATER",
  "CLASSROOM",
  "BANQUET",
  "BOARDROOM",
  "RECEPTION",
  "U_SHAPE",
  "COCKTAIL",
  "HOLLOW_SQUARE",
  "CRESCENT_ROUNDS",
] as const;

export type SetupStyle = (typeof SETUP_STYLES)[number];

const SETUP_LABELS: Record<SetupStyle, string> = {
  THEATER: "Theater",
  CLASSROOM: "Classroom",
  BANQUET: "Banquet",
  BOARDROOM: "Boardroom",
  RECEPTION: "Reception",
  U_SHAPE: "U-shape",
  COCKTAIL: "Cocktail",
  HOLLOW_SQUARE: "Hollow square",
  CRESCENT_ROUNDS: "Crescent rounds",
};

export function labelSetup(setup: string): string {
  return SETUP_LABELS[setup as SetupStyle] ?? setup;
}

const CATEGORY_LABELS: Record<string, string> = {
  BALLROOM: "Ballroom",
  JUNIOR_BALLROOM: "Junior ballroom",
  BOARDROOM: "Boardroom",
  MEETING_ROOM: "Meeting room",
  TERRACE: "Terrace",
  GARDEN: "Garden",
  SUITE: "Suite",
  STUDIO: "Studio",
};

export function labelCategory(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  CORPORATE_MEETING: "Corporate meeting",
  CONFERENCE: "Conference",
  INCENTIVE: "Incentive",
  WEDDING: "Wedding",
  SOCIAL_GALA: "Social gala",
  TRAINING: "Training",
  PRODUCT_LAUNCH: "Product launch",
  BOARD_RETREAT: "Board retreat",
};

export function labelEventType(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? type;
}

/**
 * Capacity-fit verdict for a venue against a requested headcount +
 * setup. Returns whether the room fits, by how much, and the closest
 * matching capacity row so the UI can explain *why* a venue is short.
 */
export type CapacityFit = {
  fits: boolean;
  best: { setup: string; capacity: number } | null;
  shortfall: number;
};

export function capacityFit(
  capacityStyles: { setup: string; capacity: number }[],
  attendees: number,
  setup?: string,
): CapacityFit {
  if (attendees <= 0 || capacityStyles.length === 0) {
    return { fits: false, best: null, shortfall: attendees };
  }
  const candidates = setup
    ? capacityStyles.filter((c) => c.setup === setup)
    : capacityStyles;
  if (candidates.length === 0) {
    return { fits: false, best: null, shortfall: attendees };
  }
  // Prefer the snuggest layout that still fits — planners want
  // intimacy, not the largest possible room. When nothing fits we
  // fall back to the largest available capacity so the shortfall
  // number is the smallest possible value.
  const fitting = candidates
    .filter((c) => c.capacity >= attendees)
    .sort((a, b) => a.capacity - b.capacity);
  if (fitting.length > 0) {
    return { fits: true, best: fitting[0], shortfall: 0 };
  }
  const closest = [...candidates].sort((a, b) => b.capacity - a.capacity)[0];
  return { fits: false, best: closest, shortfall: attendees - closest.capacity };
}

/**
 * Stable display order for capacity rows in a venue's matrix.
 * Putting THEATER + RECEPTION first surfaces the "max-headcount"
 * setups planners scan for; rare layouts fall to the end.
 */
const CAPACITY_DISPLAY_ORDER: SetupStyle[] = [
  "THEATER",
  "RECEPTION",
  "BANQUET",
  "CLASSROOM",
  "BOARDROOM",
  "U_SHAPE",
  "HOLLOW_SQUARE",
  "COCKTAIL",
  "CRESCENT_ROUNDS",
];

export function sortCapacityStyles<T extends { setup: string }>(rows: T[]): T[] {
  const idx = (s: string) => {
    const i = CAPACITY_DISPLAY_ORDER.indexOf(s as SetupStyle);
    return i < 0 ? CAPACITY_DISPLAY_ORDER.length : i;
  };
  return [...rows].sort((a, b) => idx(a.setup) - idx(b.setup));
}

// ── Search input ─────────────────────────────────────────────────────────

export type MeetingsSearchInput = {
  startDate: string;
  endDate: string;
  attendees: number;
  setup?: SetupStyle;
  cities?: string[];
};

export type MeetingsSearchErrors = Partial<
  Record<keyof MeetingsSearchInput, string>
>;

/**
 * Validate the discovery search bar. Mirrors the resolver's
 * required-field set (start, end, attendees) plus a sanity check
 * that end >= start. Cities + setup are optional.
 */
export function validateMeetingsSearch(
  input: Partial<MeetingsSearchInput>,
): MeetingsSearchErrors {
  const errors: MeetingsSearchErrors = {};
  if (!input.startDate) errors.startDate = "Pick a start date";
  if (!input.endDate) errors.endDate = "Pick an end date";
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    errors.endDate = "End must be on or after start";
  }
  if (input.attendees == null || Number.isNaN(input.attendees)) {
    errors.attendees = "Enter a headcount";
  } else if (input.attendees < 2) {
    errors.attendees = "Minimum 2 attendees";
  } else if (input.attendees > 5000) {
    errors.attendees = "Maximum 5,000 attendees per RFP";
  }
  return errors;
}

/**
 * Convert a UI-friendly partial search into the wire-shaped variables
 * the GraphQL `EventSpaceSearchInput` accepts. Drops empty optionals
 * so the network log stays clean.
 */
export function toSearchVariables(input: MeetingsSearchInput): Record<string, unknown> {
  const out: Record<string, unknown> = {
    startDate: input.startDate,
    endDate: input.endDate,
    attendees: input.attendees,
  };
  if (input.setup) out.setup = input.setup;
  if (input.cities && input.cities.length > 0) out.cities = input.cities;
  return out;
}

// ── Match-score formatting ───────────────────────────────────────────────

/**
 * Turn the resolver's 0-1 match score into a percent string with
 * conservative rounding — keeps the UI from overpromising "100%"
 * for a 0.998 fit. Capped at 99% unless we score perfectly.
 */
export function formatMatchScore(score: number): string {
  if (!Number.isFinite(score)) return "—";
  if (score >= 1) return "100% match";
  const pct = Math.floor(score * 100);
  return `${Math.min(99, pct)}% match`;
}

/**
 * Three-bucket badge tone so the UI can color hits without doing
 * its own thresholding. "great" = green, "good" = amber, "stretch"
 * = neutral. Threshold values mirror the discovery brief above.
 */
export type MatchTone = "great" | "good" | "stretch";

export function matchTone(score: number): MatchTone {
  if (!Number.isFinite(score)) return "stretch";
  if (score >= 0.9) return "great";
  if (score >= 0.7) return "good";
  return "stretch";
}

// ── Date helpers ─────────────────────────────────────────────────────────

/**
 * Inclusive day count between two ISO dates, defensively returning 1
 * when the range is empty or inverted (the form validator already
 * blocks that, but every consumer would have to special-case it
 * otherwise).
 */
export function nightsBetween(startISO: string, endISO: string): number {
  const a = Date.parse(startISO);
  const b = Date.parse(endISO);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 1;
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

/**
 * UTC-stable date-range formatter. Keeps the booking-page convention
 * so reservations and meetings render identical strings. Falls back
 * to the raw ISO when parsing fails — never throws.
 */
export function formatStayWindow(startISO: string, endISO: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso + "T00:00:00Z");
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  return `${fmt(startISO)} → ${fmt(endISO)}`;
}

// ── RFP wizard ───────────────────────────────────────────────────────────

export const EVENT_TYPES = [
  "CORPORATE_MEETING",
  "CONFERENCE",
  "INCENTIVE",
  "WEDDING",
  "SOCIAL_GALA",
  "TRAINING",
  "PRODUCT_LAUNCH",
  "BOARD_RETREAT",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/**
 * Five wizard steps mirroring the SubmitRFPInput shape:
 *
 *   basics    eventName, eventType, startDate, endDate, attendees, guestRoomsPerNight
 *   spaces    spaceRequirements (name + setup + attendees + durationHours + startTime)
 *   catering  cateringRequirements + additionalRequirements (free text)
 *   contact   organizer, organization, contactEmail, contactPhone
 *   review    read-only summary + submit
 *
 * The wizard is linear; back/next moves cleanly because each step
 * stands alone (no cross-step dependencies). Hosting all step state
 * in one parent reducer keeps draft autosave (updateRFP) trivial.
 */
export const RFP_WIZARD_STEPS = [
  "basics",
  "spaces",
  "catering",
  "contact",
  "review",
] as const;

export type RfpWizardStep = (typeof RFP_WIZARD_STEPS)[number];

export type RfpDraft = {
  // basics
  eventName: string;
  eventType: EventType;
  startDate: string;
  endDate: string;
  attendees: number;
  guestRoomsPerNight?: number | null;
  // spaces
  spaceRequirements: {
    name: string;
    setup: SetupStyle;
    attendees: number;
    durationHours: number;
    startTime?: string | null;
  }[];
  // catering / extras
  cateringRequirements: string;
  additionalRequirements: string;
  // contact
  organizer: string;
  organization: string;
  contactEmail: string;
  contactPhone: string;
};

export type RfpStepErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9 ()\-]{7,}$/;

export function validateBasicsStep(d: RfpDraft): RfpStepErrors {
  const errors: RfpStepErrors = {};
  if (!d.eventName.trim()) errors.eventName = "Give your event a name";
  if (!EVENT_TYPES.includes(d.eventType)) errors.eventType = "Pick an event type";
  if (!d.startDate) errors.startDate = "Pick a start date";
  if (!d.endDate) errors.endDate = "Pick an end date";
  if (d.startDate && d.endDate && d.endDate < d.startDate) {
    errors.endDate = "End must be on or after start";
  }
  if (!d.attendees || d.attendees < 2) errors.attendees = "Minimum 2 attendees";
  if (d.attendees && d.attendees > 5000) {
    errors.attendees = "Maximum 5,000 attendees per RFP";
  }
  if (
    d.guestRoomsPerNight != null &&
    (d.guestRoomsPerNight < 0 || d.guestRoomsPerNight > 5000)
  ) {
    errors.guestRoomsPerNight = "Must be between 0 and 5,000";
  }
  return errors;
}

export function validateSpacesStep(d: RfpDraft): RfpStepErrors {
  const errors: RfpStepErrors = {};
  if (d.spaceRequirements.length === 0) {
    errors.spaceRequirements = "Add at least one space requirement";
    return errors;
  }
  d.spaceRequirements.forEach((sr, idx) => {
    if (!sr.name.trim()) errors[`space.${idx}.name`] = "Name this space";
    if (!sr.setup) errors[`space.${idx}.setup`] = "Pick a setup";
    if (!sr.attendees || sr.attendees < 1) {
      errors[`space.${idx}.attendees`] = "1+ attendees";
    }
    if (!sr.durationHours || sr.durationHours <= 0) {
      errors[`space.${idx}.durationHours`] = "Duration > 0";
    } else if (sr.durationHours > 24) {
      errors[`space.${idx}.durationHours`] = "Max 24 hours";
    }
    if (sr.startTime && !/^\d{1,2}:\d{2}$/.test(sr.startTime)) {
      errors[`space.${idx}.startTime`] = "Use HH:MM";
    }
  });
  return errors;
}

export function validateContactStep(d: RfpDraft): RfpStepErrors {
  const errors: RfpStepErrors = {};
  if (!d.organizer.trim()) errors.organizer = "Your name";
  if (!d.organization.trim()) errors.organization = "Your organization";
  if (!d.contactEmail.trim()) errors.contactEmail = "Email";
  else if (!EMAIL_RE.test(d.contactEmail.trim())) {
    errors.contactEmail = "Enter a valid email";
  }
  if (!d.contactPhone.trim()) errors.contactPhone = "Phone";
  else if (!PHONE_RE.test(d.contactPhone.trim())) {
    errors.contactPhone = "Enter a valid phone";
  }
  return errors;
}

/** Catering + additional requirements have no required fields, but
 *  capping each at 2,000 chars matches the GraphQL practical limit. */
export function validateCateringStep(d: RfpDraft): RfpStepErrors {
  const errors: RfpStepErrors = {};
  if (d.cateringRequirements.length > 2000) {
    errors.cateringRequirements = "Keep under 2,000 characters";
  }
  if (d.additionalRequirements.length > 2000) {
    errors.additionalRequirements = "Keep under 2,000 characters";
  }
  return errors;
}

export function validateRfpStep(step: RfpWizardStep, d: RfpDraft): RfpStepErrors {
  switch (step) {
    case "basics":
      return validateBasicsStep(d);
    case "spaces":
      return validateSpacesStep(d);
    case "catering":
      return validateCateringStep(d);
    case "contact":
      return validateContactStep(d);
    case "review":
      // Final pass — fail-fast across every prior step.
      return {
        ...validateBasicsStep(d),
        ...validateSpacesStep(d),
        ...validateCateringStep(d),
        ...validateContactStep(d),
      };
  }
}

/** Friendly title for each step (used in the stepper rail + headers). */
export function labelRfpStep(step: RfpWizardStep): string {
  const map: Record<RfpWizardStep, string> = {
    basics: "Event basics",
    spaces: "Space requirements",
    catering: "Catering & extras",
    contact: "Contact details",
    review: "Review & submit",
  };
  return map[step];
}

/** Move forward/backward through the linear wizard. Bounded to the
 *  array so consumers don't need their own clamp logic. */
export function nextStep(step: RfpWizardStep): RfpWizardStep {
  const i = RFP_WIZARD_STEPS.indexOf(step);
  return RFP_WIZARD_STEPS[Math.min(i + 1, RFP_WIZARD_STEPS.length - 1)];
}
export function prevStep(step: RfpWizardStep): RfpWizardStep {
  const i = RFP_WIZARD_STEPS.indexOf(step);
  return RFP_WIZARD_STEPS[Math.max(i - 1, 0)];
}

/**
 * Convert a finalized draft to the wire-shaped SubmitRFPInput. Drops
 * empty strings on the optional text fields so the resolver doesn't
 * see "" and treat it as "user typed nothing meaningful".
 */
export function draftToSubmitVariables(
  d: RfpDraft,
  preferredHotelIds: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    organizer: d.organizer.trim(),
    organization: d.organization.trim(),
    contactEmail: d.contactEmail.trim(),
    contactPhone: d.contactPhone.trim(),
    eventName: d.eventName.trim(),
    eventType: d.eventType,
    startDate: d.startDate,
    endDate: d.endDate,
    attendees: d.attendees,
    preferredHotelIds,
    spaceRequirements: d.spaceRequirements.map((sr) => ({
      name: sr.name.trim(),
      setup: sr.setup,
      attendees: sr.attendees,
      durationHours: sr.durationHours,
      ...(sr.startTime ? { startTime: sr.startTime } : {}),
    })),
  };
  if (d.guestRoomsPerNight && d.guestRoomsPerNight > 0) {
    out.guestRoomsPerNight = d.guestRoomsPerNight;
  }
  if (d.cateringRequirements.trim()) {
    out.cateringRequirements = d.cateringRequirements.trim();
  }
  if (d.additionalRequirements.trim()) {
    out.additionalRequirements = d.additionalRequirements.trim();
  }
  return out;
}

// ── RFP status display ───────────────────────────────────────────────────

export const RFP_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "PROPOSAL_SENT",
  "NEGOTIATING",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "CANCELLED",
] as const;

export type RfpStatus = (typeof RFP_STATUSES)[number];

const RFP_STATUS_LABELS: Record<RfpStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  IN_REVIEW: "In review",
  PROPOSAL_SENT: "Proposal sent",
  NEGOTIATING: "Negotiating",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export function labelRfpStatus(status: string): string {
  return RFP_STATUS_LABELS[status as RfpStatus] ?? status;
}

export type StatusTone = "draft" | "active" | "won" | "lost" | "neutral";

export function rfpStatusTone(status: string): StatusTone {
  switch (status as RfpStatus) {
    case "DRAFT":
      return "draft";
    case "SUBMITTED":
    case "IN_REVIEW":
    case "PROPOSAL_SENT":
    case "NEGOTIATING":
      return "active";
    case "ACCEPTED":
      return "won";
    case "DECLINED":
    case "EXPIRED":
    case "CANCELLED":
      return "lost";
    default:
      return "neutral";
  }
}

/** RFPs in these states are still actionable from the guest side —
 *  cancel button is wired only when the status is in this set. */
export function isRfpCancellable(status: string): boolean {
  const cancellable: RfpStatus[] = [
    "DRAFT",
    "SUBMITTED",
    "IN_REVIEW",
    "PROPOSAL_SENT",
    "NEGOTIATING",
  ];
  return (cancellable as readonly string[]).includes(status);
}
