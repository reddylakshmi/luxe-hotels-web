export const dynamic = "force-dynamic";

// Meetings & Events discovery page. Editorial hero, then either:
//   • the empty state (when the URL carries no search) — three
//     value-prop cards inviting the visitor to start a search.
//   • a result grid (when the URL carries the trio of required params)
//     — capacity-fit ranked cards with deep links to venue detail.
//
// All search state lives in the URL so the back button + share link
// behave naturally and the page can stream cache-friendly server
// HTML on every navigation.

import Link from "next/link";
import { gqlFetch } from "@/lib/graphql";
import { MEETINGS_SEARCH_QUERY } from "@/lib/queries";
import { picker } from "@/lib/searchParams";
import {
  formatStayWindow,
  labelSetup,
  toSearchVariables,
  validateMeetingsSearch,
  type MeetingsSearchInput,
  type SetupStyle,
} from "@/lib/meetings";
import { MeetingsSearchBar } from "@/components/MeetingsSearchBar";
import { EventSpaceCard } from "@/components/EventSpaceCard";

type Hit = Parameters<typeof EventSpaceCard>[0]["hit"];
type Resp = { searchEventSpaces: { totalCount: number; results: Hit[] } };

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const pick = picker(searchParams);
  const startDate = pick("startDate") ?? "";
  const endDate = pick("endDate") ?? "";
  const attendeesRaw = pick("attendees");
  const attendees = attendeesRaw ? Number(attendeesRaw) : NaN;
  const setup = (pick("setup") ?? "") as SetupStyle | "";
  const hotelId = pick("hotelId");

  const partial: Partial<MeetingsSearchInput> = {
    startDate,
    endDate,
    attendees: Number.isFinite(attendees) ? attendees : undefined,
    setup: (setup || undefined) as MeetingsSearchInput["setup"],
  };
  const errors = validateMeetingsSearch(partial);
  const hasSearch = Object.keys(errors).length === 0;

  let resp: Resp | null = null;
  if (hasSearch) {
    const input = toSearchVariables(partial as MeetingsSearchInput);
    if (hotelId) input.hotelIds = [hotelId];
    try {
      resp = await gqlFetch<Resp>(MEETINGS_SEARCH_QUERY, { input });
    } catch (err) {
      console.error("[meetings] MEETINGS_SEARCH_QUERY failed", err);
    }
  }

  const carry: Record<string, string> = {};
  if (hasSearch) {
    carry.startDate = startDate;
    carry.endDate = endDate;
    carry.attendees = String(attendees);
    if (setup) carry.setup = setup;
  }

  return (
    <>
      {/* ── Editorial hero ──────────────────────────────────────── */}
      <section className="bg-ink text-cream">
        <div className="container-x py-12 md:py-16">
          <div className="eyebrow text-cream/70 mb-2">Meetings & Events</div>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight max-w-3xl">
            Plan a flawless gathering — from intimate boardroom days to grand
            ballroom galas.
          </h1>
          <p className="mt-3 text-cream/75 max-w-2xl">
            Tell us when, how many, and how you&rsquo;d like the room set —
            we&rsquo;ll surface every Luxe venue that fits, with capacity
            badges and full rate-card transparency. A dedicated planner
            replies to every RFP within one business day.
          </p>
        </div>
      </section>

      {/* ── Search bar ─────────────────────────────────────────── */}
      <section className="bg-cream border-b border-ink/10">
        <div className="container-x py-6">
          <MeetingsSearchBar
            initial={hasSearch ? (partial as MeetingsSearchInput) : undefined}
            hotelId={hotelId}
          />
          {hasSearch && (
            <p className="mt-3 text-xs text-ink/55">
              Showing venues for{" "}
              <strong className="text-ink">{formatStayWindow(startDate, endDate)}</strong> ·{" "}
              <strong className="text-ink">{attendees}</strong> attendees
              {setup && (
                <>
                  {" "}
                  · setup <strong className="text-ink">{labelSetup(setup)}</strong>
                </>
              )}
              {hotelId && (
                <>
                  {" "}
                  ·{" "}
                  <Link
                    href={`/meetings?${new URLSearchParams(carry).toString()}`}
                    className="underline hover:no-underline"
                  >
                    clear hotel filter
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      </section>

      {/* ── Body ───────────────────────────────────────────────── */}
      {!hasSearch ? (
        <EmptyState />
      ) : !resp ? (
        <ErrorState />
      ) : resp.searchEventSpaces.results.length === 0 ? (
        <NoResultsState />
      ) : (
        <section className="container-x py-10">
          <div className="text-sm text-ink/65 mb-5">
            {resp.searchEventSpaces.totalCount} venue
            {resp.searchEventSpaces.totalCount === 1 ? "" : "s"} match your brief
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resp.searchEventSpaces.results
              .slice()
              .sort((a, b) => b.matchScore - a.matchScore)
              .map((hit) => (
                <EventSpaceCard
                  key={`${hit.hotel.id}-${hit.space.id}`}
                  hit={hit}
                  attendees={attendees}
                  setup={setup ? (setup as SetupStyle) : undefined}
                  searchParams={carry}
                />
              ))}
          </div>
        </section>
      )}
    </>
  );
}

function EmptyState() {
  const cards = [
    {
      title: "Boardroom days",
      body: "10-30 attendees, full-day workshops, breakout coffee.",
      eg: "Try Pinnacle Sky Studio (NYC) or Bibliothèque Boardroom (Paris).",
    },
    {
      title: "Conferences",
      body: "100-500 attendees, multi-track plenary + breakouts, plated lunch.",
      eg: "Mayfair Grand Ballroom (London) and Salle Versailles (Paris) lead the field.",
    },
    {
      title: "Galas & weddings",
      body: "200-900 guests, reception + plated dinner, dance floor, stage.",
      eg: "Atlantis Royal Pavilion (Dubai) and Sakura Atrium (Tokyo) are unforgettable.",
    },
  ];
  return (
    <section className="container-x py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((c) => (
          <div key={c.title} className="border border-ink/10 bg-white p-6">
            <h2 className="font-serif text-2xl mb-2">{c.title}</h2>
            <p className="text-sm text-ink/75 mb-3">{c.body}</p>
            <p className="text-xs text-ink/55">{c.eg}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function NoResultsState() {
  return (
    <section className="container-x py-16 text-center">
      <h2 className="font-serif text-3xl mb-3">No venues match this brief</h2>
      <p className="text-ink/65 max-w-lg mx-auto">
        Try widening the layout or relaxing the headcount. Our planning team
        can also help match unusual specs — get in touch via any hotel
        concierge for a bespoke recommendation.
      </p>
    </section>
  );
}

function ErrorState() {
  return (
    <section className="container-x py-16 text-center">
      <h2 className="font-serif text-3xl mb-3">Something went wrong</h2>
      <p className="text-ink/65">
        We couldn&rsquo;t load venues right now. Please retry — or check back
        in a moment.
      </p>
    </section>
  );
}
