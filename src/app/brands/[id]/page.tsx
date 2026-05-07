export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { gqlFetch } from "@/lib/graphql";
import { BRAND_DETAIL_QUERY } from "@/lib/queries";
import type { BrandDetail, Connection, HotelCard as HotelCardType } from "@/types/graphql";
import { BrandLogo } from "@/components/BrandLogo";
import { HotelCard } from "@/components/HotelCard";
import { imageUrl } from "@/lib/image";

type Resp = {
  brand: BrandDetail | null;
  hotels: Connection<HotelCardType>;
};

export default async function BrandDetailPage({ params }: { params: { id: string } }) {
  const data = await gqlFetch<Resp>(BRAND_DETAIL_QUERY, { id: params.id });
  const brand = data.brand;
  if (!brand) notFound();

  const hotels = data.hotels.edges.map((e) => e.node);

  // Group by country code so the brand page reads like a portfolio map.
  const byCountry = hotels.reduce<Record<string, HotelCardType[]>>((acc, h) => {
    const c = h.location?.address?.countryCode ?? "—";
    (acc[c] ||= []).push(h);
    return acc;
  }, {});
  const countries = Object.keys(byCountry).sort();

  const accent = brand.accentColor ?? "#1a1a1a";

  return (
          <>
            {/* Brand hero */}
            <section className="relative overflow-hidden text-cream" style={{ backgroundColor: accent }}>
              <div
                      className="absolute inset-0 opacity-30 bg-cover bg-center mix-blend-multiply"
                      style={{
                        backgroundImage: `url('${imageUrl(brand.heroImageUrl, { w: 1920, h: 720 })}')`,
                      }}
              />
              <div className="container-x relative py-24 md:py-32 grid md:grid-cols-12 gap-10 items-end">
                <div className="md:col-span-8">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-cream/70 mb-4">
                    {brand.tier} · The Luxe Family
                  </div>
                  <h1 className="font-serif text-6xl md:text-7xl leading-[1.05] mb-5">{brand.name}</h1>
                  {brand.tagline && (
                          <p className="text-xl md:text-2xl text-cream/85 max-w-2xl leading-snug">
                            {brand.tagline}
                          </p>
                  )}
                </div>
                <div className="md:col-span-4 md:text-right">
                  <div className="flex md:justify-end mb-4">
                    <BrandLogo brand={brand} size="lg" />
                  </div>
                  <div className="text-cream/80 space-y-1 text-sm">
                    <div>
                      <span className="font-semibold text-cream">{brand.numberOfProperties?.toLocaleString()}</span>{" "}
                      hotels worldwide
                    </div>
                    <div>
                      <span className="font-semibold text-cream">{countries.length}</span> countries
                    </div>
                    {brand.loyaltyPointsMultiplier && (
                            <div>
                              <span className="font-semibold text-cream">{brand.loyaltyPointsMultiplier}×</span>{" "}
                              points multiplier
                            </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* About */}
            {brand.description && (
                    <section className="container-x py-20 grid md:grid-cols-12 gap-10">
                      <div className="md:col-span-4">
                        <div className="eyebrow mb-3">About the brand</div>
                        <h2 className="font-serif text-4xl">A signature of the Luxe family.</h2>
                      </div>
                      <div className="md:col-span-8 text-ink/80 leading-relaxed text-lg">
                        {brand.description}
                        {brand.sustainabilityCommitment && (
                                <p className="mt-6 text-base text-ink/70">{brand.sustainabilityCommitment}</p>
                        )}
                      </div>
                    </section>
            )}

            {/* Featured hotels */}
            {brand.featuredHotels && brand.featuredHotels.length > 0 && (
                    <section className="bg-sand">
                      <div className="container-x py-20">
                        <div className="eyebrow mb-3" style={{ color: accent }}>Signature properties</div>
                        <h2 className="font-serif text-4xl md:text-5xl mb-12">Featured hotels.</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                          {brand.featuredHotels.slice(0, 6).map((h) => (
                                  <HotelCard key={h.id} hotel={h} />
                          ))}
                        </div>
                      </div>
                    </section>
            )}

            {/* Full portfolio, grouped by country */}
            <section className="container-x py-20">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <div className="eyebrow mb-3">The portfolio</div>
                  <h2 className="font-serif text-4xl md:text-5xl">Hotels across {countries.length} countries.</h2>
                </div>
                <div className="text-sm text-ink/60">
                  Showing {hotels.length} of {data.hotels.totalCount.toLocaleString()}
                </div>
              </div>

              {countries.map((cc) => (
                      <div key={cc} className="mb-14">
                        <h3 className="font-serif text-2xl border-b border-ink/15 pb-2 mb-6">{cc}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                          {byCountry[cc].map((h) => (
                                  <HotelCard key={h.id} hotel={h} />
                          ))}
                        </div>
                      </div>
              ))}

              <div className="mt-12 text-center">
                <Link href="/brands" className="btn-ghost">View all brands</Link>
              </div>
            </section>
          </>
  );
}
