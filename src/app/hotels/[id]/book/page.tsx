export const dynamic = "force-dynamic";

// Placeholder "Complete Your Booking" page — landing target after the user
// picks a room+rate on /hotels/[id]/rates. The full guest details + payment
// form is a future iteration; for now we summarise the selection so the flow
// is testable end-to-end.

import Link from "next/link";
import { gqlFetch } from "@/lib/graphql";
import { HOTEL_DETAIL_QUERY } from "@/lib/queries";
import type { HotelDetail } from "@/types/graphql";

type Resp = { hotel: HotelDetail };

export default async function BookPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const pick = (k: string) =>
    Array.isArray(searchParams[k]) ? (searchParams[k] as string[])[0] : (searchParams[k] as string | undefined);

  const rateToken = pick("rateToken");
  const ratePlanCode = pick("ratePlanCode");
  const roomId = pick("roomId");
  const checkIn = pick("checkIn");
  const checkOut = pick("checkOut");
  const adults = pick("adults") ?? "1";
  const children = pick("children") ?? "0";

  let data: Resp | null = null;
  try {
    data = await gqlFetch<Resp>(HOTEL_DETAIL_QUERY, { id: params.id });
  } catch {
    // best-effort: still render the page so the user sees their selection
  }

  const hotel = data?.hotel;
  const room = hotel?.roomTypes.find((r) => r.id === roomId);

  const backToRates =
    `/hotels/${params.id}/rates?` +
    new URLSearchParams({
      checkIn: checkIn ?? "",
      checkOut: checkOut ?? "",
      adults,
      children,
    }).toString();

  return (
    <>
      <section className="bg-ink text-cream">
        <div className="container-x py-10 md:py-14">
          <div className="eyebrow text-cream/70 mb-2">Booking</div>
          <h1 className="font-serif text-3xl md:text-4xl">Complete Your Booking</h1>
          {hotel && (
            <p className="text-cream/70 mt-2">
              {hotel.name} · {hotel.location.address.city}
            </p>
          )}
        </div>
      </section>

      <section className="container-x py-12 grid md:grid-cols-[1.5fr_1fr] gap-10">
        <div>
          <h2 className="font-serif text-2xl mb-6">Guest Details</h2>
          <p className="text-ink/60 mb-8">
            The full booking form (guest information, payment, special requests) is the next step in this
            flow. For now this page confirms what you selected on the rates page.
          </p>
          <div className="border border-ink/10 bg-cream/40 p-6 text-sm">
            <p className="text-ink/70 mb-1">Selected rate token:</p>
            <code className="block font-mono text-xs break-all">{rateToken || "(none)"}</code>
          </div>
          <Link href={backToRates} className="inline-block mt-8 text-goldDeep underline hover:no-underline">
            ← Back to rates
          </Link>
        </div>

        <aside className="border border-ink/10 bg-cream p-6 h-fit">
          <h3 className="font-serif text-xl mb-4">Your Stay</h3>
          {hotel && (
            <div className="text-sm space-y-2">
              <div className="pb-3 border-b border-ink/10">
                <div className="text-[11px] uppercase tracking-[0.15em] text-ink/55 mb-1">Hotel</div>
                <div className="font-medium">{hotel.name}</div>
                {hotel.location.address.line1 && (
                  <div className="text-ink/60 text-xs">{hotel.location.address.line1}</div>
                )}
                <div className="text-ink/60 text-xs">
                  {hotel.location.address.city}
                  {hotel.location.address.countryCode ? `, ${hotel.location.address.countryCode}` : ""}
                </div>
              </div>
              {room && (
                <div className="pb-3 border-b border-ink/10">
                  <div className="text-[11px] uppercase tracking-[0.15em] text-ink/55 mb-1">Room</div>
                  <div className="font-medium">{room.name}</div>
                  <div className="text-ink/60 text-xs">
                    {room.bedConfiguration
                      .map((b) => `${b.count} ${b.type.toLowerCase().replace("_", " ")}`)
                      .join(", ")}
                  </div>
                </div>
              )}
              <div className="pb-3 border-b border-ink/10">
                <div className="text-[11px] uppercase tracking-[0.15em] text-ink/55 mb-1">Stay</div>
                <div>
                  {checkIn} → {checkOut}
                </div>
                <div className="text-ink/60 text-xs">
                  {adults} adult{adults === "1" ? "" : "s"}
                  {parseInt(children, 10) > 0 && `, ${children} children`}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-ink/55 mb-1">Rate plan</div>
                <div>{ratePlanCode}</div>
              </div>
            </div>
          )}
        </aside>
      </section>
    </>
  );
}
