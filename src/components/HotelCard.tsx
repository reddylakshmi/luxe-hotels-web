import Link from "next/link";
import { imageUrl } from "@/lib/image";
import type { HotelCard as HotelCardType } from "@/types/graphql";

export function HotelCard({ hotel }: { hotel: HotelCardType }) {
  const img = hotel.media?.edges?.[0]?.node?.url;
  const city = hotel.location?.address?.city ?? "";
  const country = hotel.location?.address?.countryCode ?? "";
  return (
    <article className="group bg-cream flex flex-col">
      {/* Image + meta both link to the hotel overview. The Book Now CTA
          below lives outside this Link so we don't nest <a> elements. */}
      <Link href={`/hotels/${hotel.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={imageUrl(img, { w: 800, h: 600 })}
            alt={hotel.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
          {hotel.brand?.tier && (
            <div className="absolute top-4 left-4 bg-cream/95 px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
              {hotel.brand.tier}
            </div>
          )}
        </div>
        <div className="pt-5 pb-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink/60 mb-2">
            {city}{country ? `, ${country}` : ""}
          </div>
          <h3 className="font-serif text-2xl leading-tight mb-2 group-hover:text-goldDeep">
            {hotel.name}
          </h3>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-gold">
              {Array.from({ length: hotel.starRating }).map((_, i) => (
                <span key={i}>★</span>
              ))}
            </div>
            {hotel.guestRating && (
              <span className="text-ink/70">
                {hotel.guestRating.overall.toFixed(1)} · {hotel.guestRating.count} reviews
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* "Book Now" deep-links to the Rooms & Suites tab. HotelTabs.tsx
          reads window.location.hash on mount, so the destination page
          opens with rooms already activated. */}
      <Link
        href={`/hotels/${hotel.id}#rooms`}
        aria-label={`Book ${hotel.name} — view rooms and suites`}
        className="btn-primary block text-center text-[11px] uppercase tracking-[0.2em] py-3"
      >
        Book Now
      </Link>
    </article>
  );
}
