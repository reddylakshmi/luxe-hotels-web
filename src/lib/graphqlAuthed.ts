// Server-only GraphQL fetch that carries the current guest's JWT in the
// Authorization header. Used by Server Components that need protected
// data (myReservations, loyaltyAccount, etc.). Public reads still go
// through the unauthenticated gqlFetch in graphql.ts.

import "server-only";
import { gqlFetch } from "./graphql";
import { getSession } from "./authSession";

export async function gqlFetchAuthed<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {};
  if (session) headers.authorization = `Bearer ${session.token}`;
  return gqlFetch<T>(query, variables, headers);
}
