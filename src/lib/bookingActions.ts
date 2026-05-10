"use server";

// Server actions for the booking flow. Single export — createReservationAction
// — is awaited by BookingForm.onSubmit (client component) on a successful
// validation pass. We chose a structured-input action over FormData because
// the form already lives in client state and validates synchronously; reusing
// that state means we don't have to reserialize fields onto a hidden form.
//
// Idempotency keys are minted per call (Node 18+ crypto.randomUUID) — replays
// would be deduped by the resolver in production but a fresh UUID per
// click matches the schema contract (`idempotencyKey: UUID!`).

import { gqlFetch } from "./graphql";
import { getSession } from "./authSession";
import { CREATE_RESERVATION_MUTATION } from "./queries";

type ReservationSuccess = {
  __typename: "Reservation";
  id: string;
  confirmationNumber: string;
  status: string;
  rateBreakdown: {
    currency: string;
    loyaltyDiscount: { amount: string; currency: string } | null;
    totalDue: { amount: string; currency: string };
  };
  loyaltyContext: { pointsRedeemed: number | null; pointsToEarn: number } | null;
};

type GqlError = {
  __typename:
    | "RoomUnavailableError"
    | "ValidationError"
    | "AuthorizationError"
    | "ExternalServiceError";
  code: string;
  message: string;
  fieldErrors?: { field: string; message: string }[];
};

type CreateReservationResult = ReservationSuccess | GqlError;

export type CreateReservationInput = {
  hotelId: string;
  roomTypeId: string;
  rateToken: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  specialRequests?: { category: string; request: string }[];
  loyaltyNumber?: string | null;
  promoCode?: string | null;
  pointsToRedeem?: number | null;
};

export type CreateReservationActionResult =
  | {
      ok: true;
      reservationId: string;
      confirmationNumber: string;
      pointsRedeemed: number;
      loyaltyDiscount: { amount: string; currency: string } | null;
    }
  | {
      ok: false;
      formError: string;
      fieldErrors?: { field: string; message: string }[];
    };

export async function createReservationAction(
  input: CreateReservationInput,
): Promise<CreateReservationActionResult> {
  const session = getSession();
  const headers: Record<string, string> = {};
  if (session) headers.authorization = `Bearer ${session.token}`;

  // Drop nullish optionals so the resolver doesn't see explicit null where
  // it expects "absent" (the schema treats both the same here, but keeping
  // the variable shape tight makes the network log readable).
  const cleaned: Record<string, unknown> = {
    hotelId: input.hotelId,
    roomTypeId: input.roomTypeId,
    rateToken: input.rateToken,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    adults: input.adults,
  };
  if (input.children != null) cleaned.children = input.children;
  if (input.specialRequests?.length) cleaned.specialRequests = input.specialRequests;
  if (input.loyaltyNumber) cleaned.loyaltyNumber = input.loyaltyNumber;
  if (input.promoCode) cleaned.promoCode = input.promoCode;
  if (input.pointsToRedeem && input.pointsToRedeem > 0) {
    cleaned.pointsToRedeem = input.pointsToRedeem;
  }

  let result: { createReservation: CreateReservationResult };
  try {
    result = await gqlFetch<{ createReservation: CreateReservationResult }>(
      CREATE_RESERVATION_MUTATION,
      { input: cleaned, idempotencyKey: crypto.randomUUID() },
      headers,
    );
  } catch (err) {
    return {
      ok: false,
      formError: `We couldn't complete your booking — please try again. (${(err as Error).message})`,
    };
  }

  const r = result.createReservation;
  if (r.__typename === "Reservation") {
    return {
      ok: true,
      reservationId: r.id,
      confirmationNumber: r.confirmationNumber,
      pointsRedeemed: r.loyaltyContext?.pointsRedeemed ?? 0,
      loyaltyDiscount: r.rateBreakdown.loyaltyDiscount ?? null,
    };
  }
  return {
    ok: false,
    formError: r.message,
    fieldErrors: r.__typename === "ValidationError" ? r.fieldErrors : undefined,
  };
}
