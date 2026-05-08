// /trips/[id] — full reservation detail with status-aware actions.
//
// Fetched authed via the federated stack — the reservations subgraph
// gates `reservation(id:)` behind `auth.requireAuth()` + a guestId
// match, so we don't need to recheck ownership here. Anonymous visitors
// are redirected to /sign-in with a returnTo so the deep link survives.

export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { gqlFetchAuthed } from "@/lib/graphqlAuthed";
import { RESERVATION_DETAIL_QUERY } from "@/lib/queries";
import { getSession } from "@/lib/authSession";
import type { ReservationDetail, DigitalKey } from "@/types/graphql";
import { formatStayWindow, formatCancellationDeadline } from "@/lib/trip";
import { formatMoney } from "@/lib/money";

// UTC-stable Date-scalar formatter: the schema returns Date as
// "YYYY-MM-DD" with no timezone, and lib/stay's fmtDate formats in the
// viewer's local zone — fine for date pickers, off-by-one here for
// labels next to a UTC-formatted hero string.
function fmtDateUTC(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}
import { TripActions } from "@/components/TripActions";

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmed",
  MODIFIED: "Modified",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CANCELLED: "Cancelled",
  CANCELLED_WITH_FEE: "Cancelled (fee)",
  REFUND_PENDING: "Refund pending",
  NO_SHOW: "No show",
  PENDING_PAYMENT: "Pending payment",
};

const STATUS_TONE: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  MODIFIED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  CHECKED_IN: "bg-amber-50 text-amber-800 border-amber-200",
  CHECKED_OUT: "bg-ink/5 text-ink/70 border-ink/10",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED_WITH_FEE: "bg-red-50 text-red-700 border-red-200",
  REFUND_PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  NO_SHOW: "bg-red-50 text-red-700 border-red-200",
  PENDING_PAYMENT: "bg-ink/5 text-ink/70 border-ink/10",
};

const CANCELLABLE = new Set(["CONFIRMED", "MODIFIED", "PENDING_PAYMENT"]);

type Resp = { reservation: ReservationDetail | null };

export default async function TripDetailPage({ params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(`/trips/${params.id}`)}`);
  }

  let data: Resp | null = null;
  let error: string | null = null;
  try {
    data = await gqlFetchAuthed<Resp>(RESERVATION_DETAIL_QUERY, { id: params.id });
  } catch (e) {
    error = (e as Error).message;
  }

  if (error) {
    return (
      <ErrorShell firstName={session.guest.firstName} message={error} />
    );
  }
  if (!data?.reservation) {
    notFound();
  }

  const r = data.reservation;
  const tone = STATUS_TONE[r.status] ?? STATUS_TONE.CONFIRMED;
  const label = STATUS_LABEL[r.status] ?? r.status;
  const stayLine = formatStayWindow(r.checkIn, r.checkOut, r.nights);
  const cancellableNow = CANCELLABLE.has(r.status);
  const cancellationDeadline = formatCancellationDeadline(r.cancellationDeadline);

  return (
    <>
      {/* Hero */}
      <section className="bg-ink text-cream">
        <div className="container-x py-12 md:py-16">
          <div className="text-[11px] uppercase tracking-[0.3em] text-cream/65 mb-3">
            <Link href="/trips" className="hover:text-cream/90">My Trips</Link>
            <span className="mx-2 text-cream/40">/</span>
            <span className="text-cream/85">{r.confirmationNumber}</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-3">
            {r.hotel.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-cream/80">
            <span className={`text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 border ${tone}`}>
              {label}
            </span>
            <span>{stayLine}</span>
            {r.hotel.location.address.city && (
              <span className="text-cream/65">
                · {r.hotel.location.address.city}
                {r.hotel.location.address.countryCode ? `, ${r.hotel.location.address.countryCode}` : ""}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="container-x py-12 md:grid md:grid-cols-[minmax(0,1fr)_320px] md:gap-12">
        {/* Main */}
        <div className="space-y-12 min-w-0">
          {r.digitalKey && r.status === "CHECKED_IN" && (
            <DigitalKeyCard digitalKey={r.digitalKey} room={r.room?.number ?? null} />
          )}

          <StaySummary detail={r} />
          <SpecialRequestsSection requests={r.specialRequests} />
          <RateBreakdown detail={r} />
          {r.cancellation && <CancellationSummary cancellation={r.cancellation} />}
        </div>

        {/* Sticky action sidebar */}
        <aside className="md:sticky md:top-24 md:self-start mt-10 md:mt-0 space-y-4">
          <TripActions
            reservationId={r.id}
            canCheckInOnline={r.canCheckInOnline}
            isRefundable={r.isRefundable}
            isCancellable={cancellableNow}
          />
          {r.canModify && (
            <div className="text-xs text-ink/55 px-1">
              Need different dates or guests?{" "}
              <Link
                href={`/hotels/${r.hotel.id}#rooms`}
                className="underline hover:text-goldDeep"
              >
                Browse rooms
              </Link>{" "}
              and contact your concierge.
            </div>
          )}
          {cancellationDeadline && cancellableNow && (
            <p className="text-xs text-ink/55 px-1">
              Free cancellation {cancellationDeadline}.
            </p>
          )}
          {r.paymentSummary?.lastFour && (
            <div className="border-t border-ink/10 pt-4 text-xs text-ink/60 px-1">
              <div className="uppercase tracking-[0.18em] text-ink/45 mb-1 text-[10px]">
                Payment
              </div>
              {r.paymentSummary.brand} •••• {r.paymentSummary.lastFour}
              {r.paymentSummary.amount && (
                <>
                  {" · "}
                  <span className="text-ink/80">
                    {formatMoney(r.paymentSummary.amount)}
                  </span>
                </>
              )}
              {r.paymentSummary.status && (
                <span className="ml-1 text-ink/45">({r.paymentSummary.status.toLowerCase()})</span>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

// ── Sections ────────────────────────────────────────────────────────────

function StaySummary({ detail }: { detail: ReservationDetail }) {
  const r = detail;
  const guests = `${r.adults} adult${r.adults === 1 ? "" : "s"}${
    r.children > 0 ? `, ${r.children} child${r.children === 1 ? "" : "ren"}` : ""
  }`;
  return (
    <section>
      <h2 className="font-serif text-2xl mb-6">Your stay</h2>
      <dl className="bg-white border border-ink/10 rounded-sm">
        <Row label="Check-in" value={fmtDateUTC(r.checkIn)} />
        <Row label="Check-out" value={fmtDateUTC(r.checkOut)} />
        <Row label="Nights" value={r.nights} />
        <Row label="Guests" value={guests} />
        <Row label="Room type" value={r.roomType.name} />
        {r.room?.number && (
          <Row
            label="Room"
            value={[r.room.number, r.room.floor != null ? `floor ${r.room.floor}` : null]
              .filter(Boolean)
              .join(" · ")}
          />
        )}
        {r.loyaltyContext?.tier && (
          <Row
            label="Loyalty"
            value={`${r.loyaltyContext.tier}${
              r.loyaltyContext.pointsEarned ? ` · ${r.loyaltyContext.pointsEarned} pts earning` : ""
            }`}
          />
        )}
      </dl>
    </section>
  );
}

function SpecialRequestsSection({
  requests,
}: {
  requests: ReservationDetail["specialRequests"];
}) {
  if (!requests.length) return null;
  return (
    <section>
      <h2 className="font-serif text-2xl mb-6">Requests</h2>
      <ul className="bg-white border border-ink/10 rounded-sm">
        {requests.map((req) => (
          <li
            key={req.id}
            className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 px-6 py-4 border-b border-ink/8 last:border-0"
          >
            <div className="text-xs uppercase tracking-[0.18em] text-ink/55 sm:w-40 sm:shrink-0">
              {req.category.replace(/_/g, " ").toLowerCase()}
            </div>
            <div className="text-sm text-ink/90 flex-1">{req.request}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink/55">
              {req.status.toLowerCase()}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RateBreakdown({ detail }: { detail: ReservationDetail }) {
  const r = detail;
  return (
    <section>
      <h2 className="font-serif text-2xl mb-6">Charges</h2>
      <div className="bg-white border border-ink/10 rounded-sm">
        {r.rateBreakdown.lineItems.length > 0 && (
          <ul>
            {r.rateBreakdown.lineItems.map((li) => (
              <li
                key={li.id}
                className="flex items-baseline gap-4 px-6 py-3 border-b border-ink/8"
              >
                <div className="text-sm text-ink/90 flex-1">{li.description}</div>
                <div className="text-sm text-ink/85 tabular-nums whitespace-nowrap">
                  {formatMoney(li.amount)}
                </div>
              </li>
            ))}
          </ul>
        )}
        {r.rateBreakdown.taxesAndFees && (
          <div className="flex items-baseline gap-4 px-6 py-3 border-b border-ink/8">
            <div className="text-sm text-ink/70 flex-1">Taxes &amp; fees</div>
            <div className="text-sm text-ink/85 tabular-nums whitespace-nowrap">
              {formatMoney(r.rateBreakdown.taxesAndFees.total)}
            </div>
          </div>
        )}
        <div className="flex items-baseline gap-4 px-6 py-4">
          <div className="text-sm font-medium text-ink flex-1">Total</div>
          <div className="font-serif text-xl text-ink tabular-nums whitespace-nowrap">
            {formatMoney(r.rateBreakdown.totalDue)}
          </div>
        </div>
      </div>
    </section>
  );
}

function DigitalKeyCard({
  digitalKey,
  room,
}: {
  digitalKey: DigitalKey;
  room: string | null;
}) {
  return (
    <aside className="bg-ink text-cream rounded-sm p-6 md:p-8 flex flex-wrap items-end gap-x-8 gap-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cream/55 mb-1">
          Digital key
        </div>
        <div className="font-serif text-3xl tracking-wide">{digitalKey.keyCode}</div>
        <div className="text-sm text-cream/70 mt-1">
          {digitalKey.status === "ACTIVE" ? "Active" : digitalKey.status.toLowerCase()}
          {digitalKey.expiresAt && (
            <> · expires {new Date(digitalKey.expiresAt).toLocaleString("en-US", {
              month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
            })}</>
          )}
        </div>
      </div>
      {room && (
        <div className="ml-auto text-right">
          <div className="text-[10px] uppercase tracking-[0.3em] text-cream/55 mb-1">Room</div>
          <div className="font-serif text-2xl">{room}</div>
        </div>
      )}
    </aside>
  );
}

function CancellationSummary({
  cancellation,
}: {
  cancellation: NonNullable<ReservationDetail["cancellation"]>;
}) {
  return (
    <section>
      <h2 className="font-serif text-2xl mb-6">Cancellation</h2>
      <dl className="bg-white border border-ink/10 rounded-sm">
        <Row
          label="Cancelled"
          value={new Date(cancellation.cancelledAt).toLocaleString("en-US", {
            month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
          })}
        />
        {cancellation.reason && <Row label="Reason" value={cancellation.reason} />}
        {cancellation.refundAmount && (
          <Row label="Refund" value={formatMoney(cancellation.refundAmount)} />
        )}
        {cancellation.refundStatus && (
          <Row label="Refund status" value={cancellation.refundStatus.toLowerCase()} />
        )}
      </dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 px-6 py-4 border-b border-ink/8 last:border-0">
      <dt className="text-xs uppercase tracking-[0.18em] text-ink/55 sm:w-44 sm:shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-ink/90">{value}</dd>
    </div>
  );
}

function ErrorShell({ firstName, message }: { firstName: string; message: string }) {
  return (
    <>
      <section className="bg-ink text-cream">
        <div className="container-x py-12 md:py-16">
          <div className="text-[11px] uppercase tracking-[0.3em] text-cream/65 mb-3">
            <Link href="/trips" className="hover:text-cream/90">My Trips</Link>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-3">
            Hi, {firstName}.
          </h1>
          <p className="text-cream/75">We couldn&apos;t load that reservation.</p>
        </div>
      </section>
      <section className="container-x py-12">
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3">
          {message}
        </div>
      </section>
    </>
  );
}
