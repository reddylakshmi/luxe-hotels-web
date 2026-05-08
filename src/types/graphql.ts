// Hand-typed minimal models matching the queries in lib/queries.ts.
// These intentionally shadow only the fields we select — when the schema
// changes, only the queries + this file need to be updated.

export type Money = { amount: string; currency: string };
export type LocalizedText = { text: string };
export type Address = {
  line1?: string | null;
  line2?: string | null;
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

// ── Destination autocomplete ─────────────────────────────────────────────────

export type DestinationSuggestionType = "HOTEL" | "CITY" | "STATE" | "COUNTRY";

export type DestinationSuggestion = {
  type: DestinationSuggestionType;
  label: string;
  sublabel?: string | null;
  hotelId?: string | null;
  hotelSlug?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  countryCode?: string | null;
};

// ── Rate-page types ──────────────────────────────────────────────────────────

export type RatePlan = {
  id: string;
  code: string;
  name: string;
  type: string; // BEST_AVAILABLE | MEMBER_RATE | PACKAGE | ADVANCE_PURCHASE | CORPORATE | REDEMPTION
  description?: string | null;
  refundable: boolean;
  breakfastIncluded: boolean;
  loyaltyEligible: boolean;
  loyaltyMultiplier?: number | null;
  cancellationPolicy?: { type: string; description: string; deadlineHours?: number | null } | null;
};

export type Rate = {
  id: string;
  ratePlan: RatePlan;
  averageNightlyRate: Money;
  totalRate: Money;
  totalWithTaxes: Money;
  taxesAndFees: {
    subtotal: { amount: string };
    taxes: { amount: string };
    fees: { amount: string };
    total: { amount: string };
  };
  pointsEarned: number;
  availableRooms: number;
  rateToken: string;
};

export type RoomAvailability = {
  availableCount: number;
  roomType: {
    id: string;
    code: string;
    name: string;
    category: string;
    sizeSqm?: number | null;
    view?: string | null;
    maxOccupancy: { adults: number; children: number };
    bedConfiguration: { type: string; count: number }[];
    description?: LocalizedText | null;
  };
  rates: Rate[];
};

export type HotelRates = {
  id: string;
  name: string;
  slug: string;
  starRating: number;
  brand: Brand;
  location: {
    address: Address;
    coordinates?: { latitude: number; longitude: number } | null;
  };
  media: { edges: MediaEdge[] };
  availability: {
    nights: number;
    currency: string;
    lowestRate?: Money | null;
    roomAvailabilities: RoomAvailability[];
  } | null;
};

// ── Guest profile (authed) ───────────────────────────────────────────────────

export type GuestAddress = {
  id: string;
  type: string;
  line1?: string | null;
  line2?: string | null;
  city: string;
  stateCode?: string | null;
  postalCode?: string | null;
  countryCode: string;
  isPrimary: boolean;
};

export type PaymentMethodSummary = {
  id: string;
  type: string;
  brand?: string | null;
  lastFour: string;
  holderName?: string | null;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
};

export type SavedHotelSummary = {
  id: string;
  hotelId: string;
  savedAt: string;
};

export type TravelCompanionSummary = {
  id: string;
  name: { firstName: string; lastName: string; title?: string | null };
  relationship?: string | null;
  dateOfBirth?: string | null;
};

export type GuestProfile = {
  id: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  languagePreference: string;
  currencyPreference: string;
  name: { firstName: string; lastName: string; title?: string | null };
  externalIds?: { loyaltyNumber?: string | null } | null;
  addresses: GuestAddress[];
  paymentMethods: { edges: { node: PaymentMethodSummary }[] };
  savedHotels: { edges: { node: SavedHotelSummary }[] };
  travelCompanions: TravelCompanionSummary[];
  memberSince: string;
};

// ── Trips / reservations ─────────────────────────────────────────────────────

export type ReservationStatus =
  | "CONFIRMED" | "MODIFIED" | "CANCELLED" | "CANCELLED_WITH_FEE" | "REFUND_PENDING"
  | "CHECKED_IN" | "CHECKED_OUT" | "NO_SHOW" | "PENDING_PAYMENT" | "PENDING";

export type Reservation = {
  id: string;
  confirmationNumber: string;
  status: ReservationStatus;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  hotel: { id: string; name: string; location: { address: Address } };
  roomType: { id: string; name: string };
  rateBreakdown: { currency: string; totalDue: Money };
  isRefundable: boolean;
  canCheckInOnline: boolean;
};

// ── Reservation detail (richer shape used by /trips/[id]) ───────────────────

export type DigitalKey = {
  reservationId: string;
  keyCode: string;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED";
  activatedAt?: string | null;
  expiresAt: string;
  rooms: string[];
};

export type ReservationLineItem = {
  id: string;
  date?: string | null;
  description: string;
  amount: Money;
  category: string;
  quantity?: number | null;
};

export type ReservationDetail = Reservation & {
  source: string;
  createdAt: string;
  cancellationDeadline?: string | null;
  canModify: boolean;
  hotel: {
    id: string;
    name: string;
    slug?: string | null;
    location: {
      address: Address & { line1?: string | null };
    };
  };
  roomType: { id: string; name: string };
  room?: {
    number?: string | null;
    floor?: number | null;
    building?: string | null;
    category?: string | null;
  } | null;
  rateBreakdown: {
    currency: string;
    totalDue: Money;
    roomSubtotal?: Money | null;
    taxesAndFees?: { total: Money } | null;
    lineItems: ReservationLineItem[];
  };
  specialRequests: {
    id: string;
    category: string;
    request: string;
    status: string;
  }[];
  paymentSummary?: {
    method?: string | null;
    lastFour?: string | null;
    brand?: string | null;
    chargedAt?: string | null;
    amount?: Money | null;
    status?: string | null;
  } | null;
  cancellationPolicy?: {
    type?: string | null;
    description?: string | null;
    deadlineHours?: number | null;
  } | null;
  cancellation?: {
    cancelledAt: string;
    reason?: string | null;
    refundAmount?: Money | null;
    refundStatus?: string | null;
  } | null;
  loyaltyContext?: {
    memberNumber?: string | null;
    tier?: string | null;
    pointsEarned?: number | null;
    qualifyingNights?: number | null;
  } | null;
  digitalKey?: DigitalKey | null;
};

export type HomeData = {
  featuredHotels: HotelCard[];
  featuredArticles: Article[];
  travelInspirations: Inspiration[];
  dealSpotlights: DealSpotlight[];
  brandStory: BrandStory;
};
