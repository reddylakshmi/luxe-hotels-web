# GraphQL queries reference

This is the complete catalogue of GraphQL operations the web app sends to the
federated Apollo Router at `NEXT_PUBLIC_GRAPHQL_URL` (default
`http://localhost:4000/`).

Every query lives in [`src/lib/queries.ts`](./src/lib/queries.ts) and is
issued via the tiny `gqlFetch()` helper in
[`src/lib/graphql.ts`](./src/lib/graphql.ts) — the app deliberately doesn't
ship Apollo Client to the browser. All pages are React Server Components, so
the request is made server-side and only the rendered HTML reaches the
client.

The Apollo Router fans each operation out across the relevant subgraphs.
Two interchangeable backends implement that supergraph, both serving the
router on `http://localhost:4000/` with a byte-for-byte identical schema:
[`luxe-hotels-graphqlwithJava`](https://github.com/reddylakshmi/luxe-hotels-graphqlwithJava)
(Netflix DGS / Spring Boot) and
[`luxe-hotels-graphqlwithtypescript`](https://github.com/reddylakshmi/luxe-hotels-graphqlwithtypescript)
(Apollo Server 4 / Node 20). Every operation in this document works against
either one. The "Subgraphs touched" column lists which subgraphs serve each
top-level field.

---

## Security envelope

The federated platform enforces field-level + row-level authorization,
query complexity caps, and per-request rate limits server-side. The
full breakdown lives in each backend's README Security section —
[`luxe-hotels-graphqlwithJava`](../luxe-hotels-graphqlwithJava/README.md#security)
or [`luxe-hotels-graphqlwithtypescript`](../luxe-hotels-graphqlwithtypescript/README.md);
both implement the same gates. What every query in this document has to
respect:

| Surface | Path | Notes |
|---|---|---|
| Public reads | `gqlFetch` | `HOME_QUERY`, `HOTEL_DETAIL_QUERY`, `STORIES_*`, `OFFERS_QUERY`, `MEETINGS_SEARCH_QUERY`, etc. |
| Authed reads | `gqlFetchAuthed` | Anything that selects `phone` / `dateOfBirth` / `nationality` / `externalIds` on `GuestProfile`, anything on `PaymentMethod`, all `myXxx` queries, all RFP queries |
| Authed mutations | Server actions | `signOut`, profile / address / payment / saved-hotel mutations, `createReservation`, `submitRFP`, `cancelRFP`, etc. |

### New error codes (in `extensions.code`)

| Code | When | Where it surfaces |
|---|---|---|
| `UNAUTHORIZED` | Anonymous request hit an `@auth`-gated field or resolver that calls `auth.requireAuth()` | inline error on the relevant field path |
| `FORBIDDEN` | Authenticated request but role too low for the `@auth(requires: ROLE)` gate (e.g. guest asking for `PaymentMethod.pspToken`) | inline error on the field path |
| `QUERY_TOO_COMPLEX` | Cost-scored AST exceeds `luxe.security.max-complexity` (default 2000) | top-level error, query never executes |
| `QUERY_TOO_DEEP` | Selection nesting exceeds `luxe.security.max-depth` (default 10) | top-level error |
| `RATE_LIMITED` | Per-user (`user:<guestId>`) or per-IP token bucket exhausted | HTTP 429 with structured body — `gqlFetch` throws |

Row-level rejection (e.g. trying to load another guest's reservation
by id) returns `null` with **no error** — same shape as a genuinely-
missing row, on purpose, so id-walking can't distinguish "yours" from
"theirs". Treat `null` as "unavailable" everywhere; never reveal
whether the id exists.

### Sensitive fields you should *never* request

- `PaymentMethod.pspToken` (`@auth(requires: ADMIN)`) — vault key, has
  no UI use case. The booking flow's `createReservation` mutation
  generates a tokenization round-trip server-side; the client never
  sees the token at all.
- Anything pretending to be a primary account number, CVV, or
  reversible card material — none of those are on the schema.

### Authoring queries that pass the complexity guardrail

The federated platform scores every incoming query and rejects
anything above the configured `max-complexity` (currently **2000**).
Score = field count × pagination multiplier (see backend README ▸
Performance). Two real product queries hit the limit during routine
browsing and had to be trimmed:

- **`BRAND_DETAIL_QUERY`** — `featuredHotels(first: 12)` was wider
  than the page rendered (`.slice(0, 6)`); fields like `altText`,
  `hasSpa`, `hasPool` were requested but never displayed. Each
  redundant field multiplies by the parent's `first` value.
- **`SEARCH_HOTELS_QUERY`** — `brand { id name tier accentColor }`
  fetched four scalars per row when only `tier` was rendered.

**Rules of thumb when adding a list-paginated query:**

1. Match `first:` to what the UI renders, not what you might want
   later. Lower wins.
2. Only request fields the component actually reads. `grep` your
   component file before extending the selection.
3. Avoid `altText`, `hasXxx`, full `brand { ... }`, full `location
   { ... coordinates }` subtrees unless the UI uses them.
4. If a query needs to exceed 2000, split it into two parallel
   Promise.all-style fetches instead of bumping the threshold.

### Server-side batching (DataLoader)

A few of the highest-cardinality nested fields are backed by
`@DgsDataLoader` beans on the property subgraph — the client can
request them freely without worrying about N+1:

| Field | Behavior |
|---|---|
| `Hotel.brand` | All hotels in a single query batch into one brand lookup |
| `Hotel.roomTypes` | All hotels in a single query batch into one room-type lookup |
| Federation `_entities` on `Hotel` | Foreign subgraphs' Hotel refs hydrate in one batched call |

That means queries like `featuredHotels(first: 9) { brand { tier } roomTypes { id name } }` cost the same backend round-trip count whether `first` is 1 or 100. Other subgraphs still use the synchronous per-call path; safe today (mock data), worth knowing if you write a query that loops a list field heavily.

---

## Table of contents

| Functionality | Page | Query | Subgraphs touched |
|---|---|---|---|
| Home — landing carousel + brand story | `/` | [`HOME_QUERY`](#home_query) | property · content · pricing |
| Special-rate dropdown catalogue | `/`, `/search` | [`SPECIAL_RATES_QUERY`](#special_rates_query) | pricing |
| Find a hotel — results + filters + sort | `/search` | [`SEARCH_HOTELS_QUERY`](#search_hotels_query) | property · pricing |
| Hotels list + city/country filter | `/hotels` | [`HOTELS_LIST_QUERY`](#hotels_list_query) | property |
| Destination autocomplete (typeahead) | search bar (any page) | [`DESTINATION_SUGGESTIONS_QUERY`](#destination_suggestions_query) | property |
| Recently Viewed Hotels (home section) | `/` (client-only island) | [`RECENTLY_VIEWED_QUERY`](#recently_viewed_query) | property |
| Hotel detail | `/hotels/[id]` | [`HOTEL_DETAIL_QUERY`](#hotel_detail_query) | property · experiences · meetings |
| Sign in | `/sign-in` | [`SIGN_IN_MUTATION`](#sign_in_mutation) | guest |
| Create account | `/sign-up` | [`SIGN_UP_MUTATION`](#sign_up_mutation) | guest |
| Trips — find by confirmation # | `/trips` (signed-out) | [`RESERVATION_BY_CONFIRMATION_QUERY`](#reservation_by_confirmation_query) | reservations · property |
| My Trips | `/trips` (signed-in) | [`MY_RESERVATIONS_QUERY`](#my_reservations_query) | reservations · property |
| Trip detail | `/trips/[id]` | [`RESERVATION_DETAIL_QUERY`](#reservation_detail_query) | reservations · property |
| Mobile check-in | `/trips/[id]` | [`MOBILE_CHECK_IN_MUTATION`](#mobile_check_in_mutation) | reservations |
| Cancel reservation | `/trips/[id]` | [`CANCEL_RESERVATION_MUTATION`](#cancel_reservation_mutation) | reservations |
| Create reservation (Book Now) | `/hotels/[id]/book` | [`CREATE_RESERVATION_MUTATION`](#create_reservation_mutation) | reservations · pricing · loyalty |
| Meetings discovery (cross-hotel) | `/meetings` | [`MEETINGS_SEARCH_QUERY`](#meetings_search_query) | meetings · property |
| Venue detail (event space) | `/meetings/[hotelId]/[spaceId]` | [`EVENT_SPACE_DETAIL_QUERY`](#event_space_detail_query) | meetings · property |
| Submit RFP | `/meetings/[hotelId]/[spaceId]/rfp` | [`SUBMIT_RFP_MUTATION`](#submit_rfp_mutation) | meetings |
| Update RFP (autosave / edit) | `/meetings/[hotelId]/[spaceId]/rfp` | [`UPDATE_RFP_MUTATION`](#update_rfp_mutation) | meetings |
| Cancel RFP | `/account/events` | [`CANCEL_RFP_MUTATION`](#cancel_rfp_mutation) | meetings |
| My RFPs | `/account/events` | [`MY_RFPS_QUERY`](#my_rfps_query) | meetings · property |
| My profile (booking-page prefill) | `/hotels/[id]/book` (signed-in) | [`ME_PROFILE_QUERY`](#me_profile_query) | guest |
| Account hub | `/account` | [`MY_ACCOUNT_QUERY`](#my_account_query) | guest · reservations |
| Update profile (phone / DOB / nationality) | `/account` | [`UPDATE_GUEST_PROFILE_MUTATION`](#update_guest_profile_mutation) | guest |
| Add address | `/account` | [`ADD_ADDRESS_MUTATION`](#add_address_mutation) | guest |
| Update address | `/account` | [`UPDATE_ADDRESS_MUTATION`](#update_address_mutation) | guest |
| Remove address | `/account` | [`REMOVE_ADDRESS_MUTATION`](#remove_address_mutation) | guest |
| Set primary address | `/account` | [`SET_PRIMARY_ADDRESS_MUTATION`](#set_primary_address_mutation) | guest |
| Add payment method | `/account` | [`ADD_PAYMENT_METHOD_MUTATION`](#add_payment_method_mutation) | guest |
| Remove payment method | `/account` | [`REMOVE_PAYMENT_METHOD_MUTATION`](#remove_payment_method_mutation) | guest |
| Set default payment method | `/account` | [`SET_DEFAULT_PAYMENT_METHOD_MUTATION`](#set_default_payment_method_mutation) | guest |
| Select a Room and Rate | `/hotels/[id]/rates` | [`RATES_QUERY`](#rates_query) | property · pricing |
| Stories list + category filter | `/stories` | [`STORIES_LIST_QUERY`](#stories_list_query) | content |
| Story detail | `/stories/[slug]` | [`STORY_DETAIL_QUERY`](#story_detail_query) | content · property |
| Offers | `/offers` | [`OFFERS_QUERY`](#offers_query) | content · property |
| Brands list | `/brands` | [`BRANDS_LIST_QUERY`](#brands_list_query) | property |
| Brand detail + portfolio | `/brands/[id]` | [`BRAND_DETAIL_QUERY`](#brand_detail_query) | property |
| Inspirations | `/inspirations` (when added) | [`INSPIRATIONS_QUERY`](#inspirations_query) | content |

> **Booking pages.** The Complete Your Booking page (`/hotels/[id]/book`)
> re-uses [`RATES_QUERY`](#rates_query) to resolve the room+rate the user
> picked, plus [`ME_PROFILE_QUERY`](#me_profile_query) and (signed-in
> only) `myLoyaltyAccount { loyaltyNumber pointsBalance { available } }`
> to pre-fill the form and gate the Redeem-points panel. *Submit* posts
> [`CREATE_RESERVATION_MUTATION`](#create_reservation_mutation) with the
> guest's bearer token; the confirmation page renders the canonical
> `LUX-YYYY-NNNNNN` reference returned by the resolver.

---

## `HOME_QUERY`

**Page:** `/` (home) — [`src/app/page.tsx`](./src/app/page.tsx)

**Why one query:** the home page renders five heterogeneous sections —
featured hotels, featured articles, travel inspirations, active deals, and
the brand story. A single federated round-trip is cheaper than five.

**Subgraphs touched:** `property` (hotels), `content` (articles, inspirations,
deals, brand story).

```graphql
query Home {
  featuredHotels(first: 9) {
    id name slug starRating
    brand { id name tier accentColor }
    location { address { city countryCode } }
    guestRating { overall count }
    media(first: 1, categories: [EXTERIOR]) {
      edges { node { url altText } }
    }
  }

  featuredArticles(first: 4, locale: "en") {
    id slug category readTimeMinutes
    title { text } excerpt { text }
    heroImage { url altText { text } }
    author { name }
    publishedAt
  }

  travelInspirations(first: 6, locale: "en") {
    id slug destination region bestSeason
    title { text } description { text }
    heroImage { url altText { text } }
    approxBudget { amount currency }
    recommendedDays
  }

  dealSpotlights(active: true, locale: "en") {
    id slug promoCode discountPercent
    title { text } description { text }
    ctaLabel { text } ctaUrl
    heroImage { url altText { text } }
  }

  brandStory(locale: "en") {
    title { text } tagline { text }
    pillars { code title { text } description { text } icon }
  }
}
```

The home page also fetches `SPECIAL_RATES_QUERY` (below) as part
of the same round-trip when fetching against the federated router —
it's a separate query string but the router plans it alongside.

---

## `SPECIAL_RATES_QUERY`

**Pages:** `/`, `/search` (header), `/brands/[id]`, `/hotels/[id]/rates`,
`/hotels/[id]/book`, and `/hotels/[id]/book/confirmation` — populates the
**Special Rate** dropdown on every page that owns a picker, and resolves
the human label for the booking-sidebar and confirmation chips.

**Functionality:** returns the small catalogue (5 entries today)
that drives the dropdown UI. Each row carries:
  • `code` — the matching `RatePlanType` enum member
    (e.g. `AAA_CAA`, `SENIOR`, `CORPORATE`) the web threads into
    the `/search` URL when the guest submits.
  • `label` — display text shown in the dropdown and, downstream,
    in the chip next to "Select a Room and Rate", in the booking
    summary sidebar, and on the confirmation reference card.
  • `description` — one-line copy under the highlighted option.
  • `requiresCode` — true only for `CORPORATE`. The web flips
    a free-text input on/off based on this flag rather than
    hardcoding the conditional in the bundle.

The picker state (`specialRateCode`, `corporateCode`, `usePoints`) is
threaded through every hop of the booking funnel via URL params so the
back-link from `/book` to `/rates` preserves the guest's filter and the
confirmation page can resolve the same label.

**Subgraphs touched:** `pricing`.

```graphql
query SpecialRates {
  specialRates {
    code
    label
    description
    requiresCode
  }
}
```

Sample response:

```json
{
  "data": {
    "specialRates": [
      { "code": "BEST_AVAILABLE", "label": "Lowest Regular Rate", "description": "Best publicly-available rate, no membership required.", "requiresCode": false },
      { "code": "AAA_CAA",        "label": "AAA/CAA Discount",     "description": "Member savings for AAA (US) and CAA (Canada) cardholders.", "requiresCode": false },
      { "code": "SENIOR",         "label": "Senior Discount",       "description": "Reduced rate for guests aged 62 and over. Valid ID required at check-in.", "requiresCode": false },
      { "code": "GOVERNMENT",     "label": "Government / Military", "description": "Per-diem-aligned rate for active government and military personnel.", "requiresCode": false },
      { "code": "CORPORATE",      "label": "Corp / Promo Code",     "description": "Apply your employer's negotiated rate or a promotional code.", "requiresCode": true }
    ]
  }
}
```

---

## `SEARCH_HOTELS_QUERY`

**Page:** `/search` — [`src/app/search/page.tsx`](./src/app/search/page.tsx)

**Why this is the workhorse:** drives the search results page, the filter
sidebar (price / brand / tier / amenities / guest rating / sort), and the
per-hotel availability + lowest-rate display. Reaches every search-relevant
subgraph in one round-trip.

**Subgraphs touched:** `property` (hotels, brands, hotelFacets), `pricing`
(`Hotel.availability` extension via federation entity resolution).

**Variables:**
- `filter: HotelFilter` — destination, brand, tier, amenity, price, rating
  filters as composed by the filter pills
- `first: Int` — page size (default 60)
- `checkIn: Date!` / `checkOut: Date!` — required so pricing can compute
  per-night rates
- `adults: Int!` / `children: Int` — guest counts that flow into pricing
- `sortBy: HotelSortField` — one of `DISTANCE`, `PRICE_LOW_TO_HIGH`, `CITY`,
  `BRAND`, `GUEST_RATING`, `REVIEWS`

```graphql
query SearchHotels(
  $filter: HotelFilter
  $first: Int
  $checkIn: Date!
  $checkOut: Date!
  $adults: Int!
  $children: Int
  $sortBy: HotelSortField
) {
  hotels(first: $first, filter: $filter, sortBy: $sortBy) {
    totalCount
    edges {
      node {
        id name slug starRating
        # HotelListItem renders only the tier chip from the brand
        # subtree — fetching id/name/accentColor here added 3 cost
        # per row × 25-60 rows = ~75-180 extra, sometimes enough to
        # trip the complexity guardrail.
        brand { tier }
        location { address { city countryCode } }
        guestRating { overall count }
        media(first: 1, categories: [EXTERIOR]) {
          edges { node { url } }
        }
        hasPool hasSpa hasGolf hasFreeBreakfast petsAllowed
        # Federated reach into the pricing subgraph.
        availability(checkIn: $checkIn, checkOut: $checkOut,
                     adults: $adults, children: $children) {
          nights currency
          lowestRate { amount currency }
        }
      }
    }
  }

  # The brand list powers the Brands filter pill (grouped by tier).
  brands(first: 30) {
    edges { node { id code name tier accentColor numberOfProperties } }
  }

  # Per-context counts: drive the "Maison Lumière (1)" labels on every
  # filter option. Each facet omits its own filter dimension so the user
  # can still see counts for unselected options ("multi-select facet"
  # semantics).
  facets: hotelFacets(filter: $filter) {
    totalCount
    byBrand     { brandId count brand { id name tier } }
    byBrandTier { tier count }
    amenities   { hasFreeBreakfast hasPool hasSpa hasGolf petsAllowed }
    guestRating { minRating count }
  }
}
```

---

## `HOTELS_LIST_QUERY`

**Page:** `/hotels` — [`src/app/hotels/page.tsx`](./src/app/hotels/page.tsx)

**Functionality:** raw browse of the chain's portfolio with a country
dropdown, grouped by country → city. No dates / pricing — used for
discovery rather than booking.

**Subgraphs touched:** `property`.

```graphql
query HotelsList($filter: HotelFilter, $first: Int) {
  hotels(first: $first, filter: $filter) {
    totalCount
    edges {
      node {
        id name slug starRating
        brand { id name tier accentColor }
        location { address { city countryCode } }
        guestRating { overall count }
        media(first: 1, categories: [EXTERIOR]) {
          edges { node { url altText } }
        }
        hasSpa hasPool hasRestaurants
      }
    }
  }
}
```

---

## `DESTINATION_SUGGESTIONS_QUERY`

**Page:** any page that mounts the search bar — fired by
[`src/components/DestinationAutocomplete.tsx`](./src/components/DestinationAutocomplete.tsx)
on every keystroke (debounced 200ms, min 2 chars).

**Functionality:** typeahead for the destination input. Returns a ranked
mix of cities, states/regions, countries, and hotels matching the partial
query. Used on:

- the hero / refinement search bar (home, brand pages, `/search`)
- the inline filter on `/hotels` (Hotels & Destinations)

**Subgraphs touched:** `property`.

**Variables:**
- `query: String!` — partial text the user has typed (≥ 2 chars)
- `limit: Int = 10` — cap on returned items

```graphql
query DestinationSuggestions($query: String!, $limit: Int) {
  destinationSuggestions(query: $query, limit: $limit) {
    type            # CITY | STATE | COUNTRY | HOTEL — drives the row's icon + click action
    label           # bold display text ("Paris", "Telangana", "France", "The Grand Palais Paris")
    sublabel        # secondary line ("India · 3 hotels", "5 Avenue Montaigne, …")
    hotelId         # set when type == HOTEL — for direct nav to /hotels/{id}/rates
    hotelSlug
    city            # set when type == CITY — for filter pre-fill
    state           # set when type == STATE — pre-fills the input with the state name
    country         # set when type == COUNTRY
    countryCode
  }
}
```

**Ranking semantics:** the property subgraph applies prefix-then-substring
matching, broad-first within each tier:

  CITY → STATE → COUNTRY → HOTEL

Within each tier, prefix matches always rank above substring matches.
Client-side, the dropdown re-groups by `type` in the same order so the UI
stays correct even if the backend sort changes. The corresponding
`hotels(filter: { query: ... })` server-side filter mirrors the same
matching domain — name, city, state, country name (substring), and
country code (exact).

---

## `RECENTLY_VIEWED_QUERY`

**Section:** Recently Viewed Hotels on the home page —
[`src/components/RecentlyViewedSection.tsx`](./src/components/RecentlyViewedSection.tsx).
Client-only island that hydrates after first paint; renders nothing on
first-time visits so there's no layout shift.

**Functionality:** the per-device list of recently viewed hotel ids
lives in `localStorage` (managed by
[`src/lib/recentlyViewed.ts`](./src/lib/recentlyViewed.ts) — most-recent
first, dedup, capped at 12). On mount, the home section reads that list
and asks the property subgraph for the matching hotel cards via the new
`HotelFilter.ids` predicate. Order is restored client-side because the
filter doesn't preserve input ordering.

**Subgraphs touched:** `property`.

**Variables:**
- `ids: [ID!]!` — the localStorage list (1–12 ids)

```graphql
query RecentlyViewed($ids: [ID!]!) {
  hotels(first: 24, filter: { ids: $ids }) {
    edges {
      node {
        id name slug starRating
        brand { id name tier accentColor }
        location { address { city countryCode } }
        guestRating { overall count }
        media(first: 1, categories: [EXTERIOR]) {
          edges { node { url altText } }
        }
      }
    }
  }
}
```

**Tracker:** every hotel detail page (`/hotels/[id]`) and rate-list page
(`/hotels/[id]/rates`) mounts the invisible
[`RecentlyViewedTracker`](./src/components/RecentlyViewedTracker.tsx),
which calls `recordView(hotelId)` once on mount. The booking page
intentionally doesn't track — mid-purchase pages shouldn't pollute the
browse history.

---

## `HOTEL_DETAIL_QUERY`

**Page:** `/hotels/[id]` — [`src/app/hotels/[id]/page.tsx`](./src/app/hotels/%5Bid%5D/page.tsx)

**Why federation matters here:** the page needs the hotel's gallery and
amenities (property), its spa experiences (experiences subgraph), and its
event spaces (meetings subgraph). The Apollo Router resolves all three
extensions of `Hotel` in one request.

**Subgraphs touched:** `property` · `experiences` (`Hotel.experiences`) ·
`meetings` (`Hotel.eventSpaces`).

```graphql
query HotelDetail($id: ID!) {
  hotel(id: $id) {
    id name slug starRating
    brand { id name tier tagline description heroImageUrl accentColor }
    location {
      address { line1 city state postalCode countryCode }
      coordinates { latitude longitude }
      timezone
    }
    contact { phone email website }
    guestRating {
      overall count
      breakdown { excellent veryGood good fair poor }
    }
    hasSpa hasPool hasRestaurants hasGolf
    totalRooms openedYear
    media(first: 8) {
      edges { node { url thumbnailUrl altText category } }
    }
    amenities { id code name category }
    roomTypes {
      id code name category sizeSqm
      maxOccupancy { adults children }
      bedConfiguration { type count }
      view
    }
    experiences { id name durationMinutes pricePerPerson { amount currency } category }
    eventSpaces { id name capacityStyles { setup capacity } }
  }
}
```

---

## `RATES_QUERY`

**Page:** `/hotels/[id]/rates` — [`src/app/hotels/[id]/rates/page.tsx`](./src/app/hotels/%5Bid%5D/rates/page.tsx)
**Also reused by:** `/hotels/[id]/book` (resolves the user's selected
room+rate from the URL params) and the booking confirmation page.

**Functionality:** drives the **Select a Room and Rate** page. Returns
the hotel's brand + address for the header, plus full availability — every
room type with its rate plans (Flexible / Member Exclusive / Package),
tax breakdown, points-earned, and a `rateToken` the booking flow forwards
to confirmation.

**Subgraphs touched:** `property` (hotel + rooms), `pricing`
(`Hotel.availability` extension via federation).

**Variables:**
- `id: ID!` — hotel id (from the route)
- `checkIn: Date!` / `checkOut: Date!`
- `adults: Int!` / `children: Int`
- `currency: String` — display currency; pricing FX-converts via USD pivot

```graphql
query HotelRates(
  $id: ID!
  $checkIn: Date!
  $checkOut: Date!
  $adults: Int!
  $children: Int
  $currency: String
) {
  hotel(id: $id) {
    id name slug starRating
    brand { id name tier accentColor logoUrl }
    location {
      address { line1 line2 city state postalCode countryCode }
      coordinates { latitude longitude }
    }
    media(first: 1, categories: [EXTERIOR]) {
      edges { node { url altText } }
    }

    # Federated reach into the pricing subgraph.
    availability(
      checkIn: $checkIn
      checkOut: $checkOut
      adults: $adults
      children: $children
      currency: $currency
    ) {
      nights currency
      lowestRate { amount currency }
      roomAvailabilities {
        availableCount
        roomType {
          id code name category sizeSqm view
          maxOccupancy { adults children }
          bedConfiguration { type count }
          description { text }
        }
        rates {
          id
          ratePlan {
            id code name type      # BEST_AVAILABLE | MEMBER_RATE | PACKAGE
            description refundable breakfastIncluded
            loyaltyEligible loyaltyMultiplier
            cancellationPolicy { type description deadlineHours }
          }
          averageNightlyRate { amount currency }
          totalRate { amount currency }
          totalWithTaxes { amount currency }
          taxesAndFees {
            subtotal { amount }
            taxes    { amount }
            fees     { amount }
            total    { amount }
          }
          pointsEarned
          availableRooms
          rateToken              # passed to /book and forwarded to confirmation
        }
      }
    }
  }
}
```

---

## `STORIES_LIST_QUERY`

**Page:** `/stories` — [`src/app/stories/page.tsx`](./src/app/stories/page.tsx)

**Functionality:** editorial article list with a category filter (Destination,
Food & Wine, Wellness, Design, Culture, Family, Romance, People).

**Subgraphs touched:** `content`.

```graphql
query Stories($category: ArticleCategory, $locale: String) {
  articles(filter: { category: $category }, locale: $locale) {
    totalCount
    edges {
      node {
        id slug category readTimeMinutes
        title { text } excerpt { text }
        heroImage { url altText { text } }
        author { name title }
        publishedAt
      }
    }
  }
}
```

---

## `STORY_DETAIL_QUERY`

**Page:** `/stories/[slug]` — [`src/app/stories/[slug]/page.tsx`](./src/app/stories/%5Bslug%5D/page.tsx)

**Functionality:** full article with author bio + related-hotel chips.
`relatedHotels` walks the federated `Hotel` reference into property to
render hotel names.

**Subgraphs touched:** `content` (article body), `property` (related hotel
names via `Hotel @key(fields: "id")`).

```graphql
query Story($slug: String!, $locale: String) {
  article(slug: $slug, locale: $locale) {
    id slug category readTimeMinutes
    title { text } subtitle { text } body { text }
    heroImage { url altText { text } }
    gallery { url altText { text } }
    author { name title bio { text } photoUrl }
    tags
    relatedHotels { id name }
    publishedAt updatedAt
  }
}
```

---

## `OFFERS_QUERY`

**Page:** `/offers` — [`src/app/offers/page.tsx`](./src/app/offers/page.tsx)

**Functionality:** active deal spotlights with promo codes, validity dates,
applicable hotels.

**Subgraphs touched:** `content` (deal spotlights), `property` (applicable
hotel names + cities via `Hotel @key`).

```graphql
query Offers {
  dealSpotlights(active: true, locale: "en") {
    id slug promoCode discountPercent
    validFrom validTo
    title { text } description { text } termsAndConditions { text }
    ctaLabel { text } ctaUrl
    heroImage { url altText { text } }
    applicableHotels { id name location { address { city countryCode } } }
  }
}
```

---

## `BRANDS_LIST_QUERY`

**Page:** `/brands` — [`src/app/brands/page.tsx`](./src/app/brands/page.tsx)

**Functionality:** the 21-brand index, grouped by tier (Luxury / Premium /
Select), each brand showing its hotel count.

**Subgraphs touched:** `property`.

```graphql
query BrandsList {
  brands(first: 30) {
    totalCount
    edges {
      node {
        id code name slug tier tagline
        accentColor logoUrl
        numberOfProperties
      }
    }
  }
}
```

---

## `BRAND_DETAIL_QUERY`

**Page:** `/brands/[id]` — [`src/app/brands/[id]/page.tsx`](./src/app/brands/%5Bid%5D/page.tsx)

**Functionality:** brand hero + signature properties + the full portfolio
filtered to that brand. The dedicated `featuredHotels` field gives a
curated subset, while the `hotels(filter:{ brandIds:[$id] })` returns
everything for the country grouping.

The brand page also runs [`SPECIAL_RATES_QUERY`](#special_rates_query)
in parallel with this query — the rendered `<SearchBar variant="full">`
needs the same picker catalogue as the home page so the brand-scoped
search is uniform with `/`.

**Subgraphs touched:** `property` (`pricing` for the parallel special-rates fetch).

```graphql
query BrandDetail($id: ID!) {
  brand(id: $id) {
    id code name slug tier
    tagline description
    accentColor heroImageUrl
    loyaltyPointsMultiplier numberOfProperties
    sustainabilityCommitment
    # Page slices to 6 anyway — fetch exactly what we render so the
    # federated complexity score stays under the guardrail.
    featuredHotels(first: 6) {
      id name slug starRating
      location { address { city countryCode } }
      guestRating { overall count }
      media(first: 1, categories: [EXTERIOR]) {
        edges { node { url } }
      }
    }
  }
  # Selected fields match HotelCard's rendering exactly; altText,
  # hasSpa, hasPool, and the extra brand subtree are intentionally
  # NOT requested (HotelCard reads them defensively but they're
  # never displayed on the brand-detail surface).
  hotels(first: 60, filter: { brandIds: [$id] }) {
    totalCount
    edges {
      node {
        id name slug starRating
        location { address { city countryCode } }
        guestRating { overall count }
        media(first: 1, categories: [EXTERIOR]) {
          edges { node { url } }
        }
      }
    }
  }
}
```

---

## `INSPIRATIONS_QUERY`

**Page:** `/inspirations` (route to be added — query is already wired)

**Functionality:** the full destination/season-tagged inspiration grid.

**Subgraphs touched:** `content`.

```graphql
query Inspirations($season: Season) {
  travelInspirations(season: $season, first: 20, locale: "en") {
    id slug destination region bestSeason
    title { text } description { text }
    heroImage { url altText { text } }
    approxBudget { amount currency }
    recommendedDays
    featuredHotels { id name }
  }
}
```

---

## `SIGN_IN_MUTATION`

**Page:** `/sign-in` — fired by [`SignInForm`](./src/components/SignInForm.tsx)
through [`signInAction`](./src/lib/authActions.ts) (`'use server'`).

**Functionality:** authenticate an existing guest by email + password.
Returns either an `AuthPayload` (with the JWT and a guest snapshot the
header uses to greet the guest) or an error union member. The server
action persists the access token in an httpOnly cookie via
[`authSession.writeSession`](./src/lib/authSession.ts).

**Subgraphs touched:** `guest`.

```graphql
mutation SignIn($email: EmailAddress!, $password: String!) {
  signIn(input: { email: $email, password: $password }) {
    __typename
    ... on AuthPayload {
      accessToken
      expiresIn         # seconds — drives the cookie maxAge
      tokenType
      isNewAccount
      guest {
        id
        email
        name { firstName lastName }
      }
    }
    ... on AuthenticationError { code message }
    ... on ValidationError { code message fieldErrors { field message } }
  }
}
```

> Mock backend: `GuestMockDataSource.signIn` matches by email and ignores
> the password — any 8+ char password works. Use `sophia.chen@email.com`
> for an account with seeded reservations.

---

## `SIGN_UP_MUTATION`

**Page:** `/sign-up` — fired by [`SignUpForm`](./src/components/SignUpForm.tsx)
through [`signUpAction`](./src/lib/authActions.ts).

**Functionality:** create a new guest account, immediately sign the
guest in. The server action validates first/last name, email format,
password strength (≥8 chars + letter + digit), terms acceptance, then
calls the mutation.

**Subgraphs touched:** `guest`.

```graphql
mutation SignUp(
  $email: EmailAddress!
  $password: String!
  $firstName: String!
  $lastName: String!
  $phone: PhoneNumber
) {
  signUp(input: {
    email: $email, password: $password,
    firstName: $firstName, lastName: $lastName, phone: $phone,
  }) {
    __typename
    ... on AuthPayload {
      accessToken
      expiresIn
      tokenType
      isNewAccount      # always true on a successful sign-up
      guest {
        id
        email
        name { firstName lastName }
      }
    }
    ... on ValidationError { code message fieldErrors { field message } }
  }
}
```

---

## `RESERVATION_BY_CONFIRMATION_QUERY`

**Page:** `/trips` (signed-out branch) — fired by
[`FindReservationForm`](./src/components/FindReservationForm.tsx)
through [`findTripAction`](./src/lib/tripsActions.ts).

**Functionality:** public lookup by confirmation number. No JWT needed,
which mirrors the standard hotel-industry pattern (find your booking
without an account). Returns a single `Reservation` or null.

**Subgraphs touched:** `reservations` (the lookup), `property` (for the
hotel name + city in the result card via federation).

```graphql
query ReservationByConfirmation(
  $confirmationNumber: String!
  $guestLastName: String
) {
  reservationByConfirmationNumber(
    confirmationNumber: $confirmationNumber
    guestLastName: $guestLastName
  ) {
    id confirmationNumber status
    checkIn checkOut nights adults children
    hotel { id name location { address { city countryCode } } }
    roomType { id name }
    rateBreakdown { currency totalDue { amount currency } }
    isRefundable
    canCheckInOnline
  }
}
```

> Try `LUX-2025-100001` (Paris), `LUX-2025-100002` (London),
> `LUX-2025-100003` (Tokyo), or `LUX-2025-100004` (Dubai).

---

## `MY_RESERVATIONS_QUERY`

**Page:** `/trips` (signed-in branch) — fired server-side via
[`gqlFetchAuthed`](./src/lib/graphqlAuthed.ts), which adds the
`Authorization: Bearer <token>` header from the session cookie before
calling the federated router.

**Functionality:** every reservation on the signed-in guest's account.
The reservations subgraph rejects this query with `UnauthorizedException`
when no token is forwarded, so the page only calls it inside a
session-guarded branch.

**Subgraphs touched:** `reservations` · `property` (federated hotel +
roomType resolution).

```graphql
query MyReservations($first: Int, $filter: ReservationFilter) {
  myReservations(first: $first, filter: $filter) {
    totalCount
    edges {
      node {
        id confirmationNumber status
        checkIn checkOut nights adults children
        hotel { id name location { address { city countryCode } } }
        roomType { id name }
        rateBreakdown { currency totalDue { amount currency } }
        isRefundable
        canCheckInOnline
      }
    }
  }
}
```

---

## `ME_PROFILE_QUERY`

**Page:** `/hotels/[id]/book` — fetched server-side via
[`gqlFetchAuthed`](./src/lib/graphqlAuthed.ts) to prefill the Complete
Your Booking form with the guest's saved phone, addresses, and payment
methods. The booking form falls through to the session cookie's basic
identity (firstName / lastName / email) when the query fails.

**Subgraphs touched:** `guest`.

```graphql
query Me {
  me {
    id
    email
    phone
    name { firstName lastName }
    externalIds { loyaltyNumber }
    addresses {
      id type line1 line2 city stateCode postalCode countryCode isPrimary
    }
    paymentMethods(first: 10) {
      edges {
        node { id type brand lastFour holderName expiryMonth expiryYear isDefault }
      }
    }
  }
}
```

---

## `MY_ACCOUNT_QUERY`

**Page:** `/account` — single federated round-trip that powers all four
sections of the account hub (profile · addresses · payment · recent
trips). One query is cheaper than four, and Next's `revalidatePath` lets
each mutation refresh the whole page in one re-render.

**Subgraphs touched:** `guest`, `reservations`.

```graphql
query MyAccount($recentTripsLimit: Int) {
  me {
    id email phone dateOfBirth nationality
    languagePreference currencyPreference memberSince
    name { firstName lastName title }
    externalIds { loyaltyNumber }
    addresses {
      id type line1 line2 city stateCode postalCode countryCode isPrimary
    }
    paymentMethods(first: 10) {
      edges {
        node { id type brand lastFour holderName expiryMonth expiryYear isDefault }
      }
    }
    savedHotels(first: 5)    { edges { node { id hotelId savedAt } } }
    travelCompanions {
      id relationship dateOfBirth
      name { firstName lastName title }
    }
  }
  myReservations(first: $recentTripsLimit) {
    totalCount
    edges {
      node {
        id confirmationNumber status checkIn checkOut nights
        hotel { id name location { address { city countryCode } } }
        roomType { id name }
        rateBreakdown { currency totalDue { amount currency } }
      }
    }
  }
}
```

---

## `UPDATE_GUEST_PROFILE_MUTATION`

**Page:** `/account` — fired by [`updateProfileAction`](./src/lib/accountActions.ts)
when the Profile section's Edit form is saved.

**Functionality:** patches `phone`, `dateOfBirth`, `nationality` on the
signed-in guest. Only those three fields are exposed by the schema — name
+ email + locale prefs are intentionally read-only. The data source
applies a partial update (keys missing from `input` are preserved) and
stamps `updatedAt`.

**Subgraphs touched:** `guest`.

```graphql
mutation UpdateGuestProfile($input: UpdateGuestProfileInput!) {
  updateGuestProfile(input: $input) {
    __typename
    ... on GuestProfile { id phone dateOfBirth nationality }
    ... on ValidationError { code message fieldErrors { field message } }
    ... on AuthorizationError { code message }
  }
}
```

---

## `ADD_ADDRESS_MUTATION`

**Page:** `/account` — fired by [`addAddressAction`](./src/lib/accountActions.ts)
when the Addresses section's "+ Add an address" form is submitted.

**Functionality:** appends a new address to the guest's list. If the
guest had no addresses, the new one is auto-promoted to primary; if
`isPrimary: true` is passed explicitly, the existing primary is demoted
so exactly one stays flagged.

**Subgraphs touched:** `guest`.

```graphql
mutation AddAddress($input: AddAddressInput!) {
  addAddress(input: $input) {
    __typename
    ... on GuestAddress {
      id type line1 line2 city stateCode postalCode countryCode isPrimary
    }
    ... on ValidationError { code message fieldErrors { field message } }
    ... on AuthorizationError { code message }
  }
}
```

---

## `UPDATE_ADDRESS_MUTATION`

**Page:** `/account` — fired by [`updateAddressAction`](./src/lib/accountActions.ts)
when an address row's inline edit form is submitted.

**Functionality:** partial update keyed by address `id`. Keys absent
from `input` keep their existing value (so the form can send only what
changed). Promoting to primary in the same call demotes the previous
primary; demoting a primary leaves the list with one fewer primary,
which the UI never reaches because the checkbox for the current primary
is disabled.

**Subgraphs touched:** `guest`.

```graphql
mutation UpdateAddress($id: ID!, $input: UpdateAddressInput!) {
  updateAddress(id: $id, input: $input) {
    __typename
    ... on GuestAddress {
      id type line1 line2 city stateCode postalCode countryCode isPrimary
    }
    ... on ValidationError { code message fieldErrors { field message } }
    ... on NotFoundError { code message }
    ... on AuthorizationError { code message }
  }
}
```

---

## `REMOVE_ADDRESS_MUTATION`

**Page:** `/account` — fired by [`removeAddressAction`](./src/lib/accountActions.ts).

**Functionality:** drops the address by id. If the removed address was
the primary and at least one address remains, the data source promotes
the new first entry to primary so the invariant "exactly one primary
when ≥1 address exists" holds.

**Subgraphs touched:** `guest`.

```graphql
mutation RemoveAddress($id: ID!) { removeAddress(id: $id) }
```

---

## `SET_PRIMARY_ADDRESS_MUTATION`

**Page:** `/account` — fired by [`setPrimaryAddressAction`](./src/lib/accountActions.ts).

**Functionality:** demotes the existing primary and promotes the target
address. No-op when the target is already primary.

**Subgraphs touched:** `guest`.

```graphql
mutation SetPrimaryAddress($id: ID!) {
  setPrimaryAddress(id: $id) { id isPrimary }
}
```

---

## `ADD_PAYMENT_METHOD_MUTATION`

**Page:** `/account` — fired by [`addPaymentAction`](./src/lib/accountActions.ts)
when the Payment methods section's "+ Add a card" form is submitted.

**Functionality:** appends a new card. The web form validates with the
existing booking-flow helpers (Luhn check, brand detection, expiry
month/year), derives `lastFour` and `brand` from the card number, and
sends a stub `pspToken` (real PSP integration is a later step).

**Subgraphs touched:** `guest`.

```graphql
mutation AddPaymentMethod($input: AddPaymentMethodInput!) {
  addPaymentMethod(input: $input) {
    __typename
    ... on PaymentMethod {
      id type brand lastFour holderName expiryMonth expiryYear isDefault
    }
    ... on ValidationError { code message fieldErrors { field message } }
    ... on AuthorizationError { code message }
  }
}
```

---

## `REMOVE_PAYMENT_METHOD_MUTATION`

**Page:** `/account` — fired by [`removePaymentAction`](./src/lib/accountActions.ts)
when a card row's Remove button is clicked (after a `confirm()`).

**Subgraphs touched:** `guest`.

```graphql
mutation RemovePaymentMethod($id: ID!) { removePaymentMethod(id: $id) }
```

---

## `SET_DEFAULT_PAYMENT_METHOD_MUTATION`

**Page:** `/account` — fired by [`setDefaultPaymentAction`](./src/lib/accountActions.ts)
when a non-default card row's "Set as default" button is clicked. The
data source clears the existing default before promoting the new one.

**Subgraphs touched:** `guest`.

```graphql
mutation SetDefaultPaymentMethod($id: ID!) {
  setDefaultPaymentMethod(id: $id) { id isDefault }
}
```

---

## `RESERVATION_DETAIL_QUERY`

**Page:** `/trips/[id]` — fetched server-side via
[`gqlFetchAuthed`](./src/lib/graphqlAuthed.ts) from
[`app/trips/[id]/page.tsx`](./src/app/trips/[id]/page.tsx).

**Functionality:** richer-than-list view of a single reservation that
powers the trip detail page. Pulls everything the page renders in one
round-trip: identity + status, hotel + room, full rate breakdown
(line items, taxes, total), special requests, payment summary, the
cancellation policy + record, the loyalty context, and — when the stay
is `CHECKED_IN` — the digital key. Auth is gated server-side
(`auth.requireAuth() + guestId match`); anonymous visitors get
redirected to `/sign-in`.

**Subgraphs touched:** `reservations`, `property` (hotel + room metadata
via federation).

```graphql
query ReservationDetail($id: ID!) {
  reservation(id: $id) {
    id confirmationNumber status source createdAt
    checkIn checkOut nights adults children
    isRefundable canModify canCheckInOnline cancellationDeadline
    hotel {
      id name slug
      location { address { line1 city state postalCode countryCode } }
    }
    roomType { id name }
    room { number floor building category }
    rateBreakdown {
      currency
      totalDue { amount currency }
      roomSubtotal { amount currency }
      taxesAndFees { total { amount currency } }
      lineItems { id date description amount { amount currency } category quantity }
    }
    specialRequests { id category request status }
    paymentSummary {
      method lastFour brand chargedAt amount { amount currency } status
    }
    cancellationPolicy { type description deadlineHours }
    cancellation {
      cancelledAt reason refundAmount { amount currency } refundStatus
    }
    loyaltyContext {
      memberNumber tier pointsEarned qualifyingNights
    }
    digitalKey {
      reservationId keyCode status activatedAt expiresAt rooms
    }
  }
}
```

---

## `MOBILE_CHECK_IN_MUTATION`

**Page:** `/trips/[id]` — fired by
[`checkInAction`](./src/lib/tripActions.ts) when the Online check-in
form is submitted (only rendered when the server says
`canCheckInOnline: true`).

**Functionality:** check the guest in remotely. Validates document
type / number / optional ETA in the pure
[`validateCheckIn`](./src/lib/trip.ts) helper before sending. On
success, returns the updated reservation (now `CHECKED_IN`) plus the
`DigitalKey` the page surfaces in its hero panel. Idempotency key is
generated per-call via `crypto.randomUUID`.

**Subgraphs touched:** `reservations`.

```graphql
mutation MobileCheckIn(
  $reservationId: ID!,
  $input: MobileCheckInInput!,
  $idempotencyKey: UUID!
) {
  mobileCheckIn(
    reservationId: $reservationId,
    input: $input,
    idempotencyKey: $idempotencyKey,
  ) {
    __typename
    ... on MobileCheckInSuccess {
      message
      reservation { id status }
      digitalKey { reservationId keyCode status activatedAt expiresAt rooms }
    }
    ... on ValidationError { code message fieldErrors { field message } }
    ... on NotFoundError { code message }
  }
}
```

---

## `CANCEL_RESERVATION_MUTATION`

**Page:** `/trips/[id]` — fired by
[`cancelReservationAction`](./src/lib/tripActions.ts) when the Cancel
reservation button is clicked (gated by `isRefundable` plus the status
being in `{CONFIRMED, MODIFIED, PENDING_PAYMENT}`). The button form has
a `window.confirm()` that explains whether the cancellation is free or
fee-bearing before submit.

**Subgraphs touched:** `reservations`.

```graphql
mutation CancelReservation(
  $reservationId: ID!,
  $input: CancelReservationInput,
  $idempotencyKey: UUID!
) {
  cancelReservation(
    reservationId: $reservationId,
    input: $input,
    idempotencyKey: $idempotencyKey,
  ) {
    __typename
    ... on Reservation { id status }
    ... on ValidationError { code message fieldErrors { field message } }
    ... on NotFoundError { code message }
    ... on AuthorizationError { code message }
  }
}
```

---

## `CREATE_RESERVATION_MUTATION`

**Page:** `/hotels/[id]/book` — fired by
[`createReservationAction`](./src/lib/bookingActions.ts) when the guest
clicks **Book Now** on the Complete Your Booking form.

**Functionality:** create the reservation against the rate the guest
picked on `/hotels/[id]/rates`. The action:

- carries the guest's bearer token (when signed in) so the resolver
  can attribute the booking to a `GuestProfile`,
- mints a fresh `idempotencyKey` (UUID) per click — replays would be
  deduped by the resolver in production,
- threads the redeemed-points slider value through as
  `pointsToRedeem`, which the reservations subgraph applies as a
  `pointsToRedeem * 0.007` discount in the booking's currency,
  setting `rateBreakdown.loyaltyDiscount`, reducing
  `totalDue` / `balanceDue`, and stamping
  `loyaltyContext.pointsRedeemed` on the response.

On success the action returns the canonical `confirmationNumber`
(format: `LUX-YYYY-NNNNNN`) which the form passes to
`/hotels/[id]/book/confirmation`. Resolver-side errors
(`RoomUnavailableError`, `ValidationError`, `AuthorizationError`,
`ExternalServiceError`) surface as a red banner under the submit
button; field errors map under `guest.*` next to their inputs.

**Subgraphs touched:** `reservations` is the entry point; the rate
breakdown stitches values produced earlier by `pricing`, and a real
implementation would publish a `points.redeemed` event for `loyalty`
to debit the balance asynchronously (saga pattern — out of scope for
the demo, the loyalty subgraph stays the source of truth for the
actual points balance).

```graphql
mutation CreateReservation(
  $input: CreateReservationInput!,
  $idempotencyKey: UUID!
) {
  createReservation(input: $input, idempotencyKey: $idempotencyKey) {
    __typename
    ... on Reservation {
      id
      confirmationNumber
      status
      rateBreakdown {
        currency
        loyaltyDiscount { amount currency }
        totalDue { amount currency }
      }
      loyaltyContext { pointsRedeemed pointsToEarn }
    }
    ... on RoomUnavailableError { code message }
    ... on ValidationError { code message fieldErrors { field message } }
    ... on AuthorizationError { code message }
    ... on ExternalServiceError { code message }
  }
}
```

Sample variables (50,000 pts → −350 EUR off `totalDue`):

```json
{
  "input": {
    "hotelId": "prop-paris-001",
    "roomTypeId": "rt-paris-deluxe",
    "rateToken": "rt-r-rt-paris-deluxe-bar-2026-06-01-2026-06-04-2026-06-01-2026-06-04",
    "checkIn": "2026-06-01",
    "checkOut": "2026-06-04",
    "adults": 2,
    "loyaltyNumber": "LUX0001234567",
    "pointsToRedeem": 50000
  },
  "idempotencyKey": "<crypto.randomUUID()>"
}
```

---

## `MEETINGS_SEARCH_QUERY`

**Page:** `/meetings` — discovery surface with editorial hero,
search bar (start/end/headcount/setup), and a result grid of
capacity-fit ranked venue cards. Optional `hotelId` URL param
narrows the search to a single property when the visitor came in
from `/hotels/[id]` Meetings tab.

**Functionality:** federated `searchEventSpaces` returns
`EventSpaceSearchHit { hotel, space, matchScore, notes }`. The web
client then re-sorts by `matchScore` (descending) and runs each hit
through the pure `capacityFit` helper to render the snug-fit badge
on every card. The capacity matrix on the venue detail page reuses
the same helper so the highlighted row is always consistent.

**Subgraphs touched:** `meetings` owns `searchEventSpaces`; `property`
hydrates the `Hotel` extension via federation `_entities`.

```graphql
query MeetingsSearch($input: EventSpaceSearchInput!) {
  searchEventSpaces(input: $input) {
    totalCount
    results {
      matchScore
      notes
      hotel {
        id name slug starRating
        brand { id name tier accentColor }
        location { address { city countryCode } }
        media(first: 1, categories: [EXTERIOR]) { edges { node { url altText } } }
      }
      space {
        id name category
        areaSqFt areaSqMeters ceilingHeightFt
        naturalLight blackoutCapable rooms divisible
        capacityStyles { setup capacity }
        rateCard {
          fullDay { amount currency }
          halfDay { amount currency }
          currency
        }
        images
      }
    }
  }
}
```

---

## `EVENT_SPACE_DETAIL_QUERY`

**Page:** `/meetings/[hotelId]/[spaceId]` — full venue detail.

**Functionality:** combines three queries into one federated
round-trip — `eventSpace(id)` for the venue itself, `hotel(id)` for
the property header, and `cateringMenus(hotelId)` for the catering
panel. The page passes the URL-carried `attendees` value into the
capacity matrix component so the snuggest-fit row is highlighted
inline.

**Subgraphs touched:** `meetings` (eventSpace + cateringMenus),
`property` (hotel detail).

```graphql
query EventSpaceDetail($id: ID!, $hotelId: ID!) {
  eventSpace(id: $id) {
    id hotelId name description category
    areaSqFt areaSqMeters ceilingHeightFt
    naturalLight blackoutCapable rooms divisible
    capacityStyles { setup capacity }
    technicalSpecs {
      power internetSpeedMbps riggingPoints
      loadInDoorsHeightFt freightElevator noiseRating
    }
    avEquipment {
      category name model quantity includedInRate
      rentalCost { amount currency }
    }
    cateringRequired
    rateCard {
      currency
      fullDay { amount currency } halfDay { amount currency } hourly { amount currency }
      setupFee { amount currency } cleaningFee { amount currency }
      minimumFAndBSpend { amount currency }
    }
    images floorPlanUrl
  }
  hotel(id: $hotelId) {
    id name slug starRating
    brand { id name tier accentColor }
    location {
      address { line1 city state countryCode }
      coordinates { latitude longitude }
    }
    media(first: 1, categories: [EXTERIOR]) { edges { node { url altText } } }
  }
  cateringMenus(hotelId: $hotelId) {
    id name description
    pricePerPerson { amount currency }
    minimumGuests
    courses { name description }
    beverageOptions
  }
}
```

---

## `SUBMIT_RFP_MUTATION`

**Page:** `/meetings/[hotelId]/[spaceId]/rfp` — fired by
[`submitRfpAction`](./src/lib/meetingActions.ts) on the wizard's
Review & Submit step. Sign-in is required (the page redirects
anonymous visitors to `/sign-in` before the wizard renders), so
the action's `Authorization: Bearer` always carries a real guest
token. A fresh `idempotencyKey` (UUID) is minted per click; on
success the action returns the canonical `rfpNumber`
(`RFP-YYYY-NNNNNN`) which the wizard uses to deep-link into
`/account/events?ref=<rfpNumber>` for the celebratory landing.

**Subgraphs touched:** `meetings`.

```graphql
mutation SubmitRFP($input: SubmitRFPInput!, $idempotencyKey: UUID!) {
  submitRFP(input: $input, idempotencyKey: $idempotencyKey) {
    __typename
    ... on RFP { id rfpNumber status submittedAt eventName }
    ... on ValidationError {
      code message fieldErrors { field message }
    }
    ... on NotFoundError { code message }
  }
}
```

---

## `UPDATE_RFP_MUTATION`

**Functionality:** a partial update on an existing RFP. The current
wizard submits in one shot; this mutation backs *future* draft
autosave and the planner's edit-after-feedback workflow. Only the
fields the caller passes get touched.

**Subgraphs touched:** `meetings`.

```graphql
mutation UpdateRFP($rfpId: ID!, $input: UpdateRFPInput!) {
  updateRFP(rfpId: $rfpId, input: $input) {
    __typename
    ... on RFP { id status updatedAt }
    ... on ValidationError {
      code message fieldErrors { field message }
    }
    ... on NotFoundError { code message }
  }
}
```

---

## `CANCEL_RFP_MUTATION`

**Page:** `/account/events` — fired by
[`cancelRfpAction`](./src/lib/meetingActions.ts) from the
[`RfpCancelDialog`](./src/components/RfpCancelDialog.tsx) modal.
Gated client-side by [`isRfpCancellable`](./src/lib/meetings.ts) so
the button only renders for in-flight statuses (DRAFT, SUBMITTED,
IN_REVIEW, PROPOSAL_SENT, NEGOTIATING).

**Subgraphs touched:** `meetings`.

```graphql
mutation CancelRFP($rfpId: ID!, $reason: String) {
  cancelRFP(rfpId: $rfpId, reason: $reason) {
    __typename
    ... on RFP { id status }
    ... on ValidationError { code message fieldErrors { field message } }
    ... on NotFoundError { code message }
  }
}
```

---

## `MY_RFPS_QUERY`

**Page:** `/account/events` — guest's RFP tracking surface (sign-in
gated). Renders newest-first with status timeline, preferred-hotels
chips, and an inline panel of hotel proposals (`RFPResponse`s)
whenever any have arrived.

**Subgraphs touched:** `meetings` is the entry point; `property`
hydrates the preferred-hotel + proposing-hotel federation
references.

```graphql
query MyRFPs($first: Int, $after: String, $status: RFPStatus) {
  myRFPs(first: $first, after: $after, status: $status) {
    totalCount
    pageInfo { hasNextPage endCursor }
    edges {
      cursor
      node {
        id rfpNumber status
        eventName eventType
        startDate endDate attendees guestRoomsPerNight
        submittedAt updatedAt
        preferredHotels {
          id name location { address { city countryCode } }
        }
        responses {
          id status hotelId
          hotel { id name }
          proposedRate { amount currency }
          proposedFAndBMinimum { amount currency }
          proposedRoomBlock
          notes respondedAt validUntil
        }
      }
    }
  }
}
```

---

## How a request flows

1. **A page renders on the server** (Next.js App Router, all pages in
   `src/app/**/page.tsx` are React Server Components).
2. The page calls `gqlFetch<T>(QUERY, variables, headers, cache)` —
   `src/lib/graphql.ts` wraps `fetch()` with `next: { revalidate, tags }`.
   The default is `revalidate: 30`; catalog pages (`/brands`,
   `/brands/[id]`, every `SPECIAL_RATES_QUERY` call site) pass longer
   TTLs (5 min for brand data, 1 h for the special-rates catalogue) and
   cache tags (`catalog:brands`, `catalog:brand:<id>`,
   `catalog:specialRates`) so admin mutations can target invalidation
   via `revalidateTag(...)` instead of nuking entire paths.
3. The HTTP `POST` body is a standard GraphQL request:
   `{ "query": "...", "variables": {...} }`.
4. **Apollo Router** (port 4000) runs the request through its pipeline:
   per-IP rate limit → **APQ** (replay body by SHA-256 hash, 1k-entry
   in-memory cache) → parse + validate → **query plan cache** (4096
   in-memory entries; same operation shape is planned once) →
   **subgraph dedup** (`deduplicate_query: true` collapses in-flight
   identical fan-out calls) → execute. The plan dispatches sub-queries
   in parallel to the relevant subgraphs (`property:4001`,
   `pricing:4003`, `experiences:4007`, `meetings:4008`, `content:4006`,
   etc.).
5. Each subgraph runs its resolvers against in-memory mock data —
   Netflix DGS resolvers in the Java backend, Apollo Server 4 resolvers
   in the TypeScript backend. Catalog reads in property + the
   `specialRates` constant in pricing sit behind a named cache
   (Caffeine `@Cacheable` in Java, `lru-cache` in TypeScript —
   `catalog.brand` / `catalog.featuredHotels` 5 min, `pricing.specialRates`
   1 h either way). DataLoader sits below that and
   solves the N+1 problem within a single request. The content subgraph
   proxies to the
   [`luxe-hotels-content-api`](https://github.com/reddylakshmi/luxe-hotels-content-api)
   REST backend when `LUXE_CONTENT_BACKEND_URL` is set.
6. The router merges the results, returns one JSON payload, and the page
   renders HTML to the browser. Cold home-page latency is ~270 ms; warm
   is ~15 ms because Caffeine + the router query-plan cache absorb the
   work.

A property-side instrumentation logs every operation it sees:

```
>> SearchHotels__property__0 variables={filter={query=Paris, ...}, first=60} query="..."
<< SearchHotels__property__0 done in 75ms
```

The `__property__0` suffix is the Apollo Router stamping which subgraph in
the supergraph plan the operation went to — useful for tracing fan-out.

## Adding a new query

1. Define a new exported constant in `src/lib/queries.ts` (use the
   `/* GraphQL */` template literal so IDEs syntax-highlight it).
2. Define a matching response type in `src/types/graphql.ts` (hand-written;
   no codegen).
3. Call `gqlFetch<TypeName>(QUERY, variables)` from a server component.
4. If the page is hot (changes filter every interaction), add
   `export const dynamic = "force-dynamic"` so Next.js doesn't try to
   pre-render it at build time.
