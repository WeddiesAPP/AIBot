"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import { ChatKitPanel, type FactAction } from "@/components/ChatKitPanel";

const FALLBACK_PROMPTS = [
  "Hoe boek ik een factuur?",
  "Geef me de onboarding-checklist.",
  "Wat is de DevOps-procedure voor PowerBI?",
];

type AppProps = {
  companyName: string;
  contactEmail?: string;
  prompts?: string[];
};

export default function App({
  companyName,
  contactEmail = "douwe.brink@gmail.com",
  prompts = FALLBACK_PROMPTS,
}: AppProps) {
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);

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

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-[#0B1220]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-8 py-8 sm:px-14">
        <header className="flex flex-wrap items-center justify-between gap-8">
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
          <Link
            href="/dashboard"
            className="rounded-full border border-transparent bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_40px_-18px_rgba(37,99,235,0.9)] transition hover:bg-[#1D4ED8] hover:shadow-[0_18px_48px_-16px_rgba(37,99,235,0.75)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7D2FE]"
          >
            Gebruiksdashboard
          </Link>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="space-y-4 rounded-[30px]  bg-white px-6 py-10 animate-fade-in sm:px-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c7d2ff] bg-white/75 px-5 py-1 text-xs font-semibold uppercase tracking-[0.34em] text-[#4654a3] shadow-[0_12px_28px_-18px_rgba(30,58,138,0.55)]">
              Interne AI-werkruimte
              <span className="h-2 w-2 rounded-full bg-[#20b931] animate-pulse"  />
            </span>
            <h2 className="text-[21px] font-semibold leading-[1.22] text-[#101936] sm:text-[21px]">
              Alle {companyName}-richtlijnen in een helder overzicht.
            </h2>
            <p className="mx-auto max-w-2xl text-[0.9rem] leading-relaxed text-[#4B5563] sm:text-[0.95rem]">
              Stel procesvragen, browse playbooks of controleer compliancedetails. Elk antwoord blijft actueel dankzij de meest recente en intern goedgekeurde documenten.
            </p>
            <div className="mx-auto h-1 w-20 rounded-full bg-[#244BDA]" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[0.95rem]">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handlePromptSelect(prompt)}
                className="rounded-full border border-transparent bg-[#E0E7FF] px-6 py-2 text-[#1E293B] shadow-[0_14px_28px_-16px_rgba(30,64,175,0.6)] transition-transform duration-200 hover:-translate-y-[2px] hover:border-[#244BDA]/40 hover:bg-[#DBE2FF] hover:text-[#1E3A8A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#244BDA]"
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className="w-full max-w-[1024px] transition-transform duration-300 ease-out hover:-translate-y-1">
            <div className="group relative h-[520px] overflow-hidden rounded-[22px] border border-[#E0E7FF] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition-shadow duration-300 focus-within:shadow-[0_20px_60px_rgba(37,99,235,0.18)] hover:shadow-[0_18px_56px_rgba(37,99,235,0.14)]">
              <ChatKitPanel
                theme="light"
                onWidgetAction={handleWidgetAction}
                onResponseEnd={handleResponseEnd}
                selectedPrompt={queuedPrompt}
                onPromptConsumed={handlePromptConsumed}
              />
            </div>
            <p className="mt-3 text-[0.72rem] uppercase tracking-[0.38em] text-[#5B6B95]">
              Powered by DB Labs
            </p>
          </div>

          
        </section>

        <footer className="mt-6 border-t border-slate-200 pt-5 text-xs text-[#8892B0]">
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
            <a
              href={`mailto:${contactEmail}`}
              className="rounded-full border border-transparent bg-[#E7ECFF] px-4 py-1.5 text-[#244BDA] transition hover:bg-[#DDE5F5]"
            >
              {contactEmail}
            </a>
          </div>
        </footer>
      </div>

   

      <style jsx global>{`
      :root, html, body { color-scheme: light !important; }

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

        openai-chatkit button[aria-label="Send"],
        openai-chatkit button[aria-label="Verzenden"] {
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        /* 1) Dwing light UA-styling voor form-controls binnen ChatKit */
        openai-chatkit,
        openai-chatkit * {
          color-scheme: light !important;
        }

        /* 2) Composercontainer volledig wit */
        openai-chatkit [data-expanded],
        openai-chatkit [data-expanded] *,
        openai-chatkit textarea#chatkit-composer-input {
          background: #ffffff !important;
          color: #0b1220 !important;
          border-color: #e5e7eb !important;
        }

        /* 3) Buttons consistent */
        openai-chatkit button[data-color="primary"][data-variant="solid"],
        openai-chatkit button[data-color="primary"][data-variant="solid"] * {
          background: #2563eb !important;
          color: #ffffff !important;
          border-color: transparent !important;
        }

        openai-chatkit button[data-variant="ghost"],
        openai-chatkit button[data-variant="ghost"] * {
          background: #ffffff !important;
          color: #1e293b !important;
          border-color: rgba(15, 23, 42, 0.08) !important;
        }

        /* 4) Placeholder en icons */
        openai-chatkit textarea#chatkit-composer-input::placeholder {
          color: #64748b !important;
          opacity: 0.7 !important;
        }

        openai-chatkit button svg {
          color: currentColor !important;
          stroke: currentColor !important;
        }

      `}</style>
    </main>
  );
}
