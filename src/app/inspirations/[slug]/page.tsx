export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { gqlFetch } from "@/lib/graphql";
import { INSPIRATIONS_QUERY } from "@/lib/queries";
import type { Inspiration } from "@/types/graphql";
import { imageUrl } from "@/lib/image";

type Resp = { travelInspirations: Inspiration[] };

export default async function InspirationDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  // The schema doesn't expose `inspiration(slug)` — fetch the full
  // list (capped at 20) and pick the matching slug. The list is small
  // by design and cached, so this is cheap.
  let item: Inspiration | undefined;
  try {
    const data = await gqlFetch<Resp>(INSPIRATIONS_QUERY, { season: null });
    item = data.travelInspirations.find((i) => i.slug === params.slug);
  } catch {
    // fall through to not-found
  }

  if (!item) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-serif text-3xl mb-4">Inspiration not found</h1>
        <p className="text-ink/60 mb-8">
          We couldn&apos;t load this travel idea.
        </p>
        <Link href="/inspirations" className="btn-primary inline-block">
          Browse all inspirations
        </Link>
      </div>
    );
  }

  return (
    <>
      <section className="relative">
        <div className="relative h-[60vh] min-h-[420px] w-full">
          <Image
            src={imageUrl(item.heroImage?.url, { w: 2000, h: 1200 })}
            alt={item.title.text}
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
          <div className="container-x absolute inset-x-0 bottom-0 pb-12 text-cream">
            <div className="eyebrow text-cream/80 mb-3">
              {item.region} · {item.bestSeason.replace("_", " ").toLowerCase()}
            </div>
            <h1 className="font-serif text-5xl md:text-6xl leading-tight max-w-3xl">
              {item.title.text}
            </h1>
            <p className="mt-6 text-cream/85 max-w-2xl leading-relaxed">
              {item.destination}
            </p>
          </div>
        </div>
      </section>

      <div className="container-x py-12 grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-2 space-y-6">
          <h2 className="font-serif text-3xl">Why we love it</h2>
          <p className="text-ink/80 leading-relaxed text-lg">
            {item.description.text}
          </p>
        </div>

        <aside className="md:col-span-1 space-y-6 text-sm">
          <div className="border border-ink/15 p-5">
            <div className="eyebrow mb-3">At a glance</div>
            <dl className="space-y-3">
              <div>
                <dt className="text-ink/55 text-xs uppercase tracking-wider">Destination</dt>
                <dd className="text-ink">{item.destination}</dd>
              </div>
              {item.region && (
                <div>
                  <dt className="text-ink/55 text-xs uppercase tracking-wider">Region</dt>
                  <dd className="text-ink">{item.region}</dd>
                </div>
              )}
              <div>
                <dt className="text-ink/55 text-xs uppercase tracking-wider">Best season</dt>
                <dd className="text-ink">
                  {item.bestSeason.replace("_", " ").toLowerCase()}
                </dd>
              </div>
              <div>
                <dt className="text-ink/55 text-xs uppercase tracking-wider">Suggested length</dt>
                <dd className="text-ink">{item.recommendedDays} days</dd>
              </div>
              {item.approxBudget && (
                <div>
                  <dt className="text-ink/55 text-xs uppercase tracking-wider">From</dt>
                  <dd className="text-ink">
                    {Number(item.approxBudget.amount).toLocaleString()} {item.approxBudget.currency}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {item.featuredHotels && item.featuredHotels.length > 0 && (
            <div className="border border-ink/15 p-5">
              <div className="eyebrow mb-3">Stay at</div>
              <ul className="space-y-2">
                {item.featuredHotels.map((h) => (
                  <li key={h.id}>
                    <Link href={`/hotels/${h.id}`} className="text-goldDeep underline hover:no-underline">
                      {h.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link href="/inspirations" className="block text-sm text-ink/60 hover:text-ink underline">
            ← Back to all inspirations
          </Link>
        </aside>
      </div>
    </>
  );
}
