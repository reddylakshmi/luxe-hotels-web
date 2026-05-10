"use server";

// Server actions for the Meetings & Events surfaces. Mirrors the
// shape of `tripActions.ts` and `bookingActions.ts` — every action
// carries the guest's bearer token (sign-in is required upstream),
// mints a fresh idempotency UUID, and returns a structured result so
// the client can render inline errors without throwing.

import { revalidatePath } from "next/cache";
import { gqlFetch } from "./graphql";
import { getSession } from "./authSession";
import {
  CANCEL_RFP_MUTATION,
  SUBMIT_RFP_MUTATION,
  UPDATE_RFP_MUTATION,
} from "./queries";

type ValidationGqlError = {
  __typename: "ValidationError";
  code: string;
  message: string;
  fieldErrors: { field: string; message: string }[];
};
type NotFoundGqlError = { __typename: "NotFoundError"; code: string; message: string };

function authedFetch<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {};
  if (session) headers.authorization = `Bearer ${session.token}`;
  return gqlFetch<T>(query, variables, headers);
}

// ── Submit RFP ───────────────────────────────────────────────────────────

type SubmitSuccess = {
  __typename: "RFP";
  id: string;
  rfpNumber: string;
  status: string;
  eventName: string;
};
type SubmitResult = SubmitSuccess | ValidationGqlError | NotFoundGqlError;

export type SubmitRfpActionResult =
  | { ok: true; rfpId: string; rfpNumber: string }
  | { ok: false; formError: string; fieldErrors?: Record<string, string> };

export async function submitRfpAction(
  input: Record<string, unknown>,
): Promise<SubmitRfpActionResult> {
  let result: { submitRFP: SubmitResult };
  try {
    result = await authedFetch<{ submitRFP: SubmitResult }>(SUBMIT_RFP_MUTATION, {
      input,
      idempotencyKey: crypto.randomUUID(),
    });
  } catch (err) {
    return {
      ok: false,
      formError: `We couldn't submit your RFP — please try again. (${(err as Error).message})`,
    };
  }
  const r = result.submitRFP;
  if (r.__typename === "RFP") {
    revalidatePath("/account/events");
    return { ok: true, rfpId: r.id, rfpNumber: r.rfpNumber };
  }
  const fieldErrors: Record<string, string> | undefined =
    r.__typename === "ValidationError"
      ? Object.fromEntries(r.fieldErrors.map((fe) => [fe.field, fe.message]))
      : undefined;
  return { ok: false, formError: r.message, fieldErrors };
}

// ── Update RFP (draft autosave + edit) ──────────────────────────────────

type UpdateSuccess = { __typename: "RFP"; id: string; status: string };
type UpdateResult = UpdateSuccess | ValidationGqlError | NotFoundGqlError;

export type UpdateRfpActionResult =
  | { ok: true; status: string }
  | { ok: false; formError: string };

export async function updateRfpAction(
  rfpId: string,
  input: Record<string, unknown>,
): Promise<UpdateRfpActionResult> {
  let result: { updateRFP: UpdateResult };
  try {
    result = await authedFetch<{ updateRFP: UpdateResult }>(UPDATE_RFP_MUTATION, {
      rfpId,
      input,
    });
  } catch (err) {
    return { ok: false, formError: (err as Error).message };
  }
  const r = result.updateRFP;
  if (r.__typename === "RFP") {
    revalidatePath("/account/events");
    return { ok: true, status: r.status };
  }
  return { ok: false, formError: r.message };
}

// ── Cancel RFP ──────────────────────────────────────────────────────────

type CancelSuccess = { __typename: "RFP"; id: string; status: string };
type CancelResult = CancelSuccess | ValidationGqlError | NotFoundGqlError;

export type CancelRfpState = {
  ok: boolean;
  formError?: string;
};

export async function cancelRfpAction(
  _prev: CancelRfpState,
  formData: FormData,
): Promise<CancelRfpState> {
  const rfpId = (formData.get("rfpId") as string) || "";
  if (!rfpId) return { ok: false, formError: "Missing RFP id." };
  const reason = ((formData.get("reason") as string) || "").trim() || null;

  let result: { cancelRFP: CancelResult };
  try {
    result = await authedFetch<{ cancelRFP: CancelResult }>(CANCEL_RFP_MUTATION, {
      rfpId,
      reason,
    });
  } catch (err) {
    return {
      ok: false,
      formError: `We couldn't cancel the RFP — please try again. (${(err as Error).message})`,
    };
  }
  const r = result.cancelRFP;
  if (r.__typename === "RFP") {
    revalidatePath("/account/events");
    return { ok: true };
  }
  return { ok: false, formError: r.message };
}
