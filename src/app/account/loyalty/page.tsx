// /account/loyalty — Luxe member hub.
//
// Read-only first iteration: tier dashboard, points balance, tier
// progression toward the next tier, lifetime stats, recent activity,
// certificates, and tier benefits. Redemption / transfer / partner
// linking / challenges all live behind mutations on the loyalty
// subgraph and are a clean follow-up — none ship in this PR.

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { gqlFetchAuthed } from "@/lib/graphqlAuthed";
import { MY_LOYALTY_QUERY } from "@/lib/queries";
import { getSession } from "@/lib/authSession";
import type { LoyaltyAccount } from "@/types/graphql";
import { formatMoney } from "@/lib/money";
import {
  formatPoints,
  formatPointsDelta,
  nightsToNextTierText,
  tierBadgeTone,
  tierLabel,
  tierProgressPctClamped,
  transactionLabel,
} from "@/lib/loyalty";
import { Section, Field, EmptyState } from "@/components/AccountSections";

type Resp = { myLoyaltyAccount: LoyaltyAccount | null };

export default async function LoyaltyPage() {
  const session = getSession();
  if (!session) redirect("/sign-in?returnTo=/account/loyalty");

  let data: Resp | null = null;
  let error: string | null = null;
  try {
    data = await gqlFetchAuthed<Resp>(MY_LOYALTY_QUERY, {
      transactionsLimit: 12,
      certificatesStatus: "ACTIVE",
    });
  } catch (e) {
    error = (e as Error).message;
  }

  if (error || !data?.myLoyaltyAccount) {
    return <NotEnrolledShell firstName={session.guest.firstName} error={error} />;
  }

  const a = data.myLoyaltyAccount;
  const progressPct = tierProgressPctClamped(
    a.tierProgress.tierProgressPct,
    a.tierProgress.nextTier,
  );
  const nextTierText = nightsToNextTierText(
    a.tierProgress.nightsToNextTier,
    a.tierProgress.nextTier,
  );
  const memberSince = formatYear(a.memberSince);

  return (
    <>
      {/* Hero */}
      <section className="bg-ink text-cream">
        <div className="container-x py-12 md:py-16">
          <div className="text-[11px] uppercase tracking-[0.3em] text-cream/65 mb-3">
            <Link href="/account" className="hover:text-cream/90">Account</Link>
            <span className="mx-2 text-cream/40">/</span>
            <span className="text-cream/85">Loyalty</span>
          </div>
          <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
            <div>
              <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-3">
                Hi, {session.guest.firstName}.
              </h1>
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 border ${tierBadgeTone(
                    a.tier,
                  )}`}
                >
                  {tierLabel(a.tier)}
                </span>
                <span className="text-cream/75 text-sm">
                  Member since {memberSince} · {a.loyaltyNumber}
                </span>
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-[10px] uppercase tracking-[0.3em] text-cream/55 mb-1">
                Available points
              </div>
              <div className="font-serif text-4xl md:text-5xl tabular-nums">
                {a.pointsBalance.available.toLocaleString("en-US")}
              </div>
              <div className="text-xs text-cream/60 mt-1">
                ≈ {formatMoney(a.pointsBalance.cashEquivalent)} value
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-x py-12 md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-12">
        <LoyaltySidebar />

        <div className="flex flex-col gap-12 min-w-0 mt-8 md:mt-0">
          <TierProgressSection
            progressPct={progressPct}
            nextTierText={nextTierText}
            account={a}
          />
          <BalanceBreakdown account={a} />
          <ActivitySection
            transactions={a.transactions.edges.map((e) => e.node)}
            totalCount={a.transactions.totalCount}
          />
          <CertificatesSection certificates={a.certificates} />
          <BenefitsSection benefits={a.benefits} tier={a.tier} />

          <p className="text-xs text-ink/45 mt-2">
            Redeeming points or transferring to a partner?{" "}
            <Link href="/" className="underline hover:text-goldDeep">
              Contact your concierge
            </Link>{" "}
            — self-serve redemption is coming soon.
          </p>
        </div>
      </div>
    </>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────────────

const SIDEBAR_ITEMS = [
  { id: "progress", label: "Tier progress" },
  { id: "balance", label: "Points balance" },
  { id: "activity", label: "Activity" },
  { id: "certificates", label: "Certificates" },
  { id: "benefits", label: "Benefits" },
] as const;

function LoyaltySidebar() {
  return (
    <nav aria-label="Loyalty sections" className="md:sticky md:top-24 md:self-start">
      <ul className="flex md:flex-col gap-1 md:gap-0 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 md:border-l md:border-ink/15">
        {SIDEBAR_ITEMS.map((item) => (
          <li key={item.id} className="shrink-0 md:shrink">
            <a
              href={`#${item.id}`}
              className="block whitespace-nowrap md:whitespace-normal text-sm text-ink/70 hover:text-goldDeep md:-ml-px md:border-l-2 md:border-transparent md:hover:border-goldDeep px-3 py-2 transition-colors"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ── Sections ────────────────────────────────────────────────────────────

function TierProgressSection({
  progressPct,
  nextTierText,
  account,
}: {
  progressPct: number;
  nextTierText: string | null;
  account: LoyaltyAccount;
}) {
  const tp = account.tierProgress;
  return (
    <Section
      id="progress"
      title="Tier progress"
      description={
        nextTierText
          ? `${nextTierText} by ${formatYear(tp.qualificationYearEndDate)}.`
          : "You're at the top tier — thank you for travelling with us."
      }
    >
      <div className="px-6 py-5 space-y-4">
        <div className="flex items-baseline justify-between text-xs uppercase tracking-[0.18em] text-ink/55">
          <span>{tierLabel(tp.currentTier)}</span>
          <span>{tp.nextTier ? tierLabel(tp.nextTier) : "Top tier"}</span>
        </div>
        <div
          className="h-2 bg-ink/8 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPct)}
          aria-label={`Tier progress to ${tp.nextTier ? tierLabel(tp.nextTier) : "top tier"}`}
        >
          <div
            className="h-full bg-goldDeep transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="text-xs text-ink/55 flex flex-wrap gap-x-6 gap-y-1">
          <span>{tp.qualifyingNights} qualifying nights this year</span>
          <span aria-hidden className="text-ink/25">·</span>
          <span>Qualifying spend {formatMoney(tp.qualifyingSpend)}</span>
          {tp.projectedTier && tp.projectedTier !== tp.currentTier && (
            <>
              <span aria-hidden className="text-ink/25">·</span>
              <span className="text-emerald-700">
                Projected {tierLabel(tp.projectedTier)}
              </span>
            </>
          )}
        </div>
      </div>

      <dl className="border-t border-ink/8">
        <Field label="Lifetime nights" value={account.lifetimeNights.toLocaleString("en-US")} />
        <Field label="Lifetime points" value={account.lifetimePoints.toLocaleString("en-US")} />
      </dl>
    </Section>
  );
}

function BalanceBreakdown({ account }: { account: LoyaltyAccount }) {
  const b = account.pointsBalance;
  return (
    <Section id="balance" title="Points balance" description="Where your points stand right now.">
      <dl>
        <Field label="Available" value={formatPoints(b.available)} />
        <Field label="Pending" value={formatPoints(b.pending)} />
        <Field
          label="Expiring soon"
          value={
            b.expiringSoon > 0 ? (
              <span className="text-amber-800">{formatPoints(b.expiringSoon)}</span>
            ) : (
              formatPoints(b.expiringSoon)
            )
          }
        />
        <Field label="Total" value={formatPoints(b.total)} />
        <Field
          label="Cash equivalent"
          value={`${formatMoney(b.cashEquivalent)} (concierge redemption)`}
        />
      </dl>
    </Section>
  );
}

function ActivitySection({
  transactions,
  totalCount,
}: {
  transactions: LoyaltyAccount["transactions"]["edges"][number]["node"][];
  totalCount: number;
}) {
  const description =
    totalCount === 0
      ? "Your point activity will appear here."
      : `Showing ${transactions.length} of ${totalCount}.`;
  return (
    <Section id="activity" title="Recent activity" description={description}>
      {transactions.length === 0 ? (
        <EmptyState message="No point activity yet." />
      ) : (
        <ul>
          {transactions.map((t) => (
            <li
              key={t.id}
              className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 px-6 py-4 border-b border-ink/8 last:border-0"
            >
              <div className="sm:w-44 sm:shrink-0 text-xs text-ink/55">
                <div className="uppercase tracking-[0.18em]">{transactionLabel(t.type)}</div>
                <div className="text-[11px] text-ink/45 mt-1">
                  {formatTxDate(t.transactionDate)}
                </div>
              </div>
              <div className="flex-1 text-sm text-ink/85 min-w-0">
                {t.description}
              </div>
              <div
                className={`tabular-nums whitespace-nowrap text-sm ${
                  formatPointsDelta(t.type, t.points).startsWith("−")
                    ? "text-red-700"
                    : "text-emerald-700"
                }`}
              >
                {formatPointsDelta(t.type, t.points)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function CertificatesSection({
  certificates,
}: {
  certificates: LoyaltyAccount["certificates"];
}) {
  const description =
    certificates.length === 0
      ? "Earn certificates by reaching milestones and completing challenges."
      : `${certificates.length} active.`;
  return (
    <Section id="certificates" title="Certificates" description={description}>
      {certificates.length === 0 ? (
        <EmptyState message="No active certificates." />
      ) : (
        <ul>
          {certificates.map((c) => (
            <li
              key={c.id}
              className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 px-6 py-4 border-b border-ink/8 last:border-0"
            >
              <div className="sm:w-56 sm:shrink-0">
                <div className="text-sm font-medium text-ink/90">{c.name}</div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-ink/55 mt-1">
                  {c.type.replace(/_/g, " ").toLowerCase()}
                </div>
              </div>
              <div className="text-sm text-ink/70 flex-1">{c.description}</div>
              <div className="text-xs text-ink/55 whitespace-nowrap">
                Expires {formatTxDate(c.expiresAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function BenefitsSection({
  benefits,
  tier,
}: {
  benefits: LoyaltyAccount["benefits"];
  tier: LoyaltyAccount["tier"];
}) {
  if (benefits.length === 0) return null;
  return (
    <Section
      id="benefits"
      title="Benefits"
      description={`Active perks at the ${tierLabel(tier)} tier.`}
    >
      <ul>
        {benefits.map((b) => (
          <li
            key={b.code}
            className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 px-6 py-4 border-b border-ink/8 last:border-0"
          >
            <div className="text-xs uppercase tracking-[0.18em] text-ink/55 sm:w-40 sm:shrink-0">
              {b.category.toLowerCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink/90">{b.name}</div>
              <div className="text-xs text-ink/60 mt-1">{b.description}</div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function NotEnrolledShell({
  firstName,
  error,
}: {
  firstName: string;
  error: string | null;
}) {
  return (
    <>
      <section className="bg-ink text-cream">
        <div className="container-x py-12 md:py-16">
          <div className="text-[11px] uppercase tracking-[0.3em] text-cream/65 mb-3">
            <Link href="/account" className="hover:text-cream/90">Account</Link>
            <span className="mx-2 text-cream/40">/</span>
            <span className="text-cream/85">Loyalty</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-3">
            Hi, {firstName}.
          </h1>
          <p className="text-cream/75 max-w-2xl">
            {error
              ? "We couldn't load your loyalty account just now."
              : "You're not yet enrolled in Luxe loyalty. Earn points on every stay, certificates at milestones, and tier benefits across the brand."}
          </p>
        </div>
      </section>
      <section className="container-x py-12">
        {error ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3">
            {error}
          </div>
        ) : (
          <Link href="/" className="btn-primary px-6 py-2 text-xs uppercase tracking-[0.2em]">
            Join Luxe — coming soon
          </Link>
        )}
      </section>
    </>
  );
}

// ── Local formatters ────────────────────────────────────────────────────

function formatYear(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", timeZone: "UTC" });
}

function formatTxDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}
