export const dynamic = "force-dynamic";

import Link from "next/link";
import { gqlFetch } from "@/lib/graphql";
import { HOTELS_LIST_QUERY } from "@/lib/queries";
import type { Connection, HotelCard as HotelCardType } from "@/types/graphql";
import { HotelCard } from "@/components/HotelCard";

const CITY_FILTERS = [
  { label: "All hotels", value: "" },
  { label: "Paris", value: "Paris" },
  { label: "London", value: "London" },
  { label: "New York", value: "New York" },
  { label: "Tokyo", value: "Tokyo" },
  { label: "Dubai", value: "Dubai" },
];

type Resp = { hotels: Connection<HotelCardType> };

export default async function HotelsPage({
                                            searchParams,
                                          }: {
  searchParams: { city?: string };
}) {
  const city = searchParams.city ?? "";
  const data = await gqlFetch<Resp>(HOTELS_LIST_QUERY, {
    filter: city ? { query: city } : null,
  });

  const hotels = data.hotels.edges.map((e) => e.node);
  // Group by region for an editorial feel
  const groups = hotels.reduce<Record<string, HotelCardType[]>>((acc, h) => {
    const region = h.location?.address?.countryCode ?? "Other";
    (acc[region] ||= []).push(h);
    return acc;
  }, {});

  return (
          <>
            <section className="bg-ink text-cream">
              <div className="container-x py-20 md:py-28">
                <div className="eyebrow text-cream/70 mb-4">Hotels &amp; Destinations</div>
                <h1 className="font-serif text-5xl md:text-6xl leading-tight max-w-3xl">
                  Twelve hotels. One philosophy.
                </h1>
                <p className="mt-6 text-cream/80 max-w-2xl leading-relaxed">
                  From a single Parisian address in 1957 to flagship hotels across four continents — each Luxe
                  property speaks the language of its city.
                </p>
              </div>
            </section>

            <div className="border-b border-ink/10 bg-cream sticky top-16 z-30">
              <div className="container-x py-4 flex items-center gap-2 overflow-x-auto">
                {CITY_FILTERS.map((f) => {
                  const active = city === f.value;
                  return (
                          <Link
                                  key={f.label}
                                  href={f.value ? `/hotels?city=${encodeURIComponent(f.value)}` : "/hotels"}
                                  className={`text-xs uppercase tracking-[0.18em] px-4 py-2 border whitespace-nowrap ${
                                          active
                                                  ? "bg-ink text-cream border-ink"
                                                  : "border-ink/20 text-ink/70 hover:border-ink hover:text-ink"
                                  }`}
                          >
                            {f.label}
                          </Link>
                  );
                })}
                <span className="ml-auto text-xs text-ink/60">
              {data.hotels.totalCount} hotel{data.hotels.totalCount === 1 ? "" : "s"}
            </span>
              </div>
            </div>

            <div className="container-x py-16">
              {Object.entries(groups).map(([region, list]) => (
                      <section key={region} className="mb-20">
                        <h2 className="font-serif text-3xl md:text-4xl mb-8 border-b border-ink/10 pb-3">
                          {region === "Other" ? "Worldwide" : region}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                          {list.map((h) => (
                                  <HotelCard key={h.id} hotel={h} />
                          ))}
                        </div>
                      </section>
              ))}
              {hotels.length === 0 && (
                      <div className="text-center py-24 text-ink/60">
                        No hotels match that filter. Try another city.
                      </div>
              )}
            </div>
          </>
  );
}
