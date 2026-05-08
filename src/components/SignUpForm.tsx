"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signUpAction, type SignUpState } from "@/lib/authActions";

const initialState: SignUpState = { ok: false };

export function SignUpForm({ returnTo = "/" }: { returnTo?: string }) {
  const [state, formAction] = useFormState(signUpAction, initialState);
  const signInHref = returnTo === "/" ? "/sign-in" : `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <form action={formAction} noValidate className="space-y-5">
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="grid md:grid-cols-2 gap-4">
        <Field
          id="firstName"
          name="firstName"
          label="First Name"
          autoComplete="given-name"
          required
          error={state.errors?.firstName}
        />
        <Field
          id="lastName"
          name="lastName"
          label="Last Name"
          autoComplete="family-name"
          required
          error={state.errors?.lastName}
        />
      </div>

      <Field
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        error={state.errors?.email}
      />

      <Field
        id="phone"
        name="phone"
        label="Mobile"
        type="tel"
        autoComplete="tel"
        optional
      />

      <Field
        id="password"
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        error={state.errors?.password}
        hint="At least 8 characters with letters and digits."
      />

      <Field
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        required
        error={state.errors?.confirmPassword}
      />

      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          name="acceptTerms"
          className="mt-1 w-4 h-4 accent-goldDeep"
        />
        <span className="text-ink/80">
          I agree to the{" "}
          <a href="#" className="underline hover:no-underline">booking terms</a> and the{" "}
          <a href="#" className="underline hover:no-underline">privacy policy</a>.
        </span>
      </label>
      {state.errors?.acceptTerms && (
        <p className="text-xs text-red-600 -mt-3">{state.errors.acceptTerms}</p>
      )}

      {state.formError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
          {state.formError}
        </div>
      )}

      <SubmitButton>Create Account</SubmitButton>

      <p className="text-sm text-ink/70 text-center pt-2">
        Already a member?{" "}
        <Link href={signInHref} className="text-goldDeep underline hover:no-underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  required,
  optional,
  error,
  hint,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
        {label}
        {optional && <span className="lowercase tracking-normal text-ink/45">(optional)</span>}
      </span>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className={[
          "w-full border bg-white px-3 py-2 text-sm focus:outline-none",
          error ? "border-red-500 focus:border-red-600" : "border-ink/15 focus:border-goldDeep",
        ].join(" ")}
      />
      {hint && !error && <span className="block text-xs text-ink/55 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full px-6 py-3 disabled:opacity-50"
    >
      {pending ? "Creating account…" : children}
    </button>
  );
}
