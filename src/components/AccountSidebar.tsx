// Sticky sub-nav for the /account page. Pure server component — browser
// handles smooth scroll to #anchors natively (CSS scroll-margin on each
// section keeps the sticky header from clipping the heading).

const ITEMS = [
  { id: "profile", label: "Profile" },
  { id: "addresses", label: "Addresses" },
  { id: "payment", label: "Payment methods" },
  { id: "trips", label: "Recent trips" },
] as const;

export function AccountSidebar() {
  return (
    <nav
      aria-label="Account sections"
      className="md:sticky md:top-24 md:self-start"
    >
      <ul className="flex md:flex-col gap-1 md:gap-0 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 md:border-l md:border-ink/15">
        {ITEMS.map((item) => (
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
