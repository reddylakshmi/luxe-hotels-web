"use server";

// Server actions for the /account page. Each action validates with the
// pure helpers in lib/account.ts, calls the federated GraphQL mutation
// with the guest's bearer token, then revalidates /account so the next
// render reflects the change.
//
// Returning a structured FormState (instead of throwing) keeps useFormState
// happy and lets the form survive without JS — Next.js will re-render
// with the action's return value.

import { revalidatePath } from "next/cache";
import { gqlFetch } from "./graphql";
import { getSession } from "./authSession";
import {
  ADD_ADDRESS_MUTATION,
  ADD_PAYMENT_METHOD_MUTATION,
  REMOVE_ADDRESS_MUTATION,
  REMOVE_PAYMENT_METHOD_MUTATION,
  SET_DEFAULT_PAYMENT_METHOD_MUTATION,
  SET_PRIMARY_ADDRESS_MUTATION,
  UPDATE_ADDRESS_MUTATION,
  UPDATE_GUEST_PROFILE_MUTATION,
} from "./queries";
import {
  parseExpiry,
  validateAddressForm,
  validateProfileEdit,
  type AddressFormErrors,
  type ProfileEditErrors,
} from "./account";
import {
  cardBrand,
  validateCardNumber,
  validateExpiry,
} from "./bookingValidation";

// ── Common shapes ────────────────────────────────────────────────────────

type ValidationGqlError = {
  __typename: "ValidationError";
  code: string;
  message: string;
  fieldErrors: { field: string; message: string }[];
};
type AuthorizationGqlError = {
  __typename: "AuthorizationError";
  code: string;
  message: string;
};

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

// ── Update profile ───────────────────────────────────────────────────────

export type UpdateProfileState = {
  ok: boolean;
  errors?: ProfileEditErrors;
  formError?: string;
};

type UpdateProfileResult =
  | { __typename: "GuestProfile"; id: string }
  | ValidationGqlError
  | AuthorizationGqlError;

export async function updateProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const phone = ((formData.get("phone") as string) || "").trim();
  const dateOfBirth = ((formData.get("dateOfBirth") as string) || "").trim();
  const nationality = ((formData.get("nationality") as string) || "").trim().toUpperCase();

  const errors = validateProfileEdit({
    phone: phone || undefined,
    dateOfBirth: dateOfBirth || undefined,
    nationality: nationality || undefined,
  });
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const input: Record<string, string | null> = {};
  // Send null for cleared fields so the backend can untrack a value;
  // omit fields the user didn't touch (we can't distinguish here, so
  // we always send all three — the resolver tolerates null).
  input.phone = phone || null;
  input.dateOfBirth = dateOfBirth || null;
  input.nationality = nationality || null;

  let result: { updateGuestProfile: UpdateProfileResult };
  try {
    result = await authedFetch<{ updateGuestProfile: UpdateProfileResult }>(
      UPDATE_GUEST_PROFILE_MUTATION,
      { input },
    );
  } catch (err) {
    return {
      ok: false,
      formError: `We couldn't save your changes — please try again. (${(err as Error).message})`,
    };
  }

  const r = result.updateGuestProfile;
  if (r.__typename === "GuestProfile") {
    revalidatePath("/account");
    return { ok: true };
  }
  if (r.__typename === "ValidationError") {
    return {
      ok: false,
      errors: fieldErrorsToMap<keyof ProfileEditErrors>(r.fieldErrors),
      formError: r.fieldErrors.length === 0 ? r.message : undefined,
    };
  }
  return { ok: false, formError: r.message };
}

// ── Address mutations ────────────────────────────────────────────────────

export type AddressFormState = {
  ok: boolean;
  errors?: AddressFormErrors;
  formError?: string;
};

type AddressGqlNode = { __typename: "GuestAddress"; id: string };
type AddAddressResult = AddressGqlNode | ValidationGqlError | AuthorizationGqlError;
type UpdateAddressResult =
  | AddressGqlNode
  | ValidationGqlError
  | { __typename: "NotFoundError"; code: string; message: string }
  | AuthorizationGqlError;

function parseAddressForm(formData: FormData) {
  const v = (k: string) => ((formData.get(k) as string) || "").trim();
  return {
    type: v("type") || undefined,
    line1: v("line1") || undefined,
    line2: v("line2") || undefined,
    city: v("city") || undefined,
    stateCode: v("stateCode") || undefined,
    postalCode: v("postalCode") || undefined,
    countryCode: v("countryCode").toUpperCase() || undefined,
    isPrimary: formData.get("isPrimary") === "on",
  };
}

export async function addAddressAction(
  _prev: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const parsed = parseAddressForm(formData);
  const errors = validateAddressForm(parsed);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const input = {
    type: parsed.type!,
    line1: parsed.line1!,
    line2: parsed.line2 ?? null,
    city: parsed.city!,
    stateCode: parsed.stateCode ?? null,
    postalCode: parsed.postalCode ?? null,
    countryCode: parsed.countryCode!,
    isPrimary: parsed.isPrimary,
  };

  let result: { addAddress: AddAddressResult };
  try {
    result = await authedFetch<{ addAddress: AddAddressResult }>(ADD_ADDRESS_MUTATION, { input });
  } catch (err) {
    return {
      ok: false,
      formError: `We couldn't save your address — please try again. (${(err as Error).message})`,
    };
  }
  const r = result.addAddress;
  if (r.__typename === "GuestAddress") {
    revalidatePath("/account");
    return { ok: true };
  }
  if (r.__typename === "ValidationError") {
    return {
      ok: false,
      errors: fieldErrorsToMap<keyof AddressFormErrors>(r.fieldErrors),
      formError: r.fieldErrors.length === 0 ? r.message : undefined,
    };
  }
  return { ok: false, formError: r.message };
}

export async function updateAddressAction(
  _prev: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const id = (formData.get("addressId") as string) || "";
  if (!id) return { ok: false, formError: "Missing address id." };
  const parsed = parseAddressForm(formData);
  const errors = validateAddressForm(parsed);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const input = {
    type: parsed.type!,
    line1: parsed.line1!,
    line2: parsed.line2 ?? null,
    city: parsed.city!,
    stateCode: parsed.stateCode ?? null,
    postalCode: parsed.postalCode ?? null,
    countryCode: parsed.countryCode!,
    isPrimary: parsed.isPrimary,
  };

  let result: { updateAddress: UpdateAddressResult };
  try {
    result = await authedFetch<{ updateAddress: UpdateAddressResult }>(UPDATE_ADDRESS_MUTATION, {
      id,
      input,
    });
  } catch (err) {
    return {
      ok: false,
      formError: `We couldn't update your address — please try again. (${(err as Error).message})`,
    };
  }
  const r = result.updateAddress;
  if (r.__typename === "GuestAddress") {
    revalidatePath("/account");
    return { ok: true };
  }
  if (r.__typename === "ValidationError") {
    return {
      ok: false,
      errors: fieldErrorsToMap<keyof AddressFormErrors>(r.fieldErrors),
      formError: r.fieldErrors.length === 0 ? r.message : undefined,
    };
  }
  if (r.__typename === "NotFoundError") {
    return { ok: false, formError: "That address is no longer on file." };
  }
  return { ok: false, formError: r.message };
}

export async function removeAddressAction(formData: FormData): Promise<void> {
  const id = (formData.get("addressId") as string) || "";
  if (!id) return;
  try {
    await authedFetch<{ removeAddress: boolean }>(REMOVE_ADDRESS_MUTATION, { id });
  } catch {
    // Same swallow-and-revalidate pattern as removePaymentAction.
  }
  revalidatePath("/account");
}

export async function setPrimaryAddressAction(formData: FormData): Promise<void> {
  const id = (formData.get("addressId") as string) || "";
  if (!id) return;
  try {
    await authedFetch<{ setPrimaryAddress: { id: string } | null }>(
      SET_PRIMARY_ADDRESS_MUTATION,
      { id },
    );
  } catch {
    // ditto
  }
  revalidatePath("/account");
}

// ── Add payment method ───────────────────────────────────────────────────

export type AddCardState = {
  ok: boolean;
  errors?: Partial<Record<"holderName" | "cardNumber" | "expiry", string>>;
  formError?: string;
};

type AddPaymentResult =
  | { __typename: "PaymentMethod"; id: string }
  | ValidationGqlError
  | AuthorizationGqlError;

export async function addPaymentAction(
  _prev: AddCardState,
  formData: FormData,
): Promise<AddCardState> {
  const holderName = ((formData.get("holderName") as string) || "").trim();
  const cardNumberRaw = ((formData.get("cardNumber") as string) || "").trim();
  const expiry = ((formData.get("expiry") as string) || "").trim();
  const setDefault = formData.get("setDefault") === "on";

  const errors: AddCardState["errors"] = {};
  if (!holderName) errors.holderName = "Cardholder name is required";
  const cardErr = validateCardNumber(cardNumberRaw);
  if (cardErr) errors.cardNumber = cardErr;
  const parsed = parseExpiry(expiry);
  if (!parsed) {
    errors.expiry = "Use MM/YY";
  } else {
    const expErr = validateExpiry(
      String(parsed.month).padStart(2, "0"),
      String(parsed.year % 100).padStart(2, "0"),
    );
    if (expErr) errors.expiry = expErr;
  }
  if (errors && Object.keys(errors).length > 0) return { ok: false, errors };

  const digits = cardNumberRaw.replace(/\D/g, "");
  const lastFour = digits.slice(-4);
  const brand = cardBrand(digits);
  const brandLabel =
    brand === "VISA" ? "Visa"
    : brand === "MC" ? "Mastercard"
    : brand === "AMEX" ? "American Express"
    : brand === "DISCOVER" ? "Discover"
    : "Card";

  const input = {
    type: "CREDIT_CARD",
    pspToken: `tok_demo_${Date.now().toString(36)}`,
    brand: brandLabel,
    lastFour,
    expiryMonth: parsed!.month,
    expiryYear: parsed!.year,
    holderName,
    isDefault: setDefault,
  };

  let result: { addPaymentMethod: AddPaymentResult };
  try {
    result = await authedFetch<{ addPaymentMethod: AddPaymentResult }>(
      ADD_PAYMENT_METHOD_MUTATION,
      { input },
    );
  } catch (err) {
    return {
      ok: false,
      formError: `We couldn't save your card — please try again. (${(err as Error).message})`,
    };
  }

  const r = result.addPaymentMethod;
  if (r.__typename === "PaymentMethod") {
    revalidatePath("/account");
    return { ok: true };
  }
  if (r.__typename === "ValidationError") {
    return {
      ok: false,
      errors: fieldErrorsToMap<"holderName" | "cardNumber" | "expiry">(r.fieldErrors),
      formError: r.fieldErrors.length === 0 ? r.message : undefined,
    };
  }
  return { ok: false, formError: r.message };
}

// ── Remove + set-default (no validation; just IDs) ──────────────────────

export async function removePaymentAction(formData: FormData): Promise<void> {
  const id = (formData.get("paymentMethodId") as string) || "";
  if (!id) return;
  try {
    await authedFetch<{ removePaymentMethod: boolean }>(REMOVE_PAYMENT_METHOD_MUTATION, { id });
  } catch {
    // Swallow — the page will re-render and the card will still be there.
    // A future toast/error layer is the right place to surface this.
  }
  revalidatePath("/account");
}

export async function setDefaultPaymentAction(formData: FormData): Promise<void> {
  const id = (formData.get("paymentMethodId") as string) || "";
  if (!id) return;
  try {
    await authedFetch<{ setDefaultPaymentMethod: { id: string } | null }>(
      SET_DEFAULT_PAYMENT_METHOD_MUTATION,
      { id },
    );
  } catch {
    // Same as above.
  }
  revalidatePath("/account");
}
