// Read-only display components for /account. Each section is a pure
// server component that takes already-shaped data — keeps the page-level
// orchestration simple and the sections individually swappable.
//
// Editing affordances are deliberately out of scope here; the schema's
// updateGuestProfile / addPaymentMethod mutations exist for a follow-up.

import Link from "next/link";
import type {
  GuestAddress,
  GuestProfile,
  PaymentMethodSummary,
  Reservation,
} from "@/types/graphql";
import {
  addressLabel,
  formatAddressLine,
  formatCardExpiry,
  isCardExpired,
  paymentLabel,
  sortPrimaryFirst,
} from "@/lib/account";

// ── Section shell ────────────────────────────────────────────────────────

function Section({
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 px-6 py-4 border-b border-ink/8 last:border-0">
      <dt className="text-xs uppercase tracking-[0.18em] text-ink/55 sm:w-44 sm:shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-ink/90">{value}</dd>
    </div>
  );
}

// ── Personal information ─────────────────────────────────────────────────

export function AccountInfo({ guest }: { guest: GuestProfile }) {
  const fullName = [guest.name.title, guest.name.firstName, guest.name.lastName]
    .filter(Boolean)
    .join(" ");
  const dob = guest.dateOfBirth
    ? new Date(guest.dateOfBirth).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC", // server returned a Date scalar (no time); avoid local-zone roll-back.
      })
    : "—";

  return (
    <Section id="profile" title="Profile" description="Your account essentials.">
      <dl>
        <Field label="Name" value={fullName || "—"} />
        <Field label="Email" value={guest.email} />
        <Field label="Phone" value={guest.phone || "—"} />
        <Field label="Date of birth" value={dob} />
        <Field label="Nationality" value={guest.nationality || "—"} />
        <Field
          label="Language"
          value={guest.languagePreference?.toUpperCase() || "—"}
        />
        <Field label="Currency" value={guest.currencyPreference || "—"} />
        <Field
          label="Loyalty number"
          value={guest.externalIds?.loyaltyNumber || "Not enrolled"}
        />
      </dl>
    </Section>
  );
}

// ── Addresses ────────────────────────────────────────────────────────────

export function AccountAddresses({ addresses }: { addresses: GuestAddress[] }) {
  const ordered = sortPrimaryFirst(addresses);
  const description =
    ordered.length === 0
      ? "Add an address to speed up future bookings."
      : `${ordered.length} on file.`;

  return (
    <Section id="addresses" title="Addresses" description={description}>
      {ordered.length === 0 ? (
        <EmptyState message="No addresses saved yet." />
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

// ── Payment methods ──────────────────────────────────────────────────────

export function AccountPayments({
  payments,
}: {
  payments: PaymentMethodSummary[];
}) {
  const ordered = sortPrimaryFirst(payments);
  const description =
    ordered.length === 0
      ? "Save a card to check out faster."
      : `${ordered.length} on file.`;

  return (
    <Section
      id="payment"
      title="Payment methods"
      description={description}
    >
      {ordered.length === 0 ? (
        <EmptyState message="No payment methods saved yet." />
      ) : (
        <ul>
          {ordered.map((p) => {
            const expired = isCardExpired(p.expiryMonth, p.expiryYear);
            return (
              <li
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 px-6 py-4 border-b border-ink/8 last:border-0"
              >
                <div className="text-sm text-ink/90 sm:w-60 sm:shrink-0 flex items-center gap-2">
                  <span className="font-medium">{paymentLabel(p.brand, p.lastFour)}</span>
                  {p.isDefault && (
                    <span className="inline-block px-1.5 py-0.5 text-[10px] tracking-[0.14em] bg-goldDeep/15 text-goldDeep rounded-sm">
                      DEFAULT
                    </span>
                  )}
                </div>
                <div className="text-sm text-ink/70 flex items-baseline gap-3">
                  <span>{p.holderName}</span>
                  <span aria-hidden className="text-ink/30">·</span>
                  <span className={expired ? "text-red-700" : ""}>
                    {expired ? "Expired " : "Expires "}
                    {formatCardExpiry(p.expiryMonth, p.expiryYear)}
                  </span>
                </div>
              </li>
            );
          })}
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-ink/55">{message}</div>
  );
}
