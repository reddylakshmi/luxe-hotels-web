export const dynamic = "force-dynamic";

// Booking confirmation landing page. Reached after the BookingForm
// validates and submits — receives the confirmation reference + guest
// name + selected rate via URL params.

import Link from "next/link";

export default function ConfirmationPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const pick = (k: string) =>
    Array.isArray(searchParams[k])
      ? (searchParams[k] as string[])[0]
      : (searchParams[k] as string | undefined);

  const ref = pick("ref") ?? "—";
  const firstName = pick("firstName") ?? "";
  const ratePlanCode = pick("ratePlanCode") ?? "";

  return (
    <>
      <section className="bg-emerald-700 text-cream">
        <div className="container-x py-12 md:py-16 text-center">
          <SealIcon />
          <div className="eyebrow text-cream/80 mt-4 mb-2">Booking confirmed</div>
          <h1 className="font-serif text-3xl md:text-5xl leading-tight">
            Thank you{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-3 text-cream/85">
            We&rsquo;ve emailed your booking confirmation. Save your reference for check-in.
          </p>
        </div>
      </section>

      <section className="container-x py-12">
        <div className="border border-ink/10 bg-cream p-8 max-w-xl mx-auto text-center">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
            Confirmation Number
          </div>
          <p className="font-mono text-2xl tracking-wider">{ref}</p>
          {ratePlanCode && (
            <p className="text-xs text-ink/55 mt-2">Rate plan · {ratePlanCode}</p>
          )}
          <div className="mt-8 flex flex-col md:flex-row gap-3 justify-center">
            <Link
              href={`/hotels/${params.id}`}
              className="btn-primary px-5 py-2 text-xs"
            >
              View hotel
            </Link>
            <Link
              href="/"
              className="border border-ink/15 px-5 py-2 text-xs hover:border-ink/30"
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function SealIcon() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="mx-auto opacity-90"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  );
}
