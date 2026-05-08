export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { gqlFetch } from "@/lib/graphql";
import { HOTEL_DETAIL_QUERY } from "@/lib/queries";
import type { HotelDetail } from "@/types/graphql";
import { imageUrl } from "@/lib/image";
import { RecentlyViewedTracker } from "@/components/RecentlyViewedTracker";
import { HotelTabs } from "@/components/HotelTabs";
import type { HotelTabId } from "@/lib/hotelTabs";

type Resp = { hotel: HotelDetail | null };

export default async function HotelDetailPage({ params }: { params: { id: string } }) {
  const data = await gqlFetch<Resp>(HOTEL_DETAIL_QUERY, { id: params.id });
  const h = data.hotel;
  if (!h) notFound();

  const heroUrl = imageUrl(h.media?.edges?.[0]?.node?.url, { w: 1920, h: 1080 });
  const galleryUrls = h.media?.edges?.slice(1, 7).map((e) => imageUrl(e.node.url, { w: 600, h: 450 })) ?? [];
  const city = h.location.address.city ?? "";

  return (
          <>
            <RecentlyViewedTracker hotelId={h.id} />
            {/* Hero */}
            <section className="relative h-[70vh] min-h-[500px] text-cream overflow-hidden">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${heroUrl}')` }} />
              <div className="absolute inset-0 bg-gradient-to-b from-ink/20 via-ink/40 to-ink/80" />
              <div className="container-x relative h-full flex flex-col justify-end pb-20">
                <div className="eyebrow text-cream/80 mb-3">{h.brand.name}</div>
                <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] mb-3">{h.name}</h1>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-cream/85">
                  <span>{h.location.address.line1}, {city}</span>
                  <span className="flex gap-1 text-gold">{Array.from({ length: h.starRating }).map((_, i) => <span key={i}>★</span>)}</span>
                  {h.guestRating && <span>{h.guestRating.overall.toFixed(1)} · {h.guestRating.count} reviews</span>}
                </div>
              </div>
            </section>

            <HotelTabs
                    panels={buildHotelPanels(h, city, galleryUrls)}
                    primaryAction={
                      <Link href="#rooms" className="btn-primary text-xs px-4 py-2 whitespace-nowrap">
                        Book a Room
                      </Link>
                    }
            />
          </>
  );
}

/**
 * Build the five hotel-detail panels (overview / rooms / experiences /
 * meetings / location). Lives next to the page component because each
 * panel is tightly coupled to the HotelDetail type — splitting them into
 * separate files would require dragging the type along.
 */
function buildHotelPanels(
        h: HotelDetail,
        city: string,
        galleryUrls: string[],
): Record<HotelTabId, React.ReactNode> {
  return {
    overview: (
            <>
              <section className="container-x py-16 grid md:grid-cols-12 gap-12">
                <div className="md:col-span-7">
                  <div className="eyebrow mb-3">About this property</div>
                  <h2 className="font-serif text-4xl mb-5">A {h.brand.tier?.toLowerCase()} address in {city}.</h2>
                  <p className="text-ink/80 leading-relaxed mb-6">
                    {h.brand.tagline ?? `${h.name} brings the Luxe philosophy to ${city} — quiet rooms, considered service, and the rare details that locals notice.`}
                  </p>
                  <p className="text-ink/70 leading-relaxed">{h.brand.description}</p>
                </div>
                <aside className="md:col-span-5 bg-cream border border-ink/10 p-6">
                  <div className="eyebrow mb-4">Property facts</div>
                  <dl className="grid grid-cols-2 gap-y-4 text-sm">
                    <Fact label="Brand">{h.brand.name}</Fact>
                    <Fact label="Tier">{h.brand.tier?.toLowerCase()}</Fact>
                    <Fact label="Stars">{h.starRating}-star</Fact>
                    <Fact label="Total rooms">{h.totalRooms}</Fact>
                    {h.openedYear && <Fact label="Opened">{h.openedYear}</Fact>}
                    <Fact label="Spa">{h.hasSpa ? "Yes" : "—"}</Fact>
                    <Fact label="Pool">{h.hasPool ? "Yes" : "—"}</Fact>
                    <Fact label="Restaurants">{h.hasRestaurants ? "Yes" : "—"}</Fact>
                  </dl>
                </aside>
              </section>
              {galleryUrls.length > 0 && (
                      <section className="container-x mb-16">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                          {galleryUrls.map((url, i) => (
                                  <div key={i} className="relative aspect-square overflow-hidden">
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                  </div>
                          ))}
                        </div>
                      </section>
              )}
            </>
    ),
    rooms: (
            <section className="bg-sand">
              <div className="container-x py-16">
                <div className="eyebrow mb-3">Rooms &amp; Suites</div>
                <h2 className="font-serif text-4xl md:text-5xl mb-12">Choose your stay.</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {h.roomTypes.map((rt) => (
                          <article key={rt.id} className="bg-cream">
                            <div className="aspect-[4/3] overflow-hidden">
                              <img
                                      src={`https://picsum.photos/seed/${rt.id}/800/600`}
                                      alt={rt.name}
                                      className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="p-6">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-ink/60 mb-2">{rt.category}</div>
                              <h3 className="font-serif text-2xl mb-3">{rt.name}</h3>
                              <ul className="text-sm text-ink/70 space-y-1 mb-4">
                                <li>Sleeps {rt.maxOccupancy.adults} adults{rt.maxOccupancy.children > 0 ? ` + ${rt.maxOccupancy.children} children` : ""}</li>
                                {rt.sizeSqm && <li>{rt.sizeSqm} m²</li>}
                                {rt.view && <li>{rt.view} view</li>}
                                {rt.bedConfiguration?.[0] && (
                                        <li>{rt.bedConfiguration.map((b) => `${b.count} ${b.type.toLowerCase()}`).join(", ")} bed</li>
                                )}
                              </ul>
                              <Link
                                      href={`/hotels/${h.id}/rates?roomId=${rt.id}`}
                                      className="btn-ghost w-full text-xs"
                              >
                                Check rates
                              </Link>
                            </div>
                          </article>
                  ))}
                </div>
              </div>
            </section>
    ),
    experiences: (
            <section className="container-x py-16">
              <div className="eyebrow mb-3">Spa &amp; Wellness</div>
              <h2 className="font-serif text-4xl md:text-5xl mb-12">Stay, restored.</h2>
              {h.experiences && h.experiences.length > 0 ? (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {h.experiences.slice(0, 6).map((e) => (
                                <div key={e.id} className="border border-ink/10 p-6 hover:border-ink/30 transition-colors">
                                  <h3 className="font-serif text-xl mb-2">{e.name}</h3>
                                  <div className="text-sm text-ink/60 mb-3">
                                    {e.durationMinutes ? `${e.durationMinutes} min` : ""}
                                  </div>
                                  {e.pricePerPerson && (
                                          <div className="text-ink/80">
                                            From {Number(e.pricePerPerson.amount).toLocaleString()} {e.pricePerPerson.currency} per person
                                          </div>
                                  )}
                                </div>
                        ))}
                      </div>
              ) : (
                      <p className="text-ink/60">
                        No experiences are currently listed for this property. Reach out to the
                        concierge for in-room spa, dining, and bespoke arrangements.
                      </p>
              )}
            </section>
    ),
    meetings: (
            <section className="bg-ink text-cream">
              <div className="container-x py-16">
                <div className="eyebrow text-cream/70 mb-3">Meetings &amp; Events</div>
                <h2 className="font-serif text-4xl md:text-5xl mb-12">Spaces that hold a moment.</h2>
                {h.eventSpaces && h.eventSpaces.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {h.eventSpaces.slice(0, 6).map((s) => (
                                  <div key={s.id} className="border border-cream/15 p-6">
                                    <h3 className="font-serif text-xl mb-3 text-cream">{s.name}</h3>
                                    <ul className="space-y-1 text-sm text-cream/70">
                                      {s.capacityStyles.slice(0, 3).map((c) => (
                                              <li key={c.setup}>
                                                {c.setup.replace(/_/g, " ").toLowerCase()} — up to {c.capacity}
                                              </li>
                                      ))}
                                    </ul>
                                  </div>
                          ))}
                        </div>
                ) : (
                        <p className="text-cream/70">
                          No event spaces are listed for this property. The events team can
                          tailor private dining and group bookings on request.
                        </p>
                )}
              </div>
            </section>
    ),
    location: (
            <section className="container-x py-16">
              <div className="eyebrow mb-3">Location</div>
              <h2 className="font-serif text-4xl md:text-5xl mb-8">{city}, on its own terms.</h2>
              <div className="grid md:grid-cols-3 gap-8 text-sm">
                <div>
                  <div className="font-medium mb-2">Address</div>
                  <p className="text-ink/70 leading-relaxed">
                    {h.location.address.line1}<br />
                    {city}{h.location.address.state ? `, ${h.location.address.state}` : ""}<br />
                    {h.location.address.postalCode} {h.location.address.countryCode}
                  </p>
                </div>
                {h.contact?.phone && (
                        <div>
                          <div className="font-medium mb-2">Reservations</div>
                          <p className="text-ink/70">{h.contact.phone}</p>
                          {h.contact.email && <p className="text-ink/70">{h.contact.email}</p>}
                        </div>
                )}
                {h.location.coordinates && (
                        <div>
                          <div className="font-medium mb-2">Coordinates</div>
                          <p className="text-ink/70">
                            {h.location.coordinates.latitude.toFixed(4)}°,{" "}
                            {h.location.coordinates.longitude.toFixed(4)}°
                          </p>
                        </div>
                )}
              </div>
            </section>
    ),
  };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
          <>
            <dt className="text-ink/60">{label}</dt>
            <dd className="text-ink">{children}</dd>
          </>
  );
}
