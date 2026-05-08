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

The Apollo Router fans each operation out across the relevant subgraphs in
the [`luxe-hotels-graphqlwithJava`](https://github.com/reddylakshmi/luxe-hotels-graphqlwithJava)
project. The "Subgraphs touched" column lists which subgraphs serve each
top-level field.

---

## Table of contents

| Functionality | Page | Query | Subgraphs touched |
|---|---|---|---|
| Home — landing carousel + brand story | `/` | [`HOME_QUERY`](#home_query) | property · content |
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
> and its confirmation step both re-use [`RATES_QUERY`](#rates_query) to
> resolve the room+rate the user picked, plus
> [`HOTEL_DETAIL_QUERY`](#hotel_detail_query) for the room metadata in the
> sidebar. They don't introduce new queries.

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
        brand { id name tier accentColor }
        location { address { city countryCode } }
        guestRating { overall count }
        media(first: 1, categories: [EXTERIOR]) {
          edges { node { url altText } }
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

**Subgraphs touched:** `property`.

```graphql
query BrandDetail($id: ID!) {
  brand(id: $id) {
    id code name slug tier
    tagline description
    accentColor heroImageUrl
    loyaltyPointsMultiplier numberOfProperties
    sustainabilityCommitment
    featuredHotels(first: 12) {
      id name slug starRating
      location { address { city countryCode } }
      guestRating { overall count }
      media(first: 1, categories: [EXTERIOR]) {
        edges { node { url altText } }
      }
    }
  }
  hotels(first: 60, filter: { brandIds: [$id] }) {
    totalCount
    edges {
      node {
        id name slug starRating
        location { address { city countryCode } }
        guestRating { overall count }
        media(first: 1, categories: [EXTERIOR]) {
          edges { node { url altText } }
        }
        hasSpa hasPool
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

## How a request flows

1. **A page renders on the server** (Next.js App Router, all pages in
   `src/app/**/page.tsx` are React Server Components).
2. The page calls `gqlFetch<T>(QUERY, variables)` —
   `src/lib/graphql.ts` wraps `fetch()` with `next: { revalidate: 30 }` so
   responses are cached for 30 seconds at the route level.
3. The HTTP `POST` body is a standard GraphQL request:
   `{ "query": "...", "variables": {...} }`.
4. **Apollo Router** (port 4000) parses the operation, computes a query
   plan, and dispatches sub-queries in parallel to the relevant subgraphs
   (`property:4001`, `pricing:4003`, `experiences:4007`, `meetings:4008`,
   `content:4006`, etc.).
5. Each subgraph runs Netflix DGS resolvers against in-memory mock data
   (or, for the content subgraph, against the
   [`luxe-hotels-content-api`](https://github.com/reddylakshmi/luxe-hotels-content-api)
   REST backend when `LUXE_CONTENT_BACKEND_URL` is set).
6. The router merges the results, returns one JSON payload, and the page
   renders HTML to the browser.

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
