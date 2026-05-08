// Display-only sections + shared shell for /account. The editable
// sections (Profile, Payment) live in their own client-component files
// (ProfileEditor.tsx, PaymentsManager.tsx) and reuse the Section / Field
// / EmptyState helpers exported here.

import Link from "next/link";
import type { GuestAddress, Reservation } from "@/types/graphql";
import {
  addressLabel,
  formatAddressLine,
  sortPrimaryFirst,
} from "@/lib/account";

// ── Section shell (exported so the editable client components reuse it) ──

export function Section({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <header className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mb-6">
        <h2 className="font-serif text-2xl text-ink">{title}</h2>
        {description && <p className="text-sm text-ink/60">{description}</p>}
        {action && <div className="ml-auto">{action}</div>}
      </header>
      <div className="bg-white border border-ink/10 rounded-sm">{children}</div>
    </section>
  );
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 px-6 py-4 border-b border-ink/8 last:border-0">
      <dt className="text-xs uppercase tracking-[0.18em] text-ink/55 sm:w-44 sm:shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-ink/90">{value}</dd>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-ink/55">{message}</div>
  );
}

// Profile + payments live in their own client-component files
// (ProfileEditor / PaymentsManager) since they own edit state. The
// shared Section/Field/EmptyState helpers above are reused there.

// ── Addresses ────────────────────────────────────────────────────────────

export function AccountAddresses({ addresses }: { addresses: GuestAddress[] }) {
  const ordered = sortPrimaryFirst(addresses);
  const description =
    ordered.length === 0
      ? "Self-serve address editing is coming soon."
      : `${ordered.length} on file. Editing coming soon.`;

  return (
    <Section id="addresses" title="Addresses" description={description}>
      {ordered.length === 0 ? (
        <EmptyState message="No addresses on file yet." />
      ) : (
        <ul>
          {ordered.map((a) => (
            <li
              key={a.id}
              className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 px-6 py-4 border-b border-ink/8 last:border-0"
            >
              <div className="text-xs uppercase tracking-[0.18em] text-ink/55 sm:w-44 sm:shrink-0 flex items-center gap-2">
                <span>{addressLabel(a.type)}</span>
                {a.isPrimary && (
                  <span className="inline-block px-1.5 py-0.5 text-[10px] tracking-[0.14em] bg-goldDeep/15 text-goldDeep rounded-sm">
                    PRIMARY
                  </span>
                )}
              </div>
              <div className="text-sm text-ink/90">{formatAddressLine(a)}</div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ── Recent trips ─────────────────────────────────────────────────────────

export function AccountTrips({
  reservations,
  totalCount,
}: {
  reservations: Reservation[];
  totalCount: number;
}) {
  const description =
    totalCount === 0
      ? "Your bookings will show here."
      : `Showing ${reservations.length} of ${totalCount}.`;

  return (
    <Section
      id="trips"
      title="Recent trips"
      description={description}
      action={
        <Link
          href="/trips"
          className="text-sm text-goldDeep hover:underline whitespace-nowrap"
        >
          View all trips →
        </Link>
      }
    >
      {reservations.length === 0 ? (
        <EmptyState message="No trips yet — start planning one." />
      ) : (
        <ul>
          {reservations.map((r) => (
            <li
              key={r.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-6 py-4 border-b border-ink/8 last:border-0"
            >
              <div className="sm:w-48 sm:shrink-0">
                <div className="text-xs uppercase tracking-[0.18em] text-ink/55">
                  {r.status.replace(/_/g, " ")}
                </div>
                <div className="text-[11px] text-ink/45 mt-1">
                  {r.confirmationNumber}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif text-lg text-ink truncate">
                  {r.hotel.name}
                </div>
                <div className="text-xs text-ink/60">
                  {r.hotel.location.address.city}
                  {r.hotel.location.address.countryCode
                    ? `, ${r.hotel.location.address.countryCode}`
                    : ""}
                  {" · "}
                  {r.roomType.name} · {r.nights} {r.nights === 1 ? "night" : "nights"}
                </div>
              </div>
              <div className="text-sm text-ink/80 sm:text-right">
                <div>
                  {formatStayDates(r.checkIn, r.checkOut)}
                </div>
                <div className="text-xs text-ink/55 mt-1">
                  {r.rateBreakdown.totalDue.amount} {r.rateBreakdown.currency}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function formatStayDates(checkIn: string, checkOut: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(checkIn)} → ${fmt(checkOut)}`;
}
