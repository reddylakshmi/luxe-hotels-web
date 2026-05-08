export const dynamic = "force-dynamic";

// Trips & Reservations.
//
// Two flavours, picked based on whether the guest is signed in:
//   • Signed in   — list every reservation on their account via the
//                   authed myReservations query.
//   • Signed out  — show a public "find your trip" form (confirmation
//                   number + optional last name) plus a sign-in CTA.

import Link from "next/link";
import { gqlFetchAuthed } from "@/lib/graphqlAuthed";
import { MY_RESERVATIONS_QUERY } from "@/lib/queries";
import { getSession } from "@/lib/authSession";
import type { Reservation } from "@/types/graphql";
import { TripCard } from "@/components/TripCard";
import { FindReservationForm } from "@/components/FindReservationForm";

type Resp = {
  myReservations: {
    totalCount: number;
    edges: { node: Reservation }[];
  };
};

export default async function TripsPage() {
  const session = getSession();

  if (!session) {
    return (
      <>
        <Hero
          eyebrow="Trips & Reservations"
          title="Find your booking"
          sub="Enter the confirmation number from your booking email."
        />
        <section className="container-x py-12 max-w-2xl">
          <FindReservationForm />
        </section>
      </>
    );
  }

  let data: Resp | null = null;
  let error: string | null = null;
  try {
    data = await gqlFetchAuthed<Resp>(MY_RESERVATIONS_QUERY, { first: 25 });
  } catch (e) {
    error = (e as Error).message;
  }

  const reservations = data?.myReservations.edges.map((e) => e.node) ?? [];
  const total = data?.myReservations.totalCount ?? 0;

  return (
    <>
      <Hero
        eyebrow="Trips"
        title={`Hi, ${session.guest.firstName}.`}
        sub={
          total === 0
            ? "You don't have any trips yet — let's plan one."
            : `${total} reservation${total === 1 ? "" : "s"} on your account.`
        }
      />
      <section className="container-x py-12">
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 mb-6">
            {error}
          </div>
        )}
        {!error && reservations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-ink/60 mb-6">
              When you make a booking, it will show up here automatically.
            </p>
            <Link href="/hotels" className="btn-primary px-6 py-2 inline-block">
              Browse hotels
            </Link>
          </div>
        )}
        <div className="flex flex-col gap-5">
          {reservations.map((r) => (
            <TripCard key={r.id} reservation={r} />
          ))}
        </div>
      </section>
    </>
  );
}

function Hero({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <section className="bg-ink text-cream">
      <div className="container-x py-12 md:py-16">
        <div className="eyebrow text-cream/70 mb-3">{eyebrow}</div>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-3">{title}</h1>
        <p className="text-cream/75 max-w-2xl">{sub}</p>
      </div>
    </section>
  );
}
