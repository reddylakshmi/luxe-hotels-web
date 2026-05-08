import { SignUpForm } from "@/components/SignUpForm";
import { safeReturnTo } from "@/lib/auth";
import { picker } from "@/lib/searchParams";

export const metadata = {
  title: "Create Account · Luxe",
};

export default function SignUpPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const returnTo = safeReturnTo(picker(searchParams)("returnTo"));
  return (
    <>
      <div className="eyebrow mb-3">New member</div>
      <h1 className="font-serif text-4xl mb-2">Create your free account</h1>
      <p className="text-ink/65 text-sm mb-8">
        Earn points on every stay, unlock member rates, and skip the form on every booking.
      </p>
      <SignUpForm returnTo={returnTo} />
    </>
  );
}
