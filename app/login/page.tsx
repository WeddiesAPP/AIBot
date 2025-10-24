import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";

export const metadata = {
  title: "Inloggen",
  description:
    "Log in om toegang te krijgen tot het juiste dashboard voor jouw organisatie.",
};

export default async function LoginPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(getSessionCookieName())?.value;
  const user = await verifySessionToken(sessionCookie);

  if (user) {
    redirect("/chat");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f4f7ff] via-[#eef2ff] to-[#e7ecff] text-slate-900">
      <header className="main-header">
        <div className="main-header__inner">
          <Link
            href="/"
            className="flex items-center gap-3 text-lg font-semibold tracking-tight text-slate-900"
          >
            <Image
              src="/dblabs.png"
              alt="DB Labs logo"
              width={120}
              height={36}
              priority
              className="h-9 w-auto"
            />
          </Link>
          <nav className="main-header__nav">
            <Link href="/#chatbot">Chatbot</Link>
            <Link href="/#aanpak">Aanpak</Link>
            <Link href="/#voorbeelden">Voorbeeld</Link>
            <Link href="/#faq">FAQ</Link>
          </nav>
          <div className="main-header__actions">
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-500 hover:text-indigo-600"
            >
              Terug naar home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col items-center gap-10 px-6 py-20 text-center">
        <span className="glass-badge">
          <span aria-hidden="true" className="glass-wave">
            <span className="glass-wave__segment glass-wave__segment--1" />
            <span className="glass-wave__segment glass-wave__segment--2" />
            <span className="glass-wave__segment glass-wave__segment--3" />
          </span>
          Toegang nodig
        </span>
        <div className="max-w-xl space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Log in om de assistent en het dashboard te openen
          </h1>
          <p className="text-base text-slate-600">
            Gebruik je persoonlijke gegevens om toegang te krijgen tot je
            documentassistent, dashboards en uitnodigingen voor collega’s.
          </p>
        </div>
        <LoginForm />
        <p className="text-sm text-slate-500">
          Nog geen account? Stuur een bericht naar{" "}
          <a
            href="mailto:douwe.brink@gmail.com"
            className="font-semibold text-indigo-600"
          >
            douwe.brink@gmail.com
          </a>{" "}
          voor een uitnodiging.
        </p>
      </main>

      <footer className="main-footer">
        <div className="main-footer__inner">
          <p>&copy; {new Date().getFullYear()} DB Labs. Alle rechten voorbehouden.</p>
          <div className="main-footer__nav">
            <Link href="/#chatbot">Chatbot</Link>
            <Link href="/#aanpak">Aanpak</Link>
            <Link href="/#voorbeelden">Voorbeeld</Link>
            <Link href="/#faq">FAQ</Link>
            <a href="mailto:douwe.brink@gmail.com">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

