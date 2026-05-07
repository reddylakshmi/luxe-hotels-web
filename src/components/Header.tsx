import Link from "next/link";

export function Header() {
  return (
          <header className="sticky top-0 z-40 bg-cream/85 backdrop-blur border-b border-ink/10">
            <div className="container-x flex items-center justify-between h-16">
              <Link href="/" className="flex items-baseline gap-3">
                <span className="font-serif text-2xl tracking-wide">Luxe</span>
                <span className="text-[10px] tracking-[0.3em] uppercase text-ink/60">Hotels &amp; Resorts</span>
              </Link>
              <nav className="hidden md:flex items-center gap-8 text-sm">
                <Link href="/hotels" className="hover:text-goldDeep">Hotels &amp; Destinations</Link>
                <Link href="/brands" className="hover:text-goldDeep">Brands</Link>
                <Link href="/inspirations" className="hover:text-goldDeep">Inspirations</Link>
                <Link href="/stories" className="hover:text-goldDeep">Stories</Link>
                <Link href="/offers" className="hover:text-goldDeep">Offers</Link>
                <Link href="/meetings" className="hover:text-goldDeep">Meetings &amp; Events</Link>
              </nav>
              <div className="flex items-center gap-3">
                <Link href="/account" className="hidden md:inline text-sm hover:text-goldDeep">
                  Sign In
                </Link>
                <Link href="/hotels" className="btn-primary text-xs px-4 py-2">Book Now</Link>
              </div>
            </div>
          </header>
  );
}
