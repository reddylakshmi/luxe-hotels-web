import Link from "next/link";
import { getSession } from "@/lib/authSession";
import { signOutAction } from "@/lib/authActions";
import { SignInOrJoin } from "./SignInOrJoin";

export function Header() {
  const session = getSession();
  return (
    <header className="sticky top-0 z-40 bg-cream/85 backdrop-blur border-b border-ink/10">
      <div className="container-x flex items-center justify-between h-16">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-serif text-2xl tracking-wide">Luxe</span>
          <span className="text-[10px] tracking-[0.3em] uppercase text-ink/60">
            Hotels &amp; Resorts
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm">
          <Link href="/hotels" className="hover:text-goldDeep">Hotels &amp; Destinations</Link>
          <Link href="/brands" className="hover:text-goldDeep">Brands</Link>
          <Link href="/inspirations" className="hover:text-goldDeep">Inspirations</Link>
          <Link href="/stories" className="hover:text-goldDeep">Stories</Link>
          <Link href="/offers" className="hover:text-goldDeep">Offers</Link>
          <Link href="/meetings" className="hover:text-goldDeep">Meetings &amp; Events</Link>
        </nav>

        {/* ml-8 holds visual breathing room between Meetings & Events and the
            auth + Trips controls so they don't feel like part of the same nav. */}
        <div className="hidden md:flex items-center gap-5 ml-8">
          <Link href="/trips" className="text-sm hover:text-goldDeep flex items-center gap-1.5">
            <TravelBagIcon />
            My Trips
          </Link>
          {session ? (
            <>
              <Link
                href="/account"
                className="text-sm text-ink/80 hover:text-goldDeep"
                aria-label={`Account — ${session.guest.firstName} ${session.guest.lastName}`}
              >
                Hi, <strong className="font-medium">{session.guest.firstName}</strong>
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="text-sm text-ink/65 hover:text-goldDeep"
                >
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <SignInOrJoin />
          )}
        </div>
      </div>
    </header>
  );
}

function TravelBagIcon() {
  // Small carry-on / suitcase silhouette: handle on top, body with two
  // vertical lines (suggesting clasps), wheels at the bottom.
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6" />
      <rect x="4" y="6" width="16" height="13" rx="2" />
      <path d="M9 9v7M15 9v7" />
      <path d="M7 19v1.5M17 19v1.5" />
    </svg>
  );
}
