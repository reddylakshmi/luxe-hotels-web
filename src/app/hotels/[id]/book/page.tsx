export const dynamic = "force-dynamic";

// Complete Your Booking page. Server component that:
//   1. Resolves the rate/room the user selected on /hotels/[id]/rates by
//      re-fetching the same RATES_QUERY and finding the matching room +
//      rate plan.
//   2. Composes the page from focused subcomponents — the booking form
//      itself, the right-column summary sidebar, the special-offer banner,
//      and the hold timer.
//   3. Computes all charge derivations via the pure
//      computeChargeSummary() helper so the sidebar and the special-offer
//      banner share one source of truth.

import Link from "next/link";
import { gqlFetch } from "@/lib/graphql";
import { gqlFetchAuthed } from "@/lib/graphqlAuthed";
import { ME_PROFILE_QUERY, MY_LOYALTY_BALANCE_QUERY, RATES_QUERY, SPECIAL_RATES_QUERY } from "@/lib/queries";
import type {
  GuestProfile,
  HotelRates,
  Rate,
  RoomAvailability,
  SpecialRate,
} from "@/types/graphql";
import { resolveStay, fmtDate } from "@/lib/stay";
import { fromSearchParams as guestsFrom } from "@/lib/guests";
import { picker } from "@/lib/searchParams";
import { parseMoneyAmount, formatAmount } from "@/lib/money";
import { computeChargeSummary } from "@/lib/bookingValidation";
import { getSession } from "@/lib/authSession";
import type { GuestSummary } from "@/lib/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { HoldTimer } from "@/components/HoldTimer";
import { StatementCreditBanner } from "@/components/StatementCreditBanner";
import { MemberRateBanner } from "@/components/MemberRateBanner";
import { BookingExperience } from "@/components/BookingExperience";

type Resp = { hotel: HotelRates };

/** ME_PROFILE_QUERY response shape — extends the GuestProfile type with
 *  the connection-style paymentMethods field that the query selects. */
type ProfileWithPayments = GuestProfile & {
  paymentMethods?: { edges: { node: SavedPaymentMethod }[] } | null;
};

// Mirrors PaymentMethodSummary from the GraphQL schema — brand and
// holderName are genuinely nullable on the wire, so consumers must
// tolerate null rather than the type pretending otherwise.
export type SavedPaymentMethod = {
  id: string;
  type: string;
  brand?: string | null;
  lastFour: string;
  holderName?: string | null;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
};

export default async function BookPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const pick = picker(searchParams);

  const stay = resolveStay({ checkIn: pick("checkIn"), checkOut: pick("checkOut") });
  const guests = guestsFrom(searchParams);
  const currency = pick("currency") || "USD";
  const ratePlanCode = pick("ratePlanCode") ?? "";
  const rateToken = pick("rateToken") ?? "";
  const roomId = pick("roomId") ?? "";
  // Home / rates picker carry-through. Accept both forms so legacy
  // "1" links keep working alongside the new "true" contract.
  const specialRateCode = pick("specialRateCode");
  const corporateCode = pick("corporateCode");
  const usePoints = pick("usePoints") === "1" || pick("usePoints") === "true";

  // Fetch the rate-list and (when signed in) the guest's full profile in
  // parallel — covers name, email, phone, member#, addresses, and payment
  // methods so the booking form lands fully pre-filled.
  const session = getSession();
  const [data, profileData, loyaltyData, specialRatesData] = await Promise.all([
    gqlFetch<Resp>(RATES_QUERY, {
      id: params.id,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      adults: guests.adults,
      children: guests.children,
      currency,
    }).catch((err) => {
      console.error("[book] RATES_QUERY failed for hotel", params.id, err);
      return null as Resp | null;
    }),
    session
      ? gqlFetchAuthed<{ me: ProfileWithPayments | null }>(ME_PROFILE_QUERY).catch(
          (err) => {
            console.error("[book] ME_PROFILE_QUERY failed", err);
            return null;
          },
        )
      : Promise.resolve(null),
    session
      ? gqlFetchAuthed<{
          myLoyaltyAccount: {
            loyaltyNumber: string;
            pointsBalance: { available: number };
          } | null;
        }>(MY_LOYALTY_BALANCE_QUERY).catch((err) => {
          // The guest may not be enrolled — log + fall through silently.
          console.error("[book] MY_LOYALTY_BALANCE_QUERY failed", err);
          return null;
        })
      : Promise.resolve(null),
    // Look up the picker label so the sidebar chip can show the same
    // human text the guest saw on /search and /rates. Fall through to an
    // empty catalogue if the pricing subgraph is down so the booking
    // page still renders.
    specialRateCode
      ? gqlFetch<{ specialRates: SpecialRate[] }>(SPECIAL_RATES_QUERY, {}, {}, {
          revalidate: 3600,
          tags: ["catalog:specialRates"],
        }).catch(() => ({
          specialRates: [] as SpecialRate[],
        }))
      : Promise.resolve({ specialRates: [] as SpecialRate[] }),
  ]);
  const profile = profileData?.me ?? null;
  const loyalty = loyaltyData?.myLoyaltyAccount
    ? {
        loyaltyNumber: loyaltyData.myLoyaltyAccount.loyaltyNumber,
        available: loyaltyData.myLoyaltyAccount.pointsBalance.available,
      }
    : null;

  const hotel = data?.hotel;
  if (!hotel || !hotel.availability) {
    return <NotFound hotelId={params.id} />;
  }

  const room: RoomAvailability | undefined = hotel.availability.roomAvailabilities.find(
    (r) => r.roomType.id === roomId,
  );
  const selectedRate: Rate | undefined = room?.rates.find((r) => r.ratePlan.code === ratePlanCode);

  if (!room || !selectedRate) {
    return <NotFound hotelId={params.id} />;
  }

  const charges = computeChargeSummary({
    subtotal: parseMoneyAmount(selectedRate.taxesAndFees.subtotal),
    taxes: parseMoneyAmount(selectedRate.taxesAndFees.taxes),
    fees: parseMoneyAmount(selectedRate.taxesAndFees.fees),
    currency,
    // Multiply per-room charges by the picker's room count. The
    // pricing subgraph returns a one-room rate breakdown; the UI
    // does the multiplication so the breakdown lines stay
    // round-trip with the rate detail page.
    rooms: guests.rooms,
  });

  const editStayParams = new URLSearchParams({
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    adults: String(guests.adults),
    children: String(guests.children),
    rooms: String(guests.rooms),
    currency,
  });
  // Preserve the home-page picker context on the back-link so the
  // /rates page can re-render the same chips + picker state.
  if (specialRateCode && specialRateCode !== "BEST_AVAILABLE") {
    editStayParams.set("specialRateCode", specialRateCode);
    if (corporateCode && specialRateCode === "CORPORATE") {
      editStayParams.set("corporateCode", corporateCode);
    }
  }
  if (usePoints) editStayParams.set("usePoints", "true");
  const editStayHref = `/hotels/${params.id}/rates?${editStayParams.toString()}`;

  const selectedSpecialRate =
    specialRateCode && specialRateCode !== "BEST_AVAILABLE"
      ? specialRatesData.specialRates.find((r) => r.code === specialRateCode)
      : undefined;

  const isMemberRate = selectedRate.ratePlan.type === "MEMBER_RATE";
  const addressBits = [
    hotel.location.address.line1,
    hotel.location.address.line2,
    hotel.location.address.city,
    hotel.location.address.state,
    hotel.location.address.postalCode,
  ].filter(Boolean);

  return (
    <>
      {/* ── Header (matches the rates page) ───────────────────────── */}
      <section className="bg-ink text-cream">
        <div className="container-x py-10 md:py-14 flex items-center gap-5">
          <BrandLogo brand={hotel.brand} size="md" />
          <div>
            <div className="eyebrow text-cream/70 mb-1">{hotel.brand.name}</div>
            <h1 className="font-serif text-3xl md:text-4xl leading-tight">{hotel.name}</h1>
            <p className="text-cream/70 text-sm mt-1">{addressBits.join(", ")}</p>
          </div>
        </div>
      </section>

      {/* ── Status row: Stay dates · Total stay · Hold timer ──────── */}
      <section className="bg-cream border-b border-ink/10">
        <div className="container-x py-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <Stat label="Stay Dates" value={`${fmtDate(stay.checkIn)} → ${fmtDate(stay.checkOut)}`} />
          <Stat label="Total Stay" value={formatAmount(charges.total, charges.currency)} />
          <HoldTimer backToRatesHref={editStayHref} />
        </div>
      </section>

      <StatementCreditBanner charges={charges} />

      {isMemberRate && <MemberRateBanner />}

      {/* ── Two-column form + summary ────────────────────────────── */}
      <section className="container-x py-10">
        <h2 className="font-serif text-3xl mb-8">Complete Your Booking</h2>
        <BookingExperience
          bookingHref={editStayHref}
          hotelId={params.id}
          rateToken={rateToken}
          ratePlanCode={ratePlanCode}
          roomId={roomId}
          prefillGuest={prefillFromProfileOrSession(profile, session?.guest)}
          signedInLabel={
            profile
              ? `${profile.name.firstName} ${profile.name.lastName}`
              : session
                ? `${session.guest.firstName} ${session.guest.lastName}`
                : undefined
          }
          savedAddresses={profile?.addresses ?? []}
          savedPaymentMethods={
            profile?.paymentMethods?.edges?.map((e) => e.node) ?? []
          }
          loyalty={loyalty}
          bookingCurrency={currency}
          hotelName={hotel.name}
          rateRoom={room.roomType}
          selectedRate={selectedRate}
          charges={charges}
          checkIn={stay.checkIn}
          checkOut={stay.checkOut}
          nights={hotel.availability.nights}
          rooms={guests.rooms}
          adults={guests.adults}
          children={guests.children}
          editStayHref={editStayHref}
          specialRateLabel={selectedSpecialRate?.label}
          corporateCode={
            corporateCode && selectedSpecialRate?.code === "CORPORATE"
              ? corporateCode
              : undefined
          }
          usePoints={usePoints}
        />
      </section>
    </>
  );
}

/**
 * Map a signed-in guest's profile (or session snapshot when the
 * profile fetch fails) onto the BookingForm's pre-fill shape. Picks
 * the primary address (or the first one) for the country/zip slots
 * — the guest can still pick a different saved address from the
 * selector, or override every field manually.
 */
function prefillFromProfileOrSession(
  profile: ProfileWithPayments | null,
  fallback: GuestSummary | undefined,
): Partial<import("@/lib/bookingValidation").GuestInformation> | undefined {
  if (profile) {
    const primary = profile.addresses?.find((a) => a.isPrimary) ?? profile.addresses?.[0];
    return {
      firstName: profile.name.firstName,
      lastName: profile.name.lastName,
      email: profile.email,
      memberNumber: profile.externalIds?.loyaltyNumber ?? "",
      mobile: profile.phone ?? "",
      country: primary?.countryCode ?? "US",
      addressLine1: primary?.line1 ?? "",
      addressLine2: primary?.line2 ?? "",
      city: primary?.city ?? "",
      state: primary?.stateCode ?? "",
      zip: primary?.postalCode ?? "",
    };
  }
  if (fallback) {
    return {
      firstName: fallback.firstName,
      lastName: fallback.lastName,
      email: fallback.email,
    };
  }
  return undefined;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">{label}</div>
      <div className="text-base font-medium">{value}</div>
    </div>
  );
}

function NotFound({ hotelId }: { hotelId: string }) {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="font-serif text-3xl mb-4">Booking unavailable</h1>
      <p className="text-ink/60 mb-8">
        We couldn&rsquo;t find the rate you selected — it may have expired. Please pick again.
      </p>
      <Link href={`/hotels/${hotelId}/rates`} className="btn-primary inline-block">
        Back to rates
      </Link>
    </div>
  );
}
