// URL search-param helpers. Next.js gives server components a
// `Record<string, string | string[] | undefined>` for searchParams;
// pages typically want the first value when a key is repeated.
// Centralising the helper avoids the same `Array.isArray` ternary
// drifting across pages.

export type ServerSearchParams = Record<string, string | string[] | undefined>;

/** First value for a search-param key. Returns undefined for absent or empty values. */
export function pickFirst(params: ServerSearchParams, key: string): string | undefined {
  const v = params[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

/**
 * Curried form, useful when a page reads many params:
 *
 *   const pick = picker(searchParams);
 *   const checkIn = pick("checkIn");
 *
 * Identical behaviour to {@link pickFirst} — just removes the repeated
 * `searchParams` argument at every call-site.
 */
export function picker(params: ServerSearchParams): (key: string) => string | undefined {
  return (key: string) => pickFirst(params, key);
}
