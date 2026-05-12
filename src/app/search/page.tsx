export const dynamic = "force-dynamic";

import Link from "next/link";
import { gqlFetch } from "@/lib/graphql";
import { SEARCH_HOTELS_QUERY } from "@/lib/queries";
import type { Brand, Connection, HotelCard as HotelCardType, HotelFacets } from "@/types/graphql";
import { fromSearchParams, withDefaults } from "@/lib/search";
import { fmtDate } from "@/lib/stay";
import { SearchBar } from "@/components/SearchBar";
import { FilterBar } from "@/components/FilterBar";
import { HotelListItem } from "@/components/HotelListItem";
import { SortDropdown } from "@/components/SortDropdown";

type Resp = {
  hotels: Connection<HotelCardType>;
  brands: { edges: { node: Brand }[] };
  facets: HotelFacets;
};

const RESULTS_PER_PAGE = 60;

export default async function SearchPage({
                                           searchParams,
                                         }: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const input = withDefaults(fromSearchParams(searchParams));

  // Build the federated HotelFilter input — only include keys the user
  // actually picked so the URL → API contract stays predictable.
  const filter: Record<string, unknown> = {};
  if (input.destination) filter.query = input.destination;
  if (input.brandId) filter.brandIds = [input.brandId];
  else if (input.brandIds?.length) filter.brandIds = input.brandIds;
  if (input.brandTiers?.length) filter.brandTiers = input.brandTiers;
  if (input.minStarRating) filter.minStarRating = input.minStarRating;
  if (input.minGuestRating) filter.minGuestRating = input.minGuestRating;
  if (input.hasPool) filter.hasPool = true;
  if (input.hasSpa) filter.hasSpa = true;
  if (input.hasGolf) filter.hasGolf = true;
  if (input.hasFreeBreakfast) filter.hasFreeBreakfast = true;
  if (input.petsAllowed) filter.petsAllowed = true;
  if (input.minNightlyRate != null) filter.minNightlyRate = input.minNightlyRate;
  if (input.maxNightlyRate != null) filter.maxNightlyRate = input.maxNightlyRate;
  filter.checkIn = input.checkIn;
  filter.checkOut = input.checkOut;
  filter.adults = input.adults;
  if (input.children > 0) filter.children = input.children;

  let data: Resp | null = null;
  let error: string | null = null;
  try {
    data = await gqlFetch<Resp>(SEARCH_HOTELS_QUERY, {
      filter,
      first: RESULTS_PER_PAGE,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      adults: input.adults,
      children: input.children,
      sortBy: input.sortBy ?? null,
    });
  } catch (e) {
    error = (e as Error).message;
  }

  const hotels = data?.hotels.edges.map((e) => e.node) ?? [];
  const totalCount = data?.hotels.totalCount ?? 0;
  const allBrands = data?.brands.edges.map((e) => e.node) ?? [];
  const facets = data?.facets;

  return (
          <>
            {/* Refinement search bar — full variant on the results page */}
            <section className="bg-ink text-cream">
              <div className="container-x py-12 md:py-16">
                <div className="eyebrow text-cream/70 mb-3">Search results</div>
                <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-6">
                  {input.destination ? `Hotels matching "${input.destination}"` : "Find a hotel"}
                </h1>
                <SearchBar
                        theme="ink"
                        variant="full"
                        brandId={input.brandId || undefined}
                        defaults={{
                          destination: input.destination,
                          checkIn: input.checkIn,
                          checkOut: input.checkOut,
                          nights: input.nights,
                          rooms: input.rooms,
                          adults: input.adults,
                          children: input.children,
                          childAges: input.childAges,
                        }}
                />
                <div className="mt-4 text-sm text-cream/70 flex flex-wrap gap-x-2 gap-y-1">
              <span>
                {fmtDate(input.checkIn)} → {fmtDate(input.checkOut)} · {input.nights} night
                {input.nights === 1 ? "" : "s"}
              </span>
                  <span aria-hidden>·</span>
                  <span>
                {input.adults} adult{input.adults === 1 ? "" : "s"}
                    {input.children > 0 && (
                            <>
                              {" · "}
                              {input.children} child{input.children === 1 ? "" : "ren"} (ages{" "}
                              {input.childAges.join(", ")})
                            </>
                    )}
                    {" · "}
                    {input.rooms} room{input.rooms === 1 ? "" : "s"}
              </span>
                  {input.brandId && (
                          <>
                            <span aria-hidden>·</span>
                            <Link href={`/brands/${input.brandId}`} className="underline hover:no-underline">
                              Brand-scoped
                            </Link>
                          </>
                  )}
                </div>
              </div>
            </section>

            <FilterBar active={input} brands={allBrands} facets={facets} />

            <div className="container-x py-12">
              {error && (
                      <div className="text-center py-20 text-ink/60">
                        Search couldn&apos;t complete — {error}
                      </div>
              )}
              {!error && hotels.length === 0 && (
                      <div className="text-center py-20 text-ink/60">
                        No matching hotels found. Try clearing some filters.
                      </div>
              )}
              {!error && hotels.length > 0 && (
                      <>
                        {/* Header row spans the full result-list width — sort
                            dropdown sits flush against the right edge of the cards. */}
                        <div className="mb-8 flex items-center justify-between gap-6 flex-wrap">
                          <div>
                            <div className="eyebrow mb-2">Available stays</div>
                            <h2 className="font-serif text-3xl">
                              {hotels.length.toLocaleString()} of{" "}
                              {totalCount.toLocaleString()} hotel{totalCount === 1 ? "" : "s"} match
                            </h2>
                          </div>
                          <SortDropdown
                                  currentSortBy={input.sortBy}
                                  currentSearchParams={searchParams}
                          />
                        </div>

                        <div className="flex flex-col gap-6">
                          {hotels.map((h) => (
                                  <HotelListItem
                                          key={h.id}
                                          hotel={h}
                                          nights={input.nights}
                                          stay={{
                                            checkIn: input.checkIn,
                                            checkOut: input.checkOut,
                                            nights: input.nights,
                                          }}
                                          guests={{
                                            rooms: input.rooms,
                                            adults: input.adults,
                                            children: input.children,
                                            childAges: input.childAges,
                                          }}
                                  />
                          ))}
                        </div>
                      </>
              )}
            </div>
          </>
  );
}
