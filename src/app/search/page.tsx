export const dynamic = "force-dynamic";

import Link from "next/link";
import { gqlFetch } from "@/lib/graphql";
import { SEARCH_HOTELS_QUERY } from "@/lib/queries";
import type { Connection, HotelCard as HotelCardType } from "@/types/graphql";
import { fromSearchParams, withDefaults, nightsBetween } from "@/lib/search";
import { SearchBar } from "@/components/SearchBar";
import { imageUrl } from "@/lib/image";

type Resp = { hotels: Connection<HotelCardType> };

const RESULTS_PER_PAGE = 60;

export default async function SearchPage({
                                           searchParams,
                                         }: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const input = withDefaults(fromSearchParams(searchParams));

  const filter: Record<string, unknown> = {};
  if (input.destination) filter.query = input.destination;
  if (input.brandId) filter.brandIds = [input.brandId];
  filter.checkIn = input.checkIn;
  filter.checkOut = input.checkOut;
  filter.adults = input.adults;

  let data: Resp | null = null;
  let error: string | null = null;
  try {
    data = await gqlFetch<Resp>(SEARCH_HOTELS_QUERY, {
      filter,
      first: RESULTS_PER_PAGE,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      adults: input.adults,
    });
  } catch (e) {
    error = (e as Error).message;
  }

  const hotels = data?.hotels.edges.map((e) => e.node) ?? [];
  const totalCount = data?.hotels.totalCount ?? 0;
  const nights = nightsBetween(input.checkIn, input.checkOut);

  return (
          <>
            {/* Re-show the search bar at the top so users can refine. */}
            <section className="bg-ink text-cream">
              <div className="container-x py-12 md:py-16">
                <div className="eyebrow text-cream/70 mb-3">Search results</div>
                <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-6">
                  {input.destination
                          ? `Hotels matching "${input.destination}"`
                          : input.brandId
                                  ? "Find a hotel"
                                  : "Find a hotel"}
                </h1>
                <SearchBar
                        theme="ink"
                        brandId={input.brandId || undefined}
                        defaults={{
                          destination: input.destination,
                          checkIn: input.checkIn,
                          checkOut: input.checkOut,
                          adults: input.adults,
                        }}
                />
                <div className="mt-4 text-sm text-cream/70">
                  {fmtDate(input.checkIn)} → {fmtDate(input.checkOut)} · {nights} night
                  {nights === 1 ? "" : "s"} · {input.adults} adult{input.adults === 1 ? "" : "s"}
                  {input.brandId && (
                          <>
                            {" · "}
                            <Link href={`/brands/${input.brandId}`} className="underline hover:no-underline">
                              Brand-scoped
                            </Link>
                          </>
                  )}
                </div>
              </div>
            </section>

            <div className="container-x py-12">
              {error && (
                      <div className="text-center py-20 text-ink/60">
                        Search couldn&apos;t complete — {error}
                      </div>
              )}
              {!error && hotels.length === 0 && (
                      <div className="text-center py-20 text-ink/60">
                        No matching hotels found. Try a different destination or clear the filters.
                      </div>
              )}
              {!error && hotels.length > 0 && (
                      <>
                        <div className="flex items-end justify-between mb-8">
                          <div>
                            <div className="eyebrow mb-2">Available stays</div>
                            <h2 className="font-serif text-3xl">
                              {hotels.length.toLocaleString()} of{" "}
                              {totalCount.toLocaleString()} hotel{totalCount === 1 ? "" : "s"} match
                            </h2>
                          </div>
                          <div className="text-xs text-ink/60">
                            Sorted by relevance · prices in hotel currency
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                          {hotels.map((h) => (
                                  <SearchResultCard
                                          key={h.id}
                                          hotel={h}
                                          nights={nights}
                                          checkIn={input.checkIn}
                                          checkOut={input.checkOut}
                                          adults={input.adults}
                                  />
                          ))}
                        </div>
                      </>
              )}
            </div>
          </>
  );
}

function SearchResultCard({
                            hotel,
                            nights,
                            checkIn,
                            checkOut,
                            adults,
                          }: {
  hotel: HotelCardType;
  nights: number;
  checkIn: string;
  checkOut: string;
  adults: number;
}) {
  const img = hotel.media?.edges?.[0]?.node?.url;
  const city = hotel.location?.address?.city;
  const country = hotel.location?.address?.countryCode;
  const lowest = hotel.availability?.lowestRate;
  const total = lowest && nights > 0 ? Number(lowest.amount) : null;
  const perNight = total !== null ? total / nights : null;

  const reservationLink = `/hotels/${hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`;

  return (
          <article className="group bg-cream">
            <Link href={reservationLink} className="block">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                        src={imageUrl(img, { w: 800, h: 600 })}
                        alt={hotel.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                {hotel.brand?.tier && (
                        <div className="absolute top-4 left-4 bg-cream/95 px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
                          {hotel.brand.tier}
                        </div>
                )}
              </div>
              <div className="pt-5 pb-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-ink/60 mb-2">
                  {city}{country ? `, ${country}` : ""}
                </div>
                <h3 className="font-serif text-2xl leading-tight mb-2 group-hover:text-goldDeep">
                  {hotel.name}
                </h3>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gold">
                    {Array.from({ length: hotel.starRating }).map((_, i) => <span key={i}>★</span>)}
                  </div>
                  {hotel.guestRating && (
                          <span className="text-ink/70">
                  {hotel.guestRating.overall.toFixed(1)} · {hotel.guestRating.count} reviews
                </span>
                  )}
                </div>
              </div>
            </Link>

            <div className="border-t border-ink/10 mt-3 pt-3 flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-ink/60 mb-1">
                  {nights} night{nights === 1 ? "" : "s"} · {adults} adult{adults === 1 ? "" : "s"}
                </div>
                {perNight !== null && lowest ? (
                        <div className="text-ink">
                          <span className="font-serif text-2xl">
                            {Math.round(perNight).toLocaleString()}
                          </span>
                          <span className="text-ink/60 text-sm ml-1">{lowest.currency} / night</span>
                          <div className="text-xs text-ink/60">
                            {Math.round(total!).toLocaleString()} {lowest.currency} total
                          </div>
                        </div>
                ) : (
                        <div className="text-sm text-ink/60">Rates available on inquiry.</div>
                )}
              </div>
              <Link href={reservationLink} className="btn-ghost text-xs px-4 py-2 whitespace-nowrap">
                View rates
              </Link>
            </div>
          </article>
  );
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
