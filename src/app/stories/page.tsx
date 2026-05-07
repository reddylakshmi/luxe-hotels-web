export const dynamic = "force-dynamic";

import { gqlFetch } from "@/lib/graphql";
import { STORIES_LIST_QUERY } from "@/lib/queries";
import type { Article, Connection } from "@/types/graphql";
import { StoryCard } from "@/components/StoryCard";
import Link from "next/link";

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "Destinations", value: "DESTINATION" },
  { label: "Food & Wine", value: "FOOD_AND_WINE" },
  { label: "Wellness", value: "WELLNESS" },
  { label: "Design", value: "DESIGN" },
  { label: "Culture", value: "CULTURE" },
  { label: "Family", value: "FAMILY" },
  { label: "Romance", value: "ROMANCE" },
  { label: "People", value: "PEOPLE" },
];

type Resp = { articles: Connection<Article> };

export default async function StoriesPage({
                                            searchParams,
                                          }: {
  searchParams: { category?: string };
}) {
  const category = searchParams.category ?? "";
  const data = await gqlFetch<Resp>(STORIES_LIST_QUERY, {
    category: category || null,
    locale: "en",
  });
  const articles = data.articles.edges.map((e) => e.node);

  return (
          <>
            <section className="bg-ink text-cream">
              <div className="container-x py-20 md:py-28">
                <div className="eyebrow text-cream/70 mb-4">The Luxe Magazine</div>
                <h1 className="font-serif text-5xl md:text-6xl leading-tight max-w-3xl">
                  Stories from the road.
                </h1>
                <p className="mt-6 text-cream/80 max-w-2xl leading-relaxed">
                  The places, the people, the rituals. Editorial reporting from the cities our hotels call home.
                </p>
              </div>
            </section>

            <div className="border-b border-ink/10 sticky top-16 bg-cream z-30">
              <div className="container-x py-4 flex items-center gap-2 overflow-x-auto">
                {CATEGORIES.map((c) => {
                  const active = category === c.value;
                  return (
                          <Link
                                  key={c.label}
                                  href={c.value ? `/stories?category=${c.value}` : "/stories"}
                                  className={`text-xs uppercase tracking-[0.18em] px-4 py-2 border whitespace-nowrap ${
                                          active
                                                  ? "bg-ink text-cream border-ink"
                                                  : "border-ink/20 text-ink/70 hover:border-ink hover:text-ink"
                                  }`}
                          >
                            {c.label}
                          </Link>
                  );
                })}
              </div>
            </div>

            <div className="container-x py-16">
              {articles.length === 0 ? (
                      <div className="text-center py-20 text-ink/60">No stories in this category yet.</div>
              ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
                        {articles.map((a) => (
                                <StoryCard key={a.id} article={a} />
                        ))}
                      </div>
              )}
            </div>
          </>
  );
}
