// Shared layout for /sign-in and /sign-up. A single editorial split with
// the form on the left and a hero image on the right matches the rest
// of the site's visual language.

import { redirect } from "next/navigation";
import { getSession } from "@/lib/authSession";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Already signed in? Don't show sign-in / sign-up — bounce home.
  if (getSession()) redirect("/");
  return (
    <div className="min-h-[80vh] grid md:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16 md:py-24">
        <div className="w-full max-w-md">{children}</div>
      </div>
      <aside
        className="hidden md:block bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=80&auto=format')",
        }}
        aria-hidden
      />
    </div>
  );
}
