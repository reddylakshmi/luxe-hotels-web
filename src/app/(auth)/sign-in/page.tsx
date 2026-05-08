import { SignInForm } from "@/components/SignInForm";
import { safeReturnTo } from "@/lib/auth";
import { picker } from "@/lib/searchParams";

export const metadata = {
  title: "Sign In · Luxe",
};

export default function SignInPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const returnTo = safeReturnTo(picker(searchParams)("returnTo"));
  const isReturning = returnTo !== "/";
  return (
    <>
      <div className="eyebrow mb-3">Member</div>
      <h1 className="font-serif text-4xl mb-2">Sign In</h1>
      <p className="text-ink/65 text-sm mb-8">
        {isReturning
          ? "Sign in to continue your booking — we'll send you right back where you left off."
          : "Welcome back. Sign in to manage your stays and earn rewards on every booking."}
      </p>
      <SignInForm returnTo={returnTo} />
    </>
  );
}
