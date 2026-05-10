export const dynamic = "force-dynamic";

// Five-step Request a Proposal wizard. Sign-in required: anonymous
// visitors are redirected to /sign-in with a returnTo back to this
// URL (carrying the search context as searchParams). Once signed in,
// the page seeds the wizard with:
//   • the chosen hotel + space (URL params),
//   • the planner's contact details from ME_PROFILE_QUERY (so they
//     don't retype name / email / phone),
//   • the search context (dates / headcount / setup) when present.
// All wizard mutation lives client-side in `RfpWizard`.

import { redirect } from "next/navigation";
import Link from "next/link";
import { gqlFetchAuthed } from "@/lib/graphqlAuthed";
import { gqlFetch } from "@/lib/graphql";
import { ME_PROFILE_QUERY, EVENT_SPACE_DETAIL_QUERY } from "@/lib/queries";
import { getSession } from "@/lib/authSession";
import { picker } from "@/lib/searchParams";
import {
  formatStayWindow,
  labelSetup,
  type RfpDraft,
  type SetupStyle,
} from "@/lib/meetings";
import { BrandLogo } from "@/components/BrandLogo";
import { RfpWizard, type WizardSeed } from "@/components/RfpWizard";

type ProfileResp = {
  me: {
    name: { firstName: string; lastName: string };
    email: string;
    phone: string | null;
  } | null;
};

type DetailResp = {
  eventSpace: { id: string; name: string; hotelId: string } | null;
  hotel: { id: string; name: string; brand: { id: string; name: string; tier: string; accentColor: string | null } } | null;
};

export default async function RfpPage({
  params,
  searchParams,
}: {
  params: { hotelId: string; spaceId: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const pick = picker(searchParams);
  const startDate = pick("startDate") ?? "";
  const endDate = pick("endDate") ?? "";
  const attendeesRaw = pick("attendees");
  const attendees = attendeesRaw ? Number(attendeesRaw) : 0;
  const setup = (pick("setup") ?? "") as SetupStyle | "";

  // Carry every non-empty search param into the returnTo so the
  // sign-in round-trip lands the guest back on the same wizard URL
  // with the same inferred initial values.
  const carry = new URLSearchParams();
  if (startDate) carry.set("startDate", startDate);
  if (endDate) carry.set("endDate", endDate);
  if (attendees) carry.set("attendees", String(attendees));
  if (setup) carry.set("setup", setup);
  const returnTo =
    `/meetings/${params.hotelId}/${params.spaceId}/rfp` +
    (carry.toString() ? `?${carry.toString()}` : "");

  const session = getSession();
  if (!session) redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);

  const [detail, profile] = await Promise.all([
    gqlFetch<DetailResp>(EVENT_SPACE_DETAIL_QUERY, {
      id: params.spaceId,
      hotelId: params.hotelId,
    }).catch((err) => {
      console.error("[rfp] EVENT_SPACE_DETAIL_QUERY failed", err);
      return null;
    }),
    gqlFetchAuthed<ProfileResp>(ME_PROFILE_QUERY).catch((err) => {
      console.error("[rfp] ME_PROFILE_QUERY failed", err);
      return null;
    }),
  ]);

  if (!detail?.eventSpace || !detail.hotel) {
    return <NotFound />;
  }

  const fullName =
    profile?.me?.name
      ? `${profile.me.name.firstName} ${profile.me.name.lastName}`.trim()
      : `${session.guest.firstName} ${session.guest.lastName}`.trim();
  const contactEmail = profile?.me?.email ?? session.guest.email;
  const contactPhone = profile?.me?.phone ?? "";

  const seed: WizardSeed = {
    hotelId: params.hotelId,
    hotelName: detail.hotel.name,
    spaceId: params.spaceId,
    spaceName: detail.eventSpace.name,
    initial: buildInitialDraft({ startDate, endDate, attendees, setup }),
    contact: {
      organizer: fullName,
      organization: "",
      contactEmail,
      contactPhone,
    },
  };

  return (
    <>
      <section className="bg-ink text-cream">
        <div className="container-x py-10 md:py-14 flex items-center gap-5">
          <BrandLogo brand={detail.hotel.brand} size="md" />
          <div className="flex-1">
            <div className="eyebrow text-cream/70 mb-1">Request a Proposal</div>
            <h1 className="font-serif text-3xl md:text-4xl leading-tight">
              {detail.eventSpace.name}
            </h1>
            <p className="text-cream/70 text-sm mt-1">{detail.hotel.name}</p>
          </div>
          <Link
            href={`/meetings/${params.hotelId}/${params.spaceId}${
              carry.toString() ? `?${carry.toString()}` : ""
            }`}
            className="hidden md:inline-block text-cream/80 hover:text-cream text-sm underline"
          >
            ← Back to venue
          </Link>
        </div>
      </section>

      {(startDate || attendees > 0) && (
        <section className="bg-cream border-b border-ink/10">
          <div className="container-x py-3 text-xs text-ink/65 flex flex-wrap gap-x-5 gap-y-1">
            {startDate && endDate && (
              <span>
                <strong className="text-ink/80">Window:</strong>{" "}
                {formatStayWindow(startDate, endDate)}
              </span>
            )}
            {attendees > 0 && (
              <span>
                <strong className="text-ink/80">Headcount:</strong> {attendees}
              </span>
            )}
            {setup && (
              <span>
                <strong className="text-ink/80">Setup:</strong> {labelSetup(setup)}
              </span>
            )}
          </div>
        </section>
      )}

      <section className="container-x py-10">
        <RfpWizard seed={seed} />
      </section>
    </>
  );
}

function buildInitialDraft(args: {
  startDate: string;
  endDate: string;
  attendees: number;
  setup: SetupStyle | "";
}): Partial<RfpDraft> {
  const { startDate, endDate, attendees, setup } = args;
  const initial: Partial<RfpDraft> = {};
  if (startDate) initial.startDate = startDate;
  if (endDate) initial.endDate = endDate;
  if (attendees > 0) initial.attendees = attendees;
  if (setup) {
    initial.spaceRequirements = [
      {
        name: "Plenary",
        setup: setup as SetupStyle,
        attendees: attendees || 50,
        durationHours: 8,
        startTime: "09:00",
      },
    ];
  }
  return initial;
}

function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="font-serif text-3xl mb-4">RFP unavailable</h1>
      <p className="text-ink/60 mb-8">
        We couldn&rsquo;t find that venue. It may have moved or been retired.
      </p>
      <Link href="/meetings" className="btn-primary inline-block">
        Back to all venues
      </Link>
    </div>
  );
}
