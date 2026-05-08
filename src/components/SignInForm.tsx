"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signInAction, type SignInState } from "@/lib/authActions";

const initialState: SignInState = { ok: false };

export function SignInForm() {
  const [state, formAction] = useFormState(signInAction, initialState);

  return (
    <form action={formAction} noValidate className="space-y-5">
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
        id="password"
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        error={state.errors?.password}
      />

      {state.formError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
          {state.formError}
        </div>
      )}

      <SubmitButton>Sign In</SubmitButton>

      <p className="text-sm text-ink/70 text-center pt-2">
        New to Luxe?{" "}
        <Link href="/sign-up" className="text-goldDeep underline hover:no-underline">
          Create an account
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
  error,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-[10px] uppercase tracking-[0.2em] text-ink/55 mb-1">
        {label}
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
      {pending ? "Signing in…" : children}
    </button>
  );
}
