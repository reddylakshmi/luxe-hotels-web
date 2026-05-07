import Link from "next/link";
import { imageUrl } from "@/lib/image";
import type { DealSpotlight } from "@/types/graphql";

export function DealCard({ deal }: { deal: DealSpotlight }) {
  const cities = deal.applicableHotels?.map((h) => h.location?.address?.city).filter(Boolean).slice(0, 3).join(", ");
  return (
          <article className="grid md:grid-cols-2 gap-0 bg-cream border border-ink/10 group hover:border-ink/30 transition-colors">
            <div className="relative aspect-[5/4] overflow-hidden">
              <img
                      src={imageUrl(deal.heroImage?.url, { w: 900, h: 720 })}
                      alt={deal.title.text}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              {deal.discountPercent != null && (
                      <div className="absolute top-4 left-4 bg-ink text-cream px-3 py-1.5 text-[11px] uppercase tracking-[0.18em]">
                        Save {deal.discountPercent.toFixed(0)}%
                      </div>
              )}
            </div>
            <div className="p-8 md:p-10 flex flex-col justify-center">
              <div className="eyebrow mb-3">
                {deal.promoCode ? `Code · ${deal.promoCode}` : "Limited offer"}
              </div>
              <h3 className="font-serif text-3xl leading-tight mb-3">{deal.title.text}</h3>
              <p className="text-ink/70 leading-relaxed mb-5">{deal.description.text}</p>
              {cities && <div className="text-xs text-ink/60 mb-6">{cities}</div>}
              <div>
                <Link href={deal.ctaUrl} className="btn-ghost">
                  {deal.ctaLabel.text}
                </Link>
              </div>
            </div>
          </article>
  );
}
