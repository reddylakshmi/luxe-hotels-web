// Federated GraphQL queries used across pages. Each query crosses one or
// more subgraphs through the Apollo Router.

export const HOME_QUERY = /* GraphQL */ `
  query Home {
    featuredHotels(first: 9) {
      id
      name
      slug
      starRating
      brand { id name tier accentColor }
      location {
        address { city countryCode }
      }
      guestRating { overall count }
      media(first: 1, categories: [EXTERIOR]) {
        edges { node { url altText } }
      }
    }

    featuredArticles(first: 4, locale: "en") {
      id
      slug
      category
      readTimeMinutes
      title { text }
      excerpt { text }
      heroImage { url altText { text } }
      author { name }
      publishedAt
    }

    travelInspirations(first: 6, locale: "en") {
      id
      slug
      destination
      region
      bestSeason
      title { text }
      description { text }
      heroImage { url altText { text } }
      approxBudget { amount currency }
      recommendedDays
    }

    dealSpotlights(active: true, locale: "en") {
      id
      slug
      promoCode
      discountPercent
      title { text }
      description { text }
      ctaLabel { text }
      ctaUrl
      heroImage { url altText { text } }
    }

    brandStory(locale: "en") {
      title { text }
      tagline { text }
      pillars { code title { text } description { text } icon }
    }

    # Powers the home-page Special Rate dropdown. Small (5 items),
    # cacheable, and the labels live next to the matching
    # RatePlanType enum so swapping locale or copy is one resolver
    # edit rather than a code change in the bundle.
    specialRates {
      code
      label
      description
      requiresCode
    }
  }
`;

export const SEARCH_HOTELS_QUERY = /* GraphQL */ `
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
          id
          name
          slug
          starRating
          # Card tier chip needs only 'tier' from the brand subtree —
          # name/id/accentColor were unused and added 4 cost per row.
          brand { tier }
          location { address { city countryCode } }
          guestRating { overall count }
          media(first: 1, categories: [EXTERIOR]) {
            edges { node { url } }
          }
          # The amenity-flag block stays — the filter panel reads it
          # back to highlight matched amenities in results.
          hasPool
          hasSpa
          hasGolf
          hasFreeBreakfast
          petsAllowed
          # Federated reach into the pricing subgraph.
          availability(checkIn: $checkIn, checkOut: $checkOut,
                       adults: $adults, children: $children) {
            nights
            currency
            lowestRate { amount currency }
          }
        }
      }
    }
    brands(first: 30) {
      edges { node { id code name tier accentColor numberOfProperties } }
    }
    facets: hotelFacets(filter: $filter) {
      totalCount
      byBrand { brandId count brand { id name tier } }
      byBrandTier { tier count }
      amenities { hasFreeBreakfast hasPool hasSpa hasGolf petsAllowed }
      guestRating { minRating count }
    }
  }
`;

export const HOTELS_LIST_QUERY = /* GraphQL */ `
  query HotelsList($filter: HotelFilter, $first: Int) {
    hotels(first: $first, filter: $filter) {
      totalCount
      edges {
        node {
          id
          name
          slug
          starRating
          brand { id name tier accentColor }
          location {
            address { city countryCode }
          }
          guestRating { overall count }
          media(first: 1, categories: [EXTERIOR]) {
            edges { node { url altText } }
          }
          hasSpa
          hasPool
          hasRestaurants
        }
      }
    }
  }
`;

export const HOTEL_DETAIL_QUERY = /* GraphQL */ `
  query HotelDetail($id: ID!) {
    hotel(id: $id) {
      id
      name
      slug
      starRating
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
      totalRooms
      openedYear
      media(first: 8) {
        edges { node { url thumbnailUrl altText category } }
      }
      amenities { id code name category }
      roomTypes {
        id code name category
        sizeSqm
        maxOccupancy { adults children }
        bedConfiguration { type count }
        view
      }
      experiences { id name durationMinutes pricePerPerson { amount currency } category }
      eventSpaces { id name capacityStyles { setup capacity } }
    }
  }
`;

// ── Guest profile (authed) ───────────────────────────────────────────────

export const ME_PROFILE_QUERY = /* GraphQL */ `
  query Me {
    me {
      id
      email
      phone
      name { firstName lastName }
      externalIds { loyaltyNumber }
      addresses {
        id
        type
        line1
        line2
        city
        stateCode
        postalCode
        countryCode
        isPrimary
      }
      paymentMethods(first: 10) {
        edges {
          node {
            id
            type
            brand
            lastFour
            holderName
            expiryMonth
            expiryYear
            isDefault
          }
        }
      }
    }
  }
`;

// ── Loyalty balance (authed, used by the booking flow) ──────────────────

export const MY_LOYALTY_BALANCE_QUERY = /* GraphQL */ `
  query MyLoyaltyBalance {
    myLoyaltyAccount {
      loyaltyNumber
      pointsBalance { available }
    }
  }
`;

// ── Loyalty hub (authed) ─────────────────────────────────────────────────

export const MY_LOYALTY_QUERY = /* GraphQL */ `
  query MyLoyalty($transactionsLimit: Int, $certificatesStatus: CertificateStatus) {
    myLoyaltyAccount {
      id
      loyaltyNumber
      tier
      status
      memberSince
      lifetimePoints
      lifetimeNights
      referralCode
      pointsBalance {
        available pending expiringSoon total
        cashEquivalent { amount currency }
      }
      tierProgress {
        currentTier nextTier
        qualifyingNights nightsToNextTier nightsToRetain
        qualifyingSpend { amount currency }
        tierProgressPct
        qualificationYearEndDate
        projectedTier
      }
      benefits { code name description category tier }
      certificates(first: 10, status: $certificatesStatus) {
        id type name description status issuedAt expiresAt
      }
      transactions(first: $transactionsLimit) {
        totalCount
        edges {
          node {
            id type points balanceAfter description transactionDate
          }
        }
      }
    }
  }
`;

// ── Account page (authed): combined profile + recent trips ──────────────

export const MY_ACCOUNT_QUERY = /* GraphQL */ `
  query MyAccount($recentTripsLimit: Int) {
    me {
      id
      email
      phone
      dateOfBirth
      nationality
      languagePreference
      currencyPreference
      memberSince
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
      savedHotels(first: 5) {
        edges { node { id hotelId savedAt } }
      }
      travelCompanions {
        id
        name { firstName lastName title }
        relationship
        dateOfBirth
      }
    }
    myReservations(first: $recentTripsLimit) {
      totalCount
      edges {
        node {
          id
          confirmationNumber
          status
          checkIn
          checkOut
          nights
          hotel { id name location { address { city countryCode } } }
          roomType { id name }
          rateBreakdown { currency totalDue { amount currency } }
        }
      }
    }
  }
`;

// ── Account mutations (authed) ──────────────────────────────────────────

export const UPDATE_GUEST_PROFILE_MUTATION = /* GraphQL */ `
  mutation UpdateGuestProfile($input: UpdateGuestProfileInput!) {
    updateGuestProfile(input: $input) {
      __typename
      ... on GuestProfile { id phone dateOfBirth nationality }
      ... on ValidationError { code message fieldErrors { field message } }
      ... on AuthorizationError { code message }
    }
  }
`;

export const ADD_ADDRESS_MUTATION = /* GraphQL */ `
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
`;

export const UPDATE_ADDRESS_MUTATION = /* GraphQL */ `
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
`;

export const REMOVE_ADDRESS_MUTATION = /* GraphQL */ `
  mutation RemoveAddress($id: ID!) { removeAddress(id: $id) }
`;

export const SET_PRIMARY_ADDRESS_MUTATION = /* GraphQL */ `
  mutation SetPrimaryAddress($id: ID!) {
    setPrimaryAddress(id: $id) { id isPrimary }
  }
`;

export const ADD_PAYMENT_METHOD_MUTATION = /* GraphQL */ `
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
`;

export const REMOVE_PAYMENT_METHOD_MUTATION = /* GraphQL */ `
  mutation RemovePaymentMethod($id: ID!) {
    removePaymentMethod(id: $id)
  }
`;

export const SET_DEFAULT_PAYMENT_METHOD_MUTATION = /* GraphQL */ `
  mutation SetDefaultPaymentMethod($id: ID!) {
    setDefaultPaymentMethod(id: $id) { id isDefault }
  }
`;

// ── Trips / reservations ─────────────────────────────────────────────────

export const MY_RESERVATIONS_QUERY = /* GraphQL */ `
  query MyReservations($first: Int, $filter: ReservationFilter) {
    myReservations(first: $first, filter: $filter) {
      totalCount
      edges {
        node {
          id
          confirmationNumber
          status
          checkIn
          checkOut
          nights
          adults
          children
          hotel { id name location { address { city countryCode } } }
          roomType { id name }
          rateBreakdown {
            currency
            totalDue { amount currency }
          }
          isRefundable
          canCheckInOnline
        }
      }
    }
  }
`;

export const RESERVATION_DETAIL_QUERY = /* GraphQL */ `
  query ReservationDetail($id: ID!) {
    reservation(id: $id) {
      id
      confirmationNumber
      status
      source
      createdAt
      checkIn
      checkOut
      nights
      adults
      children
      isRefundable
      canModify
      canCheckInOnline
      cancellationDeadline
      hotel {
        id
        name
        slug
        location { address { line1 city state postalCode countryCode } }
      }
      roomType { id name }
      room { number floor building category }
      rateBreakdown {
        currency
        totalDue { amount currency }
        roomSubtotal { amount currency }
        taxesAndFees { total { amount currency } }
        lineItems {
          id date description amount { amount currency } category quantity
        }
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
`;

export const MOBILE_CHECK_IN_MUTATION = /* GraphQL */ `
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
`;

export const CANCEL_RESERVATION_MUTATION = /* GraphQL */ `
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
`;

export const CREATE_RESERVATION_MUTATION = /* GraphQL */ `
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
`;

export const RESERVATION_BY_CONFIRMATION_QUERY = /* GraphQL */ `
  query ReservationByConfirmation($confirmationNumber: String!, $guestLastName: String) {
    reservationByConfirmationNumber(
      confirmationNumber: $confirmationNumber
      guestLastName: $guestLastName
    ) {
      id
      confirmationNumber
      status
      checkIn
      checkOut
      nights
      adults
      children
      hotel { id name location { address { city countryCode } } }
      roomType { id name }
      rateBreakdown { currency totalDue { amount currency } }
      isRefundable
      canCheckInOnline
    }
  }
`;

// ── Auth mutations ───────────────────────────────────────────────────────

export const SIGN_IN_MUTATION = /* GraphQL */ `
  mutation SignIn($email: EmailAddress!, $password: String!) {
    signIn(input: { email: $email, password: $password }) {
      __typename
      ... on AuthPayload {
        accessToken
        expiresIn
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
`;

export const SIGN_UP_MUTATION = /* GraphQL */ `
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
        isNewAccount
        guest {
          id
          email
          name { firstName lastName }
        }
      }
      ... on ValidationError { code message fieldErrors { field message } }
    }
  }
`;

export const RECENTLY_VIEWED_QUERY = /* GraphQL */ `
  query RecentlyViewed($ids: [ID!]!) {
    hotels(first: 24, filter: { ids: $ids }) {
      edges {
        node {
          id
          name
          slug
          starRating
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
`;

export const DESTINATION_SUGGESTIONS_QUERY = /* GraphQL */ `
  query DestinationSuggestions($query: String!, $limit: Int) {
    destinationSuggestions(query: $query, limit: $limit) {
      type
      label
      sublabel
      hotelId
      hotelSlug
      city
      state
      country
      countryCode
    }
  }
`;

export const RATES_QUERY = /* GraphQL */ `
  query HotelRates(
    $id: ID!
    $checkIn: Date!
    $checkOut: Date!
    $adults: Int!
    $children: Int
    $currency: String
  ) {
    hotel(id: $id) {
      id
      name
      slug
      starRating
      brand { id name tier accentColor logoUrl }
      location {
        address { line1 line2 city state postalCode countryCode }
        coordinates { latitude longitude }
      }
      media(first: 1, categories: [EXTERIOR]) {
        edges { node { url altText } }
      }
      availability(
        checkIn: $checkIn
        checkOut: $checkOut
        adults: $adults
        children: $children
        currency: $currency
      ) {
        nights
        currency
        lowestRate { amount currency }
        roomAvailabilities {
          availableCount
          roomType {
            id
            code
            name
            category
            sizeSqm
            view
            maxOccupancy { adults children }
            bedConfiguration { type count }
            description { text }
          }
          rates {
            id
            ratePlan {
              id
              code
              name
              type
              description
              refundable
              breakfastIncluded
              loyaltyEligible
              loyaltyMultiplier
              cancellationPolicy { type description deadlineHours }
            }
            averageNightlyRate { amount currency }
            totalRate { amount currency }
            totalWithTaxes { amount currency }
            taxesAndFees {
              subtotal { amount }
              taxes { amount }
              fees { amount }
              total { amount }
            }
            pointsEarned
            availableRooms
            rateToken
          }
        }
      }
    }
  }
`;

export const STORIES_LIST_QUERY = /* GraphQL */ `
  query Stories($category: ArticleCategory, $locale: String) {
    articles(filter: { category: $category }, locale: $locale) {
      totalCount
      edges {
        node {
          id
          slug
          category
          readTimeMinutes
          title { text }
          excerpt { text }
          heroImage { url altText { text } }
          author { name title }
          publishedAt
        }
      }
    }
  }
`;

export const STORY_DETAIL_QUERY = /* GraphQL */ `
  query Story($slug: String!, $locale: String) {
    article(slug: $slug, locale: $locale) {
      id
      slug
      category
      readTimeMinutes
      title { text }
      subtitle { text }
      body { text }
      heroImage { url altText { text } }
      gallery { url altText { text } }
      author { name title bio { text } photoUrl }
      tags
      relatedHotels { id name }
      publishedAt updatedAt
    }
  }
`;

export const OFFERS_QUERY = /* GraphQL */ `
  query Offers {
    dealSpotlights(active: true, locale: "en") {
      id
      slug
      promoCode
      discountPercent
      validFrom validTo
      title { text }
      description { text }
      termsAndConditions { text }
      ctaLabel { text }
      ctaUrl
      heroImage { url altText { text } }
      applicableHotels { id name location { address { city countryCode } } }
    }
  }
`;

export const BRANDS_LIST_QUERY = /* GraphQL */ `
  query BrandsList {
    brands(first: 30) {
      totalCount
      edges {
        node {
          id
          code
          name
          slug
          tier
          tagline
          accentColor
          logoUrl
          numberOfProperties
        }
      }
    }
  }
`;

export const BRAND_DETAIL_QUERY = /* GraphQL */ `
  query BrandDetail($id: ID!) {
    brand(id: $id) {
      id
      code
      name
      slug
      tier
      tagline
      description
      accentColor
      heroImageUrl
      loyaltyPointsMultiplier
      numberOfProperties
      sustainabilityCommitment
      # Page slices to 6 anyway — fetch exactly what we render to keep
      # the federated complexity score under control. Each extra hotel
      # multiplies the per-card subtree cost.
      featuredHotels(first: 6) {
        id
        name
        slug
        starRating
        location { address { city countryCode } }
        guestRating { overall count }
        media(first: 1, categories: [EXTERIOR]) {
          edges { node { url } }
        }
      }
    }
    # The full portfolio is heavy by design — every active hotel for
    # the brand, grouped by country on the page. Selected fields match
    # HotelCard's rendering exactly; altText, hasSpa, hasPool, and the
    # extra brand subtree are intentionally NOT requested (HotelCard
    # reads them defensively but they're never displayed here).
    hotels(first: 60, filter: { brandIds: [$id] }) {
      totalCount
      edges {
        node {
          id
          name
          slug
          starRating
          location { address { city countryCode } }
          guestRating { overall count }
          media(first: 1, categories: [EXTERIOR]) {
            edges { node { url } }
          }
        }
      }
    }
  }
`;

export const INSPIRATIONS_QUERY = /* GraphQL */ `
  query Inspirations($season: Season) {
    travelInspirations(season: $season, first: 20, locale: "en") {
      id
      slug
      destination
      region
      bestSeason
      title { text }
      description { text }
      heroImage { url altText { text } }
      approxBudget { amount currency }
      recommendedDays
      featuredHotels { id name }
    }
  }
`;

export const SPECIAL_RATES_QUERY = /* GraphQL */ `
  query SpecialRates {
    specialRates {
      code
      label
      description
      requiresCode
    }
  }
`;

// ── Meetings & Events ────────────────────────────────────────────────────

export const SUBMIT_RFP_MUTATION = /* GraphQL */ `
  mutation SubmitRFP($input: SubmitRFPInput!, $idempotencyKey: UUID!) {
    submitRFP(input: $input, idempotencyKey: $idempotencyKey) {
      __typename
      ... on RFP {
        id
        rfpNumber
        status
        submittedAt
        eventName
      }
      ... on ValidationError {
        code
        message
        fieldErrors { field message }
      }
      ... on NotFoundError { code message }
    }
  }
`;

export const UPDATE_RFP_MUTATION = /* GraphQL */ `
  mutation UpdateRFP($rfpId: ID!, $input: UpdateRFPInput!) {
    updateRFP(rfpId: $rfpId, input: $input) {
      __typename
      ... on RFP { id status updatedAt }
      ... on ValidationError {
        code
        message
        fieldErrors { field message }
      }
      ... on NotFoundError { code message }
    }
  }
`;

export const CANCEL_RFP_MUTATION = /* GraphQL */ `
  mutation CancelRFP($rfpId: ID!, $reason: String) {
    cancelRFP(rfpId: $rfpId, reason: $reason) {
      __typename
      ... on RFP { id status }
      ... on ValidationError { code message fieldErrors { field message } }
      ... on NotFoundError { code message }
    }
  }
`;

export const MY_RFPS_QUERY = /* GraphQL */ `
  query MyRFPs($first: Int, $after: String, $status: RFPStatus) {
    myRFPs(first: $first, after: $after, status: $status) {
      totalCount
      pageInfo { hasNextPage endCursor }
      edges {
        cursor
        node {
          id
          rfpNumber
          status
          eventName
          eventType
          startDate
          endDate
          attendees
          guestRoomsPerNight
          submittedAt
          updatedAt
          preferredHotels { id name location { address { city countryCode } } }
          responses {
            id
            status
            hotelId
            hotel { id name }
            proposedRate { amount currency }
            proposedFAndBMinimum { amount currency }
            proposedRoomBlock
            notes
            respondedAt
            validUntil
          }
        }
      }
    }
  }
`;

export const RFP_DETAIL_QUERY = /* GraphQL */ `
  query RFPDetail($id: ID!) {
    rfp(id: $id) {
      id
      rfpNumber
      status
      organizer
      organization
      contactEmail
      contactPhone
      eventName
      eventType
      startDate
      endDate
      attendees
      guestRoomsPerNight
      cateringRequirements
      additionalRequirements
      submittedAt
      updatedAt
      expiresAt
      preferredHotels { id name location { address { city countryCode } } }
      spaceRequirements { name setup attendees durationHours startTime }
      responses {
        id
        status
        hotelId
        hotel { id name }
        proposedSpaces { id name }
        proposedRate { amount currency }
        proposedFAndBMinimum { amount currency }
        proposedRoomBlock
        notes
        respondedAt
        validUntil
      }
      history { status notes changedAt changedBy }
    }
  }
`;

export const MEETINGS_SEARCH_QUERY = /* GraphQL */ `
  query MeetingsSearch($input: EventSpaceSearchInput!) {
    searchEventSpaces(input: $input) {
      totalCount
      results {
        matchScore
        notes
        hotel {
          id
          name
          slug
          starRating
          brand { id name tier accentColor }
          location { address { city countryCode } }
          media(first: 1, categories: [EXTERIOR]) {
            edges { node { url altText } }
          }
        }
        space {
          id
          name
          category
          areaSqFt
          areaSqMeters
          ceilingHeightFt
          naturalLight
          blackoutCapable
          rooms
          divisible
          capacityStyles { setup capacity }
          rateCard { fullDay { amount currency } halfDay { amount currency } currency }
          images
        }
      }
    }
  }
`;

export const EVENT_SPACE_DETAIL_QUERY = /* GraphQL */ `
  query EventSpaceDetail($id: ID!, $hotelId: ID!) {
    eventSpace(id: $id) {
      id
      hotelId
      name
      description
      category
      areaSqFt
      areaSqMeters
      ceilingHeightFt
      naturalLight
      blackoutCapable
      rooms
      divisible
      capacityStyles { setup capacity }
      technicalSpecs {
        power
        internetSpeedMbps
        riggingPoints
        loadInDoorsHeightFt
        freightElevator
        noiseRating
      }
      avEquipment {
        category
        name
        model
        quantity
        includedInRate
        rentalCost { amount currency }
      }
      cateringRequired
      rateCard {
        currency
        fullDay { amount currency }
        halfDay { amount currency }
        hourly { amount currency }
        setupFee { amount currency }
        cleaningFee { amount currency }
        minimumFAndBSpend { amount currency }
      }
      images
      floorPlanUrl
    }
    hotel(id: $hotelId) {
      id
      name
      slug
      starRating
      brand { id name tier accentColor }
      location {
        address { line1 city state countryCode }
        coordinates { latitude longitude }
      }
      media(first: 1, categories: [EXTERIOR]) {
        edges { node { url altText } }
      }
    }
    cateringMenus(hotelId: $hotelId) {
      id
      name
      description
      pricePerPerson { amount currency }
      minimumGuests
      courses { name description }
      beverageOptions
    }
  }
`;
