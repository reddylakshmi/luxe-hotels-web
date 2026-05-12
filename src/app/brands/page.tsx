// Catalog page — pure read of the brand list. 5-minute ISR with a
// `catalog:brands` cache tag lets a future admin mutation
// (revalidateTag('catalog:brands')) invalidate this in milliseconds
// instead of waiting for the TTL. No searchParams / authed data, so
// Next will reuse a single rendered HTML snapshot until the tag fires.
export const revalidate = 300;

import Link from "next/link";
import { gqlFetch } from "@/lib/graphql";
import { BRANDS_LIST_QUERY } from "@/lib/queries";
import type { Brand, Connection } from "@/types/graphql";
import { BrandLogo } from "@/components/BrandLogo";

type Resp = { brands: Connection<Brand> };

const TIER_ORDER: Record<string, number> = { LUXURY: 0, PREMIUM: 1, SELECT: 2 };

const TIER_COPY: Record<string, { eyebrow: string; tagline: string }> = {
  LUXURY:  { eyebrow: "The Luxury Collection",  tagline: "Iconic flagships across our most-loved cities." },
  PREMIUM: { eyebrow: "Premium",                tagline: "Elevated, considered stays for the way you travel today." },
  SELECT:  { eyebrow: "Select",                 tagline: "Modern, dependable hotels for every moment of the journey." },
};

export default async function BrandsPage() {
  const data = await gqlFetch<Resp>(BRANDS_LIST_QUERY, {}, {}, {
    revalidate: 300,
    tags: ["catalog:brands"],
  });
  const brands = data.brands.edges.map((e) => e.node);

  // Group by tier, sorted in our intended order.
  const byTier = brands.reduce<Record<string, Brand[]>>((acc, b) => {
    const t = b.tier ?? "OTHER";
    (acc[t] ||= []).push(b);
    return acc;
  }, {});
  const tiers = Object.keys(byTier).sort((a, b) => (TIER_ORDER[a] ?? 99) - (TIER_ORDER[b] ?? 99));

  return (
          <>
            <section className="bg-ink text-cream">
              <div className="container-x py-20 md:py-28">
                <div className="eyebrow text-cream/70 mb-4">The Luxe Family of Brands</div>
                <h1 className="font-serif text-5xl md:text-6xl leading-tight max-w-3xl">
                  {brands.length} brands. One shared philosophy.
                </h1>
                <p className="mt-6 text-cream/80 max-w-2xl leading-relaxed">
                  From iconic luxury palaces to modern wellness studios — every Luxe brand speaks the language of
                  its travellers. {data.brands.totalCount.toLocaleString()} brands, {brands
                          .reduce((sum, b) => sum + (b.numberOfProperties ?? 0), 0)
                          .toLocaleString()}{" "}
                  hotels worldwide.
                </p>
              </div>
            </section>

            {tiers.map((tier) => {
              const list = byTier[tier];
              const copy = TIER_COPY[tier] ?? { eyebrow: tier, tagline: "" };
              return (
                      <section key={tier} className="container-x py-16 border-b border-ink/10 last:border-b-0">
                        <div className="mb-10">
                          <div className="eyebrow mb-3">{copy.eyebrow}</div>
                          <h2 className="font-serif text-3xl md:text-4xl">{copy.tagline}</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12">
                          {list.map((b) => (
                                  <Link
                                          key={b.id}
                                          href={`/brands/${b.id}`}
                                          className="group block text-center"
                                  >
                                    <div className="flex justify-center mb-5 transition-transform duration-300 group-hover:-translate-y-1">
                                      <BrandLogo brand={b} size="lg" />
                                    </div>
                                    <div
                                            className="text-[10px] uppercase tracking-[0.2em] mb-1"
                                            style={{ color: b.accentColor ?? "#7a5a26" }}
                                    >
                                      {b.tier?.toLowerCase()}
                                    </div>
                                    <h3 className="font-serif text-xl group-hover:text-goldDeep">{b.name}</h3>
                                    {b.tagline && (
                                            <p className="text-sm text-ink/60 mt-1 leading-relaxed line-clamp-2">{b.tagline}</p>
                                    )}
                                    <div className="text-xs text-ink/50 mt-2">
                                      {(b.numberOfProperties ?? 0).toLocaleString()} hotel
                                      {(b.numberOfProperties ?? 0) === 1 ? "" : "s"}
                                    </div>
                                  </Link>
                          ))}
                        </div>
                      </section>
              );
            })}
          </>
  );
}
