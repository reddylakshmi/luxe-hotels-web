// Lightweight GraphQL fetch helper for React Server Components. We deliberately
// skip Apollo's React integration and use plain `fetch` against the federated
// router — the App Router gives us caching + revalidation for free, and SSR
// avoids client-side hydration cost on content-heavy pages.

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/";

/**
 * Fetch-level cache config. Pages that own *catalog* reads (brands,
 * hotel description, specialRates) pass a longer revalidate + tags so
 * the data cache survives more than the default 30 s and so a future
 * admin mutation can target invalidation with `revalidateTag('catalog:brand:X')`.
 * Pages that read picker- / availability-sensitive data leave the
 * defaults and rely on `dynamic = "force-dynamic"` at the page level.
 */
export type GqlCacheConfig = {
    revalidate?: number;
    tags?: string[];
};

export async function gqlFetch<T>(
        query: string,
        variables: Record<string, unknown> = {},
        headers: Record<string, string> = {},
        cache: GqlCacheConfig = {},
): Promise<T> {
    // Mutations (signIn, signUp, createReservation, …) must never be
    // cached. Next.js's Data Cache otherwise hangs onto the first
    // result for `revalidate` seconds — so a typo'd password would
    // keep returning AuthenticationError even after a correct retry.
    const isMutation = /^\s*mutation\b/i.test(query);

    const fetchInit: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...headers,
        },
        body: JSON.stringify({ query, variables }),
    };
    if (isMutation) {
        fetchInit.cache = "no-store";
    } else {
        const next: { revalidate: number; tags?: string[] } = {
            revalidate: cache.revalidate ?? 30,
        };
        if (cache.tags && cache.tags.length > 0) next.tags = cache.tags;
        fetchInit.next = next;
    }

    const res = await fetch(GRAPHQL_URL, fetchInit);
    if (!res.ok) {
        throw new Error(`GraphQL HTTP ${res.status}`);
    }
    const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (json.errors?.length) {
        throw new Error(json.errors.map((e) => e.message).join("; "));
    }
    if (!json.data) throw new Error("GraphQL returned no data");
    return json.data;
}
