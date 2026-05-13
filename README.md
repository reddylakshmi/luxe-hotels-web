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
| `/` | Hero, featured hotels (incl. India IT-corridor flagships), **Recently Viewed Hotels** (client-only island, per-device localStorage), brand-story pillars, travel inspirations, active offers, featured stories, member CTA | property, content |
| `/search` | Search results — federated availability + lowest rate per hotel, per-context filter facets, 6 sort options, currency conversion | property, pricing |
| `/hotels` | All hotels grouped by country, with city filter | property |
| `/hotels/[id]` | Full hotel detail: gallery, rooms, spa experiences, event spaces, reviews, location | property, experiences, meetings |
| `/hotels/[id]/rates` | Select a Room and Rate — Marriott-style rate-list page with editable stay/guests bar, 42-currency selector, "show with taxes and fees" toggle, expandable room cards (Flexible / Member Exclusive / Package rate plans) | property, pricing |
| `/hotels/[id]/book` | Complete Your Booking — guest info form (53-country dropdown, country-aware state + zip), payment fields with Luhn-validated card number, room-requests + accessibility, **redeem-points panel for loyalty members**, sticky summary sidebar that reflects the redemption in real time, 14-min hold timer. Submit calls `createReservation` via a Server Action. | property, pricing, reservations |
| `/hotels/[id]/book/confirmation` | Booking confirmation with the canonical `LUX-YYYY-NNNNNN` reference returned by the resolver | reservations |
| `/sign-in` | Member sign-in form (email + password) | guest |
| `/sign-up` | Create-account form (free tier, member rates, points) | guest |
| `/account` | Signed-in account hub — profile · addresses · payment methods · recent trips, all editable inline (sticky-sidebar layout, Server Actions back add/edit/remove + set-primary/default flows) | guest · reservations |
| `/trips` | Signed-in: list of `myReservations` (each row links to detail). Signed-out: public confirmation-number lookup. | reservations · property |
| `/trips/[id]` | Trip detail — itinerary + status-aware actions (Online check-in, Cancel reservation), digital key when CHECKED_IN, charges + special requests + cancellation summary | reservations · property |
| `/meetings` | Meetings & Events discovery — cross-hotel `searchEventSpaces` with capacity-fit ranked venue cards | meetings · property |
| `/meetings/[hotelId]/[spaceId]` | Venue detail — capacity matrix, full rate card, technical specs, A/V inventory, catering menus, RFP CTA | meetings · property |
| `/meetings/[hotelId]/[spaceId]/rfp` | Five-step **Request a Proposal** wizard (sign-in gated) — submits via `submitRFP`, routes to `/account/events` on success | meetings · guest |
| `/account/events` | Signed-in: list of `myRFPs` with status timeline, hotel proposals, cancel-RFP dialog. | meetings · property |
| `/stories` | Article list with category filter | content |
| `/stories/[slug]` | Article detail with author, tags, related hotels | content, property |
| `/offers` | Active deal spotlights | content, property |
| `/brands` | All 21 brands grouped by tier (Luxury / Premium / Select) | property |
| `/brands/[id]` | Brand hero + signature properties + full portfolio | property |

The home page issues a single federated query that reaches `featuredHotels`, `featuredArticles`, `travelInspirations`, `dealSpotlights`, and `brandStory` in one round-trip — Apollo Router fans out to the right subgraphs.

> **GraphQL queries reference:** [`GRAPHQL.md`](./GRAPHQL.md) lists every
> operation the web app sends, what page it powers, and which subgraphs it
> touches. Read this if you want to learn how the data is composed.
>
> **Visual walk-through:** [`docs/screenshots/`](./docs/screenshots/) has
> captioned 1280px captures of the signed-in account flow (sign-in →
> trips → account display → profile/address/payment edit modes →
> add / edit / remove round-trips through the federated stack).

## Notable features

- **Destination autocomplete.** Typeahead on the search bar (debounced 200ms,
  min 2 chars). Hits the property subgraph's `destinationSuggestions` query
  and groups results into **Cities → States/Regions → Countries → Hotels**
  (broad-but-specific intent first). Picking a hotel jumps straight to its
  rate page; picking a city / state / country pre-fills the destination
  input. The `/search` filter mirrors the same matching domain on the
  server side, so submitting "France", "Telangana", or "FR" all surface
  the right hotels.
- **Home-page picker with special-rate dropdown.** The SearchBar
  on `/` ships the full picker stack — destination, stay dates,
  rooms & guests, plus a **Special Rate** dropdown (Lowest Regular
  Rate / AAA-CAA / Senior / Government / Corp-Promo) and a **Use
  Points / Awards** checkbox. The dropdown is populated from the
  federated `specialRates` query so labels live next to the
  matching `RatePlanType` enum in the schema. Submit runs the pure
  `validateSearchSubmit` helper — empty destination, missing or
  calendar-invalid dates, or check-out ≤ check-in all surface
  inline red text under the offending input and block submission;
  no redirect to an error page. Corp/Promo selection toggles an
  inline code input via the schema's `requiresCode` flag. Selected
  rate + Use Points chips appear in the `/search` context line, the
  `/rates` "Select a Room and Rate" header, the `/book` summary
  sidebar, and the `/confirmation` reference card — so the guest's
  filter choice is visible end-to-end. Every hop preserves the
  picker state in the URL (`specialRateCode`, `corporateCode`,
  `usePoints`) including the booking page's *Edit Stay Details*
  back-link.
- **Uniform brand-page search.** `/brands/[id]` ships the same
  full picker stack as the home page (Destination + Stay + Rooms /
  Guests + Special Rate + Use Points). The brand page fetches the
  `specialRates` catalogue in parallel with `BRAND_DETAIL_QUERY` and
  seeds the SearchBar `defaults` from incoming search params, so a
  brand-scoped search has the same controls + carry-over behaviour
  as the home flow. Submit forwards `brandId` so `/search` filters
  to the selected brand.
- **Marriott-style rate tabs on `/hotels/[id]/rates`.** Two-tab
  WAI-ARIA tablist (Standard Rates / Deals & Packages) with
  per-tab badges, hash-synced deep-links (`/rates#deals` jumps
  straight to the second tab + back-button restores the prior
  tab), and pre-partitioned room lists per tab so only the active
  tab's cards mount client-side. Rate plans are classified via
  `lib/ratesTabs.ts` — BAR + ADVANCE_PURCHASE land in Standard;
  MEMBER / AAA / SENIOR / GOVERNMENT / CORPORATE / PROMOTION /
  PACKAGE / GROUP / REDEMPTION land in Deals; unknown codes fail
  closed to Deals so a future enum member can't silently disappear
  from the UI.
- **End-to-end booking flow.** Search → rate-list → guest+payment form →
  `createReservation` → confirmation. Validation lives in
  `lib/bookingValidation.ts` (pure, 79 tests) so card number / zip /
  phone / state rules can be reused. Submit posts to
  `createReservationAction` (server-side) which carries the guest's
  bearer token, mints a fresh `idempotencyKey`, and threads
  `pointsToRedeem` through to the federated mutation; the confirmation
  page renders the canonical `LUX-YYYY-NNNNNN` reference returned by
  the resolver. Resolver-side errors (room unavailable, validation,
  authorization) surface inline under the submit button.
- **Redeem points at checkout.** Signed-in members with a positive
  loyalty balance see a *Redeem points* slider between guest info and
  payment. The two-column page is wrapped by `BookingExperience.tsx`
  which lifts `pointsToRedeem` state so the sticky summary's
  "Loyalty redemption · N pts · −$X" line and Total update in real
  time as the slider moves. `pointsToRedeem` is sent on the
  `createReservation` mutation and surfaced back as
  `loyaltyContext.pointsRedeemed` on the confirmation. Backend applies
  a flat 0.007/unit-currency discount as `rateBreakdown.loyaltyDiscount`
  — a per-currency `pointsValuation(currency)` server query is the
  next refinement.
- **Meetings & Events funnel.** `/meetings` runs `searchEventSpaces`
  across every property, ranking hits by capacity-fit (`capacityFit`
  picks the *snuggest* layout that meets headcount, not the largest).
  Venue detail shows a highlighted capacity matrix, rate card,
  technical specs, A/V inventory, and the hotel's catering menus.
  *Request a Proposal* opens a sign-in gated five-step wizard
  (basics · spaces · catering · contact · review) seeded with the
  search context + the guest's profile contact info. Submit calls
  `submitRfpAction` (carries bearer token, mints idempotency UUID),
  routes to `/account/events?ref=<rfpNumber>` where a celebratory
  banner pins the new RFP, and the timeline + hotel proposals panel
  surfaces every reply as the planning team responds. The existing
  `/hotels/[id]` Meetings tab now deep-links each venue card into
  the new flow. Pure helpers (`lib/meetings.ts`) cover capacity
  math, wizard step validators, status-tone bucketing, and
  cancel-eligibility under 43 vitest.
- **Currency conversion.** All 42 currencies the property subgraph references
  are supported in the rate-page dropdown. The pricing subgraph FX-converts
  amounts via USD as the pivot.
- **Country / state data.** `lib/countries.ts` (53 entries with phone code,
  currency, zip regex) + `lib/states.ts` (US/CA/AU/IN/MX/BR with formal
  subdivision lists; everything else falls back to free text).
- **Recently Viewed Hotels.** Per-device list (localStorage, capped at 12,
  most-recent-first, dedup) tracked invisibly on hotel detail and rate
  pages, surfaced in a client-only island on the home page after the
  Featured Hotels carousel. The booking flow intentionally doesn't
  track — mid-purchase pages shouldn't pollute the browse history.
- **Sign in / Sign up.** Three-layer architecture: pure validation
  (`lib/auth.ts`) → server actions on httpOnly session cookies
  (`lib/authActions.ts`, `lib/authSession.ts`) → forms with
  `useFormState` for progressive enhancement. Header swaps to a
  "Hi, {firstName}" greeting + Sign Out when authenticated. The
  Complete Your Booking form pre-fills first name, last name, and
  email from the session so a logged-in guest doesn't retype them.
- **My Trips.** Signed-in guests see their reservations via the
  authed `myReservations` query (`gqlFetchAuthed` adds the JWT
  Bearer header from the cookie). Signed-out guests get a public
  "find by confirmation number" form backed by
  `reservationByConfirmationNumber`.
- **Hotel-detail tabs.** WAI-ARIA tab pattern on `/hotels/[id]`
  (Overview · Rooms & Suites · Experiences · Meetings · Location)
  swaps content in place — no scroll jumps. Hash-synced URL so
  `/hotels/X#meetings` deep-links work; keyboard nav (←/→/↑/↓ wrap,
  Home/End jump) follows the spec.

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
- **No Apollo Client on the client.** All pages are server components. Caching and revalidation are handled by Next's `fetch` — `gqlFetch` defaults to `revalidate: 30` and accepts a per-call `{ revalidate, tags }` for catalog pages that opt into longer TTLs. `/brands`, `/brands/[id]`, and every `SPECIAL_RATES_QUERY` call site pass cache tags (`catalog:brands`, `catalog:brand:<id>`, `catalog:specialRates`) so a future admin mutation can `revalidateTag(...)` instead of nuking entire paths. If a future page needs interactive client-side queries, add Apollo Client locally in that route — don't make it a dependency for the whole app.
- **Type safety.** `src/types/graphql.ts` is hand-written to match the queries in `src/lib/queries.ts`. When the schema changes, update both files. (Future improvement: add `graphql-codegen` to generate types from a downloaded supergraph SDL.)
- **Locale.** All queries pass `locale: "en"`. The GraphQL layer handles fallback when a translation is missing — nothing in this app does.
- **Account hub.** `/account` is one federated `MyAccount` query (guest + reservations subgraphs in one round-trip) feeding four sticky-sidebar sections: Profile, Addresses, Payment methods, Recent trips. Profile edits, address add / edit / remove / set-primary, and payment add / remove / set-default each post to a Server Action that calls the matching mutation and runs `revalidatePath('/account')`. Validation is pure (`lib/account.ts` — phone, ISO date, country code, address shape, card-expiry math) so vitest covers every branch. The header's "Hi, {firstName}" greeting links here. The sidebar (`AccountSidebar`) is route-aware — section anchors rewrite to `/account#<id>` when mounted on a subpage so clicking *Profile* from `/account/loyalty` actually takes you back, and the matching subpage entry gets a goldDeep `aria-current="page"` indicator. Every subpage hero also carries an `AccountBreadcrumb` (← Back to account + small-caps trail) for redundant, can't-miss back-navigation.
- **Trip detail.** `/trips/[id]` is the post-booking surface: itinerary, charges, special requests, payment summary, plus a sticky action sidebar that gates **Online check-in** (collapsing form for document type / number / ETA) and **Cancel reservation** on the server-side `canCheckInOnline` and `isRefundable` flags. Mutations (`mobileCheckIn`, `cancelReservation`) generate per-call idempotency keys via `crypto.randomUUID` and run `revalidatePath('/trips/[id]')`. When the reservation is `CHECKED_IN`, a Digital Key card surfaces the door code + expiry.
- **Featured Hotels Book Now.** Each card on the home featured strip has a **Book Now** CTA that deep-links to `/hotels/<id>#rooms` — the existing `HotelTabs` component reads `window.location.hash` on mount, so guests land on Rooms & Suites with the tab already activated.

## Security — how the web interacts with the gateway gates

The federated platform enforces **five layered controls** server-side
(see [`luxe-hotels-graphqlwithJava/README.md` ▸ Security](../luxe-hotels-graphqlwithJava/README.md#security)).
None of them live in this Next.js app — the web is a *consumer* of the
gateway contract. Here's what that means for the front-end code:

- **JWT propagation.** `src/lib/graphqlAuthed.ts` is the only path that
  adds `Authorization: Bearer <token>` from the httpOnly `luxe_session`
  cookie. Public pages (`/`, `/hotels`, `/stories`) use `gqlFetch`;
  protected surfaces (`/account/*`, `/trips/*`, `/meetings/.../rfp`)
  use `gqlFetchAuthed`. Anything in between is a bug.
- **Field selection respects `@auth`.** The `MY_ACCOUNT_QUERY` and
  `ME_PROFILE_QUERY` request `phone`, `dateOfBirth`, etc. on
  `GuestProfile` — all `@auth(requires: GUEST)` server-side. They only
  resolve over `gqlFetchAuthed`. `PaymentMethod.pspToken` (the
  `@auth(requires: ADMIN)` vault key) is **never selected** by any
  web query — it has no UI surface and shouldn't.
- **PCI never enters the bundle.** Card number, CVV, full token —
  none of these are on the schema, none are persisted in cookies,
  none cross `/api`. The booking form's payment fields go straight
  to `createReservation` via the Server Action and the response carries
  only the truncated `lastFour` back.
- **Cross-tenant returns null.** Server-side row-level checks return
  `null` (not an error) when a signed-in guest tries to load another
  guest's reservation by id. The trip-detail page renders the
  "reservation unavailable" path on null, which doubles as the legit
  "expired link / wrong id" case — same shape, no enumeration leak.
- **Rate-limit & complexity errors.** A burst can return HTTP 429
  with `extensions.code = RATE_LIMITED`; a giant query returns
  `QUERY_TOO_COMPLEX` / `QUERY_TOO_DEEP`. `gqlFetch` surfaces the
  message; routes that hit these are bugs in *our* code, not the user
  — they should never reach a guest. **Open follow-up**: surface
  these as a graceful "Slow down" banner instead of the generic
  error page when they do leak through.
- **Persisted queries roadmap.** Today the web sends inline queries
  via POST. When the router flips `persisted_queries.safelist.enabled`
  to true in production, every operation in `src/lib/queries.ts` must
  be registered first. Plan: add a `npm run query:publish` script
  that uploads to Apollo's registry as part of CI. Until then, the
  router's `log_unknown: true` setting will report any new query
  that ships without a manifest entry.

The header `My Trips` / `Hi, {firstName}` chip is the visible auth
indicator. Sign-out → cookie deleted → all `gqlFetchAuthed` calls go
out without the header → server returns either anonymous-safe data
or `UNAUTHORIZED`. The redirect-to-`/sign-in?returnTo=…` pattern on
every protected page ensures the round-trip is seamless.

**`buildAuthHref(target, pathname, search)`** in `lib/auth.ts` is the
shared helper for "Sign In" CTAs on signed-out pages. It builds
`/sign-in?returnTo=<encoded current URL>` so that any guest who hits
sign-in from `/hotels/[id]/book`, `/trips`, or a future protected
page lands back exactly where they were. Returns the plain
`/sign-in` on root and on the auth pages themselves to avoid
re-wrap loops. The downstream chain (sign-in page → `SignInForm`
hidden input → `signInAction` → `safeReturnTo()` validation →
redirect) was already correct; this helper is the link-side glue
so the masthead `SignInOrJoin` dropdown and the `/trips`
"sign in to see all of your trips" CTA both round-trip cleanly.

## Testing

```bash
npm test           # full vitest suite (561 tests, <1s)
npm run test:watch # watch mode
```

| Module | Tests | What it covers |
|---|---|---|
| `lib/account.test.ts` | 54 | Member-since formatter (UTC-stable), card-expiry math, primary-first sort, optional phone, DOB age window, country code, address-form composite |
| `lib/accountNav.test.ts` | 7 | Sidebar href resolution (anchor → `/account#<id>` from subpages, explicit href passthrough) + active-state rules (subpage match only, never anchor items) |
| `lib/trip.test.ts` | 15 | Stay-window formatter, cancellation-deadline parsing, mobile-check-in form validator (document type / number / ETA HH:MM) |
| `lib/bookingValidation.test.ts` | 82 | Email, phone, country-aware zip, Luhn, brand-aware CVV, expiry-vs-now, charge math (incl. multi-room scaling — subtotal/taxes/fees multiply by `rooms` with default 1 and a defensive clamp at ≥ 1), hold-timer formatter, card-number formatter, typing simulations |
| `lib/searchBarValidation.test.ts` | 13 | Home-page search submit: empty destination, missing/invalid dates (Feb 30, month 13, non-leap Feb 29, leap-year Feb 29), check-out ≤ check-in ordering, null/undefined coercion, cascade prevention (no double-error when a date is itself invalid) |
| `lib/ratesTabs.test.ts` | 11 | Rate-plan classification (BAR + ADVANCE_PURCHASE → standard; MEMBER / AAA / SENIOR / PACKAGE / etc. → deals), case-insensitivity, null/unknown fail-closed to deals, per-room partitioning drops rooms with zero matching rates |
| `lib/truncate.test.ts` | 7 | Excerpt clamping for HotelListItem — word-boundary cuts, hard cut for token-only input, trailing punctuation strip, null/undefined/empty defensiveness, 160-char default |
| `lib/meetings.test.ts` | 43 | Setup labels, capacity-fit (snug-not-largest), search input validation + wire shape, match-score caps, RFP wizard step validators, draft-to-input transformer, status tone bucketing, cancel eligibility |
| `lib/autocomplete.test.ts` | 17 | Group ordering (city → state → country → hotel), flatten, keyboard wraparound, hotel/city/state/country routing |
| `lib/countries.test.ts` | ~20 | 53-country invariants, ISO codes, phone codes, zip-pattern correctness |
| `lib/states.test.ts` | ~12 | Per-country counts (US 51, CA 13, IN 36, AU 8, MX 32, BR 27), case-insensitivity |
| `lib/searchParams.test.ts` | 6 | First-of-array semantics, curried `picker()` |
| `lib/money.test.ts` | 7 | `parseMoneyAmount`, `formatMoney`, `formatAmount` edge cases |
| `lib/image.test.ts` | 7 | Placeholder-host detection, deterministic seed, real-URL passthrough |
| `lib/recentlyViewed.test.ts` | 15 | localStorage ordering, dedup, cap at 12, malformed JSON, SSR-null storage |
| `lib/auth.test.ts` | 28 | Password rules, confirm-password, sign-in / sign-up form validators, session expiry, AuthPayload→Session conversion, `buildAuthHref` returnTo builder (root + auth-page loops + query-string preservation) |
| `lib/hotelTabs.test.ts` | 38 | Tab id parsing (case / whitespace / # prefix), keyboard wraparound (←/→/↑/↓/Home/End), default-tab fallback |
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
│   ├── offers/page.tsx                  deal spotlights (OFFERS_QUERY)
│   ├── (auth)/                          shared layout for sign-in / sign-up
│   │   ├── layout.tsx                   editorial split, redirects if authed
│   │   ├── sign-in/page.tsx             Sign-in form (SIGN_IN_MUTATION)
│   │   └── sign-up/page.tsx             Create-account form (SIGN_UP_MUTATION)
│   ├── account/page.tsx                 Account hub (MY_ACCOUNT_QUERY)
│   └── trips/
│       ├── page.tsx                     My Trips list / find-by-confirmation
│       └── [id]/page.tsx                Trip detail (RESERVATION_DETAIL_QUERY + check-in / cancel)
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
│   ├── BookingExperience.tsx            two-column wrapper that lifts
│   │                                    pointsToRedeem so form + sidebar share state
│   ├── BookingForm.tsx                  guest + payment + requests form;
│   │                                    onSubmit calls createReservationAction
│   ├── BookingPointsPanel.tsx           "Redeem points" slider + preview
│   ├── BookingSummarySidebar.tsx        right-column summary on book page
│                                        (Total reflects loyalty discount)
│   ├── MeetingsSearchBar.tsx            cross-hotel /meetings search input
│   ├── EventSpaceCard.tsx               capacity-fit ranked venue card
│   ├── EventSpaceCapacityMatrix.tsx     setup × capacity matrix w/ snug fit highlight
│   ├── EventSpaceRateCardView.tsx       full / half / hourly / setup / cleaning rates
│   ├── RfpWizard.tsx                    five-step Request a Proposal wizard
│   ├── RfpStatusTimeline.tsx            Submitted → Proposal sent → Accepted milestones
│   ├── RfpCancelDialog.tsx              cancel-RFP modal with reason
│   ├── CvvHelper.tsx                    "where's the CVV" popover
│   ├── RecentlyViewedTracker.tsx        invisible per-page tracker
│   ├── RecentlyViewedSection.tsx        home-page Recently Viewed island
│   ├── HotelTabs.tsx                    ARIA tab swap on /hotels/[id]
│   ├── SignInForm.tsx · SignUpForm.tsx  auth forms (useFormState)
│   ├── SignInOrJoin.tsx                 header dropdown for auth state
│   ├── AccountSidebar.tsx               sticky route-aware nav across the /account hub
│                                        (active-state on the current subpage, hash items
│                                        rewrite to /account#<id> from subpages)
│   ├── AccountBreadcrumb.tsx            "← Back to account" + breadcrumb for subpage heroes
│   ├── AccountSections.tsx              shared Section/Field/EmptyState shell + read-only Trips
│   ├── ProfileEditor.tsx                Profile edit toggle (phone / DOB / nationality)
│   ├── AddressesManager.tsx             Addresses add/edit/remove/set-primary
│   ├── PaymentsManager.tsx              Payment-method add/remove/set-default
│   ├── TripCard.tsx                     reservation card (shared list/lookup; linkable)
│   ├── TripActions.tsx                  /trips/[id] sticky action panel (check-in form + cancel)
│   └── FindReservationForm.tsx          public confirmation-number lookup
├── lib/
│   ├── graphql.ts                       gqlFetch helper
│   ├── queries.ts                       all GraphQL operations (30 ops total)
│   ├── graphqlAuthed.ts                 server-only authed gqlFetch wrapper
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
│   ├── bookingValidation.ts             pure form validation + Luhn + FX math
│   ├── bookingActions.ts                server action: createReservation
│   ├── loyalty.ts                       points-to-cash + clamp helpers
│   ├── meetings.ts                      capacity fit math + RFP wizard validators + status helpers
│   ├── meetingActions.ts                server actions: submitRFP / updateRFP / cancelRFP
│   ├── recentlyViewed.ts                per-device localStorage list helpers
│   ├── hotelTabs.ts                     ARIA tab keyboard math + hash parser
│   ├── auth.ts                          pure validators + Session shape
│   ├── authActions.ts                   server actions: sign in / up / out
│   ├── authSession.ts                   httpOnly session-cookie read/write
│   ├── account.ts                       pure helpers: member-since, card expiry, primary-first sort, address validators
│   ├── accountActions.ts                server actions: profile + address + payment mutations
│   ├── accountNav.ts                    pure helpers: sidebar href resolution + active-state rules
│   ├── trip.ts                          pure helpers: stay-window, cancellation deadline, check-in form validator
│   ├── tripActions.ts                   server actions: mobileCheckIn + cancelReservation
│   └── tripsActions.ts                  server action: find by confirmation #
└── types/graphql.ts                     hand-typed response shapes
```
