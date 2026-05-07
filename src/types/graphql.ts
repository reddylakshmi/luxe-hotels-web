// Hand-typed minimal models matching the queries in lib/queries.ts.
// These intentionally shadow only the fields we select — when the schema
// changes, only the queries + this file need to be updated.

export type Money = { amount: string; currency: string };
export type LocalizedText = { text: string };
export type Address = {
  line1?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  countryCode: string;
};
export type Brand = {
  id: string;
  code?: string;
  name: string;
  slug?: string;
  tier?: string | null;
  tagline?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  accentColor?: string | null;
  loyaltyPointsMultiplier?: number;
  numberOfProperties?: number;
  sustainabilityCommitment?: string | null;
};

export type BrandDetail = Brand & {
  featuredHotels: HotelCard[];
};

export type HotelFacets = {
  totalCount: number;
  byBrand: { brandId: string; count: number; brand: { id: string; name: string; tier?: string | null } }[];
  byBrandTier: { tier: string; count: number }[];
  amenities: {
    hasFreeBreakfast: number;
    hasPool: number;
    hasSpa: number;
    hasGolf: number;
    petsAllowed: number;
  };
  guestRating: { minRating: number; count: number }[];
};
export type GuestRating = { overall: number; count: number };
export type MediaEdge = { node: { url: string; altText?: string | null; thumbnailUrl?: string | null; category?: string | null } };
export type Connection<T> = { totalCount: number; edges: { node: T }[] };

export type HotelCard = {
  id: string;
  name: string;
  slug: string;
  starRating: number;
  brand: Brand;
  location: { address: Address };
  guestRating?: GuestRating | null;
  media: { edges: MediaEdge[] };
  hasSpa?: boolean;
  hasPool?: boolean;
  hasGolf?: boolean;
  hasRestaurants?: boolean;
  hasFreeBreakfast?: boolean;
  petsAllowed?: boolean;
  // Populated only when the page asked for availability (search results).
  availability?: {
    nights: number;
    currency: string;
    lowestRate?: Money | null;
  } | null;
};

export type HotelDetail = HotelCard & {
  brand: Brand;
  location: {
    address: Address;
    coordinates?: { latitude: number; longitude: number } | null;
    timezone?: string | null;
  };
  contact?: { phone?: string | null; email?: string | null; website?: string | null } | null;
  guestRating?: (GuestRating & { breakdown?: { excellent: number; veryGood: number; good: number; fair: number; poor: number } | null }) | null;
  hasSpa: boolean;
  hasPool: boolean;
  hasRestaurants: boolean;
  hasGolf: boolean;
  totalRooms: number;
  openedYear?: number | null;
  amenities: { id: string; code: string; name: string; category: string }[];
  roomTypes: {
    id: string;
    code: string;
    name: string;
    category: string;
    sizeSqm?: number | null;
    maxOccupancy: { adults: number; children: number };
    bedConfiguration: { type: string; count: number }[];
    view?: string | null;
  }[];
  experiences: { id: string; name: string; durationMinutes?: number | null; pricePerPerson?: Money | null; category?: string | null }[];
  eventSpaces: { id: string; name: string; capacityStyles: { setup: string; capacity: number }[] }[];
};

export type Article = {
  id: string;
  slug: string;
  category: string;
  readTimeMinutes: number;
  title: LocalizedText;
  subtitle?: LocalizedText | null;
  excerpt: LocalizedText;
  body?: LocalizedText | null;
  heroImage: { url: string; altText?: LocalizedText | null };
  gallery?: { url: string; altText?: LocalizedText | null }[];
  author: { name: string; title?: string | null; bio?: LocalizedText | null; photoUrl?: string | null };
  tags?: string[];
  relatedHotels?: { id: string; name: string }[];
  publishedAt: string;
  updatedAt?: string;
};

export type Inspiration = {
  id: string;
  slug: string;
  destination: string;
  region: string;
  bestSeason: string;
  title: LocalizedText;
  description: LocalizedText;
  heroImage: { url: string; altText?: LocalizedText | null };
  approxBudget?: Money | null;
  recommendedDays: number;
  featuredHotels?: { id: string; name: string }[];
};

export type DealSpotlight = {
  id: string;
  slug: string;
  promoCode?: string | null;
  discountPercent?: number | null;
  validFrom?: string;
  validTo?: string;
  title: LocalizedText;
  description: LocalizedText;
  termsAndConditions?: LocalizedText | null;
  ctaLabel: LocalizedText;
  ctaUrl: string;
  heroImage: { url: string; altText?: LocalizedText | null };
  applicableHotels?: { id: string; name: string; location?: { address: Address } }[];
};

export type BrandStory = {
  title: LocalizedText;
  tagline: LocalizedText;
  pillars: { code: string; title: LocalizedText; description: LocalizedText; icon?: string | null }[];
};

export type HomeData = {
  featuredHotels: HotelCard[];
  featuredArticles: Article[];
  travelInspirations: Inspiration[];
  dealSpotlights: DealSpotlight[];
  brandStory: BrandStory;
};
