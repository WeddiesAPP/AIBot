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
    redirect("/");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-[#0B1220]">
      <a
        href="#login-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-[#1D4ED8] focus:shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
      >
        Direct naar inlogformulier
      </a>
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-8 sm:px-14">
        <header className="flex flex-wrap items-center justify-between gap-8" role="banner">
          <div className="flex items-center gap-5">
            <img
              src="/dblabs.png"
              alt="DB Labs logo"
              width={120}
              height='auto'
              loading="eager"
              className="w-[120px]"
            />
            <div>
              <p className="text-[0.76rem] uppercase tracking-[0.48em] text-[#6F7BCB]">
                DBLabs Portaal
              </p>
              <h1 className="text-[1.32rem] font-semibold leading-tight text-[#0B1220]">
                Welkom terug
              </h1>
            </div>
          </div>
        </header>

        <section
          id="login-main"
          className="flex flex-1 flex-col items-center justify-center gap-8 text-center"
          aria-labelledby="login-heading"
        >
          <div className="space-y-4 max-w-xl">
            
              <span className="h-2 w-2 rounded-full bg-[#20b931] animate-pulse" />
           
            <h2
              id="login-heading"
              className="text-[21px] font-semibold leading-[1.22] text-[#101936]"
            >
              Meld je aan om toegang te krijgen tot de chatbot.
            </h2>
            
          </div>
          <LoginForm />
        </section>

        <footer
          className="mt-8 border-t border-slate-200 pt-5 text-xs text-[#8892B0]"
          role="contentinfo"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/dblabs.png"
                alt="DB Labs logo"
                width={120}
                height='auto'
                loading="eager"
                className="w-[120px]"
              />
              <p>&copy; {new Date().getFullYear()} DBLabs - Alleen intern gebruik</p>
            </div>
            <address className="not-italic">
              <a
                href="mailto:douwe.brink@gmail.com"
                className="rounded-full border border-transparent bg-[#E7ECFF] px-4 py-1.5 text-[#244BDA] transition hover:bg-[#DDE5F5]"
              >
                douwe.brink@gmail.com
              </a>
            </address>
          </div>
        </footer>
      </div>
    </main>
  );
}
