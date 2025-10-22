import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import {
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/auth";

export const metadata = {
  title: "Inloggen",
  description:
    "Log in om toegang te krijgen tot het juiste usage dashboard voor jouw organisatie.",
};

export default async function LoginPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(getSessionCookieName())?.value;
  const user = await verifySessionToken(sessionCookie);

  if (user) {
    redirect(user.dashboard);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 px-4 py-12 text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.08),_transparent_60%)]" />
      <div className="relative w-full max-w-xl space-y-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Finance Portaal
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Welkom terug
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Meld je aan om gebruiksinformatie en kosten per bedrijf te bekijken.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
