import Link from "next/link";

const COLS = [
  {
    title: "Stay",
    links: [
      { label: "Hotels & Destinations", href: "/hotels" },
      { label: "Offers", href: "/offers" },
      { label: "Inspirations", href: "/inspirations" },
      { label: "Stories", href: "/stories" },
    ],
  },
  {
    title: "Plan",
    links: [
      { label: "Meetings & Events", href: "/meetings" },
      { label: "Group Bookings", href: "/meetings" },
      { label: "Corporate Travel", href: "/corporate" },
      { label: "Concierge", href: "/concierge" },
    ],
  },
  {
    title: "Loyalty",
    links: [
      { label: "Luxe Members", href: "/loyalty" },
      { label: "Tier Benefits", href: "/loyalty" },
      { label: "Points & Rewards", href: "/loyalty" },
      { label: "Sign In", href: "/account" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Brand Story", href: "/about" },
      { label: "Sustainability", href: "/about/sustainability" },
      { label: "Careers", href: "/about/careers" },
      { label: "Press", href: "/about/press" },
    ],
  },
];

export function Footer() {
  return (
          <footer className="bg-ink text-cream/90 mt-20">
            <div className="container-x grid grid-cols-2 md:grid-cols-5 gap-10 py-16">
              <div className="col-span-2 md:col-span-1">
                <div className="font-serif text-3xl mb-3">Luxe</div>
                <p className="text-sm text-cream/70 leading-relaxed">
                  Twelve flagship hotels. One philosophy: anchored in place, devoted to craft.
                </p>
              </div>
              {COLS.map((col) => (
                      <div key={col.title}>
                        <h4 className="text-[11px] uppercase tracking-[0.18em] text-cream mb-4">{col.title}</h4>
                        <ul className="space-y-2 text-sm text-cream/70">
                          {col.links.map((link) => (
                                  <li key={link.label}>
                                    <Link href={link.href} className="hover:text-cream">
                                      {link.label}
                                    </Link>
                                  </li>
                          ))}
                        </ul>
                      </div>
              ))}
            </div>
            <div className="border-t border-cream/10 py-6">
              <div className="container-x flex flex-col md:flex-row items-center justify-between text-xs text-cream/60 gap-2">
                <span>© {new Date().getFullYear()} Luxe International. All rights reserved.</span>
                <div className="flex gap-5">
                  <Link href="/legal/privacy">Privacy</Link>
                  <Link href="/legal/terms">Terms</Link>
                  <Link href="/legal/cookies">Cookies</Link>
                  <Link href="/contact">Contact</Link>
                </div>
              </div>
            </div>
          </footer>
  );
}
