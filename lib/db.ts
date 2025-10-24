import { sql as vercelSql } from "@vercel/postgres";
import pg from "pg";

const { Pool } = pg;

type QueryParams = readonly unknown[] | undefined;

type QueryResult<T> = {
  rows: T[];
  rowCount: number;
};

let pgPool: Pool | null = null;
let preferVercelClient: boolean | null = null;

function normalizeConnectionString(raw: string): URL | null {
  try {
    const normalized = raw.replace(/^postgres(ql)?:\/\//i, "https://");
    return new URL(normalized);
  } catch (_error) {
    return null;
  }
}

function shouldUseVercel(connectionString: string | null): boolean {
  if (preferVercelClient !== null) {
    return preferVercelClient;
  }

  if (!connectionString) {
    preferVercelClient = true;
    return preferVercelClient;
  }

  const parsed = normalizeConnectionString(connectionString);
  if (!parsed) {
    preferVercelClient = true;
    return preferVercelClient;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname.includes("neon.tech") ||
    hostname.endsWith("vercel-storage.com")
  ) {
    preferVercelClient = true;
  } else {
    if (
      hostname.includes(".supabase.") &&
      typeof process.env.NODE_TLS_REJECT_UNAUTHORIZED === "undefined"
    ) {
      // Supabase issues certificates signed by an intermediary that is not
      // always available locally (e.g. on Windows). We relax verification so
      // local scripts and the dev server can connect without extra setup.
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
    preferVercelClient = false;
  }
  return preferVercelClient;
}

function requiresSsl(connectionString: string): boolean {
  return /sslmode=require|sslmode=verify-full|sslmode=verify-ca/i.test(
    connectionString
  );
}

function ensurePgPool(connectionString: string): Pool {
  if (pgPool) {
    return pgPool;
  }
  const useSsl = requiresSsl(connectionString);
  pgPool = new Pool({
    connectionString,
    ssl: useSsl
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
  });
  return pgPool;
}

export async function query<T = unknown>(
  text: string,
  params?: QueryParams
): Promise<QueryResult<T>> {
  const connectionString =
    process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? null;

  if (shouldUseVercel(connectionString)) {
    const result = await vercelSql.query<T>(
      text,
      params ? [...params] : undefined
    );
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? result.rows.length,
    };
  }

  if (!connectionString) {
    throw new Error(
      "POSTGRES_URL (or DATABASE_URL) must be set to query the database."
    );
  }

  const pool = ensurePgPool(connectionString);
  const result = await pool.query<T>(text, params ? [...params] : undefined);
  return {
    rows: result.rows,
    rowCount: typeof result.rowCount === "number" ? result.rowCount : 0,
  };
}
