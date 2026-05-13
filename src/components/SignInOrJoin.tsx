"use client";

// Header auth dropdown for signed-out guests. A single "Sign in or Join"
// trigger pops a small menu with the two options — keeps the header
// uncluttered and signals the choice clearly. Wraps the existing portal-
// based Popover so we share the same anchoring + dismiss behaviour as
// every other dropdown on the site.
//
// Both menu items carry a `returnTo` pointing at the guest's current URL
// (path + search) so signing in from /hotels/[id]/book lands them back on
// the booking page with the form pre-filled — not the home page. The
// sign-in / sign-up server action already validates returnTo via
// `safeReturnTo` (lib/auth.ts), so we trust the link layer to read the
// current URL and the action layer to gate it.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Popover } from "./Popover";
import { buildAuthHref } from "@/lib/auth";

export function SignInOrJoin() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";
  const signInHref = buildAuthHref("/sign-in", pathname, search);
  const signUpHref = buildAuthHref("/sign-up", pathname, search);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="text-sm hover:text-goldDeep flex items-center gap-1.5"
      >
        <PersonIcon />
        Sign In or Join
        <ChevronDown />
      </button>

      <Popover anchorRef={triggerRef} open={open} onClose={() => setOpen(false)}>
        <div
          role="menu"
          className="bg-cream border border-ink/10 shadow-xl w-56 py-1"
        >
          <MenuLink href={signInHref} onPick={() => setOpen(false)}>
            <span className="block font-medium">Sign In</span>
            <span className="block text-xs text-ink/55">Welcome back, member.</span>
          </MenuLink>
          <div className="border-t border-ink/10" />
          <MenuLink href={signUpHref} onPick={() => setOpen(false)}>
            <span className="block font-medium">Join Luxe</span>
            <span className="block text-xs text-ink/55">
              Free account · member rates · earn points.
            </span>
          </MenuLink>
        </div>
      </Popover>
    </>
  );
}

function MenuLink({
  href,
  onPick,
  children,
}: {
  href: string;
  onPick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onPick}
      className="block px-4 py-3 text-sm text-ink hover:bg-ink/5 focus:bg-ink/5 outline-none"
    >
      {children}
    </Link>
  );
}

function PersonIcon() {
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
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 4l3 3 3-3" />
    </svg>
  );
}
