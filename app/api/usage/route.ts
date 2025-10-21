import { NextResponse } from "next/server";

const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_ORG_API_BASE = "https://api.openai.com/v1/organization";
const COMPLETIONS_PATH = "/usage/completions";
const COSTS_PATH = "/costs";
const MAX_COMPLETION_BUCKET_LIMIT = 31;
const MAX_COST_BUCKET_LIMIT = 180;
const MS_PER_DAY = 86_400_000;

type OrganizationBucket<T> = {
  start_time: number;
  end_time: number;
  results?: T[];
};

type OrganizationPage<T> = {
  data?: OrganizationBucket<T>[];
  has_more?: boolean;
  next_page?: string | null;
  error?: { message?: string } | string;
  message?: string;
  details?: unknown;
};

type CompletionResult = {
  input_tokens?: number;
  output_tokens?: number;
  input_cached_tokens?: number;
  input_audio_tokens?: number;
  output_audio_tokens?: number;
  num_model_requests?: number;
  project_id?: string | null;
  user_id?: string | null;
  api_key_id?: string | null;
  model?: string | null;
};

type CostResult = {
  amount?: {
    value?: number | null;
    currency?: string | null;
  };
  project_id?: string | null;
  line_item?: string | null;
};

type NormalizedDailyUsage = {
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
  daily: NormalizedDailyUsage[];
};

class UpstreamError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export const runtime = "edge";

export async function GET(request: Request) {
  const apiKey = resolveUsageApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Missing OPENAI_USAGE_API_KEY environment variable",
      },
      { status: 500 }
    );
  }

  try {
    const url = new URL(request.url);
    const today = toIsoDate(new Date());
    const endDateInput = url.searchParams.get("end_date") ?? today;

    if (!isValidIsoDate(endDateInput)) {
      return NextResponse.json(
        { error: "end_date must be in YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    const endDate = parseIsoDate(endDateInput);
    const startDateInput =
      url.searchParams.get("start_date") ??
      toIsoDate(offsetDate(endDate, -(DEFAULT_WINDOW_DAYS - 1)));

    if (!isValidIsoDate(startDateInput)) {
      return NextResponse.json(
        { error: "start_date must be in YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    const startDate = parseIsoDate(startDateInput);

    if (startDate > endDate) {
      return NextResponse.json(
        { error: "start_date must be earlier than or equal to end_date." },
        { status: 400 }
      );
    }

    const projectOverride = url.searchParams.get("project");
    const projectFromEnv =
      process.env.OPENAI_PROJECT ?? process.env.NEXT_PUBLIC_OPENAI_PROJECT_ID;
    const project = projectOverride?.trim() || projectFromEnv?.trim() || "";

    const orgApiBase =
      process.env.OPENAI_ORG_API_BASE?.trim() ?? DEFAULT_ORG_API_BASE;

    const startTime = toUnixSeconds(startDate);
    const exclusiveEnd = offsetDate(endDate, 1);
    const endTime = toUnixSeconds(exclusiveEnd);
    const dayCount = Math.max(
      1,
      Math.round((exclusiveEnd.getTime() - startDate.getTime()) / MS_PER_DAY)
    );

    const arrayParams: Array<[string, string]> | undefined = project
      ? [["project_ids[]", project]]
      : undefined;

    const completionsBuckets = await collectPagedBuckets<CompletionResult>({
      baseUrl: `${orgApiBase}${COMPLETIONS_PATH}`,
      params: buildBaseParams({
        startTime,
        endTime,
        limit: Math.min(dayCount, MAX_COMPLETION_BUCKET_LIMIT),
        bucketWidth: "1d",
      }),
      headers: buildHeaders(apiKey),
      arrayParams,
      maxPages: 10,
    });

    const costsBuckets = await collectPagedBuckets<CostResult>({
      baseUrl: `${orgApiBase}${COSTS_PATH}`,
      params: buildBaseParams({
        startTime,
        endTime,
        limit: Math.min(dayCount, MAX_COST_BUCKET_LIMIT),
        bucketWidth: "1d",
      }),
      headers: buildHeaders(apiKey),
      arrayParams,
      maxPages: 10,
    });

    const completionAggregate = aggregateCompletions(completionsBuckets);
    const { costAggregate, currency: inferredCurrency } =
      aggregateCosts(costsBuckets);

    const daily: NormalizedDailyUsage[] = [];
    let cursor = new Date(startDate);
    const currency = inferredCurrency ?? "USD";

    for (let i = 0; i < dayCount; i += 1) {
      const key = toIsoDate(cursor);
      const completion = completionAggregate.get(key);
      const cost = costAggregate.get(key);

      const inputTokens = completion?.inputTokens ?? 0;
      const outputTokens = completion?.outputTokens ?? 0;
      const requests = completion?.requests ?? 0;
      const spend = cost?.amount ?? 0;
      const spendCurrency = cost?.currency ?? currency;

      daily.push({
        date: key,
        cost: spend,
        currency: spendCurrency,
        requests,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      });

      cursor = offsetDate(cursor, 1);
    }

    const summary = buildSummary(daily, currency);

    const responsePayload: UsageResponse = {
      range: {
        start_date: toIsoDate(startDate),
        end_date: toIsoDate(endDate),
      },
      summary,
      daily,
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    if (error instanceof UpstreamError) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.payload,
        },
        { status: error.status }
      );
    }

    console.error("Failed to retrieve usage metrics", error);
    return NextResponse.json(
      { error: "Unexpected error retrieving usage metrics." },
      { status: 500 }
    );
  }
}

function resolveUsageApiKey(): string | null {
  return process.env.OPENAI_USAGE_API_KEY?.trim() ?? null;
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function buildBaseParams({
  startTime,
  endTime,
  limit,
  bucketWidth,
}: {
  startTime: number;
  endTime: number;
  limit: number;
  bucketWidth: "1d" | "1h" | "1m";
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("start_time", String(startTime));
  params.set("end_time", String(endTime));
  params.set("bucket_width", bucketWidth);
  params.set("limit", String(limit));
  return params;
}

async function collectPagedBuckets<T>({
  baseUrl,
  params,
  headers,
  arrayParams,
  maxPages,
}: {
  baseUrl: string;
  params: URLSearchParams;
  headers: Record<string, string>;
  arrayParams?: Array<[string, string]>;
  maxPages: number;
}): Promise<OrganizationBucket<T>[]> {
  const buckets: OrganizationBucket<T>[] = [];
  let pageToken: string | null = null;

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const pageParams = new URLSearchParams(params);
    if (pageToken) {
      pageParams.set("page", pageToken);
    }
    if (arrayParams) {
      for (const [key, value] of arrayParams) {
        pageParams.append(key, value);
      }
    }

    const url = `${baseUrl}?${pageParams.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as
      | OrganizationPage<T>
      | Record<string, unknown>;

    if (!response.ok) {
      const message =
        extractOrganizationError(payload) ??
        `${response.status} ${response.statusText}`;
      throw new UpstreamError(response.status, message, payload);
    }

    const parsed = payload as OrganizationPage<T>;
    if (Array.isArray(parsed.data)) {
      buckets.push(...parsed.data);
    }

    if (!parsed.has_more || !parsed.next_page) {
      break;
    }

    pageToken = parsed.next_page;
  }

  return buckets;
}

function aggregateCompletions(
  buckets: OrganizationBucket<CompletionResult>[]
): Map<
  string,
  { inputTokens: number; outputTokens: number; requests: number }
> {
  const aggregate = new Map<
    string,
    { inputTokens: number; outputTokens: number; requests: number }
  >();

  for (const bucket of buckets) {
    const date = toIsoDate(new Date(bucket.start_time * 1000));
    const totals =
      aggregate.get(date) ?? { inputTokens: 0, outputTokens: 0, requests: 0 };

    if (Array.isArray(bucket.results)) {
      for (const result of bucket.results) {
        totals.inputTokens += normalizeNumber(result.input_tokens);
        totals.outputTokens += normalizeNumber(result.output_tokens);
        totals.requests += normalizeNumber(result.num_model_requests);
      }
    }

    aggregate.set(date, totals);
  }

  return aggregate;
}

function aggregateCosts(
  buckets: OrganizationBucket<CostResult>[]
): {
  costAggregate: Map<string, { amount: number; currency: string }>;
  currency: string | null;
} {
  const aggregate = new Map<string, { amount: number; currency: string }>();
  let inferredCurrency: string | null = null;

  for (const bucket of buckets) {
    const date = toIsoDate(new Date(bucket.start_time * 1000));
    let entry = aggregate.get(date);
    if (!entry) {
      entry = { amount: 0, currency: inferredCurrency ?? "USD" };
      aggregate.set(date, entry);
    }

    if (Array.isArray(bucket.results)) {
      for (const result of bucket.results) {
        const amount = normalizeNumber(result.amount?.value);
        if (amount > 0) {
          entry.amount += amount;
        }
        const currency = result.amount?.currency;
        if (currency && !inferredCurrency) {
          inferredCurrency = currency.toUpperCase();
          entry.currency = inferredCurrency;
        }
      }
    }
  }

  return { costAggregate: aggregate, currency: inferredCurrency };
}

function buildSummary(
  daily: NormalizedDailyUsage[],
  currency: string
): UsageSummary {
  const totalCost = daily.reduce((sum, day) => sum + day.cost, 0);
  const totalTokens = daily.reduce((sum, day) => sum + day.totalTokens, 0);
  const totalRequests = daily.reduce((sum, day) => sum + day.requests, 0);
  const averageDailyCost = daily.length > 0 ? totalCost / daily.length : 0;

  return {
    totalCost,
    totalTokens,
    totalRequests,
    averageDailyCost,
    currency,
  };
}

function extractOrganizationError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ("error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string") {
      return error;
    }
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
    ) {
      return ((error as { message?: string }).message ?? "").trim() || null;
    }
  }

  if ("message" in payload && typeof (payload as { message?: unknown }).message === "string") {
    return ((payload as { message: string }).message ?? "").trim() || null;
  }

  return null;
}

function normalizeNumber(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return value;
}

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toIsoDate(date: Date): string {
  const utc = new Date(date.getTime());
  return new Date(utc.getTime() - utc.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function offsetDate(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
