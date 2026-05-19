export const dynamic = "force-dynamic";

import Link from "next/link";
import { gqlFetch } from "@/lib/graphql";
import { INSPIRATIONS_QUERY } from "@/lib/queries";
import type { Inspiration } from "@/types/graphql";
import { InspirationCard } from "@/components/InspirationCard";

const SEASONS = [
  { label: "All seasons", value: "" },
  { label: "Spring", value: "SPRING" },
  { label: "Summer", value: "SUMMER" },
  { label: "Fall", value: "FALL" },
  { label: "Winter", value: "WINTER" },
  { label: "Year-round", value: "YEAR_ROUND" },
];

type Resp = { travelInspirations: Inspiration[] };

export default async function InspirationsPage({
  searchParams,
}: {
  searchParams: { season?: string };
}) {
  const season = searchParams.season ?? "";
  let data: Resp | null = null;
  try {
    data = await gqlFetch<Resp>(INSPIRATIONS_QUERY, { season: season || null });
  } catch {
    data = { travelInspirations: [] };
  }
  const items = data?.travelInspirations ?? [];

  return (
    <>
      <section className="bg-ink text-cream">
        <div className="container-x py-20 md:py-28">
          <div className="eyebrow text-cream/70 mb-4">Travel Inspirations</div>
          <h1 className="font-serif text-5xl md:text-6xl leading-tight max-w-3xl">
            Stays worth planning the year around.
          </h1>
          <p className="mt-6 text-cream/80 max-w-2xl leading-relaxed">
            Curated itineraries, season by season — the moments our concierges
            recommend you book around.
          </p>
        </div>
      </section>

      <div className="border-b border-ink/10 sticky top-16 bg-cream z-30">
        <div className="container-x py-4 flex items-center gap-2 overflow-x-auto">
          {SEASONS.map((s) => {
            const active = season === s.value;
            return (
              <Link
                key={s.label}
                href={s.value ? `/inspirations?season=${s.value}` : "/inspirations"}
                className={`text-xs uppercase tracking-[0.18em] px-4 py-2 border whitespace-nowrap ${
                  active
                    ? "bg-ink text-cream border-ink"
                    : "border-ink/20 text-ink/70 hover:border-ink hover:text-ink"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="container-x py-16">
        {items.length === 0 ? (
          <div className="text-center py-20 text-ink/60">
            No inspirations in this season yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {items.map((item) => (
              <InspirationCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
