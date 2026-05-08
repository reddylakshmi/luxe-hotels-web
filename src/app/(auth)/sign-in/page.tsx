import { SignInForm } from "@/components/SignInForm";

export const metadata = {
  title: "Sign In · Luxe",
};

export default function SignInPage() {
  return (
    <>
      <div className="eyebrow mb-3">Member</div>
      <h1 className="font-serif text-4xl mb-2">Sign In</h1>
      <p className="text-ink/65 text-sm mb-8">
        Welcome back. Sign in to manage your stays and earn rewards on every booking.
      </p>
      <SignInForm />
    </>
  );
}
