// Compact status timeline for an RFP. Renders the linear lifecycle
// (Submitted → In review → Proposal sent → Accepted/Declined) with
// the *reached* steps in goldDeep and the rest faded. We render a
// fixed lifecycle rather than the resolver's `history` events
// because planners care about the milestones, not every status nudge.

import { labelRfpStatus, type RfpStatus } from "@/lib/meetings";

const STAGES: RfpStatus[] = [
  "SUBMITTED",
  "IN_REVIEW",
  "PROPOSAL_SENT",
  "NEGOTIATING",
  "ACCEPTED",
];

const STAGE_INDEX: Record<RfpStatus, number> = {
  DRAFT: -1,
  SUBMITTED: 0,
  IN_REVIEW: 1,
  PROPOSAL_SENT: 2,
  NEGOTIATING: 3,
  ACCEPTED: 4,
  DECLINED: 4,
  EXPIRED: 4,
  CANCELLED: 4,
};

export function RfpStatusTimeline({ status }: { status: string }) {
  const idx = STAGE_INDEX[status as RfpStatus] ?? -1;
  const terminalLost = ["DECLINED", "EXPIRED", "CANCELLED"].includes(status);

  return (
    <ol
      className="flex items-center gap-1.5"
      aria-label={`RFP status: ${labelRfpStatus(status)}`}
    >
      {STAGES.map((stage, i) => {
        const reached = i <= idx && !terminalLost;
        const current = i === idx;
        const lostHere = terminalLost && i === STAGES.length - 1;
        const label = lostHere ? labelRfpStatus(status) : labelRfpStatus(stage);
        return (
          <li
            key={stage + i}
            className={[
              "flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em]",
              lostHere
                ? "text-red-700"
                : reached
                  ? "text-goldDeep"
                  : "text-ink/40",
            ].join(" ")}
          >
            <span
              aria-hidden
              className={[
                "w-2 h-2 rounded-full",
                lostHere
                  ? "bg-red-700"
                  : reached
                    ? "bg-goldDeep"
                    : "bg-ink/20",
                current && !lostHere && "ring-2 ring-goldDeep ring-offset-2",
              ]
                .filter(Boolean)
                .join(" ")}
            />
            <span>{label}</span>
            {i < STAGES.length - 1 && (
              <span aria-hidden className="text-ink/20 mx-1">
                —
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
