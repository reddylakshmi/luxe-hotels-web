import Link from "next/link";
import { imageUrl } from "@/lib/image";
import type { Article } from "@/types/graphql";

export function StoryCard({ article, large = false }: { article: Article; large?: boolean }) {
  return (
          <Link href={`/stories/${article.slug}`} className="group block">
            <div
                    className={`relative overflow-hidden mb-4 ${
                            large ? "aspect-[16/10]" : "aspect-[4/3]"
                    }`}
            >
              <img
                      src={imageUrl(article.heroImage?.url, { w: large ? 1200 : 800, h: large ? 750 : 600 })}
                      alt={article.title.text}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            </div>
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-ink/60 mb-2">
              <span className="text-goldDeep">{article.category.replace(/_/g, " ").toLowerCase()}</span>
              <span>·</span>
              <span>{article.readTimeMinutes} min read</span>
            </div>
            <h3
                    className={`font-serif leading-tight mb-2 group-hover:text-goldDeep ${
                            large ? "text-3xl md:text-4xl" : "text-2xl"
                    }`}
            >
              {article.title.text}
            </h3>
            <p className="text-ink/70 text-sm leading-relaxed line-clamp-2">{article.excerpt.text}</p>
            <div className="text-xs text-ink/60 mt-3">By {article.author.name}</div>
          </Link>
  );
}
