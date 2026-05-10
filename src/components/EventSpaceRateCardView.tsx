// Rate card panel on the venue detail page. Two columns of pricing
// rows (full day / half day / hourly / setup / cleaning / F&B min)
// using the same Money formatter as the booking flow so currency
// rendering is consistent across the site.

import { formatAmount, parseMoneyAmount } from "@/lib/money";

type Money = { amount: string; currency: string } | null | undefined;

export function EventSpaceRateCardView({
  rateCard,
}: {
  rateCard: {
    currency: string;
    fullDay: Money;
    halfDay: Money;
    hourly: Money;
    setupFee: Money;
    cleaningFee: Money;
    minimumFAndBSpend: Money;
  };
}) {
  const money = (m: Money): string => {
    if (!m) return "—";
    return formatAmount(parseMoneyAmount(m), m.currency);
  };

  const rows: { label: string; value: string; emphasis?: boolean }[] = [
    { label: "Full day", value: money(rateCard.fullDay), emphasis: true },
    { label: "Half day", value: money(rateCard.halfDay) },
    { label: "Hourly", value: money(rateCard.hourly) },
    { label: "Setup fee", value: money(rateCard.setupFee) },
    { label: "Cleaning fee", value: money(rateCard.cleaningFee) },
    { label: "F&B minimum", value: money(rateCard.minimumFAndBSpend) },
  ];

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 border border-ink/10 bg-white">
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={[
            "flex justify-between items-baseline gap-3 px-5 py-3 border-ink/10",
            // Border heuristic: every row gets a bottom border except the
            // last in each column, which a CSS-only solution can't reach
            // with grid + nth-child reliably across breakpoints.
            i < rows.length - 1 ? "border-b" : "",
            "sm:border-b sm:[&:nth-last-child(-n+2)]:border-b-0",
          ].join(" ")}
        >
          <dt
            className={[
              "text-[11px] uppercase tracking-[0.18em]",
              row.emphasis ? "text-ink" : "text-ink/55",
            ].join(" ")}
          >
            {row.label}
          </dt>
          <dd
            className={[
              "text-right tabular-nums",
              row.emphasis ? "font-serif text-lg" : "text-sm",
            ].join(" ")}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
