// Result card on the /meetings discovery grid. Shows the venue's
// hero image, brand chip, name, capacity-fit badge, key dimensions
// and a CTA to the venue detail page. Card is fully linked — the
// outer Link wraps the entire surface so the whole card is hit-target.

import Link from "next/link";
import { imageUrl } from "@/lib/image";
import {
  capacityFit,
  formatMatchScore,
  labelCategory,
  labelSetup,
  matchTone,
  sortCapacityStyles,
  type SetupStyle,
} from "@/lib/meetings";
import { formatAmount, parseMoneyAmount } from "@/lib/money";

type EventSpaceHit = {
  matchScore: number;
  notes: string | null;
  hotel: {
    id: string;
    name: string;
    slug: string;
    starRating: number;
    brand: { id: string; name: string; tier: string; accentColor: string | null };
    location: { address: { city: string; countryCode: string } };
    media: { edges: { node: { url: string; altText: string | null } }[] };
  };
  space: {
    id: string;
    name: string;
    category: string;
    areaSqFt: number;
    areaSqMeters: number;
    ceilingHeightFt: number;
    naturalLight: boolean;
    blackoutCapable: boolean;
    rooms: number;
    divisible: boolean;
    capacityStyles: { setup: string; capacity: number }[];
    rateCard: {
      fullDay: { amount: string; currency: string };
      halfDay: { amount: string; currency: string };
      currency: string;
    };
    images: string[];
  };
};

export function EventSpaceCard({
  hit,
  attendees,
  setup,
  searchParams,
}: {
  hit: EventSpaceHit;
  attendees: number;
  setup?: SetupStyle;
  /** Carry the search context into the venue detail link so the back
   *  button + RFP wizard can respect it. */
  searchParams: Record<string, string>;
}) {
  const fit = capacityFit(hit.space.capacityStyles, attendees, setup);
  const tone = matchTone(hit.matchScore);
  const img = hit.space.images?.[0] ?? hit.hotel.media?.edges?.[0]?.node?.url;
  const fullDay = parseMoneyAmount(hit.space.rateCard.fullDay);
  const detailHref =
    `/meetings/${hit.hotel.id}/${hit.space.id}?` +
    new URLSearchParams(searchParams).toString();

  return (
    <Link
      href={detailHref}
      className="group block bg-white border border-ink/10 hover:border-goldDeep transition-colors"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink/5">
        <img
          src={imageUrl(img, { w: 800, h: 600 })}
          alt={hit.space.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <div
          className={[
            "absolute top-3 left-3 px-3 py-1 text-[10px] uppercase tracking-[0.2em]",
            tone === "great" && "bg-emerald-50 text-emerald-900 border border-emerald-200",
            tone === "good" && "bg-amber-50 text-amber-900 border border-amber-200",
            tone === "stretch" && "bg-cream/95 text-ink border border-ink/15",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {formatMatchScore(hit.matchScore)}
        </div>
        {hit.hotel.brand?.tier && (
          <div className="absolute top-3 right-3 bg-cream/95 px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
            {hit.hotel.brand.tier}
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-ink/60 mb-1">
          {hit.hotel.location.address.city} · {hit.hotel.brand?.name}
        </div>
        <h3 className="font-serif text-xl leading-tight mb-1 group-hover:text-goldDeep">
          {hit.space.name}
        </h3>
        <div className="text-sm text-ink/65 mb-3">
          {labelCategory(hit.space.category)} · {hit.hotel.name}
        </div>

        <dl className="text-xs grid grid-cols-2 gap-y-1 gap-x-3 text-ink/75 mb-3">
          <Row label="Area">
            {Math.round(hit.space.areaSqFt).toLocaleString()} sq ft
          </Row>
          <Row label="Ceiling">{hit.space.ceilingHeightFt} ft</Row>
          <Row label="Daylight">{hit.space.naturalLight ? "Yes" : "No"}</Row>
          <Row label="Blackout">{hit.space.blackoutCapable ? "Yes" : "No"}</Row>
        </dl>

        <div className="border-t border-ink/10 pt-3 mt-3 flex items-baseline justify-between gap-3">
          <div className="text-xs text-ink/65">
            {fit.fits && fit.best ? (
              <>
                Fits {attendees} in <strong className="text-ink">{labelSetup(fit.best.setup)}</strong>{" "}
                <span className="text-ink/50">(up to {fit.best.capacity})</span>
              </>
            ) : fit.best ? (
              <>
                Tightest fit:{" "}
                <strong className="text-ink">
                  {labelSetup(fit.best.setup)} · {fit.best.capacity}
                </strong>{" "}
                — {fit.shortfall} short
              </>
            ) : (
              <em className="text-ink/55">Layout combinations available on request</em>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink/55">From</div>
            <div className="font-serif text-base">
              {formatAmount(fullDay, hit.space.rateCard.currency)}
              <span className="text-xs text-ink/50">/day</span>
            </div>
          </div>
        </div>

        {/* Top three capacity rows (sorted) so planners get a quick read */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sortCapacityStyles(hit.space.capacityStyles)
            .slice(0, 3)
            .map((c) => (
              <span
                key={c.setup}
                className="text-[10px] uppercase tracking-[0.15em] text-ink/65 border border-ink/15 px-2 py-0.5"
              >
                {labelSetup(c.setup)} · {c.capacity}
              </span>
            ))}
        </div>
      </div>
    </Link>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-ink/55">{label}</dt>
      <dd className="text-right tabular-nums">{children}</dd>
    </>
  );
}
