export const dynamic = "force-dynamic";

import Link from "next/link";
import { gqlFetch } from "@/lib/graphql";
import { HOTELS_LIST_QUERY } from "@/lib/queries";
import type { Connection, HotelCard as HotelCardType } from "@/types/graphql";
import { HotelCard } from "@/components/HotelCard";
import { DestinationAutocomplete } from "@/components/DestinationAutocomplete";

type Resp = { hotels: Connection<HotelCardType> };

// Two-letter country code → display name + region.
const COUNTRY_NAMES: Record<string, { name: string; region: string }> = {
  US: { name: "United States", region: "Americas" },
  CA: { name: "Canada", region: "Americas" },
  MX: { name: "Mexico", region: "Americas" },
  BR: { name: "Brazil", region: "Americas" },
  AR: { name: "Argentina", region: "Americas" },
  CL: { name: "Chile", region: "Americas" },
  PE: { name: "Peru", region: "Americas" },
  GB: { name: "United Kingdom", region: "Europe" },
  FR: { name: "France", region: "Europe" },
  DE: { name: "Germany", region: "Europe" },
  IT: { name: "Italy", region: "Europe" },
  ES: { name: "Spain", region: "Europe" },
  PT: { name: "Portugal", region: "Europe" },
  NL: { name: "Netherlands", region: "Europe" },
  BE: { name: "Belgium", region: "Europe" },
  CH: { name: "Switzerland", region: "Europe" },
  AT: { name: "Austria", region: "Europe" },
  IE: { name: "Ireland", region: "Europe" },
  SE: { name: "Sweden", region: "Europe" },
  NO: { name: "Norway", region: "Europe" },
  DK: { name: "Denmark", region: "Europe" },
  FI: { name: "Finland", region: "Europe" },
  IS: { name: "Iceland", region: "Europe" },
  GR: { name: "Greece", region: "Europe" },
  HR: { name: "Croatia", region: "Europe" },
  PL: { name: "Poland", region: "Europe" },
  CZ: { name: "Czechia", region: "Europe" },
  HU: { name: "Hungary", region: "Europe" },
  JP: { name: "Japan", region: "Asia Pacific" },
  KR: { name: "South Korea", region: "Asia Pacific" },
  CN: { name: "China", region: "Asia Pacific" },
  HK: { name: "Hong Kong", region: "Asia Pacific" },
  TW: { name: "Taiwan", region: "Asia Pacific" },
  SG: { name: "Singapore", region: "Asia Pacific" },
  TH: { name: "Thailand", region: "Asia Pacific" },
  MY: { name: "Malaysia", region: "Asia Pacific" },
  ID: { name: "Indonesia", region: "Asia Pacific" },
  VN: { name: "Vietnam", region: "Asia Pacific" },
  PH: { name: "Philippines", region: "Asia Pacific" },
  IN: { name: "India", region: "Asia Pacific" },
  LK: { name: "Sri Lanka", region: "Asia Pacific" },
  AU: { name: "Australia", region: "Asia Pacific" },
  NZ: { name: "New Zealand", region: "Asia Pacific" },
  AE: { name: "United Arab Emirates", region: "Middle East & Africa" },
  SA: { name: "Saudi Arabia", region: "Middle East & Africa" },
  QA: { name: "Qatar", region: "Middle East & Africa" },
  OM: { name: "Oman", region: "Middle East & Africa" },
  IL: { name: "Israel", region: "Middle East & Africa" },
  JO: { name: "Jordan", region: "Middle East & Africa" },
  EG: { name: "Egypt", region: "Middle East & Africa" },
  MA: { name: "Morocco", region: "Middle East & Africa" },
  ZA: { name: "South Africa", region: "Middle East & Africa" },
  KE: { name: "Kenya", region: "Middle East & Africa" },
};

const REGION_ORDER = ["Americas", "Europe", "Asia Pacific", "Middle East & Africa"];

// Kept under the gateway's 2000-point query-complexity cap. Each hotel
// node in HOTELS_LIST_QUERY scores ~27 points, so first:300 blew the
// limit (~8100) and 500'd the page. 60 lands at ~1620 with headroom;
// the page already shows "first N of {totalCount}" so this degrades
// gracefully. Raise only alongside a lighter per-node selection.
const HOTELS_PER_PAGE = 60;

export default async function HotelsPage({
                                            searchParams,
                                          }: {
  searchParams: { city?: string; country?: string };
}) {
  const cityQuery = searchParams.city ?? "";
  const countryCode = (searchParams.country ?? "").toUpperCase();

  // Build the HotelFilter input. countryCodes is exact-match;
  // city is a free-text query (matches name or city).
  const filter: Record<string, unknown> = {};
  if (cityQuery) filter.query = cityQuery;
  if (countryCode) filter.countryCodes = [countryCode];

  const data = await gqlFetch<Resp>(HOTELS_LIST_QUERY, {
    filter: Object.keys(filter).length ? filter : null,
    first: HOTELS_PER_PAGE,
  });

  const hotels = data.hotels.edges.map((e) => e.node);

  // Group: country → city → hotels[]
  type ByCity = Record<string, HotelCardType[]>;
  type ByCountry = Record<string, ByCity>;

  const byCountry: ByCountry = {};
  const cityCounts: Record<string, number> = {}; // for header count
  for (const h of hotels) {
    const cc = h.location?.address?.countryCode ?? "—";
    const city = h.location?.address?.city ?? "—";
    (byCountry[cc] ??= {})[city] ??= [];
    byCountry[cc][city].push(h);
    cityCounts[`${cc}::${city}`] = (cityCounts[`${cc}::${city}`] ?? 0) + 1;
  }

  // Order countries: by region, then alphabetically by display name.
  const orderedCountryCodes = Object.keys(byCountry).sort((a, b) => {
    const ra = REGION_ORDER.indexOf(COUNTRY_NAMES[a]?.region ?? "");
    const rb = REGION_ORDER.indexOf(COUNTRY_NAMES[b]?.region ?? "");
    if (ra !== rb) return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
    const na = COUNTRY_NAMES[a]?.name ?? a;
    const nb = COUNTRY_NAMES[b]?.name ?? b;
    return na.localeCompare(nb);
  });

  // Group countries by region for the dropdown.
  const allCountryCodes = Object.keys(COUNTRY_NAMES).sort((a, b) => {
    const ra = REGION_ORDER.indexOf(COUNTRY_NAMES[a].region);
    const rb = REGION_ORDER.indexOf(COUNTRY_NAMES[b].region);
    if (ra !== rb) return ra - rb;
    return COUNTRY_NAMES[a].name.localeCompare(COUNTRY_NAMES[b].name);
  });

  const renderedCount = hotels.length;
  const totalCount = data.hotels.totalCount;

  return (
          <>
            <section className="bg-ink text-cream">
              <div className="container-x py-20 md:py-28">
                <div className="eyebrow text-cream/70 mb-4">Hotels &amp; Destinations</div>
                <h1 className="font-serif text-5xl md:text-6xl leading-tight max-w-3xl">
                  {totalCount.toLocaleString()} hotels.{" "}
                  {orderedCountryCodes.length} countries.
                </h1>
                <p className="mt-6 text-cream/80 max-w-2xl leading-relaxed">
                  From a single Parisian address in 1957 to a portfolio across four continents — every Luxe property
                  speaks the language of its city.
                </p>
              </div>
            </section>

            {/* Filter bar */}
            <div className="border-b border-ink/10 bg-cream sticky top-16 z-30">
              <div className="container-x py-4 flex items-center gap-3 flex-wrap">
                <form action="/hotels" className="flex items-center gap-3 flex-wrap">
                  <label className="text-xs uppercase tracking-[0.18em] text-ink/70">Country</label>
                  <select
                          name="country"
                          defaultValue={countryCode}
                          className="bg-cream border border-ink/20 px-3 py-2 text-sm pr-8 cursor-pointer hover:border-ink"
                  >
                    <option value="">All countries</option>
                    {REGION_ORDER.map((region) => (
                            <optgroup key={region} label={region}>
                              {allCountryCodes
                                      .filter((cc) => COUNTRY_NAMES[cc].region === region)
                                      .map((cc) => (
                                              <option key={cc} value={cc}>
                                                {COUNTRY_NAMES[cc].name}
                                              </option>
                                      ))}
                            </optgroup>
                    ))}
                  </select>

                  <label className="text-xs uppercase tracking-[0.18em] text-ink/70 ml-2">City / Hotel</label>
                  <DestinationAutocomplete
                          variant="inline"
                          name="city"
                          defaultValue={cityQuery}
                          placeholder="e.g. Paris, Maison Lumière…"
                  />

                  <button type="submit" className="btn-primary text-xs px-5 py-2">Apply</button>
                  {(countryCode || cityQuery) && (
                          <Link href="/hotels" className="text-xs text-ink/60 underline ml-2">
                            Clear
                          </Link>
                  )}
                </form>

                <span className="ml-auto text-xs text-ink/60">
              Showing {renderedCount.toLocaleString()} of {totalCount.toLocaleString()} hotel
                  {totalCount === 1 ? "" : "s"}
            </span>
              </div>
            </div>

            <div className="container-x py-16">
              {hotels.length === 0 ? (
                      <div className="text-center py-24 text-ink/60">
                        No hotels match that filter. Try clearing the search.
                      </div>
              ) : (
                      orderedCountryCodes.map((cc) => {
                        const cities = byCountry[cc];
                        const cityNames = Object.keys(cities).sort();
                        const countryName = COUNTRY_NAMES[cc]?.name ?? cc;
                        const countryHotelCount = Object.values(cities).reduce((n, list) => n + list.length, 0);
                        return (
                                <section key={cc} className="mb-20">
                                  <div className="flex items-end justify-between border-b border-ink/15 pb-3 mb-8">
                                    <div>
                                      <div className="eyebrow mb-1">
                                        {COUNTRY_NAMES[cc]?.region ?? "Worldwide"}
                                      </div>
                                      <h2 className="font-serif text-3xl md:text-4xl">{countryName}</h2>
                                    </div>
                                    <div className="text-sm text-ink/60">
                                      {countryHotelCount} hotel{countryHotelCount === 1 ? "" : "s"}
                                      {" · "}
                                      {cityNames.length} cit{cityNames.length === 1 ? "y" : "ies"}
                                    </div>
                                  </div>
                                  {cityNames.map((cityName) => (
                                          <div key={cityName} className="mb-12">
                                            <h3 className="font-serif text-xl mb-5 flex items-baseline gap-3">
                                              <span>{cityName}</span>
                                              <span className="text-xs text-ink/50 uppercase tracking-[0.15em]">
                                  {cities[cityName].length} hotel{cities[cityName].length === 1 ? "" : "s"}
                                </span>
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                                              {cities[cityName].map((h) => (
                                                      <HotelCard key={h.id} hotel={h} />
                                              ))}
                                            </div>
                                          </div>
                                  ))}
                                </section>
                        );
                      })
              )}

              {renderedCount < totalCount && (
                      <div className="mt-8 text-center text-sm text-ink/60">
                        Showing the first {renderedCount.toLocaleString()} hotels of {totalCount.toLocaleString()}.{" "}
                        Use the filters above to narrow your search.
                      </div>
              )}
            </div>
          </>
  );
}
