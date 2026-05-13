// Pure auth helpers — types + validation. No React, no DOM, no server
// runtime dependencies, so vitest can exercise every branch.
//
// The server-side glue (cookies, redirect, GraphQL calls) lives in
// lib/authActions.ts and lib/authSession.ts. The form components import
// the validators from here for inline error display.

import { validateEmail, validateRequired } from "./bookingValidation";

export type GuestSummary = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

/**
 * Server-only auth session as it lives in the httpOnly cookie. The
 * `expiresAt` epoch lets the auth header skip stale tokens without
 * having to round-trip to the backend.
 */
export type Session = {
  token: string;
  expiresAt: number; // epoch milliseconds
  guest: GuestSummary;
};

// ── Validation ─────────────────────────────────────────────────────────

/** Min 8 chars, must include at least one letter and one digit. */
export function validatePassword(value: string | undefined): string | undefined {
  const required = validateRequired(value, "Password");
  if (required) return required;
  const v = value!;
  if (v.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Za-z]/.test(v)) return "Password must include at least one letter";
  if (!/\d/.test(v)) return "Password must include at least one digit";
  return undefined;
}

/** Confirm-password equality. The first arg is the source of truth. */
export function validateConfirmPassword(
  password: string | undefined,
  confirm: string | undefined,
): string | undefined {
  const required = validateRequired(confirm, "Confirm password");
  if (required) return required;
  return password === confirm ? undefined : "Passwords do not match";
}

export type SignInFormInput = {
  email: string;
  password: string;
};

export type SignInFormErrors = Partial<Record<keyof SignInFormInput, string>>;

export function validateSignInForm(input: SignInFormInput): SignInFormErrors {
  const errors: SignInFormErrors = {};
  const e = validateEmail(input.email);
  if (e) errors.email = e;
  // For sign-in we only require a non-empty password — strength rules
  // shouldn't lock out a guest whose existing account predates them.
  const p = validateRequired(input.password, "Password");
  if (p) errors.password = p;
  return errors;
}

export type SignUpFormInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

export type SignUpFormErrors = Partial<Record<keyof SignUpFormInput, string>>;

export function validateSignUpForm(input: SignUpFormInput): SignUpFormErrors {
  const errors: SignUpFormErrors = {};
  const fn = validateRequired(input.firstName, "First name");
  if (fn) errors.firstName = fn;
  const ln = validateRequired(input.lastName, "Last name");
  if (ln) errors.lastName = ln;
  const e = validateEmail(input.email);
  if (e) errors.email = e;
  const p = validatePassword(input.password);
  if (p) errors.password = p;
  const cp = validateConfirmPassword(input.password, input.confirmPassword);
  if (cp) errors.confirmPassword = cp;
  if (!input.acceptTerms) {
    errors.acceptTerms = "You must accept the booking terms to create an account";
  }
  return errors;
}

// ── Session helpers ────────────────────────────────────────────────────

/** Has the session token expired vs the supplied clock? */
export function isSessionExpired(
  session: Session | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!session) return true;
  return session.expiresAt <= now;
}

// ── returnTo (post-auth redirect target) ──────────────────────────────

/** Where the post-auth redirect lands when nothing valid was passed. */
export const DEFAULT_AUTH_REDIRECT = "/";

/**
 * Validate a {@code returnTo} URL against the open-redirect class of
 * vulnerabilities. Only same-origin app paths pass:
 *
 *   ✓  /hotels/abc/book?x=1
 *   ✓  /sign-up
 *   ✗  //evil.com         (protocol-relative — would resolve to evil.com)
 *   ✗  https://evil.com   (absolute external)
 *   ✗  javascript:alert() (script URL)
 *   ✗  /path/../../etc    (traversal — doesn't matter on the client but
 *                          we prefer normal app URLs anyway)
 *   ✗  not-starting-with-slash
 *
 * Returns the input when valid, the {@link DEFAULT_AUTH_REDIRECT} otherwise.
 * Pure — no React, no DOM, no network — so vitest can pin every branch.
 */
export function safeReturnTo(value: string | undefined | null): string {
  if (!value) return DEFAULT_AUTH_REDIRECT;
  const v = value.trim();
  if (v.length === 0) return DEFAULT_AUTH_REDIRECT;
  if (!v.startsWith("/")) return DEFAULT_AUTH_REDIRECT;
  if (v.startsWith("//")) return DEFAULT_AUTH_REDIRECT; // protocol-relative
  if (v.startsWith("/\\") || v.includes("\\")) return DEFAULT_AUTH_REDIRECT; // backslash tricks
  if (v.includes("://")) return DEFAULT_AUTH_REDIRECT; // absolute URL embedded
  if (v.includes("..")) return DEFAULT_AUTH_REDIRECT; // path traversal
  // Anything else is a relative app path → safe to honour.
  return v;
}

/**
 * Build a `/sign-in?returnTo=...` (or sign-up) href that points back to
 * the page the user is currently on. Used by the header's
 * SignInOrJoin dropdown so signing in from /hotels/[id]/book lands
 * the guest back on the booking page with their form pre-filled,
 * instead of dropping them on the home page.
 *
 * Returns the plain `/sign-in` / `/sign-up` href (no returnTo) when:
 *  • on root — that's the default redirect target anyway,
 *  • on `/sign-in` or `/sign-up` themselves — the auth page reads
 *    returnTo from its own query string; re-wrapping would either
 *    nest the encoding or create a loop.
 *
 * Pure — accepts a pathname + a query-string and returns a path.
 * No React, no DOM, no network — vitest can pin every branch.
 */
export function buildAuthHref(
  target: "/sign-in" | "/sign-up",
  pathname: string | null | undefined,
  search: string | null | undefined,
): string {
  if (!pathname || pathname === "/") return target;
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return target;
  }
  const currentUrl = search && search.length > 0 ? `${pathname}?${search}` : pathname;
  return `${target}?returnTo=${encodeURIComponent(currentUrl)}`;
}

/** Compose a Session from the AuthPayload returned by signIn / signUp. */
export function sessionFromAuthPayload(
  payload: {
    accessToken: string;
    expiresIn: number;
    guest: { id: string; email: string; name: { firstName: string; lastName: string } };
  },
  now: number = Date.now(),
): Session {
  return {
    token: payload.accessToken,
    expiresAt: now + payload.expiresIn * 1000,
    guest: {
      id: payload.guest.id,
      email: payload.guest.email,
      firstName: payload.guest.name.firstName,
      lastName: payload.guest.name.lastName,
    },
  };
}
