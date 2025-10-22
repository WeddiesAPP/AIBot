"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

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

type UsageDashboardProps = {
  initialProjectId?: string;
  companyName?: string;
};

export function UsageDashboard({
  initialProjectId,
  companyName,
}: UsageDashboardProps = {}) {
  const initialEndDate = formatDate(new Date());
  const initialStartDate = formatDate(offsetDays(new Date(), -29));
  const defaultProjectId =
    initialProjectId ?? process.env.NEXT_PUBLIC_OPENAI_PROJECT_ID ?? "";
  const companyLabel = companyName ?? "Finance RBBLS";

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [projectId, setProjectId] = useState(defaultProjectId);

  const [queryStartDate, setQueryStartDate] = useState(initialStartDate);
  const [queryEndDate, setQueryEndDate] = useState(initialEndDate);
  const [queryProjectId, setQueryProjectId] = useState(defaultProjectId);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadUsage() {
      if (!queryStartDate || !queryEndDate) {
        return;
      }

      if (new Date(queryStartDate) > new Date(queryEndDate)) {
        setError("De begindatum moet voor of gelijk zijn aan de einddatum.");
        setUsage(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        start_date: queryStartDate,
        end_date: queryEndDate,
      });

      if (queryProjectId.trim()) {
        params.set("project", queryProjectId.trim());
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
  }, [queryStartDate, queryEndDate, queryProjectId, refreshCounter]);

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

  const appliedStartDate = usage?.range.start_date ?? queryStartDate;
  const appliedEndDate = usage?.range.end_date ?? queryEndDate;

  const handleRefresh = useCallback(() => {
    setQueryStartDate(startDate);
    setQueryEndDate(endDate);
    setQueryProjectId(projectId);
    setRefreshCounter((count) => count + 1);
  }, [endDate, projectId, startDate]);

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
                {companyLabel}
              </p>
              <h1 className="text-[1.32rem] font-semibold leading-tight text-[#0B1220]">
                Dashboard gebruik & kosten
              </h1>
            </div>
          </div>
          <Link
            href="/"
             className="rounded-full border border-transparent bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_40px_-18px_rgba(37,99,235,0.9)] transition hover:bg-[#1D4ED8] hover:shadow-[0_18px_48px_-16px_rgba(37,99,235,0.75)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7D2FE]"
          >
            Terug naar assistent
          </Link>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="space-y-4 rounded-[30px]  bg-white px-6 py-10 animate-fade-in sm:px-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c7d2ff] bg-white/75 px-5 py-1 text-xs font-semibold uppercase tracking-[0.34em] text-[#4654a3] shadow-[0_12px_28px_-18px_rgba(30,58,138,0.55)]">
              Rapportage & Inzage
              <span className="h-2 w-2 rounded-full bg-[#244BDA]" />
            </span>
            <h2 className="text-[21px] font-semibold leading-[1.22] text-[#101936] sm:text-[21px]">
              Houd grip op kosten en gebruik van {companyLabel}
            </h2>
            <p className="mx-auto max-w-2xl text-[0.9rem] leading-relaxed text-[#4B5563] sm:text-[0.95rem]">
              Bekijk dagelijkse uitgaven, tokenverbruik en activiteitsniveaus. Pas de periode aan of filter op project om nuance te behouden.
            </p>
            <div className="mx-auto h-1 w-20 rounded-full bg-[#244BDA]" />
          </div>
          <div className="w-full max-w-[1180px] text-left">
            <div className="rounded-[30px] border border-[#E0E7FF] bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] sm:p-8">
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
                onRefresh={handleRefresh}
                isLoading={isLoading}
                projectId={projectId}
                onProjectChange={setProjectId}
              />
              <SummaryCards usage={usage} formatCurrency={formatCurrency} />
            </div>
          </div>
          <div className="w-full max-w-[1180px] space-y-8 text-left">
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

        <section className="w-full max-w-[1024px] self-center rounded-[28px] border border-[#E0E7FF] bg-white px-6 py-4 text-sm text-[#475569] shadow-[0_12px_32px_rgba(15,23,42,0.06)] sm:flex sm:items-center sm:justify-between">
          <p>
            Data getoond van{" "}
            <span className="font-medium text-slate-900">{appliedStartDate}</span>{" "}
            t/m{" "}
            <span className="font-medium text-slate-900">{appliedEndDate}</span>
            {queryProjectId
              ? ` - Project ${queryProjectId.trim()}`
              : " - Alle gekoppelde projecten"}
          </p>
          <p className="mt-2 text-xs text-[#64748B] sm:mt-0">
            De gegevens worden ververst telkens wanneer je het dashboard opent.
          </p>
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
              <p>&copy; {new Date().getFullYear()} {companyLabel} - Alleen intern gebruik</p>
            </div>
            <a
              href="mailto:douwe.brink@gmail.com"
              className="rounded-full border border-transparent bg-[#E8EEF9] px-4 py-1.5 text-slate-600 transition hover:bg-[#DDE5F5]"
            >
              douwe.brink@gmail.com
            </a>
          </div>
        </footer>
      </div>
    </main>
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
    <div className="mb-8 flex flex-col gap-6 border-b border-[#E0E7FF] pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {QUICK_RANGES.map((range) => (
          <button
            key={range.days}
            type="button"
            className={`rounded-full border px-4 py-2 text-sm transition ${
              isActiveRange(startDate, endDate, range.days)
                ? "border-transparent bg-[#2563EB] text-white shadow-[0_12px_28px_-16px_rgba(37,99,235,0.65)] hover:bg-[#1D4ED8]"
                : "border-[#E0E7FF] bg-white text-[#1E293B] shadow-[0_10px_22px_-18px_rgba(30,64,175,0.4)] hover:border-[#244BDA]/40 hover:text-[#1E3A8A]"
            }`}
            onClick={() => onSelectRange(range.days)}
            disabled={isLoading && isActiveRange(startDate, endDate, range.days)}
          >
            {range.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-col text-xs font-medium uppercase tracking-[0.2em] text-[#5B6B95]">
          Startdatum
          <input
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            className="mt-1 rounded-xl border border-[#E0E7FF] bg-white px-3 py-2 text-sm text-[#1E293B] shadow-[0_8px_20px_-16px_rgba(30,64,175,0.4)] focus:border-[#244BDA] focus:outline-none"
          />
        </label>
        <label className="flex flex-col text-xs font-medium uppercase tracking-[0.2em] text-[#5B6B95]">
          Einddatum
          <input
            type="date"
            value={endDate}
            max={formatDate(new Date())}
            onChange={(event) => onEndDateChange(event.target.value)}
            className="mt-1 rounded-xl border border-[#E0E7FF] bg-white px-3 py-2 text-sm text-[#1E293B] shadow-[0_8px_20px_-16px_rgba(30,64,175,0.4)] focus:border-[#244BDA] focus:outline-none"
          />
        </label>
        <label className="flex flex-col text-xs font-medium uppercase tracking-[0.2em] text-[#5B6B95]">
          Project (optioneel)
          <input
            type="text"
            value={projectId}
            placeholder="proj_..."
            onChange={(event) => onProjectChange(event.target.value)}
            className="mt-1 rounded-xl border border-[#E0E7FF] bg-white px-3 py-2 text-sm text-[#1E293B] shadow-[0_8px_20px_-16px_rgba(30,64,175,0.4)] focus:border-[#244BDA] focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="self-end rounded-full border border-transparent px-5 py-2 text-sm font-medium text-white transition disabled:border-[#CBD5F5] disabled:bg-[#E0E7FF] disabled:text-[#64748B]"
          style={{
            background: isLoading ? undefined : "#2563EB",
            boxShadow: isLoading
              ? undefined
              : "0 12px 28px -16px rgba(37,99,235,0.6)",
          }}
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

type ChartPoint = DailyUsage & {
  x: number;
  y: number;
};

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
  const chartHeight = 100;
  const chartWidth = 250;
  const viewBoxPaddingX = 5;
  const viewBoxWidth = chartWidth + viewBoxPaddingX * 2;

  const chartPoints = useMemo<ChartPoint[]>(() => {
    if (data.length === 0) {
      return [];
    }
    const maxCost = maxValue || Math.max(...data.map((point) => point.cost));
    const safeMax = maxCost === 0 ? 1 : maxCost;
    const usableWidth = chartWidth;
    return data.map((point, index) => {
      const x =
        data.length === 1 ? usableWidth / 2 : (index / (data.length - 1)) * usableWidth;
      const y = chartHeight - (point.cost / safeMax) * chartHeight;
      return {
        ...point,
        x,
        y,
      };
    });
  }, [chartWidth, data, maxValue]);

  const areaPath = useMemo(() => {
    if (chartPoints.length === 0) {
      return `0,${chartHeight} ${chartWidth},${chartHeight}`;
    }
    return chartPoints.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  }, [chartPoints, chartHeight, chartWidth]);

  const costLabels = useMemo(() => {
    if (chartPoints.length === 0) {
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
  }, [chartPoints.length, data, maxValue]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activePoint = activeIndex == null ? null : chartPoints[activeIndex];

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (chartPoints.length === 0) {
        return;
      }
      const bounds = event.currentTarget.getBoundingClientRect();
      const svgX =
        ((event.clientX - bounds.left) / bounds.width) * viewBoxWidth - viewBoxPaddingX;
      const clampedX = Math.max(0, Math.min(chartWidth, svgX));

      let closestIndex = 0;
      let smallestDelta = Number.POSITIVE_INFINITY;
      chartPoints.forEach((point, index) => {
        const delta = Math.abs(point.x - clampedX);
        if (delta < smallestDelta) {
          smallestDelta = delta;
          closestIndex = index;
        }
      });

      setActiveIndex(closestIndex);
    },
    [chartPoints, chartWidth, viewBoxPaddingX, viewBoxWidth]
  );

  const handlePointerLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Dagelijkse kostentrend
          </h2>
          <p className="text-xs text-slate-500">
            Waarden in {formatCurrency.resolvedOptions().currency}
          </p>
        </div>
        {activePoint ? (
          <div className="rounded-2xl bg-slate-100 px-4 py-2 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">{activePoint.date}</p>
            <p>{formatCurrency.format(activePoint.cost)} &middot; {activePoint.requests} verzoeken</p>
            <p>{numberFormatter.format(activePoint.totalTokens)} tokens totaal</p>
          </div>
        ) : null}
      </div>
      <div className="relative mt-6 h-80 w-full">
        <svg
          viewBox={`${-viewBoxPaddingX} 0 ${viewBoxWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <defs>
            <linearGradient id="costLineGradient" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gridLineGradient" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0" />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <rect
            x="0"
            y="0"
            width={chartWidth}
            height={chartHeight}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="0.5"
            rx="2"
          />
          {costLabels?.map((label) => (
            <g key={label.fraction}>
              <line
                x1="0"
                y1={label.fraction * chartHeight}
                x2={chartWidth}
                y2={label.fraction * chartHeight}
                stroke="#e2e8f0"
                strokeWidth="0.4"
                strokeDasharray="2,4"
              />
              <text
                x="-3.5"
                y={label.fraction * chartHeight + 4}
                fontSize="4"
                fill="#94a3b8"
              >
                {formatCurrency.format(label.value)}
              </text>
            </g>
          ))}
          {chartPoints.length > 0 ? (
            <>
              <polygon
                points={`${areaPath} ${chartWidth},${chartHeight} 0,${chartHeight}`}
                fill="url(#costLineGradient)"
                opacity="0.4"
              />
              <polyline
                fill="none"
                stroke="#0f172a"
                strokeWidth="2"
                points={areaPath}
                vectorEffect="non-scaling-stroke"
              />
              {chartPoints.map((point) => (
                <circle
                  key={point.date}
                  cx={point.x}
                  cy={point.y}
                  r="0.75"
                  fill="#0f172a"
                  opacity="0.45"
                />
              ))}
              {activePoint ? (
                <>
                  <line
                    x1={activePoint.x}
                    y1="0"
                    x2={activePoint.x}
                    y2={chartHeight}
                    stroke="url(#gridLineGradient)"
                    strokeWidth="0.7"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="2"
                    fill="#6366f1"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                </>
              ) : null}
            </>
          ) : null}
          <rect
            x="0"
            y="0"
            width={chartWidth}
            height={chartHeight}
            fill="transparent"
          />
        </svg>
        {activePoint ? (
          <div
            className="pointer-events-none absolute top-3 translate-x-[-50%] rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-700 shadow-lg backdrop-blur"
            style={{ left: `${(activePoint.x / chartWidth) * 100}%` }}
          >
            <p className="font-semibold text-slate-900">{formatCurrency.format(activePoint.cost)}</p>
            <p>{activePoint.date}</p>
          </div>
        ) : null}
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
