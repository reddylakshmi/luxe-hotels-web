// Green congrats banner shown when the selected rate plan is the
// MEMBER_RATE — invites guests to sign in or create a free account.

export function MemberRateBanner() {
  return (
    <section className="bg-emerald-50 border-y border-emerald-200">
      <div className="container-x py-4 flex items-center gap-3">
        <CheckIcon />
        <p className="text-sm text-emerald-900">
          <strong>Congratulations,</strong> you&rsquo;re getting an exclusive member rate. To
          complete your booking,{" "}
          <a href="#sign-in" className="underline hover:no-underline">
            sign-in
          </a>{" "}
          or{" "}
          <a href="#sign-up" className="underline hover:no-underline">
            create a free account
          </a>{" "}
          below.
        </p>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-emerald-700 shrink-0"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
