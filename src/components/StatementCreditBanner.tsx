// Special-offer row on the booking page: Luxe Visa $250 statement credit
// + bonus points. Pure server component — all numbers come from the page
// via computeChargeSummary().

import type { ChargeSummary } from "@/lib/bookingValidation";

export function StatementCreditBanner({
  charges,
}: {
  charges: ChargeSummary;
}) {
  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <section className="border border-amber-200 bg-amber-50/70">
      <div className="container-x py-5 grid md:grid-cols-[1fr_auto_auto] items-center gap-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-700/80 mb-1">
            Special offer
          </div>
          <p className="font-medium">
            Luxe Credit Card Visa{" "}
            <span className="text-amber-800">$250 Statement Credit</span> + up to{" "}
            <span className="text-amber-800">100,000 Points</span>
          </p>
          <p className="text-sm text-ink/70">
            Plus, earn up to $100 in airline credits with your Luxe Visa.
          </p>
        </div>

        <dl className="text-sm grid grid-cols-[auto_auto] gap-x-4 gap-y-1 justify-self-end">
          <dt className="text-ink/65">Total Stay:</dt>
          <dd className="text-right font-medium">
            {fmt(charges.total)} {charges.currency}
          </dd>
          <dt className="text-ink/65">Statement Credit:</dt>
          <dd className="text-right text-amber-700">
            −{fmt(charges.statementCreditAmountUsd)} USD
          </dd>
          <dt className="text-ink/65 font-medium pt-1 border-t border-ink/10 mt-1">
            Total After Statement Credit:
          </dt>
          <dd className="text-right font-medium pt-1 border-t border-ink/10 mt-1">
            {fmt(charges.totalAfterStatementCredit)} {charges.currency}
          </dd>
        </dl>

        <a
          href="https://www.example.com/luxe-visa"
          className="btn-primary text-xs px-5 py-2.5 whitespace-nowrap"
        >
          Apply Now
        </a>
      </div>
    </section>
  );
}
