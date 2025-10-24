#!/usr/bin/env node
/**
 * Inserts or updates a single auth user record.
 * Usage:
 *   npm run db:seed -- --username finance --password secret --company finance
 * Optional flags:
 *   --dashboard /custom-path
 *   --label "Finance Dashboard"
 *   --projectId proj_123
 *   --inactive
 */
import { sql as vercelSql } from "@vercel/postgres";
import bcrypt from "bcryptjs";
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

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const stripped = arg.slice(2);
    if (stripped.includes("=")) {
      const [key, ...rest] = stripped.split("=");
      result[key] = rest.join("=") ?? "";
      continue;
    }
    const key = stripped;
    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      result[key] = next;
      index += 1;
    } else {
      result[key] = true;
    }
  }
  return result;
}

async function main() {
  loadEnv();

  if (!process.env.POSTGRES_URL) {
    console.error("POSTGRES_URL is not set. Cannot connect to the database.");
    process.exitCode = 1;
    return;
  }

  const options = parseArgs(process.argv);
  const username = options.username?.trim();
  const password = options.password ? String(options.password) : "";
  const company = options.company?.trim();
  const dashboard =
    options.dashboard && String(options.dashboard).trim()
      ? String(options.dashboard).trim()
      : null;
  const label =
    options.label && String(options.label).trim()
      ? String(options.label).trim()
      : null;
  const projectId =
    options.projectId && String(options.projectId).trim()
      ? String(options.projectId).trim()
      : null;
  const inactive = Boolean(options.inactive);

  if (!username || !password || !company) {
    console.error(
      "Missing required flags. Provide --username, --password, and --company."
    );
    process.exit(1);
    return;
  }

  const tableName = resolveTableName(process.env.AUTH_USERS_TABLE);
  const dashboardPath =
    dashboard && dashboard.startsWith("/") ? dashboard : dashboard
      ? `/${dashboard}`
      : `/dashboard/${company}`;
  const labelValue = label ?? company;
  const passwordHash = bcrypt.hashSync(password, 12);

  const params = [
    username,
    passwordHash,
    company,
    dashboardPath,
    labelValue,
    projectId,
    inactive ? false : true
  ];

  await runQuery(
    `INSERT INTO ${tableName} (
      username,
      password_hash,
      company,
      dashboard_path,
      label,
      project_id,
      is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (username) DO UPDATE
    SET
      password_hash = EXCLUDED.password_hash,
      company = EXCLUDED.company,
      dashboard_path = EXCLUDED.dashboard_path,
      label = EXCLUDED.label,
      project_id = EXCLUDED.project_id,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()`,
    params
  );

  console.log(
    `User "${username}" has been ${
      inactive ? "stored as inactive" : "seeded"
    } in ${tableName}.`
  );
}

main().catch((error) => {
  console.error("Failed to seed user:", error);
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
