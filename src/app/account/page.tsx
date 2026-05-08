// /account — read-only profile dashboard for signed-in guests.
//
// Sticky-sidebar layout with four anchored sections (Profile, Addresses,
// Payment methods, Recent trips) backed by a single federated query that
// fans out to the guest + reservations subgraphs in one round-trip.
//
// Anonymous visitors are redirected to /sign-in with a returnTo so the
// header link works as expected even when the cookie has expired.

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { gqlFetchAuthed } from "@/lib/graphqlAuthed";
import { MY_ACCOUNT_QUERY } from "@/lib/queries";
import { getSession } from "@/lib/authSession";
import type { GuestProfile, Reservation } from "@/types/graphql";
import { formatMemberSince } from "@/lib/account";
import { AccountSidebar } from "@/components/AccountSidebar";
import { AccountTrips } from "@/components/AccountSections";
import { ProfileEditor } from "@/components/ProfileEditor";
import { AddressesManager } from "@/components/AddressesManager";
import { PaymentsManager } from "@/components/PaymentsManager";

type Resp = {
  me: GuestProfile | null;
  myReservations: { totalCount: number; edges: { node: Reservation }[] };
};

export default async function AccountPage() {
  const session = getSession();
  if (!session) redirect("/sign-in?returnTo=/account");

  let data: Resp | null = null;
  let error: string | null = null;
  try {
    data = await gqlFetchAuthed<Resp>(MY_ACCOUNT_QUERY, { recentTripsLimit: 3 });
  } catch (e) {
    error = (e as Error).message;
  }

  if (error || !data?.me) {
    return (
      <>
        <Hero
          eyebrow="Account"
          title={`Hi, ${session.guest.firstName}.`}
          sub="We couldn't load your account just now."
        />
        <section className="container-x py-12">
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3">
            {error ?? "Profile unavailable."}
          </div>
        </section>
      </>
    );
  }

  const guest = data.me;
  const memberSince = formatMemberSince(guest.memberSince);
  const reservations = data.myReservations.edges.map((e) => e.node);
  const total = data.myReservations.totalCount;

  return (
    <>
      <Hero
        eyebrow="Account"
        title={`Hi, ${guest.name.firstName}.`}
        sub={memberSince ?? "Welcome back."}
        loyaltyNumber={guest.externalIds?.loyaltyNumber ?? null}
      />

      <div className="container-x py-12 md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-12">
        <AccountSidebar />

        <div className="flex flex-col gap-12 min-w-0 mt-8 md:mt-0">
          <ProfileEditor guest={guest} />
          <AddressesManager addresses={guest.addresses} />
          <PaymentsManager
            payments={guest.paymentMethods.edges.map((e) => e.node)}
          />
          <AccountTrips reservations={reservations} totalCount={total} />

          <p className="text-xs text-ink/45 mt-2">
            Need help with something we can&apos;t edit here?{" "}
            <Link href="/" className="underline hover:text-goldDeep">
              Contact your concierge
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}

function Hero({
  eyebrow,
  title,
  sub,
  loyaltyNumber,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  loyaltyNumber?: string | null;
}) {
  return (
    <section className="bg-ink text-cream">
      <div className="container-x py-12 md:py-16 flex flex-wrap items-end gap-x-12 gap-y-4">
        <div>
          <div className="eyebrow text-cream/70 mb-3">{eyebrow}</div>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-3">
            {title}
          </h1>
          <p className="text-cream/75 max-w-2xl">{sub}</p>
        </div>
        {loyaltyNumber && (
          <div className="ml-auto text-right">
            <div className="text-[10px] tracking-[0.3em] uppercase text-cream/55 mb-1">
              Loyalty
            </div>
            <div className="font-serif text-xl tracking-wide">{loyaltyNumber}</div>
          </div>
        )}
      </div>
    </section>
  );
}
