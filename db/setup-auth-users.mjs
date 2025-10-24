#!/usr/bin/env node
/**
 * Creates the auth_users table when AUTH_MODE=database is enabled.
 * Uses the same normalisation rules as the runtime auth code.
 */
import { sql as vercelSql } from "@vercel/postgres";
import pg from "pg";
import { loadEnv } from "./env-helpers.mjs";

const { Pool } = pg;

let cachedUseVercel = null;
let pgPool = null;

function normalizeConnectionString(raw) {
  try {
    const normalized = raw.replace(/^postgres(ql)?:\/\//i, "https://");
    return new URL(normalized);
  } catch (_error) {
    return null;
  }
}

function shouldUseVercel(connectionString) {
  if (cachedUseVercel !== null) {
    return cachedUseVercel;
  }
  if (!connectionString) {
    cachedUseVercel = true;
    return cachedUseVercel;
  }
  const parsed = normalizeConnectionString(connectionString);
  if (!parsed) {
    cachedUseVercel = true;
    return cachedUseVercel;
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname.includes("neon.tech") ||
    hostname.endsWith("vercel-storage.com")
  ) {
    cachedUseVercel = true;
  } else {
    if (
      hostname.includes(".supabase.") &&
      typeof process.env.NODE_TLS_REJECT_UNAUTHORIZED === "undefined"
    ) {
      // Supabase uses intermediary certificates that may be missing locally.
      // Disabling verification keeps the helper working without manual CA install.
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
    cachedUseVercel = false;
  }
  return cachedUseVercel;
}

function ensurePgPool(connectionString) {
  if (pgPool) {
    return pgPool;
  }
  const needsSsl =
    /sslmode=require|sslmode=verify-full|sslmode=verify-ca/i.test(
      connectionString
    );
  pgPool = new Pool({
    connectionString,
    ssl: needsSsl
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
  });
  return pgPool;
}

async function runQuery(text, params) {
  const connectionString =
    process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? null;
  if (shouldUseVercel(connectionString)) {
    return vercelSql.query(text, params);
  }
  if (!connectionString) {
    throw new Error("POSTGRES_URL must be set to execute queries.");
  }
  const pool = ensurePgPool(connectionString);
  return pool.query(text, params);
}

function resolveTableName(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return "auth_users";
  }
  const sanitized = raw
    .split(".")
    .map((part) => part.replace(/[^a-zA-Z0-9_]/g, ""))
    .filter(Boolean)
    .join(".");
  return sanitized.length > 0 ? sanitized : "auth_users";
}

function resolveIndexName(tableName) {
  return `idx_${tableName.replace(/\./g, "_")}_company`;
}

async function createExtension() {
  try {
    await runQuery("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "42501" || error.code === "55000")
    ) {
      console.warn(
        "Skipping pgcrypto installation (insufficient privileges). Ensure gen_random_uuid is available."
      );
      return;
    }
    throw error;
  }
}

async function createTable(tableName) {
  await runQuery(
    `CREATE TABLE IF NOT EXISTS ${tableName} (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      company TEXT NOT NULL,
      dashboard_path TEXT NOT NULL DEFAULT '',
      label TEXT NOT NULL DEFAULT '',
      project_id TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );
}

async function createIndex(tableName) {
  const indexName = resolveIndexName(tableName);
  await runQuery(
    `CREATE INDEX IF NOT EXISTS ${indexName}
      ON ${tableName} (company)`
  );
}

async function main() {
  loadEnv();

  const tableName = resolveTableName(process.env.AUTH_USERS_TABLE);

  if (!process.env.POSTGRES_URL) {
    console.error("POSTGRES_URL is not set. Cannot connect to the database.");
    process.exitCode = 1;
    return;
  }

  console.log(`Preparing auth users table "${tableName}"...`);
  await createExtension();
  await createTable(tableName);
  await createIndex(tableName);
  console.log("Auth database ready.");
}

main().catch((error) => {
  console.error("Failed to prepare auth database:", error);
  if (
    typeof process.env.POSTGRES_URL === "string" &&
    process.env.POSTGRES_URL.includes("localhost")
  ) {
    console.error(
      "Tip: ensure your local Postgres instance is running (e.g. `docker compose up -d auth-db`)."
    );
  }
  process.exit(1);
});
