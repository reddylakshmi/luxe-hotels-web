"use server";

// Public reservation lookup — guest types confirmation number + last
// name and we ask the reservations subgraph (no auth required for this
// path). Lives next to the form via useFormState so errors render
// inline.

import { gqlFetch } from "./graphql";
import { RESERVATION_BY_CONFIRMATION_QUERY } from "./queries";
import type { Reservation } from "@/types/graphql";

export type FindTripState = {
  ok: boolean;
  reservation?: Reservation | null;
  error?: string;
  formError?: string;
};

export async function findTripAction(
  _prev: FindTripState,
  formData: FormData,
): Promise<FindTripState> {
  const confirmationNumber = ((formData.get("confirmationNumber") as string) || "").trim();
  const lastName = ((formData.get("lastName") as string) || "").trim();

  if (!confirmationNumber) {
    return { ok: false, error: "Enter a confirmation number." };
  }

  let result: { reservationByConfirmationNumber: Reservation | null };
  try {
    result = await gqlFetch<{ reservationByConfirmationNumber: Reservation | null }>(
      RESERVATION_BY_CONFIRMATION_QUERY,
      {
        confirmationNumber,
        guestLastName: lastName.length > 0 ? lastName : null,
      },
    );
  } catch (err) {
    return {
      ok: false,
      formError: `Couldn't reach the booking system — please try again. (${(err as Error).message})`,
    };
  }

  const r = result.reservationByConfirmationNumber;
  if (!r) {
    return {
      ok: false,
      error: `No reservation matched confirmation number "${confirmationNumber}".`,
    };
  }
  return { ok: true, reservation: r };
}
