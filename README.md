# Luxe Hotels — Web

Next.js 14 (App Router) front-end for the **luxe-hotels-graphqlwithJava** federated GraphQL platform. Inspired by editorial luxury sites (marriott.com, fourseasons.com): big imagery, serif headlines, generous whitespace, sticky navigation, member-led calls to action.

## Stack

- **Next.js 14** (App Router, React Server Components)
- **TypeScript**
- **Tailwind CSS 3**
- Plain `fetch` with the App Router's built-in caching/revalidation — no Apollo Client runtime cost on the client
- Cormorant Garamond + Inter via Google Fonts

## Pages

| Route | What it shows | Subgraphs touched |
|---|---|---|
| `/` | Hero, featured hotels, brand-story pillars, travel inspirations, active offers, featured stories, member CTA | property, content |
| `/hotels` | All hotels grouped by country, with city filter | property |
| `/hotels/[id]` | Full hotel detail: gallery, rooms, spa experiences, event spaces, reviews, location | property, experiences, meetings |
| `/stories` | Article list with category filter | content |
| `/stories/[slug]` | Article detail with author, tags, related hotels | content |
| `/offers` | Active deal spotlights | content |

The home page issues a single federated query that reaches `featuredHotels`, `featuredArticles`, `travelInspirations`, `dealSpotlights`, and `brandStory` in one round-trip — Apollo Router fans out to the right subgraphs.

> **GraphQL queries reference:** [`GRAPHQL.md`](./GRAPHQL.md) lists every
> operation the web app sends, what page it powers, and which subgraphs it
> touches. Read this if you want to learn how the data is composed.

## Run it locally

**1.** Make sure the federated backend is running on `http://localhost:4000/`:

```bash
cd ../luxe-hotels-graphqlwithJava
./scripts/start-subgraphs.sh \
  && APOLLO_ELV2_LICENSE=accept ~/.rover/bin/rover supergraph compose --config supergraph.yaml --output supergraph.graphqls \
  && ./router/router --config router/router.yaml --supergraph supergraph.graphqls
```

**2.** Install + start the web app:

```bash
cd ../luxe-hotels-web
npm install
npm run dev
# open http://localhost:3000
```

The GraphQL endpoint is configured via `NEXT_PUBLIC_GRAPHQL_URL` in `.env.local` (defaults to `http://localhost:4000/`).

## Design notes

- **Image strategy.** The GraphQL data points to placeholder URLs at `content.luxehotels.example` that don't actually serve files. `src/lib/image.ts` deterministically maps every `content.luxehotels.example` URL to a stable Picsum seed so the same slot always renders the same image. Real photos drop in later by changing one helper.
- **No Apollo Client on the client.** All pages are server components. Caching and revalidation are handled by Next's `fetch` (`revalidate: 30`). If a future page needs interactive client-side queries, add Apollo Client locally in that route — don't make it a dependency for the whole app.
- **Type safety.** `src/types/graphql.ts` is hand-written to match the queries in `src/lib/queries.ts`. When the schema changes, update both files. (Future improvement: add `graphql-codegen` to generate types from a downloaded supergraph SDL.)
- **Locale.** All queries pass `locale: "en"`. The GraphQL layer handles fallback when a translation is missing — nothing in this app does.
- **Auth.** Sign-in flows are stubbed in the header/footer but not wired. The next step is to add a `/account` route that mutates against the guest subgraph's `signIn`, stores the JWT, and forwards it on member-gated queries.

## File map

```
src/
├── app/
│   ├── layout.tsx              header + footer + fonts + globals
│   ├── page.tsx                home
│   ├── globals.css             Tailwind + components
│   ├── hotels/
│   │   ├── page.tsx            list with city filter
│   │   └── [id]/page.tsx       detail
│   ├── stories/
│   │   ├── page.tsx            list with category filter
│   │   └── [slug]/page.tsx     detail
│   └── offers/page.tsx         deal spotlights
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Hero.tsx
│   ├── SearchBar.tsx
│   ├── HotelCard.tsx
│   ├── StoryCard.tsx
│   ├── InspirationCard.tsx
│   └── DealCard.tsx
├── lib/
│   ├── graphql.ts              gqlFetch helper
│   ├── queries.ts              all GraphQL operations
│   └── image.ts                placeholder URL mapper
└── types/graphql.ts            hand-typed response shapes
```
