export const dynamic = "force-dynamic";

import { gqlFetch } from "@/lib/graphql";
import { OFFERS_QUERY } from "@/lib/queries";
import type { DealSpotlight } from "@/types/graphql";
import { DealCard } from "@/components/DealCard";

type Resp = { dealSpotlights: DealSpotlight[] };

export default async function OffersPage() {
  const data = await gqlFetch<Resp>(OFFERS_QUERY);
  const deals = data.dealSpotlights;

  return (
          <>
            <section className="bg-ink text-cream">
              <div className="container-x py-20 md:py-28">
                <div className="eyebrow text-cream/70 mb-4">Curated Offers</div>
                <h1 className="font-serif text-5xl md:text-6xl leading-tight max-w-3xl">
                  Gentler rates, considered stays.
                </h1>
                <p className="mt-6 text-cream/80 max-w-2xl leading-relaxed">
                  Member-favourite offers from across the Luxe collection. Limited windows, signature service.
                </p>
              </div>
            </section>

            <div className="container-x py-16 grid grid-cols-1 md:grid-cols-2 gap-8">
              {deals.map((d) => <DealCard key={d.id} deal={d} />)}
              {deals.length === 0 && (
                      <div className="md:col-span-2 text-center py-24 text-ink/60">
                        No active offers right now. Check back soon.
                      </div>
              )}
            </div>
          </>
  );
}
