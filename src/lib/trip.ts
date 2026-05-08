// Pure helpers for /trips/[id]. No React, no DOM, no fetch — every
// branch exercised by lib/trip.test.ts. Display-side concerns
// (status colour, badge label) live with their components in
// TripCard.tsx; what's here is the formatting + validation that needs
// to stay timezone-stable and is shared between server actions and
// client forms.

/**
 * "Jul 6, 2026 → Jul 11, 2026 · 5 nights" — formatted in UTC so a
 * `Date`-only ISO string from the schema doesn't slip back a day for
 * viewers west of Greenwich.
 */
export function formatStayWindow(
  checkIn: string,
  checkOut: string,
  nights: number,
): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  const noun = nights === 1 ? "night" : "nights";
  return `${fmt(checkIn)} → ${fmt(checkOut)} · ${nights} ${noun}`;
}

/**
 * "until Jun 30, 2026, 5:00 PM" — for the cancellation deadline. Uses
 * the viewer's local timezone since deadlines are wall-clock at the
 * hotel; falls back to null when no deadline is set (free cancellation
 * windows still open).
 */
export function formatCancellationDeadline(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `until ${date}, ${time}`;
}

/** Document types accepted by the schema's `MobileCheckInInput.documentType`. */
export const CHECK_IN_DOCUMENT_TYPES = [
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVERS_LICENSE", label: "Driver's licence" },
  { value: "NATIONAL_ID", label: "National ID" },
] as const;

export type CheckInDocumentType =
  (typeof CHECK_IN_DOCUMENT_TYPES)[number]["value"];

const DOC_TYPE_VALUES = new Set<string>(CHECK_IN_DOCUMENT_TYPES.map((d) => d.value));

export type CheckInFormInput = {
  documentType?: string;
  documentNumber?: string;
  estimatedArrivalTime?: string;
};
export type CheckInFormErrors = Partial<
  Record<"documentType" | "documentNumber" | "estimatedArrivalTime", string>
>;

export function validateCheckIn(input: CheckInFormInput): CheckInFormErrors {
  const errors: CheckInFormErrors = {};
  if (!input.documentType || !DOC_TYPE_VALUES.has(input.documentType)) {
    errors.documentType = "Pick a document type";
  }
  if (!input.documentNumber || !input.documentNumber.trim()) {
    errors.documentNumber = "Document number is required";
  } else if (input.documentNumber.trim().length < 4) {
    errors.documentNumber = "Document number looks too short";
  }
  if (input.estimatedArrivalTime && input.estimatedArrivalTime.trim()) {
    // Accept "HH:MM" 24-hour. The schema is permissive (String) so we
    // only reject obvious gibberish.
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(input.estimatedArrivalTime.trim())) {
      errors.estimatedArrivalTime = "Use 24-hour HH:MM (e.g. 16:30)";
    }
  }
  return errors;
}
