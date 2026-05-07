import Link from "next/link";
import { imageUrl } from "@/lib/image";
import type { Inspiration } from "@/types/graphql";

export function InspirationCard({ item }: { item: Inspiration }) {
  return (
          <Link href={`/inspirations/${item.slug}`} className="group block">
            <div className="relative aspect-[3/4] overflow-hidden">
              <img
                      src={imageUrl(item.heroImage?.url, { w: 800, h: 1100 })}
                      alt={item.title.text}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-cream">
                <div className="text-[10px] uppercase tracking-[0.2em] text-cream/80 mb-2">
                  {item.region} · {item.bestSeason.replace("_", " ").toLowerCase()}
                </div>
                <h3 className="font-serif text-2xl leading-tight">{item.title.text}</h3>
                {item.approxBudget && (
                        <div className="mt-2 text-xs text-cream/80">
                          From {Number(item.approxBudget.amount).toLocaleString()} {item.approxBudget.currency}
                          {" · "}
                          {item.recommendedDays} days
                        </div>
                )}
              </div>
            </div>
          </Link>
  );
}
