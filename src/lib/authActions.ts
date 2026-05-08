"use server";

// Sign-in / sign-up / sign-out server actions. Forms POST here via
// useFormState, the action calls the federated GraphQL mutation, stores
// the resulting JWT in an httpOnly cookie, and redirects.
//
// Returning a structured FormState (not throwing) keeps the form working
// without JS — Next.js renders the server-action response.

import { redirect } from "next/navigation";
import { gqlFetch } from "./graphql";
import { SIGN_IN_MUTATION, SIGN_UP_MUTATION } from "./queries";
import {
  DEFAULT_AUTH_REDIRECT,
  safeReturnTo,
  sessionFromAuthPayload,
  validateSignInForm,
  validateSignUpForm,
  type SignInFormErrors,
  type SignUpFormErrors,
} from "./auth";
import { clearSession, writeSession } from "./authSession";

export type SignInState = {
  ok: boolean;
  errors?: SignInFormErrors;
  formError?: string;
};

export type SignUpState = {
  ok: boolean;
  errors?: SignUpFormErrors;
  formError?: string;
};

type AuthPayload = {
  __typename: "AuthPayload";
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  isNewAccount?: boolean | null;
  guest: { id: string; email: string; name: { firstName: string; lastName: string } };
};

type AuthenticationError = { __typename: "AuthenticationError"; code: string; message: string };
type ValidationError = {
  __typename: "ValidationError";
  code: string;
  message: string;
  fieldErrors: { field: string; message: string }[];
};
type SignInResult = AuthPayload | AuthenticationError | ValidationError;
type SignUpResult = AuthPayload | ValidationError;

const SIGNED_OUT_DESTINATION = DEFAULT_AUTH_REDIRECT;

// ── Sign in ─────────────────────────────────────────────────────────────

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = ((formData.get("email") as string) || "").trim();
  const password = (formData.get("password") as string) || "";
  const returnTo = safeReturnTo((formData.get("returnTo") as string) || null);

  const errors = validateSignInForm({ email, password });
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  let result: { signIn: SignInResult };
  try {
    result = await gqlFetch<{ signIn: SignInResult }>(SIGN_IN_MUTATION, {
      email, password,
    });
  } catch (err) {
    return {
      ok: false,
      formError: `We couldn't reach the booking system — please try again. (${
        (err as Error).message
      })`,
    };
  }

  const payload = result.signIn;
  if (payload.__typename !== "AuthPayload") {
    return { ok: false, formError: payload.message };
  }
  writeSession(sessionFromAuthPayload(payload));
  redirect(returnTo);
}

// ── Sign up ─────────────────────────────────────────────────────────────

export async function signUpAction(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const email = ((formData.get("email") as string) || "").trim();
  const password = (formData.get("password") as string) || "";
  const confirmPassword = (formData.get("confirmPassword") as string) || "";
  const firstName = ((formData.get("firstName") as string) || "").trim();
  const lastName = ((formData.get("lastName") as string) || "").trim();
  const acceptTerms = formData.get("acceptTerms") === "on";
  const phoneRaw = ((formData.get("phone") as string) || "").trim();
  const phone = phoneRaw.length > 0 ? phoneRaw : undefined;
  const returnTo = safeReturnTo((formData.get("returnTo") as string) || null);

  const errors = validateSignUpForm({
    email, password, confirmPassword, firstName, lastName, acceptTerms,
  });
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  let result: { signUp: SignUpResult };
  try {
    result = await gqlFetch<{ signUp: SignUpResult }>(SIGN_UP_MUTATION, {
      email, password, firstName, lastName, phone,
    });
  } catch (err) {
    return {
      ok: false,
      formError: `We couldn't reach the booking system — please try again. (${
        (err as Error).message
      })`,
    };
  }

  const payload = result.signUp;
  if (payload.__typename !== "AuthPayload") {
    // Map server-side field errors into the form-level errors map so
    // the UI shows them inline next to the offending field.
    const fieldErrors: SignUpFormErrors = {};
    for (const fe of payload.fieldErrors ?? []) {
      const key = fe.field as keyof SignUpFormErrors;
      fieldErrors[key] = fe.message;
    }
    return {
      ok: false,
      errors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      formError: Object.keys(fieldErrors).length > 0 ? undefined : payload.message,
    };
  }
  writeSession(sessionFromAuthPayload(payload));
  redirect(returnTo);
}

// ── Sign out ────────────────────────────────────────────────────────────

export async function signOutAction(): Promise<void> {
  clearSession();
  redirect(SIGNED_OUT_DESTINATION);
}
