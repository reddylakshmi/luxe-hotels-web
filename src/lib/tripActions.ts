"use server";

// Server actions for /trips/[id]. Each one validates with the pure
// helpers in lib/trip.ts, calls the federated GraphQL mutation with the
// guest's bearer token, and revalidates the trip detail path so the
// next render reflects the new state. Idempotency keys are generated
// per-call (Node's crypto.randomUUID) — replays would be caught by
// future server-side dedupe but until then a fresh UUID per action
// matches the schema contract (`idempotencyKey: UUID!`).

import { revalidatePath } from "next/cache";
import { gqlFetch } from "./graphql";
import { getSession } from "./authSession";
import {
  CANCEL_RESERVATION_MUTATION,
  MOBILE_CHECK_IN_MUTATION,
} from "./queries";
import {
  validateCheckIn,
  type CheckInFormErrors,
} from "./trip";

// ── Common shapes ────────────────────────────────────────────────────────

type ValidationGqlError = {
  __typename: "ValidationError";
  code: string;
  message: string;
  fieldErrors: { field: string; message: string }[];
};
type NotFoundGqlError = { __typename: "NotFoundError"; code: string; message: string };
type AuthorizationGqlError = { __typename: "AuthorizationError"; code: string; message: string };

function authedFetch<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {};
  if (session) headers.authorization = `Bearer ${session.token}`;
  return gqlFetch<T>(query, variables, headers);
}

function fieldErrorsToMap<K extends string>(
  errors: { field: string; message: string }[],
): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const fe of errors) out[fe.field as K] = fe.message;
  return out;
}

function tripPath(id: string) {
  return `/trips/${id}`;
}

// ── Online check-in ─────────────────────────────────────────────────────

export type CheckInState = {
  ok: boolean;
  errors?: CheckInFormErrors;
  formError?: string;
};

type CheckInResult =
  | { __typename: "MobileCheckInSuccess"; message: string }
  | ValidationGqlError
  | NotFoundGqlError;

export async function checkInAction(
  _prev: CheckInState,
  formData: FormData,
): Promise<CheckInState> {
  const reservationId = (formData.get("reservationId") as string) || "";
  if (!reservationId) return { ok: false, formError: "Missing reservation id." };
  const documentType = ((formData.get("documentType") as string) || "").trim();
  const documentNumber = ((formData.get("documentNumber") as string) || "").trim();
  const estimatedArrivalTime = ((formData.get("estimatedArrivalTime") as string) || "").trim();

  const errors = validateCheckIn({ documentType, documentNumber, estimatedArrivalTime });
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const variables = {
    reservationId,
    input: {
      documentType,
      documentNumber,
      estimatedArrivalTime: estimatedArrivalTime || null,
    },
    idempotencyKey: crypto.randomUUID(),
  };

  let result: { mobileCheckIn: CheckInResult };
  try {
    result = await authedFetch<{ mobileCheckIn: CheckInResult }>(
      MOBILE_CHECK_IN_MUTATION,
      variables,
    );
  } catch (err) {
    return {
      ok: false,
      formError: `We couldn't complete check-in — please try again. (${(err as Error).message})`,
    };
  }

  const r = result.mobileCheckIn;
  if (r.__typename === "MobileCheckInSuccess") {
    revalidatePath(tripPath(reservationId));
    return { ok: true };
  }
  if (r.__typename === "ValidationError") {
    return {
      ok: false,
      errors: fieldErrorsToMap<keyof CheckInFormErrors>(r.fieldErrors),
      formError: r.fieldErrors.length === 0 ? r.message : undefined,
    };
  }
  return { ok: false, formError: r.message };
}

// ── Cancel reservation ─────────────────────────────────────────────────

export type CancelState = {
  ok: boolean;
  formError?: string;
};

type CancelResult =
  | { __typename: "Reservation"; id: string; status: string }
  | ValidationGqlError
  | NotFoundGqlError
  | AuthorizationGqlError;

export async function cancelReservationAction(
  _prev: CancelState,
  formData: FormData,
): Promise<CancelState> {
  const reservationId = (formData.get("reservationId") as string) || "";
  if (!reservationId) return { ok: false, formError: "Missing reservation id." };
  const reason = ((formData.get("reason") as string) || "").trim();

  const variables = {
    reservationId,
    input: reason ? { reason } : null,
    idempotencyKey: crypto.randomUUID(),
  };

  let result: { cancelReservation: CancelResult };
  try {
    result = await authedFetch<{ cancelReservation: CancelResult }>(
      CANCEL_RESERVATION_MUTATION,
      variables,
    );
  } catch (err) {
    return {
      ok: false,
      formError: `We couldn't cancel the reservation — please try again. (${(err as Error).message})`,
    };
  }

  const r = result.cancelReservation;
  if (r.__typename === "Reservation") {
    revalidatePath(tripPath(reservationId));
    revalidatePath("/trips");
    return { ok: true };
  }
  return { ok: false, formError: r.message };
}
