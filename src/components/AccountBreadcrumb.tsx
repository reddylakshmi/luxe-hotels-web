// Breadcrumb shown at the top of every /account/<subpage> hero. Two
// affordances on one row: a back-arrow link to /account on the left,
// and a "Account / <subpage>" trail on the right. Both feel
// editorial — small caps, generous letter-spacing — but the back
// arrow is high-contrast on dark and underlined on hover so the
// guest can never miss it. Use the `dark` variant on dark heroes
// (account/loyalty) and the default on cream backgrounds
// (account/events).

import Link from "next/link";

export function AccountBreadcrumb({
  current,
  variant = "light",
}: {
  /** Label for the current subpage, e.g. "Loyalty" or "Events". */
  current: string;
  variant?: "light" | "dark";
}) {
  const palette =
    variant === "dark"
      ? {
          back: "text-cream hover:text-gold underline underline-offset-4",
          trail: "text-cream/65",
          current: "text-cream/90",
          divider: "text-cream/35",
        }
      : {
          back: "text-goldDeep hover:text-ink underline underline-offset-4",
          trail: "text-ink/55",
          current: "text-ink/80",
          divider: "text-ink/30",
        };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <Link
        href="/account"
        aria-label="Back to account hub"
        className={`text-sm ${palette.back}`}
      >
        ← Back to account
      </Link>
      <nav
        aria-label="Breadcrumb"
        className="text-[11px] uppercase tracking-[0.3em]"
      >
        <Link href="/account" className={`${palette.trail} hover:${palette.current}`}>
          Account
        </Link>
        <span aria-hidden className={`mx-2 ${palette.divider}`}>
          /
        </span>
        <span aria-current="page" className={palette.current}>
          {current}
        </span>
      </nav>
    </div>
  );
}
