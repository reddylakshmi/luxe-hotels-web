// Lightweight GraphQL fetch helper for React Server Components. We deliberately
// skip Apollo's React integration and use plain `fetch` against the federated
// router — the App Router gives us caching + revalidation for free, and SSR
// avoids client-side hydration cost on content-heavy pages.

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/";

export async function gqlFetch<T>(
        query: string,
        variables: Record<string, unknown> = {},
        headers: Record<string, string> = {},
): Promise<T> {
    const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...headers,
        },
        body: JSON.stringify({ query, variables }),
        // Cache for 30s on server; client routes that change can override.
        next: { revalidate: 30 },
    });
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
