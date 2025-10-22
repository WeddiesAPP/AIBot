"use client";

import { useActionState, useId } from "react";
import { authenticateAction } from "./actions";
import type { LoginFormState } from "./actions";

const EMPTY_STATE: LoginFormState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    authenticateAction,
    EMPTY_STATE
  );
  const usernameId = useId();
  const passwordId = useId();

  return (
    <form
      action={formAction}
      className="w-full max-w-md space-y-6 rounded-3xl border border-slate-200 bg-white/90 p-10 shadow-2xl backdrop-blur"
    >
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Finance Portaal
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Meld je aan
        </h1>
        <p className="text-sm text-slate-500">
          Vul je bedrijfsgegevens in om toegang te krijgen tot het juiste
          dashboard.
        </p>
      </div>

      <div className="space-y-5">
        <label
          className="block text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
          htmlFor={usernameId}
        >
          Gebruikersnaam
          <input
            id={usernameId}
            name="username"
            type="text"
            autoComplete="username"
            data-lpignore="true"
            required
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.6)] focus:border-[#244BDA] focus:outline-none"
          />
        </label>

        <label
          className="block text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
          htmlFor={passwordId}
        >
          Wachtwoord
          <input
            id={passwordId}
            name="password"
            type="password"
            autoComplete="current-password"
            data-lpignore="true"
            required
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.6)] focus:border-[#244BDA] focus:outline-none"
          />
        </label>
      </div>

      {state?.error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 shadow-sm">
          {state.error}
        </p>
      ) : null}

      <div className="pt-2">
        <SubmitButton pending={isPending} />
      </div>
    </form>
  );
}

type SubmitButtonProps = {
  pending: boolean;
};

function SubmitButton({ pending }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center rounded-full bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_48px_-18px_rgba(37,99,235,0.75)] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {pending ? "Bezig met inloggen..." : "Inloggen"}
    </button>
  );
}
