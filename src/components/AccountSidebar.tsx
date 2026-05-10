// Sticky sub-nav for the /account hub. Pure server component — the
// browser handles in-page smooth scroll for #anchor items, and
// Next.js client-side nav handles the cross-route hops to subpages
// like /account/loyalty and /account/events.
//
// Items fall into two kinds:
//   • section anchors (id only) — scroll to a section of /account
//   • subpage links (href set)  — navigate to a sibling route
//
// When a guest is on a subpage (e.g. /account/loyalty), the section
// anchors must resolve back to /account#<id> rather than a bare
// fragment, otherwise clicking "Profile" from /account/loyalty
// would do nothing. Pass the current pathname so the renderer can
// produce the right href and highlight the current item.

import { resolveSidebarHref, isSidebarItemCurrent, type SidebarItem } from "@/lib/accountNav";

const ITEMS: SidebarItem[] = [
  { id: "profile", label: "Profile" },
  { id: "addresses", label: "Addresses" },
  { id: "payment", label: "Payment methods" },
  { id: "trips", label: "Recent trips" },
  { id: "loyalty", label: "Loyalty hub", href: "/account/loyalty" },
  { id: "events", label: "Events & RFPs", href: "/account/events" },
];

export function AccountSidebar({
  currentPath = "/account",
}: {
  /** Pathname of the page mounting this sidebar — drives correct
   *  href resolution for hash items and the active-page indicator. */
  currentPath?: string;
}) {
  return (
    <nav
      aria-label="Account sections"
      className="md:sticky md:top-24 md:self-start"
    >
      <ul className="flex md:flex-col gap-1 md:gap-0 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 md:border-l md:border-ink/15">
        {ITEMS.map((item) => {
          const href = resolveSidebarHref(item, currentPath);
          const current = isSidebarItemCurrent(item, currentPath);
          return (
            <li key={item.id} className="shrink-0 md:shrink">
              <a
                href={href}
                aria-current={current ? "page" : undefined}
                className={[
                  "block whitespace-nowrap md:whitespace-normal text-sm md:-ml-px md:border-l-2 px-3 py-2 transition-colors",
                  current
                    ? "text-goldDeep md:border-goldDeep font-medium"
                    : "text-ink/70 hover:text-goldDeep md:border-transparent md:hover:border-goldDeep",
                ].join(" ")}
              >
                {item.label}
                {item.href && !current && (
                  <span aria-hidden className="text-ink/30 ml-1">
                    →
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
