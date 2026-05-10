export const dynamic = "force-dynamic";

// Venue detail. Renders the EventSpace's hero photo, capacity matrix
// (highlighting the requested headcount when carried in the URL), full
// rate card, technical specs, A/V inventory, and the hotel's catering
// menus. The "Request a Proposal" CTA jumps straight into the wizard
// (built in the next commit) carrying the search context forward.

import Link from "next/link";
import Image from "next/image";
import { gqlFetch } from "@/lib/graphql";
import { EVENT_SPACE_DETAIL_QUERY } from "@/lib/queries";
import { picker } from "@/lib/searchParams";
import { imageUrl } from "@/lib/image";
import {
  formatStayWindow,
  labelCategory,
  labelSetup,
  type SetupStyle,
} from "@/lib/meetings";
import { formatAmount, parseMoneyAmount } from "@/lib/money";
import { BrandLogo } from "@/components/BrandLogo";
import { EventSpaceCapacityMatrix } from "@/components/EventSpaceCapacityMatrix";
import { EventSpaceRateCardView } from "@/components/EventSpaceRateCardView";

type Money = { amount: string; currency: string } | null;

type Resp = {
  eventSpace: {
    id: string;
    hotelId: string;
    name: string;
    description: string;
    category: string;
    areaSqFt: number;
    areaSqMeters: number;
    ceilingHeightFt: number;
    naturalLight: boolean;
    blackoutCapable: boolean;
    rooms: number;
    divisible: boolean;
    capacityStyles: { setup: string; capacity: number }[];
    technicalSpecs: {
      power: string;
      internetSpeedMbps: number;
      riggingPoints: number | null;
      loadInDoorsHeightFt: number | null;
      freightElevator: boolean;
      noiseRating: string | null;
    };
    avEquipment: {
      category: string;
      name: string;
      model: string | null;
      quantity: number;
      includedInRate: boolean;
      rentalCost: Money;
    }[];
    cateringRequired: boolean;
    rateCard: {
      currency: string;
      fullDay: Money;
      halfDay: Money;
      hourly: Money;
      setupFee: Money;
      cleaningFee: Money;
      minimumFAndBSpend: Money;
    };
    images: string[];
    floorPlanUrl: string | null;
  } | null;
  hotel: {
    id: string;
    name: string;
    starRating: number;
    brand: { id: string; name: string; tier: string; accentColor: string | null };
    location: {
      address: { line1: string | null; city: string; state: string | null; countryCode: string };
    };
    media: { edges: { node: { url: string; altText: string | null } }[] };
  } | null;
  cateringMenus: {
    id: string;
    name: string;
    description: string;
    pricePerPerson: { amount: string; currency: string };
    minimumGuests: number;
    courses: { name: string; description: string }[];
    beverageOptions: string[];
  }[];
};

export default async function VenueDetailPage({
  params,
  searchParams,
}: {
  params: { hotelId: string; spaceId: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const pick = picker(searchParams);
  const startDate = pick("startDate") ?? "";
  const endDate = pick("endDate") ?? "";
  const attendeesRaw = pick("attendees");
  const attendees = attendeesRaw ? Number(attendeesRaw) : 0;
  const setup = pick("setup") as SetupStyle | undefined;

  let data: Resp | null;
  try {
    data = await gqlFetch<Resp>(EVENT_SPACE_DETAIL_QUERY, {
      id: params.spaceId,
      hotelId: params.hotelId,
    });
  } catch (err) {
    console.error("[meetings] EVENT_SPACE_DETAIL_QUERY failed", err);
    data = null;
  }

  if (!data?.eventSpace || !data.hotel) {
    return <NotFound />;
  }
  const space = data.eventSpace;
  const hotel = data.hotel;

  const carryParams: Record<string, string> = {};
  if (startDate) carryParams.startDate = startDate;
  if (endDate) carryParams.endDate = endDate;
  if (attendees) carryParams.attendees = String(attendees);
  if (setup) carryParams.setup = setup;

  const rfpHref =
    `/meetings/${params.hotelId}/${params.spaceId}/rfp` +
    (Object.keys(carryParams).length
      ? "?" + new URLSearchParams(carryParams).toString()
      : "");
  const backHref =
    `/meetings` +
    (Object.keys(carryParams).length
      ? "?" + new URLSearchParams(carryParams).toString()
      : "");

  const heroImg = space.images?.[0] ?? hotel.media?.edges?.[0]?.node?.url ?? null;

  return (
    <>
      {/* ── Header ────────────────────────────────────────────── */}
      <section className="bg-ink text-cream">
        <div className="container-x py-10 md:py-14 flex items-center gap-5">
          <BrandLogo brand={hotel.brand} size="md" />
          <div className="flex-1">
            <div className="eyebrow text-cream/70 mb-1">{hotel.brand.name}</div>
            <h1 className="font-serif text-3xl md:text-4xl leading-tight">{space.name}</h1>
            <p className="text-cream/70 text-sm mt-1">
              {labelCategory(space.category)} · {hotel.name} ·{" "}
              {hotel.location.address.city}
              {hotel.location.address.countryCode
                ? `, ${hotel.location.address.countryCode}`
                : ""}
            </p>
          </div>
          <Link
            href={backHref}
            className="hidden md:inline-block text-cream/80 hover:text-cream text-sm underline"
          >
            ← All venues
          </Link>
        </div>
      </section>

      {/* ── Status bar ────────────────────────────────────────── */}
      {(startDate || attendees > 0) && (
        <section className="bg-cream border-b border-ink/10">
          <div className="container-x py-4 text-sm text-ink/75 flex flex-wrap items-center gap-x-6 gap-y-1">
            {startDate && endDate && (
              <span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mr-1">
                  Dates
                </span>{" "}
                {formatStayWindow(startDate, endDate)}
              </span>
            )}
            {attendees > 0 && (
              <span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mr-1">
                  Headcount
                </span>{" "}
                {attendees}
              </span>
            )}
            {setup && (
              <span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mr-1">
                  Setup
                </span>{" "}
                {labelSetup(setup)}
              </span>
            )}
          </div>
        </section>
      )}

      {/* ── Hero photo + RFP CTA ──────────────────────────────── */}
      <section className="container-x py-8 md:py-10 grid grid-cols-1 md:grid-cols-[1fr_360px] gap-8">
        <div>
          {heroImg && (
            <Image
              src={imageUrl(heroImg, { w: 1280, h: 720 })}
              alt={space.name}
              width={1280}
              height={720}
              className="w-full h-auto object-cover border border-ink/10"
              unoptimized
            />
          )}
          <p className="mt-5 text-ink/75 leading-relaxed max-w-2xl">{space.description}</p>

          <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-6 text-sm">
            <Stat label="Area">
              {Math.round(space.areaSqFt).toLocaleString()} sq ft
              <div className="text-xs text-ink/55">
                {Math.round(space.areaSqMeters).toLocaleString()} sq m
              </div>
            </Stat>
            <Stat label="Ceiling">{space.ceilingHeightFt} ft</Stat>
            <Stat label="Natural light">{space.naturalLight ? "Yes" : "No"}</Stat>
            <Stat label="Blackout">{space.blackoutCapable ? "Yes" : "No"}</Stat>
            <Stat label="Rooms">{space.rooms}</Stat>
            <Stat label="Divisible">{space.divisible ? "Yes" : "No"}</Stat>
            <Stat label="Catering required">{space.cateringRequired ? "Yes" : "No"}</Stat>
            {space.floorPlanUrl && (
              <Stat label="Floor plan">
                <a
                  className="text-goldDeep underline hover:no-underline"
                  href={space.floorPlanUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download PDF
                </a>
              </Stat>
            )}
          </dl>
        </div>

        {/* CTA sidebar */}
        <aside className="md:sticky md:top-6 self-start border border-ink/10 bg-white p-5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
            Starts at
          </div>
          <div className="font-serif text-3xl mb-1">
            {space.rateCard.fullDay
              ? formatAmount(parseMoneyAmount(space.rateCard.fullDay), space.rateCard.currency)
              : "—"}
            <span className="text-sm text-ink/50 font-sans"> /day</span>
          </div>
          <p className="text-xs text-ink/55 mb-5">
            Half-day, hourly and add-on pricing in the rate card below.
          </p>
          <Link href={rfpHref} className="btn-primary block text-center px-5 py-3 mb-3">
            Request a Proposal
          </Link>
          <p className="text-xs text-ink/55">
            A planner will respond within one business day. No card required.
          </p>
        </aside>
      </section>

      {/* ── Capacity matrix ───────────────────────────────────── */}
      <section className="container-x py-8">
        <h2 className="font-serif text-2xl mb-4">Capacity by setup</h2>
        <EventSpaceCapacityMatrix
          capacityStyles={space.capacityStyles}
          attendees={attendees > 0 ? attendees : undefined}
        />
      </section>

      {/* ── Rate card ─────────────────────────────────────────── */}
      <section className="container-x py-8">
        <h2 className="font-serif text-2xl mb-4">Rate card</h2>
        <EventSpaceRateCardView rateCard={space.rateCard} />
      </section>

      {/* ── Technical specs + A/V ─────────────────────────────── */}
      <section className="container-x py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="font-serif text-2xl mb-4">Technical specs</h2>
          <dl className="border border-ink/10 bg-white p-5 grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <Spec label="Power">{space.technicalSpecs.power}</Spec>
            <Spec label="Internet">{space.technicalSpecs.internetSpeedMbps} Mbps</Spec>
            <Spec label="Rigging points">
              {space.technicalSpecs.riggingPoints ?? "—"}
            </Spec>
            <Spec label="Load-in height">
              {space.technicalSpecs.loadInDoorsHeightFt
                ? `${space.technicalSpecs.loadInDoorsHeightFt} ft`
                : "—"}
            </Spec>
            <Spec label="Freight elevator">
              {space.technicalSpecs.freightElevator ? "Yes" : "No"}
            </Spec>
            <Spec label="Noise rating">{space.technicalSpecs.noiseRating ?? "—"}</Spec>
          </dl>
        </div>
        <div>
          <h2 className="font-serif text-2xl mb-4">A/V inventory</h2>
          <ul className="border border-ink/10 bg-white divide-y divide-ink/10 text-sm">
            {space.avEquipment.map((eq, i) => (
              <li key={i} className="px-5 py-3 flex items-baseline gap-3">
                <div className="flex-1">
                  <div>
                    <strong className="font-medium">{eq.name}</strong>
                    {eq.model && (
                      <span className="text-ink/55 text-xs"> · {eq.model}</span>
                    )}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-ink/55">
                    {eq.category} · qty {eq.quantity}
                  </div>
                </div>
                <div className="text-xs text-right whitespace-nowrap">
                  {eq.includedInRate ? (
                    <span className="text-emerald-700">Included</span>
                  ) : eq.rentalCost ? (
                    formatAmount(parseMoneyAmount(eq.rentalCost), eq.rentalCost.currency)
                  ) : (
                    "—"
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Catering menus ────────────────────────────────────── */}
      {data.cateringMenus.length > 0 && (
        <section className="container-x py-10">
          <h2 className="font-serif text-2xl mb-4">Catering at {hotel.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.cateringMenus.map((m) => (
              <article key={m.id} className="border border-ink/10 bg-white p-5">
                <h3 className="font-serif text-xl mb-1">{m.name}</h3>
                <div className="text-xs text-ink/55 mb-3">
                  Min. {m.minimumGuests} guests · from{" "}
                  {formatAmount(parseMoneyAmount(m.pricePerPerson), m.pricePerPerson.currency)}{" "}
                  per person
                </div>
                <p className="text-sm text-ink/75 mb-3">{m.description}</p>
                <ul className="text-xs text-ink/65 space-y-1 mb-3">
                  {m.courses.map((c) => (
                    <li key={c.name}>
                      <strong className="text-ink">{c.name}</strong> — {c.description}
                    </li>
                  ))}
                </ul>
                {m.beverageOptions.length > 0 && (
                  <div className="text-[10px] uppercase tracking-[0.18em] text-ink/55">
                    {m.beverageOptions.join(" · ")}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Bottom CTA ────────────────────────────────────────── */}
      <section className="container-x py-12 text-center">
        <Link href={rfpHref} className="btn-primary inline-block px-8 py-3">
          Request a Proposal for {space.name}
        </Link>
      </section>
    </>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
        {label}
      </div>
      <div className="text-base font-medium">{children}</div>
    </div>
  );
}

function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-ink/55 text-[10px] uppercase tracking-[0.18em]">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </>
  );
}

function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="font-serif text-3xl mb-4">Venue unavailable</h1>
      <p className="text-ink/60 mb-8">
        We couldn&rsquo;t find that venue. It may have moved or been retired.
      </p>
      <Link href="/meetings" className="btn-primary inline-block">
        Back to all venues
      </Link>
    </div>
  );
}
