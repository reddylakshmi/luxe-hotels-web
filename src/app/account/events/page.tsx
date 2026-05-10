export const dynamic = "force-dynamic";

// /account/events — guest's RFP tracking surface.
//
// Sign-in gated. Lists `myRFPs` newest-first with a status timeline,
// preferred-hotels chips, and an inline expandable proposals panel
// (visible whenever the RFP has at least one RFPResponse). When the
// guest just submitted an RFP from the wizard the URL carries
// ?ref=<rfpNumber> and we pin the card with a celebratory banner.

import { redirect } from "next/navigation";
import Link from "next/link";
import { gqlFetchAuthed } from "@/lib/graphqlAuthed";
import { MY_RFPS_QUERY } from "@/lib/queries";
import { getSession } from "@/lib/authSession";
import { picker } from "@/lib/searchParams";
import {
  formatStayWindow,
  isRfpCancellable,
  labelEventType,
  labelRfpStatus,
  rfpStatusTone,
} from "@/lib/meetings";
import { formatAmount, parseMoneyAmount } from "@/lib/money";
import { AccountSidebar } from "@/components/AccountSidebar";
import { AccountBreadcrumb } from "@/components/AccountBreadcrumb";
import { RfpStatusTimeline } from "@/components/RfpStatusTimeline";
import { RfpCancelDialog } from "@/components/RfpCancelDialog";

type RfpResponse = {
  id: string;
  status: string;
  hotelId: string;
  hotel: { id: string; name: string };
  proposedRate: { amount: string; currency: string } | null;
  proposedFAndBMinimum: { amount: string; currency: string } | null;
  proposedRoomBlock: number | null;
  notes: string | null;
  respondedAt: string;
  validUntil: string | null;
};

type RfpNode = {
  id: string;
  rfpNumber: string;
  status: string;
  eventName: string;
  eventType: string;
  startDate: string;
  endDate: string;
  attendees: number;
  guestRoomsPerNight: number | null;
  submittedAt: string;
  updatedAt: string;
  preferredHotels: {
    id: string;
    name: string;
    location: { address: { city: string; countryCode: string } };
  }[];
  responses: RfpResponse[];
};

type Resp = {
  myRFPs: {
    totalCount: number;
    edges: { node: RfpNode }[];
  };
};

export default async function AccountEventsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = getSession();
  if (!session) redirect("/sign-in?returnTo=/account/events");

  const pick = picker(searchParams);
  const justSubmittedRef = pick("ref");

  let data: Resp | null;
  try {
    data = await gqlFetchAuthed<Resp>(MY_RFPS_QUERY, { first: 50 });
  } catch (err) {
    console.error("[events] MY_RFPS_QUERY failed", err);
    data = null;
  }
  const rfps = data?.myRFPs.edges.map((e) => e.node) ?? [];

  // Newest first by submittedAt (the resolver returns insertion order
  // which doesn't always match desired UX).
  const sorted = [...rfps].sort(
    (a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt),
  );
  const recent = justSubmittedRef
    ? sorted.find((r) => r.rfpNumber === justSubmittedRef)
    : null;

  return (
    <>
      <section className="bg-cream border-b border-ink/10">
        <div className="container-x py-10">
          <AccountBreadcrumb current="Events" />
          <div className="eyebrow mb-2">Events & RFPs</div>
          <h1 className="font-serif text-3xl md:text-4xl leading-tight">
            Your meeting and event proposals
          </h1>
          <p className="text-ink/70 text-sm mt-2 max-w-2xl">
            Every RFP you&rsquo;ve submitted, alongside hotel proposals and
            timeline. Cancel an in-flight RFP at any time before you accept a
            proposal.
          </p>
        </div>
      </section>

      {recent && (
        <section className="bg-emerald-50 border-b border-emerald-200">
          <div className="container-x py-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-900 mb-1">
                ✓ RFP submitted
              </div>
              <p className="text-sm text-emerald-900">
                <strong>{recent.rfpNumber}</strong> — {recent.eventName}. A
                planner will respond within one business day.
              </p>
            </div>
            <Link
              href="/meetings"
              className="text-sm text-emerald-900 underline hover:no-underline"
            >
              Browse more venues →
            </Link>
          </div>
        </section>
      )}

      <section className="container-x py-10">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-12">
          <AccountSidebar currentPath="/account/events" />
          <div>
            {sorted.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="space-y-6">
                {sorted.map((rfp) => (
                  <li key={rfp.id}>
                    <RfpCard rfp={rfp} pinned={rfp.rfpNumber === justSubmittedRef} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function EmptyState() {
  return (
    <div className="border border-ink/10 bg-white p-10 text-center">
      <h2 className="font-serif text-2xl mb-2">No RFPs yet</h2>
      <p className="text-ink/70 max-w-md mx-auto mb-5">
        Find a venue, request a proposal, and a Luxe planner replies within
        one business day.
      </p>
      <Link href="/meetings" className="btn-primary inline-block">
        Browse venues
      </Link>
    </div>
  );
}

function RfpCard({ rfp, pinned }: { rfp: RfpNode; pinned: boolean }) {
  const tone = rfpStatusTone(rfp.status);
  return (
    <article
      className={[
        "border bg-white",
        pinned ? "border-emerald-400" : "border-ink/10",
      ].join(" ")}
    >
      <header className="p-5 md:p-6 border-b border-ink/10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
            {rfp.rfpNumber} · {labelEventType(rfp.eventType)}
          </div>
          <h2 className="font-serif text-2xl leading-tight">{rfp.eventName}</h2>
          <p className="text-sm text-ink/65 mt-1">
            {formatStayWindow(rfp.startDate, rfp.endDate)} · {rfp.attendees} attendees
            {rfp.guestRoomsPerNight
              ? ` · ${rfp.guestRoomsPerNight} guest rooms / night`
              : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={rfp.status} tone={tone} />
          {isRfpCancellable(rfp.status) && (
            <RfpCancelDialog rfpId={rfp.id} eventName={rfp.eventName} />
          )}
        </div>
      </header>

      <div className="px-5 md:px-6 py-4 border-b border-ink/10">
        <RfpStatusTimeline status={rfp.status} />
      </div>

      <div className="p-5 md:p-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-2">
          Preferred hotels
        </div>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {rfp.preferredHotels.map((h) => (
            <Link
              key={h.id}
              href={`/hotels/${h.id}`}
              className="text-xs border border-ink/15 px-2.5 py-1 hover:border-goldDeep text-ink/80 hover:text-ink"
            >
              {h.name}
              <span className="text-ink/45">
                {" "}
                · {h.location.address.city}
              </span>
            </Link>
          ))}
        </div>

        {rfp.responses.length > 0 ? (
          <ResponsesPanel responses={rfp.responses} />
        ) : (
          <p className="text-sm text-ink/55">
            Awaiting hotel responses — usually within one business day.
          </p>
        )}
      </div>
    </article>
  );
}

function StatusBadge({ status, tone }: { status: string; tone: ReturnType<typeof rfpStatusTone> }) {
  const cls: Record<typeof tone, string> = {
    draft: "bg-ink/10 text-ink",
    active: "bg-amber-50 text-amber-900 border border-amber-200",
    won: "bg-emerald-50 text-emerald-900 border border-emerald-200",
    lost: "bg-red-50 text-red-900 border border-red-200",
    neutral: "bg-cream text-ink/70 border border-ink/15",
  };
  return (
    <span
      className={[
        "text-[10px] uppercase tracking-[0.2em] px-3 py-1",
        cls[tone],
      ].join(" ")}
    >
      {labelRfpStatus(status)}
    </span>
  );
}

function ResponsesPanel({ responses }: { responses: RfpResponse[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-2">
        Hotel proposals ({responses.length})
      </div>
      <ul className="border border-ink/10 divide-y divide-ink/10">
        {responses.map((r) => (
          <li
            key={r.id}
            className="p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3"
          >
            <div>
              <div className="font-medium">{r.hotel.name}</div>
              {r.notes && <p className="text-sm text-ink/70 mt-1">{r.notes}</p>}
              <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mt-2">
                Status: {r.status}
                {r.validUntil && (
                  <>
                    {" "}
                    · valid until{" "}
                    {new Date(r.validUntil).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </>
                )}
              </div>
            </div>
            <div className="text-right text-sm tabular-nums whitespace-nowrap">
              {r.proposedRate && (
                <div>
                  <span className="text-ink/55 text-xs">Room</span>{" "}
                  <strong>
                    {formatAmount(parseMoneyAmount(r.proposedRate), r.proposedRate.currency)}
                    /nt
                  </strong>
                </div>
              )}
              {r.proposedFAndBMinimum && (
                <div>
                  <span className="text-ink/55 text-xs">F&B min</span>{" "}
                  {formatAmount(
                    parseMoneyAmount(r.proposedFAndBMinimum),
                    r.proposedFAndBMinimum.currency,
                  )}
                </div>
              )}
              {r.proposedRoomBlock != null && (
                <div className="text-xs text-ink/55">
                  Room block: {r.proposedRoomBlock}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
