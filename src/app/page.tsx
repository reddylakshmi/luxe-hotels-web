export const dynamic = "force-dynamic";

import Link from "next/link";
import { gqlFetch } from "@/lib/graphql";
import { HOME_QUERY } from "@/lib/queries";
import type { HomeData } from "@/types/graphql";
import { Hero } from "@/components/Hero";
import { HotelCard } from "@/components/HotelCard";
import { StoryCard } from "@/components/StoryCard";
import { InspirationCard } from "@/components/InspirationCard";
import { DealCard } from "@/components/DealCard";

export default async function HomePage() {
  let data: HomeData | null = null;
  let error: string | null = null;
  try {
    data = await gqlFetch<HomeData>(HOME_QUERY);
  } catch (e) {
    error = (e as Error).message;
  }

  if (error) {
    return (
            <div className="container-x py-32 text-center">
              <h1 className="font-serif text-4xl mb-4">Hotels are quietly catching their breath.</h1>
              <p className="text-ink/70">
                The federated GraphQL router didn&apos;t respond. Make sure the backend stack is running on
                <code className="mx-1 px-2 py-0.5 bg-ink/5">http://localhost:4000/</code>
                — see the README for the start command.
              </p>
            </div>
    );
  }

  return (
          <>
            <Hero />

            {/* Featured hotels */}
            <section className="container-x py-24">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <div className="eyebrow mb-3">The Luxe Collection</div>
                  <h2 className="font-serif text-4xl md:text-5xl">Featured Hotels</h2>
                </div>
                <Link href="/hotels" className="text-sm hover:text-goldDeep">View all hotels →</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                {data!.featuredHotels.map((h) => (
                        <HotelCard key={h.id} hotel={h} />
                ))}
              </div>
            </section>

            {/* Brand story banner */}
            {data!.brandStory && (
                    <section className="bg-ink text-cream">
                      <div className="container-x py-24 grid md:grid-cols-12 gap-10">
                        <div className="md:col-span-5">
                          <div className="eyebrow text-cream/70 mb-4">Our Story</div>
                          <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-6">
                            {data!.brandStory.title.text}
                          </h2>
                          <p className="text-cream/80 leading-relaxed">{data!.brandStory.tagline.text}</p>
                          <Link href="/about" className="inline-block mt-8 text-sm border-b border-cream/30 pb-1 hover:border-cream">
                            Read the philosophy
                          </Link>
                        </div>
                        <div className="md:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-6">
                          {data!.brandStory.pillars.map((p) => (
                                  <div key={p.code} className="border-t border-cream/20 pt-5">
                                    <div className="eyebrow text-cream/70 mb-2">{p.code}</div>
                                    <h3 className="font-serif text-2xl mb-3 text-cream">{p.title.text}</h3>
                                    <p className="text-sm text-cream/70 leading-relaxed">{p.description.text}</p>
                                  </div>
                          ))}
                        </div>
                      </div>
                    </section>
            )}

            {/* Travel inspirations */}
            <section className="container-x py-24">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <div className="eyebrow mb-3">Inspirations</div>
                  <h2 className="font-serif text-4xl md:text-5xl">Where to next.</h2>
                </div>
                <Link href="/inspirations" className="text-sm hover:text-goldDeep">All inspirations →</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {data!.travelInspirations.map((i) => (
                        <InspirationCard key={i.id} item={i} />
                ))}
              </div>
            </section>

            {/* Active deals */}
            {data!.dealSpotlights.length > 0 && (
                    <section className="bg-sand">
                      <div className="container-x py-24">
                        <div className="flex items-end justify-between mb-12">
                          <div>
                            <div className="eyebrow mb-3">Member-favourite offers</div>
                            <h2 className="font-serif text-4xl md:text-5xl">Curated stays, gentler rates.</h2>
                          </div>
                          <Link href="/offers" className="text-sm hover:text-goldDeep">All offers →</Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {data!.dealSpotlights.slice(0, 4).map((d) => (
                                  <DealCard key={d.id} deal={d} />
                          ))}
                        </div>
                      </div>
                    </section>
            )}

            {/* Stories */}
            <section className="container-x py-24">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <div className="eyebrow mb-3">The Luxe Magazine</div>
                  <h2 className="font-serif text-4xl md:text-5xl">Stories from the road.</h2>
                </div>
                <Link href="/stories" className="text-sm hover:text-goldDeep">All stories →</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {data!.featuredArticles[0] && (
                        <div className="md:col-span-7">
                          <StoryCard article={data!.featuredArticles[0]} large />
                        </div>
                )}
                <div className="md:col-span-5 grid gap-8">
                  {data!.featuredArticles.slice(1, 4).map((a) => (
                          <div key={a.id} className="grid grid-cols-[140px_1fr] gap-4">
                            <Link href={`/stories/${a.slug}`} className="block aspect-[4/3] overflow-hidden">
                              <img
                                      src={`https://picsum.photos/seed/${a.slug}/400/300`}
                                      alt={a.title.text}
                                      className="w-full h-full object-cover"
                              />
                            </Link>
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.18em] text-goldDeep mb-1">
                                {a.category.replace(/_/g, " ").toLowerCase()}
                              </div>
                              <Link href={`/stories/${a.slug}`} className="font-serif text-lg leading-tight hover:text-goldDeep block mb-1">
                                {a.title.text}
                              </Link>
                              <div className="text-xs text-ink/60">{a.readTimeMinutes} min · {a.author.name}</div>
                            </div>
                          </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Member CTA */}
            <section className="bg-ink text-cream">
              <div className="container-x py-20 text-center">
                <div className="eyebrow text-cream/70 mb-3">Luxe Members</div>
                <h2 className="font-serif text-4xl md:text-5xl mb-4">Stay rewarded.</h2>
                <p className="text-cream/80 max-w-2xl mx-auto mb-8 leading-relaxed">
                  Earn points on every stay. Unlock suite upgrades, late checkouts, and the small touches that
                  define the difference between a good stay and a memorable one.
                </p>
                <Link href="/loyalty" className="btn-primary border-cream text-cream hover:border-goldDeep hover:bg-goldDeep">
                  Join Luxe Members
                </Link>
              </div>
            </section>
          </>
  );
}
