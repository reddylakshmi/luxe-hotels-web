// Server-only session cookie helpers. Reads/writes the encrypted-ish
// (httpOnly) session cookie via Next's cookies() helper, which means
// only Server Components, Server Actions, and Route Handlers can call
// these — exactly where auth lives anyway.
//
// The cookie holds JSON with the access token + a small guest snapshot.
// Writing both means the Header (a server component) can render
// "Hi, Aria" without a round-trip to the backend on every page.

import "server-only";
import { cookies } from "next/headers";
import { isSessionExpired, type Session } from "./auth";

const COOKIE_NAME = "luxe_session";
const ONE_DAY_SECONDS = 60 * 60 * 24;

/** Read the current session, or null if absent / malformed / expired. */
export function getSession(): Session | null {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    if (isSessionExpired(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persist the session in an httpOnly cookie. Lifetime is the smaller of
 * the token's TTL or one day — keeps the cookie correlated with the
 * backend's actual JWT expiry so a stale token doesn't sit around past
 * its useful life.
 */
export function writeSession(session: Session): void {
  const ttlSec = Math.max(
    60,
    Math.min(ONE_DAY_SECONDS, Math.floor((session.expiresAt - Date.now()) / 1000)),
  );
  cookies().set({
    name: COOKIE_NAME,
    value: JSON.stringify(session),
    httpOnly: true,
    sameSite: "lax",
    // secure: true would be set in production behind HTTPS — left off
    // here so the local dev server (http://localhost:3000) can read it.
    path: "/",
    maxAge: ttlSec,
  });
}

/** Forget the session (sign out). */
export function clearSession(): void {
  cookies().delete(COOKIE_NAME);
}
