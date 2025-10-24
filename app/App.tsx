"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatKitPanel, type FactAction } from "@/components/ChatKitPanel";
import { LogoutButton } from "@/components/LogoutButton";

const FALLBACK_PROMPTS = [
  "🔗 Hoe koppel ik Exact Online aan Invantive Cloud?",
  "☁️ Wat moet ik doen voor een PowerBI-Invantive koppeling?",
  "🗂️ Hoe upload ik het RGS schema in PowerBI?",
  "⚡ Hoe stel ik dagelijkse automatiseringen in voor PowerBI dashboards?",
  "📬 Kun je automatische PowerAutomate-mails laten versturen bij alerts?",
  "👀 Hoe monitor ik of PowerBI dashboards succesvol vernieuwd zijn?",
  "🛠️ Welke rollen en toegangsrechten adviseer je in PowerBI?",
  "🧾 Wat is de beste werkwijze bij verwerken van facturen?",
  "🔍 Welke interne controles beveelt Finance RBBLS aan?",
  "🤝 Hoe kan ik rapportages veilig delen met collega’s of externen?",
  "🛡️ Welke beveiligingsmaatregelen gelden voor financiële administratie?",
  "📚 Hoelang moet ik mijn boekhouding bewaren volgens wetgeving?",
  "📈 Hoe stel ik een marge- of trendanalyse op in PowerBI?",
  "✅ Welke stappen zijn cruciaal bij een periodieke rapportage?",
  "📣 Kun je uitleggen wat te doen als data niet laadt?",
  "🕵️‍♂️ Is er hulp bij detectie van fouten of fraude?",
  "💡 Welke best practices gelden voor declaraties en kasstromenbeheer?",
  "📊 Welke KPI’s monitort Finance RBBLS standaard in dashboards?",
  "🔄 Hoe stel ik een nieuwe administratie in bij een klant?",
  "💬 Wat zijn tips voor communicatie over financiële rapportages?",
];

type AppProps = {
  companyName: string;
  contactEmail?: string;
  prompts?: string[];
  isAuthenticated?: boolean;
  dashboardHref?: string;
};

const VISIBLE_PROMPT_COUNT = 2;
const PROMPT_ROTATION_INTERVAL = 10000;
const PROMPT_SLIDE_DURATION = 900;

export default function App({
  companyName,
  contactEmail = "douwe.brink@gmail.com",
  prompts = FALLBACK_PROMPTS,
  isAuthenticated = false,
  dashboardHref = "/dashboard",
}: AppProps) {
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);
  const [scheme] = useState<"light" | "dark">("light");
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const rotationTimeoutRef = useRef<number | null>(null);

  const handleWidgetAction = useCallback(async (action: FactAction) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[ChatKitPanel] widget action", action);
    }
  }, []);

  const handleResponseEnd = useCallback(() => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[ChatKitPanel] response end");
    }
  }, []);

  const handlePromptSelect = useCallback((prompt: string) => {
    setQueuedPrompt(prompt);
  }, []);

  const handlePromptConsumed = useCallback(() => {
    setQueuedPrompt(null);
  }, []);

  const promptWindow = useCallback(
    (startIndex: number) => {
      if (prompts.length === 0) {
        return [];
      }

      const windowSize = Math.min(VISIBLE_PROMPT_COUNT, prompts.length);
      return Array.from({ length: windowSize }, (_, offset) => {
        const nextIndex = (startIndex + offset) % prompts.length;
        return prompts[nextIndex];
      });
    },
    [prompts],
  );

  useEffect(() => {
    setCurrentPromptIndex(0);
    setIsSliding(false);
    if (rotationTimeoutRef.current !== null) {
      window.clearTimeout(rotationTimeoutRef.current);
      rotationTimeoutRef.current = null;
    }
  }, [prompts.length]);

  useEffect(() => {
    if (prompts.length <= VISIBLE_PROMPT_COUNT) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setIsSliding(true);

      if (rotationTimeoutRef.current !== null) {
        window.clearTimeout(rotationTimeoutRef.current);
      }

      rotationTimeoutRef.current = window.setTimeout(() => {
        setCurrentPromptIndex((previous) => {
          const next =
            (previous + VISIBLE_PROMPT_COUNT) % prompts.length;
          return next;
        });
        setIsSliding(false);
        rotationTimeoutRef.current = null;
      }, PROMPT_SLIDE_DURATION);
    }, PROMPT_ROTATION_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
      if (rotationTimeoutRef.current !== null) {
        window.clearTimeout(rotationTimeoutRef.current);
        rotationTimeoutRef.current = null;
      }
    };
  }, [prompts.length]);

  const activePrompts = useMemo(
    () => promptWindow(currentPromptIndex),
    [promptWindow, currentPromptIndex],
  );

  const nextPromptIndex =
    prompts.length === 0
      ? 0
      : (currentPromptIndex + VISIBLE_PROMPT_COUNT) % prompts.length;

  const incomingPrompts = useMemo(
    () => promptWindow(nextPromptIndex),
    [promptWindow, nextPromptIndex],
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-[#0B1220]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-[#1D4ED8] focus:shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
      >
        Direct naar hoofdinhoud
      </a>
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-8 py-8 sm:px-14">
        <header className="flex flex-wrap items-center justify-between gap-8" role="banner">
          <div className="flex items-center gap-5">
            <Image
              src="/red-black.svg"
              alt="Finance RBBLS logo"
              width={74}
              height={74}
              priority
            />
            <div>
              <p className="text-[0.76rem] uppercase tracking-[0.48em] text-[#6F7BCB]">
                {companyName}
              </p>
              <h1 className="text-[1.32rem] font-semibold leading-tight text-[#0B1220]">
                Bedrijfskennis Assistent
              </h1>
            </div>
          </div>
          <nav
            aria-label="Primaire navigatie"
            className="flex items-center gap-3"
          >
            {isAuthenticated ? (
              <>
                <Link
                  href={dashboardHref}
                  className="rounded-full border border-transparent bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_40px_-18px_rgba(37,99,235,0.9)] transition hover:bg-[#1D4ED8] hover:shadow-[0_18px_48px_-16px_rgba(37,99,235,0.75)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7D2FE]"
                >
                  Gebruiksdashboard
                </Link>
                <LogoutButton className="px-4 py-1.5 text-xs" ariaLabel="Uitloggen en sessie beeindigen" />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-transparent bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_40px_-18px_rgba(37,99,235,0.9)] transition hover:bg-[#1D4ED8] hover:shadow-[0_18px_48px_-16px_rgba(37,99,235,0.75)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7D2FE]"
                >
                  Inloggen
                </Link>
                <a
                  href={`mailto:${contactEmail}`}
                  className="rounded-full border border-[#D7DDF2] bg-white/80 px-4 py-1.5 text-xs font-semibold text-[#1D3A8A] shadow-sm transition hover:border-[#A9B6E5] hover:text-[#1B2E72]"
                >
                  Contact
                </a>
              </>
            )}
          </nav>
        </header>

        <section
          id="main-content"
          className="flex flex-1 flex-col items-center justify-center gap-6 text-center"
          aria-labelledby="assistant-intro"
        >
          <div className="space-y-4 rounded-[30px] bg-white px-6 animate-fade-in sm:px-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c7d2ff] bg-white/75 px-5 py-1 text-xs font-semibold uppercase tracking-[0.34em] text-[#4654a3] shadow-[0_12px_28px_-18px_rgba(30,58,138,0.55)]">
              Interne AI-werkruimte
              <span className="h-2 w-2 rounded-full bg-[#20b931] animate-pulse"  />
            </span>
            <h2
              id="assistant-intro"
              className="text-[21px] font-semibold leading-[1.22] text-[#101936] sm:text-[21px]"
            >
              Alle {companyName}-richtlijnen in een helder overzicht.
            </h2>
            <p className="mx-auto max-w-2xl text-[0.9rem] leading-relaxed text-[#4B5563] sm:text-[0.95rem]">
              Stel procesvragen, browse playbooks of controleer compliancedetails. Elk antwoord blijft actueel dankzij de meest recente en intern goedgekeurde documenten.
            </p>
            <div className="mx-auto h-1 w-20 rounded-full bg-[#244BDA]" />
          </div>

          <div className="relative w-full overflow-hidden px-1 text-[0.95rem]">
            <div
              className="flex w-full flex-nowrap"
              style={{
                transform:
                  prompts.length > VISIBLE_PROMPT_COUNT && isSliding
                    ? "translateX(-100%)"
                    : "translateX(0)",
                transition:
                  prompts.length > VISIBLE_PROMPT_COUNT
                    ? isSliding
                      ? `transform ${PROMPT_SLIDE_DURATION}ms cubic-bezier(0.16, 1, 0.3, 1)`
                      : "none"
                    : undefined,
              }}
            >
              <div className="flex w-full shrink-0 items-center justify-center gap-4">
                {activePrompts.map((prompt, index) => (
                  <button
                    key={`active-${(currentPromptIndex + index) % Math.max(prompts.length, 1)}-${prompt}`}
                    type="button"
                    onClick={() => handlePromptSelect(prompt)}
                    className="rounded-full border border-transparent bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_40px_-18px_rgba(37,99,235,0.9)] transition hover:-translate-y-[1px] hover:bg-[#1D4ED8] hover:shadow-[0_18px_48px_-16px_rgba(37,99,235,0.75)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7D2FE]"
                    style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              {prompts.length > VISIBLE_PROMPT_COUNT && (
                <div className="flex w-full shrink-0 items-center justify-center gap-4">
                  {incomingPrompts.map((prompt, index) => (
                    <button
                      key={`incoming-${(nextPromptIndex + index) % prompts.length}-${prompt}`}
                      type="button"
                      onClick={() => handlePromptSelect(prompt)}
                      className="rounded-full border border-transparent bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_40px_-18px_rgba(37,99,235,0.9)] transition hover:-translate-y-[1px] hover:bg-[#1D4ED8] hover:shadow-[0_18px_48px_-16px_rgba(37,99,235,0.75)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7D2FE]"
                      style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="w-full max-w-[1024px] transition-transform duration-300 ease-out hover:-translate-y-1">
            <div className="group relative h-[520px] overflow-hidden rounded-[22px] border border-[#E0E7FF] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition-shadow duration-300 focus-within:shadow-[0_20px_60px_rgba(37,99,235,0.18)] hover:shadow-[0_18px_56px_rgba(37,99,235,0.14)]">
              <ChatKitPanel
                theme={scheme}
                onWidgetAction={handleWidgetAction}
                onResponseEnd={handleResponseEnd}
                //onThemeRequest={setScheme}
                selectedPrompt={queuedPrompt}
                onPromptConsumed={handlePromptConsumed}
              />
            </div>
            <p className="mt-3 text-[0.72rem] uppercase tracking-[0.38em] text-[#5B6B95]">
              Powered by DB Labs
            </p>
          </div>

          
        </section>

        <footer
          className="mt-6 border-t border-slate-200 pt-5 text-xs text-[#8892B0]"
          role="contentinfo"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/dblabs.png"
                alt="DB Labs logo"
                width={120}
                height={32}
              />
              <p>&copy; {new Date().getFullYear()} {companyName} - Alleen intern gebruik</p>
            </div>
            <address className="not-italic">
              <a
                href={`mailto:${contactEmail}`}
                className="rounded-full border border-transparent bg-[#E7ECFF] px-4 py-1.5 text-[#244BDA] transition hover:bg-[#DDE5F5]"
              >
                {contactEmail}
              </a>
            </address>
          </div>
        </footer>
      </div>

   

      <style jsx global>{`
      
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in-up 1.5s ease-out both;
        }
        .yVugO 
        {
        background-color: white !important
        }
        openai-chatkit button[aria-label="Send"],
        openai-chatkit button[aria-label="Verzenden"] {
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

       /* 1) Dwing light UA-styling voor form-controls binnen ChatKit */
openai-chatkit, 
openai-chatkit * {
  color-scheme: light !important;
}

/* 2) Zet de composer en het textarea visueel in light */
openai-chatkit .ifWRv,
openai-chatkit textarea#chatkit-composer-input {
  background: #ffffff !important;
  color: #0B1220 !important;
  border-color: #E5E7EB !important;
}

/* 3) Primary/ghost knoppen expliciet licht maken (zonder reliance op class hashes) */
openai-chatkit button[data-color="primary"][data-variant="solid"] {
  background: #2563EB !important;
  color: #ffffff !important;
  border-color: transparent !important;
}

openai-chatkit button[data-variant="ghost"] {
  background: #E0E7FF !important;
  color: #1E293B !important;
  border-color: transparent !important;
}

/* 4) Placeholder ook donker genoeg */
openai-chatkit textarea#chatkit-composer-input::placeholder {
  color: #64748B !important; /* slate-500-ish */
}

      `}</style>
    </main>
  );
}






