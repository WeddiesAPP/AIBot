"use client";

import Image from "next/image";
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
      className="w-full max-w-md space-y-6 rounded-[26px] border border-[#E0E7FF] bg-white px-8 py-10 text-left shadow-[0_18px_56px_rgba(37,99,235,0.14)] sm:px-12"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <Image
          src="/dblabs.png"
          alt="DB Labs logo"
          width={140}
          height={36}
          priority
        />
        
      </div>

      <div className="space-y-5 text-left">
        <label
          className="block text-xs font-semibold uppercase tracking-[0.24em] text-[#5B6B95]"
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
            className="mt-2 w-full rounded-[18px] border border-[#E0E7FF] bg-white px-4 py-3 text-sm text-[#0B1220] shadow-[0_12px_28px_-20px_rgba(15,23,42,0.6)] transition focus:border-[#244BDA] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
          />
        </label>

        <label
          className="block text-xs font-semibold uppercase tracking-[0.24em] text-[#5B6B95]"
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
            className="mt-2 w-full rounded-[18px] border border-[#E0E7FF] bg-white px-4 py-3 text-sm text-[#0B1220] shadow-[0_12px_28px_-20px_rgba(15,23,42,0.6)] transition focus:border-[#244BDA] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
          />
        </label>
      </div>

      {state?.error ? (
        <p className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 shadow-sm">
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
