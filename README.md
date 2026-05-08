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
| `/` | Hero, featured hotels (incl. India IT-corridor flagships), brand-story pillars, travel inspirations, active offers, featured stories, member CTA | property, content |
| `/search` | Search results — federated availability + lowest rate per hotel, per-context filter facets, 6 sort options, currency conversion | property, pricing |
| `/hotels` | All hotels grouped by country, with city filter | property |
| `/hotels/[id]` | Full hotel detail: gallery, rooms, spa experiences, event spaces, reviews, location | property, experiences, meetings |
| `/hotels/[id]/rates` | Select a Room and Rate — Marriott-style rate-list page with editable stay/guests bar, 42-currency selector, "show with taxes and fees" toggle, expandable room cards (Flexible / Member Exclusive / Package rate plans) | property, pricing |
| `/hotels/[id]/book` | Complete Your Booking — guest info form (53-country dropdown, country-aware state + zip), payment fields with Luhn-validated card number, room-requests + accessibility, sticky summary sidebar, 14-min hold timer | property, pricing |
| `/hotels/[id]/book/confirmation` | Booking confirmation with reference number | property |
| `/stories` | Article list with category filter | content |
| `/stories/[slug]` | Article detail with author, tags, related hotels | content, property |
| `/offers` | Active deal spotlights | content, property |
| `/brands` | All 21 brands grouped by tier (Luxury / Premium / Select) | property |
| `/brands/[id]` | Brand hero + signature properties + full portfolio | property |

The home page issues a single federated query that reaches `featuredHotels`, `featuredArticles`, `travelInspirations`, `dealSpotlights`, and `brandStory` in one round-trip — Apollo Router fans out to the right subgraphs.

> **GraphQL queries reference:** [`GRAPHQL.md`](./GRAPHQL.md) lists every
> operation the web app sends, what page it powers, and which subgraphs it
> touches. Read this if you want to learn how the data is composed.

## Notable features

- **Destination autocomplete.** Typeahead on the search bar (debounced 200ms,
  min 2 chars). Hits the property subgraph's `destinationSuggestions` query
  and groups results into **Cities → States/Regions → Countries → Hotels**
  (broad-but-specific intent first). Picking a hotel jumps straight to its
  rate page; picking a city / state / country pre-fills the destination
  input. The `/search` filter mirrors the same matching domain on the
  server side, so submitting "France", "Telangana", or "FR" all surface
  the right hotels.
- **End-to-end booking flow.** Search → rate-list → guest+payment form →
  confirmation. Validation lives in `lib/bookingValidation.ts` (pure, 77
  tests) so card number / zip / phone / state rules can be reused.
- **Currency conversion.** All 42 currencies the property subgraph references
  are supported in the rate-page dropdown. The pricing subgraph FX-converts
  amounts via USD as the pivot.
- **Country / state data.** `lib/countries.ts` (53 entries with phone code,
  currency, zip regex) + `lib/states.ts` (US/CA/AU/IN/MX/BR with formal
  subdivision lists; everything else falls back to free text).

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

## Testing

```bash
npm test           # full vitest suite (261 tests, ~0.5s)
npm run test:watch # watch mode
```

| Module | Tests | What it covers |
|---|---|---|
| `lib/bookingValidation.test.ts` | 77 | Email, phone, country-aware zip, Luhn, brand-aware CVV, expiry-vs-now, charge math, hold-timer formatter, card-number formatter, typing simulations |
| `lib/autocomplete.test.ts` | 17 | Group ordering (city → state → country → hotel), flatten, keyboard wraparound, hotel/city/state/country routing |
| `lib/countries.test.ts` | ~20 | 53-country invariants, ISO codes, phone codes, zip-pattern correctness |
| `lib/states.test.ts` | ~12 | Per-country counts (US 51, CA 13, IN 36, AU 8, MX 32, BR 27), case-insensitivity |
| `lib/searchParams.test.ts` | 6 | First-of-array semantics, curried `picker()` |
| `lib/money.test.ts` | 7 | `parseMoneyAmount`, `formatMoney`, `formatAmount` edge cases |
| `lib/image.test.ts` | 7 | Placeholder-host detection, deterministic seed, real-URL passthrough |
| `lib/guests.test.ts` | 29 | Room/adult/child arithmetic, child-age serialisation |
| `lib/stay.test.ts` | 18 | `resolveStay` defaulting from any partial input |
| `lib/dateRange.test.ts` | ~15 | Date-range picker math (range building, day picking) |
| `lib/popover.test.ts` | 9 | Pure positioning math used by the portal-mounted popover |
| `lib/search.test.ts` | 13 | URL ↔ filter state round-trip |
| `components/FilterBar.test.ts` | 15 | Hidden-input carry-forward across pills |

Every file under `src/lib/` has a test counterpart.

## File map

```
src/
├── app/
│   ├── layout.tsx                       header + footer + fonts + globals
│   ├── page.tsx                         home (HOME_QUERY)
│   ├── globals.css                      Tailwind + components
│   ├── search/page.tsx                  results page (SEARCH_HOTELS_QUERY)
│   ├── hotels/
│   │   ├── page.tsx                     list with country filter
│   │   └── [id]/
│   │       ├── page.tsx                 hotel detail (HOTEL_DETAIL_QUERY)
│   │       ├── rates/page.tsx           Select a Room and Rate (RATES_QUERY)
│   │       └── book/
│   │           ├── page.tsx             Complete Your Booking
│   │           └── confirmation/page.tsx booking confirmation
│   ├── brands/
│   │   ├── page.tsx                     brand index (BRANDS_LIST_QUERY)
│   │   └── [id]/page.tsx                brand detail (BRAND_DETAIL_QUERY)
│   ├── stories/
│   │   ├── page.tsx                     article list (STORIES_LIST_QUERY)
│   │   └── [slug]/page.tsx              article detail (STORY_DETAIL_QUERY)
│   └── offers/page.tsx                  deal spotlights (OFFERS_QUERY)
├── components/
│   ├── Header.tsx · Footer.tsx · Hero.tsx
│   ├── SearchBar.tsx                    composable search (compact / full)
│   ├── DestinationAutocomplete.tsx      typeahead destination input
│   ├── DateRangePicker.tsx · GuestPicker.tsx
│   ├── FilterBar.tsx · SortDropdown.tsx search refinement controls
│   ├── HotelCard.tsx · HotelListItem.tsx
│   ├── StoryCard.tsx · InspirationCard.tsx · DealCard.tsx
│   ├── BrandLogo.tsx · Popover.tsx
│   ├── RoomRateCard.tsx                 expandable room+rate card
│   ├── RoomDetailsModal.tsx             full room info dialog
│   ├── RatesSettingsBar.tsx             currency + show-taxes toggles
│   ├── StayUpdateBar.tsx                editable stay/guests on rates page
│   ├── HoldTimer.tsx                    14-min countdown on book page
│   ├── StatementCreditBanner.tsx        Luxe Visa offer banner
│   ├── MemberRateBanner.tsx             member-exclusive rate notice
│   ├── BookingForm.tsx                  guest + payment + requests form
│   ├── BookingSummarySidebar.tsx        right-column summary on book page
│   └── CvvHelper.tsx                    "where's the CVV" popover
├── lib/
│   ├── graphql.ts                       gqlFetch helper
│   ├── queries.ts                       all GraphQL operations (10 queries)
│   ├── image.ts                         placeholder URL mapper
│   ├── stay.ts                          stay-window resolver + formatter
│   ├── search.ts                        URL ↔ search-input bidirectional
│   ├── searchParams.ts                  pickFirst / picker for server pages
│   ├── guests.ts                        rooms/adults/children state machine
│   ├── dateRange.ts                     calendar-grid math
│   ├── popover.ts                       pure positioning math
│   ├── money.ts                         Money parsing + formatting
│   ├── constants.ts                     shared UI constants (fallback image)
│   ├── countries.ts                     53 supported countries
│   ├── states.ts                        states/provinces for major countries
│   ├── autocomplete.ts                  destination-suggestion grouping
│   └── bookingValidation.ts             pure form validation + Luhn + FX math
└── types/graphql.ts                     hand-typed response shapes
```
