export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { gqlFetch } from "@/lib/graphql";
import { STORY_DETAIL_QUERY } from "@/lib/queries";
import type { Article } from "@/types/graphql";
import { imageUrl } from "@/lib/image";

type Resp = { article: Article | null };

export default async function StoryPage({ params }: { params: { slug: string } }) {
  const data = await gqlFetch<Resp>(STORY_DETAIL_QUERY, { slug: params.slug, locale: "en" });
  const a = data.article;
  if (!a) notFound();

  return (
          <>
            <article>
              <div
                      className="relative h-[60vh] min-h-[480px] text-cream overflow-hidden"
                      style={{ backgroundImage: `url('${imageUrl(a.heroImage.url, { w: 1920, h: 1080 })}')` }}
              >
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${imageUrl(a.heroImage.url, { w: 1920, h: 1080 })}')` }} />
                <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/40 to-ink/80" />
                <div className="container-x relative h-full flex flex-col justify-end pb-16 max-w-4xl">
                  <div className="eyebrow text-cream/80 mb-3">{a.category.replace(/_/g, " ").toLowerCase()} · {a.readTimeMinutes} min</div>
                  <h1 className="font-serif text-5xl md:text-7xl leading-[1.05]">{a.title.text}</h1>
                  {a.subtitle && <p className="text-xl text-cream/85 mt-5 max-w-2xl leading-relaxed">{a.subtitle.text}</p>}
                </div>
              </div>

              <div className="container-x py-16 grid md:grid-cols-12 gap-12">
                <aside className="md:col-span-3 md:sticky md:top-24 self-start text-sm">
                  <div className="flex items-start gap-3 mb-6">
                    <img
                            src={imageUrl(a.author.photoUrl, { w: 96, h: 96 })}
                            alt={a.author.name}
                            className="w-14 h-14 rounded-full object-cover border border-ink/10"
                    />
                    <div>
                      <div className="font-medium">{a.author.name}</div>
                      <div className="text-ink/60 text-xs">{a.author.title}</div>
                    </div>
                  </div>
                  {a.tags && a.tags.length > 0 && (
                          <div>
                            <div className="eyebrow mb-3">Tags</div>
                            <div className="flex flex-wrap gap-2">
                              {a.tags.map((t) => (
                                      <span key={t} className="text-xs px-2.5 py-1 border border-ink/20 text-ink/70">
                              {t}
                            </span>
                              ))}
                            </div>
                          </div>
                  )}
                </aside>

                <div className="md:col-span-9 prose-lg max-w-2xl">
                  <div className="font-serif text-xl leading-relaxed text-ink/85 mb-8 first-letter:text-6xl first-letter:float-left first-letter:font-serif first-letter:mr-3 first-letter:mt-1 first-letter:text-goldDeep">
                    {a.body?.text}
                  </div>
                  {a.relatedHotels && a.relatedHotels.length > 0 && (
                          <div className="mt-16 pt-8 border-t border-ink/10">
                            <div className="eyebrow mb-4">Stay here</div>
                            <div className="grid grid-cols-2 gap-4">
                              {a.relatedHotels.map((h) => (
                                      <Link key={h.id} href={`/hotels/${h.id}`} className="block border border-ink/15 p-4 hover:border-ink/40">
                                        <div className="font-serif text-lg group-hover:text-goldDeep">{h.name}</div>
                                      </Link>
                              ))}
                            </div>
                          </div>
                  )}
                </div>
              </div>
            </article>
          </>
  );
}
