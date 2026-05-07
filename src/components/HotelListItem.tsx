// Media-left list-item card for the search results. Two-column horizontal
// layout: image on the left (~40%), details on the right.

import Link from "next/link";
import { imageUrl } from "@/lib/image";
import type { HotelCard } from "@/types/graphql";

export function HotelListItem({
                                hotel,
                                nights,
                                checkIn,
                                checkOut,
                                adults,
                              }: {
  hotel: HotelCard;
  nights: number;
  checkIn: string;
  checkOut: string;
  adults: number;
}) {
  const img = hotel.media?.edges?.[0]?.node?.url;
  const city = hotel.location?.address?.city;
  const country = hotel.location?.address?.countryCode;
  const lowest = hotel.availability?.lowestRate;
  const total = lowest && nights > 0 ? Number(lowest.amount) : null;
  const perNight = total !== null ? total / nights : null;

  const reservationLink = `/hotels/${hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`;

  const badges: string[] = [];
  if (hotel.hasFreeBreakfast) badges.push("Free breakfast");
  if (hotel.hasPool) badges.push("Pool");
  if (hotel.hasSpa) badges.push("Spa");
  if (hotel.petsAllowed) badges.push("Pets ok");
  if (hotel.hasGolf) badges.push("Golf");

  return (
          <article className="group bg-cream border border-ink/10 hover:border-ink/30 transition-colors">
            <div className="grid grid-cols-1 md:grid-cols-[42%_1fr]">
              {/* ── Media (left) ───────────────────────────────────────────── */}
              <Link href={reservationLink} className="block relative overflow-hidden md:min-h-[260px]">
                <img
                        src={imageUrl(img, { w: 800, h: 600 })}
                        alt={hotel.name}
                        className="w-full h-full object-cover aspect-[16/10] md:aspect-auto transition-transform duration-700 group-hover:scale-[1.04]"
                />
                {hotel.brand?.tier && (
                        <div className="absolute top-4 left-4 bg-cream/95 px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
                          {hotel.brand.tier}
                        </div>
                )}
              </Link>

              {/* ── Details (right) ────────────────────────────────────────── */}
              <div className="p-6 md:p-7 flex flex-col">
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-ink/60 mb-2">
                    {city}{country ? `, ${country}` : ""} · {hotel.brand?.name}
                  </div>
                  <Link href={reservationLink}>
                    <h3 className="font-serif text-2xl md:text-3xl leading-tight mb-3 hover:text-goldDeep">
                      {hotel.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-4 text-sm mb-3">
                    <div className="flex items-center gap-1 text-gold">
                      {Array.from({ length: hotel.starRating }).map((_, i) => <span key={i}>★</span>)}
                    </div>
                    {hotel.guestRating && (
                            <span className="text-ink/70">
                    <strong className="text-ink font-medium">
                      {hotel.guestRating.overall.toFixed(1)}
                    </strong>
                              {" · "}
                              {hotel.guestRating.count.toLocaleString()} reviews
                  </span>
                    )}
                  </div>
                  {badges.length > 0 && (
                          <ul className="flex flex-wrap gap-1.5 mb-4">
                            {badges.map((b) => (
                                    <li key={b}
                                        className="text-[10px] uppercase tracking-[0.15em] border border-ink/15 px-2 py-1 text-ink/70">
                                      {b}
                                    </li>
                            ))}
                          </ul>
                  )}
                </div>

                <div className="border-t border-ink/10 pt-4 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
                      {nights} night{nights === 1 ? "" : "s"} · {adults} adult{adults === 1 ? "" : "s"}
                    </div>
                    {perNight !== null && lowest ? (
                            <div className="text-ink">
                              <span className="font-serif text-3xl">
                                {Math.round(perNight).toLocaleString()}
                              </span>
                              <span className="text-ink/60 text-sm ml-1">{lowest.currency} / night</span>
                              <div className="text-xs text-ink/55">
                                {Math.round(total!).toLocaleString()} {lowest.currency} total
                              </div>
                            </div>
                    ) : (
                            <div className="text-sm text-ink/60">Rates available on inquiry.</div>
                    )}
                  </div>
                  <Link href={reservationLink} className="btn-primary text-xs px-5 py-2.5 whitespace-nowrap">
                    View rates
                  </Link>
                </div>
              </div>
            </div>
          </article>
  );
}
