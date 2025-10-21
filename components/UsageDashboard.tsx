"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DailyUsage = {
  date: string;
  cost: number;
  currency: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

type UsageSummary = {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  averageDailyCost: number;
  currency: string;
};

type UsageResponse = {
  range: {
    start_date: string;
    end_date: string;
  };
  summary: UsageSummary;
  daily: DailyUsage[];
};

const QUICK_RANGES = [
  { label: "7 dagen", days: 7 },
  { label: "30 dagen", days: 30 },
  { label: "90 dagen", days: 90 },
];

const numberFormatter = new Intl.NumberFormat("nl-NL");

const euroFormatter = (currency: string) =>
  new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function UsageDashboard() {
  const [startDate, setStartDate] = useState(() =>
    formatDate(offsetDays(new Date(), -29))
  );
  const [endDate, setEndDate] = useState(() => formatDate(new Date()));
  const [projectId, setProjectId] = useState(
    () => process.env.NEXT_PUBLIC_OPENAI_PROJECT_ID ?? ""
  );
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadUsage() {
      if (!startDate || !endDate) {
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        setError("De begindatum moet vóór of gelijk zijn aan de einddatum.");
        setUsage(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });

      if (projectId.trim()) {
        params.set("project", projectId.trim());
      }

      try {
        const response = await fetch(`/api/usage?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => null)) as
          | { error?: string; details?: unknown }
          | null;

        if (!response.ok) {
          const detailMessage = extractUsageError(payload);
          throw new Error(
            detailMessage ?? `Usage API gaf ${response.status} ${response.statusText}`
          );
        }

        const json = payload as UsageResponse;
        if (!cancelled) {
          setUsage(json);
        }
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Failed to load usage data", fetchError);
        setUsage(null);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Kan de gebruiksgegevens niet laden."
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadUsage();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [startDate, endDate, projectId]);

  const sortedDaily = useMemo(() => {
    if (!usage?.daily) {
      return [];
    }
    return [...usage.daily].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [usage]);

  const maxSpend = useMemo(() => {
    if (sortedDaily.length === 0) {
      return 0;
    }
    const maxCost = Math.max(...sortedDaily.map((day) => day.cost));
    return maxCost === 0 ? 0 : maxCost * 1.1;
  }, [sortedDaily]);

  const currency = usage?.summary.currency ?? "EUR";
  const formatCurrency = useMemo(() => euroFormatter(currency), [currency]);

  const appliedStartDate = usage?.range.start_date ?? startDate;
  const appliedEndDate = usage?.range.end_date ?? endDate;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-100 to-slate-200 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-6 py-12 sm:px-14">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/acme-logo.svg"
              alt="Finance RBBLS logo"
              width={40}
              height={40}
              priority
            />
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                Finance RBBLS
              </p>
              <h1 className="text-xl font-semibold text-slate-900">
                Dashboard gebruik & kosten
              </h1>
            </div>
          </div>
          <Link
            href="/"
            className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Terug naar assistent
          </Link>
        </header>

        <section className="flex-1 grid gap-8 py-10">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
            <Controls
              startDate={startDate}
              endDate={endDate}
              onSelectRange={(days) => {
                const today = new Date();
                setEndDate(formatDate(today));
                setStartDate(formatDate(offsetDays(today, -(days - 1))));
              }}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onRefresh={() => {
                setEndDate(formatDate(new Date()));
              }}
              isLoading={isLoading}
              projectId={projectId}
              onProjectChange={setProjectId}
            />
            <SummaryCards usage={usage} formatCurrency={formatCurrency} />
          </div>
          <div className="grid gap-8">
            <UsageTrendChart
              data={sortedDaily}
              maxValue={maxSpend}
              formatCurrency={formatCurrency}
            />
            <DailyBreakdown
              data={sortedDaily}
              isLoading={isLoading}
              error={error}
              formatCurrency={formatCurrency}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/70 px-6 py-4 text-sm text-slate-600 sm:flex sm:items-center sm:justify-between">
          <p>
            Data getoond van{" "}
            <span className="font-medium text-slate-900">{appliedStartDate}</span>{" "}
            t/m{" "}
            <span className="font-medium text-slate-900">{appliedEndDate}</span>
            {projectId
              ? ` · Project ${projectId.trim()}`
              : " · Alle gekoppelde projecten"}
          </p>
          <p className="mt-2 text-xs text-slate-500 sm:mt-0">
            De gegevens worden ververst telkens wanneer je het dashboard opent.
          </p>
        </section>

        <footer className="border-t border-slate-200 pt-6 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/douwebrink-logo.svg"
                alt="Douwe Brink logo"
                width={120}
                height={28}
              />
              <p>
                &copy; {new Date().getFullYear()} Finance RBBLS · Alleen intern gebruik
              </p>
            </div>
            <a
              href="mailto:ops@financerbbls.com"
              className="text-slate-500 transition hover:text-slate-700"
            >
              ops@financerbbls.com
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

type ControlsProps = {
  startDate: string;
  endDate: string;
  onSelectRange: (days: number) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  projectId: string;
  onProjectChange: (value: string) => void;
};

function Controls({
  startDate,
  endDate,
  onSelectRange,
  onStartDateChange,
  onEndDateChange,
  onRefresh,
  isLoading,
  projectId,
  onProjectChange,
}: ControlsProps) {
  return (
    <div className="mb-8 flex flex-col gap-6 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {QUICK_RANGES.map((range) => (
          <button
            key={range.days}
            type="button"
            className={`rounded-full border px-4 py-2 text-sm transition ${
              isActiveRange(startDate, endDate, range.days)
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
            onClick={() => onSelectRange(range.days)}
            disabled={isLoading && isActiveRange(startDate, endDate, range.days)}
          >
            {range.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-col text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          Startdatum
          <input
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-900 focus:outline-none"
          />
        </label>
        <label className="flex flex-col text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          Einddatum
          <input
            type="date"
            value={endDate}
            max={formatDate(new Date())}
            onChange={(event) => onEndDateChange(event.target.value)}
            className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-900 focus:outline-none"
          />
        </label>
        <label className="flex flex-col text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          Project (optioneel)
          <input
            type="text"
            value={projectId}
            placeholder="proj_..."
            onChange={(event) => onProjectChange(event.target.value)}
            className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-900 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="self-end rounded-full border border-slate-900 px-5 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-900 hover:text-white disabled:border-slate-200 disabled:text-slate-400"
        >
          Vernieuw
        </button>
      </div>
    </div>
  );
}

type SummaryCardsProps = {
  usage: UsageResponse | null;
  formatCurrency: Intl.NumberFormat;
};

function SummaryCards({ usage, formatCurrency }: SummaryCardsProps) {
  if (!usage) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 rounded-2xl border border-slate-200 bg-slate-100/60"
          />
        ))}
      </div>
    );
  }

  const { summary } = usage;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="Totale kosten"
        value={formatCurrency.format(summary.totalCost)}
        helper="Totaal verbruik binnen de geselecteerde periode."
      />
      <SummaryCard
        label="Gemiddeld per dag"
        value={formatCurrency.format(summary.averageDailyCost)}
        helper="Gemiddelde kosten per dag voor prognoses."
      />
      <SummaryCard
        label="Totaal tokens"
        value={numberFormatter.format(summary.totalTokens)}
        helper="Combinatie van input- en outputtokens."
      />
      <SummaryCard
        label="Totaal verzoeken"
        value={numberFormatter.format(summary.totalRequests)}
        helper="Aantal verwerkte assistant-verzoeken."
      />
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  helper: string;
};

function SummaryCard({ label, value, helper }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

type UsageTrendChartProps = {
  data: DailyUsage[];
  maxValue: number;
  formatCurrency: Intl.NumberFormat;
};

function UsageTrendChart({
  data,
  maxValue,
  formatCurrency,
}: UsageTrendChartProps) {
  const chartPoints = useMemo(() => {
    if (data.length === 0) {
      return "0,100 100,100";
    }
    const maxCost = maxValue || Math.max(...data.map((point) => point.cost));
    const safeMax = maxCost === 0 ? 1 : maxCost;
    return data
      .map((point, index) => {
        const x =
          data.length === 1 ? 0 : (index / (data.length - 1)) * 100;
        const y = 100 - (point.cost / safeMax) * 100;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [data, maxValue]);

  const costLabels = useMemo(() => {
    if (data.length === 0) {
      return null;
    }
    const maxCost = maxValue || Math.max(...data.map((point) => point.cost));
    return [0, 0.5, 1].map((fraction) => {
      const value = maxCost * (1 - fraction);
      return {
        fraction,
        value,
      };
    });
  }, [data, maxValue]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Dagelijkse kostentrend
        </h2>
        <p className="text-xs text-slate-500">
          Waarden in {formatCurrency.resolvedOptions().currency}
        </p>
      </div>
      <div className="mt-5 h-72 w-full">
        <svg viewBox="-5 -5 110 110" className="h-full w-full">
          <defs>
            <linearGradient id="costLineGradient" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect
            x="0"
            y="0"
            width="100"
            height="100"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="0.5"
            rx="2"
          />
          {costLabels?.map((label) => (
            <g key={label.fraction}>
              <line
                x1="0"
                y1={label.fraction * 100}
                x2="100"
                y2={label.fraction * 100}
                stroke="#e2e8f0"
                strokeWidth="0.4"
                strokeDasharray="2,4"
              />
              <text
                x="-2"
                y={label.fraction * 100 + 4}
                fontSize="4"
                fill="#94a3b8"
              >
                {formatCurrency.format(label.value)}
              </text>
            </g>
          ))}
          <polyline
            fill="none"
            stroke="#0f172a"
            strokeWidth="2"
            points={chartPoints}
            vectorEffect="non-scaling-stroke"
          />
          <polygon
            points={`${chartPoints} 100,100 0,100`}
            fill="url(#costLineGradient)"
            opacity="0.4"
          />
        </svg>
      </div>
    </div>
  );
}

type DailyBreakdownProps = {
  data: DailyUsage[];
  isLoading: boolean;
  error: string | null;
  formatCurrency: Intl.NumberFormat;
};

function DailyBreakdown({
  data,
  isLoading,
  error,
  formatCurrency,
}: DailyBreakdownProps) {
  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
        <p className="text-sm font-semibold">Gebruik niet beschikbaar</p>
        <p className="mt-2 text-sm text-rose-600">{error}</p>
        <p className="mt-4 text-xs text-rose-500">
          Controleer of de Usage API voor je sleutel is ingeschakeld en of het juiste project-ID wordt gebruikt.
        </p>
      </div>
    );
  }

  if (isLoading && data.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-12 rounded-xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Geen gebruiksgegevens gevonden voor deze periode.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-[0.2em] text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Datum</th>
            <th className="px-4 py-3 text-right">Kosten</th>
            <th className="px-4 py-3 text-right">Verzoeken</th>
            <th className="px-4 py-3 text-right">Inputtokens</th>
            <th className="px-4 py-3 text-right">Outputtokens</th>
            <th className="px-4 py-3 text-right">Totaal tokens</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
          {data.map((day) => (
            <tr key={day.date}>
              <td className="px-4 py-3 text-left font-medium text-slate-700">
                {day.date}
              </td>
              <td className="px-4 py-3 text-right text-slate-700">
                {formatCurrency.format(day.cost)}
              </td>
              <td className="px-4 py-3 text-right">
                {numberFormatter.format(day.requests)}
              </td>
              <td className="px-4 py-3 text-right">
                {numberFormatter.format(day.inputTokens)}
              </td>
              <td className="px-4 py-3 text-right">
                {numberFormatter.format(day.outputTokens)}
              </td>
              <td className="px-4 py-3 text-right">
                {numberFormatter.format(day.totalTokens)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function isActiveRange(startDate: string, endDate: string, days: number) {
  const expectedStart = formatDate(
    offsetDays(new Date(endDate), -(days - 1))
  );
  return startDate === expectedStart;
}

function formatDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function offsetDays(date: Date, days: number) {
  const cloned = new Date(date);
  cloned.setDate(cloned.getDate() + days);
  return cloned;
}

function extractUsageError(
  payload: { error?: string; details?: unknown } | null
): string | null {
  if (!payload) {
    return null;
  }

  if (payload.error && payload.error.trim()) {
    return payload.error.trim();
  }

  const details = payload.details;
  if (typeof details === "string" && details.trim()) {
    return details.trim();
  }

  if (details && typeof details === "object") {
    const record = details as Record<string, unknown>;
    const errorValue = record.error;
    if (typeof errorValue === "string" && errorValue.trim()) {
      return errorValue.trim();
    }
    const messageValue = record.message;
    if (typeof messageValue === "string" && messageValue.trim()) {
      return messageValue.trim();
    }
  }

  return null;
}
