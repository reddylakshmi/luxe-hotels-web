// Federated GraphQL queries used across pages. Each query crosses one or
// more subgraphs through the Apollo Router.

export const HOME_QUERY = /* GraphQL */ `
  query Home {
    featuredHotels(first: 6) {
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
  }
`;

export const SEARCH_HOTELS_QUERY = /* GraphQL */ `
  query SearchHotels(
    $filter: HotelFilter
    $first: Int
    $checkIn: Date!
    $checkOut: Date!
    $adults: Int!
  ) {
    hotels(first: $first, filter: $filter) {
      totalCount
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
          # Federated reach into the pricing subgraph.
          availability(checkIn: $checkIn, checkOut: $checkOut, adults: $adults) {
            nights
            currency
            lowestRate { amount currency }
          }
        }
      }
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
      featuredHotels(first: 12) {
        id
        name
        slug
        starRating
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
          id
          name
          slug
          starRating
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
