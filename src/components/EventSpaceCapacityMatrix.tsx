// Editorial capacity matrix shown on /meetings/[hotelId]/[spaceId].
// Highlights the row that meets (or comes closest to) the requested
// headcount so the planner sees the answer first; bold green when it
// fits, amber when it's a stretch.

import { capacityFit, labelSetup, sortCapacityStyles } from "@/lib/meetings";

export function EventSpaceCapacityMatrix({
  capacityStyles,
  attendees,
}: {
  capacityStyles: { setup: string; capacity: number }[];
  attendees?: number;
}) {
  const sorted = sortCapacityStyles(capacityStyles);
  const fit = attendees && attendees > 0 ? capacityFit(capacityStyles, attendees) : null;
  const bestKey = fit?.best?.setup;

  return (
    <div className="border border-ink/10 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-cream border-b border-ink/10">
          <tr>
            <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-ink/55">
              Setup
            </th>
            <th className="text-right px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-ink/55">
              Capacity
            </th>
            {fit && (
              <th className="text-right px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-ink/55">
                Fit
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const isBest = row.setup === bestKey;
            const fitsRow = attendees ? row.capacity >= attendees : null;
            return (
              <tr
                key={row.setup}
                className={[
                  "border-b last:border-b-0 border-ink/5",
                  isBest && fitsRow && "bg-emerald-50/60",
                  isBest && fitsRow === false && "bg-amber-50/70",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <td className="px-4 py-2.5">
                  {labelSetup(row.setup)}
                  {isBest && (
                    <span className="ml-2 text-[10px] uppercase tracking-[0.15em] text-ink/55">
                      best fit
                    </span>
                  )}
                </td>
                <td className="text-right px-4 py-2.5 tabular-nums">
                  {row.capacity.toLocaleString()}
                </td>
                {fit && (
                  <td className="text-right px-4 py-2.5">
                    {fitsRow ? (
                      <span className="text-emerald-700 text-[11px] uppercase tracking-[0.18em]">
                        ✓ fits {attendees}
                      </span>
                    ) : (
                      <span className="text-amber-800 text-[11px] uppercase tracking-[0.18em]">
                        − {Math.max(0, (attendees ?? 0) - row.capacity)} short
                      </span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
