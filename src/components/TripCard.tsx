// One reservation card — used in the My Trips list AND in the Find a
// Reservation result panel so both views render the same way.

import { fmtDate } from "@/lib/stay";
import { formatMoney } from "@/lib/money";
import type { Reservation } from "@/types/graphql";

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED:    "Confirmed",
  CHECKED_IN:   "Checked in",
  CHECKED_OUT:  "Checked out",
  CANCELLED:    "Cancelled",
  NO_SHOW:      "No show",
  PENDING:      "Pending",
};

const STATUS_TONE: Record<string, string> = {
  CONFIRMED:    "bg-emerald-50 text-emerald-800 border-emerald-200",
  CHECKED_IN:   "bg-amber-50 text-amber-800 border-amber-200",
  CHECKED_OUT:  "bg-ink/5 text-ink/70 border-ink/10",
  CANCELLED:    "bg-red-50 text-red-700 border-red-200",
  NO_SHOW:      "bg-red-50 text-red-700 border-red-200",
  PENDING:      "bg-ink/5 text-ink/70 border-ink/10",
};

export function TripCard({ reservation }: { reservation: Reservation }) {
  const r = reservation;
  const tone = STATUS_TONE[r.status] ?? STATUS_TONE.PENDING;
  return (
    <article className="border border-ink/10 bg-white p-6 md:p-8 grid md:grid-cols-[1.2fr_1fr] gap-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span
            className={`text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 border ${tone}`}
          >
            {STATUS_LABEL[r.status] ?? r.status}
          </span>
          <span className="text-xs text-ink/55">
            Confirmation · <strong className="font-mono">{r.confirmationNumber}</strong>
          </span>
        </div>
        <h3 className="font-serif text-2xl mb-1">{r.hotel.name}</h3>
        <p className="text-sm text-ink/60">
          {r.hotel.location.address.city}
          {r.hotel.location.address.countryCode ? `, ${r.hotel.location.address.countryCode}` : ""}
        </p>
        <p className="text-sm text-ink/70 mt-3">
          {r.roomType.name} · {r.adults} adult{r.adults === 1 ? "" : "s"}
          {r.children > 0 && `, ${r.children} child${r.children === 1 ? "" : "ren"}`}
        </p>
      </div>

      <div className="md:text-right space-y-2 md:border-l md:border-ink/10 md:pl-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">Stay</div>
          <div className="text-sm">
            {fmtDate(r.checkIn)} → {fmtDate(r.checkOut)}
          </div>
          <div className="text-xs text-ink/55">
            {r.nights} night{r.nights === 1 ? "" : "s"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">Total</div>
          <div className="font-serif text-xl">{formatMoney(r.rateBreakdown.totalDue)}</div>
          {r.isRefundable && (
            <div className="text-[11px] text-emerald-700">Fully refundable</div>
          )}
        </div>
        {r.canCheckInOnline && (
          <div className="text-[11px] text-ink/65 pt-1">
            ✓ Eligible for online check-in
          </div>
        )}
      </div>
    </article>
  );
}
