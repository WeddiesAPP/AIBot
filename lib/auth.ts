import { compare } from "bcryptjs";
import {
  USE_DATABASE,
  getAuthSecretFromEnv,
  isAuthConfigured as baseIsAuthConfigured,
} from "./auth-config";
import { query } from "./db";

type RawAuthUser = {
  username?: string;
  password?: string;
  company?: string;
  dashboard?: string;
  label?: string;
  projectId?: string;
};

type AuthUserRow = {
  username: string;
  password_hash: string;
  company: string;
  dashboard_path: string | null;
  label: string | null;
  project_id: string | null;
  is_active: boolean | null;
};

export type AuthUser = {
  username: string;
  passwordHash: string;
  company: string;
  dashboard: string;
  label: string;
  projectId?: string;
};

export type AuthenticatedUser = Omit<AuthUser, "passwordHash">;

const SESSION_COOKIE_NAME = "ck_session";
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const encoder = new TextEncoder();

const AUTH_USERS_TABLE = resolveTableName(process.env.AUTH_USERS_TABLE);

const globalBuffer =
  typeof globalThis !== "undefined" &&
  typeof (globalThis as Record<string, unknown>).Buffer !== "undefined"
    ? ((globalThis as Record<string, unknown>).Buffer as {
        from(
          input: ArrayBufferView | ArrayLike<number> | string,
          encoding?: string
        ): Uint8Array & { toString(encoding: string): string };
      })
    : undefined;

let cachedEnvUsers: AuthUser[] | null = null;
let cachedSecret: string | null | undefined;
let hmacKeyPromise: Promise<CryptoKey> | null = null;

function resolveTableName(value: string | undefined | null): string {
  const raw = value?.trim();
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

function normalizeDashboardPath(
  provided: string | null | undefined,
  company: string
): string {
  if (provided && provided.trim()) {
    const trimmed = provided.trim();
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }
  return `/dashboard/${company}`;
}

function mapRowToAuthUser(row: AuthUserRow): AuthUser {
  return {
    username: row.username,
    passwordHash: row.password_hash,
    company: row.company,
    dashboard: normalizeDashboardPath(row.dashboard_path, row.company),
    label: row.label ?? row.company,
    projectId: row.project_id ?? undefined,
  };
}

function getAuthSecret(): string | null {
  if (cachedSecret !== undefined) {
    return cachedSecret;
  }
  cachedSecret = getAuthSecretFromEnv();
  return cachedSecret;
}

function parseEnvUsers(): AuthUser[] {
  if (USE_DATABASE) {
    return [];
  }

  if (cachedEnvUsers) {
    return cachedEnvUsers;
  }

  const rawConfig = process.env.AUTH_USERS;
  if (!rawConfig) {
    cachedEnvUsers = [];
    return cachedEnvUsers;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawConfig);
  } catch (error) {
    console.error("AUTH_USERS kon niet geparse worden als JSON:", error);
    cachedEnvUsers = [];
    return cachedEnvUsers;
  }

  if (!Array.isArray(parsed)) {
    console.error("AUTH_USERS moet een array zijn van gebruikersobjecten.");
    cachedEnvUsers = [];
    return cachedEnvUsers;
  }

  const users: AuthUser[] = [];

  for (const entry of parsed as RawAuthUser[]) {
    const username = entry.username?.trim();
    const password = entry.password ?? "";
    const company = entry.company?.trim() ?? entry.dashboard?.split("/").pop();

    if (!username || !password || !company) {
      continue;
    }

    const dashboard = normalizeDashboardPath(entry.dashboard, company);
    const label = entry.label?.trim() || company;

    users.push({
      username,
      passwordHash: password,
      company,
      dashboard,
      label,
      projectId: entry.projectId?.trim() || undefined,
    });
  }

  cachedEnvUsers = users;
  return cachedEnvUsers;
}

async function dbFindUserByUsername(username: string): Promise<AuthUser | null> {
  const trimmed = username.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const result = await query<AuthUserRow>(
      `SELECT username, password_hash, company, dashboard_path, label, project_id, COALESCE(is_active, true) AS is_active
       FROM ${AUTH_USERS_TABLE}
       WHERE username = $1
       LIMIT 1`,
      [trimmed]
    );
    if (result.rowCount === 0) {
      return null;
    }
    const row = result.rows[0];
    if (row.is_active === false) {
      return null;
    }
    return mapRowToAuthUser(row);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth] kon gebruiker niet ophalen op username", error);
    }
    return null;
  }
}

async function dbFindUserByCompany(company: string): Promise<AuthUser | null> {
  const trimmed = company.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const result = await query<AuthUserRow>(
      `SELECT username, password_hash, company, dashboard_path, label, project_id, COALESCE(is_active, true) AS is_active
       FROM ${AUTH_USERS_TABLE}
       WHERE company = $1
       LIMIT 1`,
      [trimmed]
    );
    if (result.rowCount === 0) {
      return null;
    }
    const row = result.rows[0];
    if (row.is_active === false) {
      return null;
    }
    return mapRowToAuthUser(row);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth] kon gebruiker niet ophalen op company", error);
    }
    return null;
  }
}

export const isAuthConfigured = baseIsAuthConfigured;

export async function findUserByUsername(
  username: string
): Promise<AuthUser | null> {
  if (USE_DATABASE) {
    return dbFindUserByUsername(username);
  }
  return parseEnvUsers().find((user) => user.username === username) ?? null;
}

export async function findUserByCompany(
  company: string
): Promise<AuthUser | null> {
  if (USE_DATABASE) {
    return dbFindUserByCompany(company);
  }
  return parseEnvUsers().find((user) => user.company === company) ?? null;
}

export async function verifyCredentials(
  username: string,
  password: string
): Promise<AuthenticatedUser | null> {
  const match = await findUserByUsername(username);
  if (!match) {
    return null;
  }

  const passwordLooksHashed = match.passwordHash.startsWith("$2");

  if (USE_DATABASE || passwordLooksHashed) {
    const valid = await compare(password, match.passwordHash);
    if (!valid) {
      return null;
    }
  } else if (match.passwordHash !== password) {
    return null;
  }

  const { passwordHash: _ignored, ...user } = match;
  void _ignored;
  return user;
}

function getSessionTtl(): number {
  const raw = process.env.AUTH_SESSION_MAX_AGE;
  if (!raw) {
    return DEFAULT_SESSION_TTL_SECONDS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_SESSION_TTL_SECONDS;
  }
  return parsed;
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let base64: string;
  if (globalBuffer) {
    base64 = globalBuffer.from(bytes).toString("base64");
  } else {
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  base64 += "===".slice((base64.length + 3) % 4);
  if (globalBuffer) {
    const buf = globalBuffer.from(base64, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  if (hmacKeyPromise) {
    return hmacKeyPromise;
  }
  hmacKeyPromise = crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign", "verify"]
  );
  return hmacKeyPromise;
}

function createPayload(username: string, expiresAt: number): string {
  return `${username}:${expiresAt}`;
}

export type SessionToken = {
  value: string;
  expiresAt: number;
};

export async function createSessionToken(
  username: string
): Promise<SessionToken | null> {
  const secret = getAuthSecret();
  if (!secret) {
    return null;
  }
  const expiresAt = Date.now() + getSessionTtl() * 1000;
  const payload = createPayload(username, expiresAt);
  const key = await getHmacKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  const signature = toBase64Url(signatureBuffer);
  return {
    value: `${payload}.${signature}`,
    expiresAt,
  };
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<AuthenticatedUser | null> {
  if (!token) {
    return null;
  }
  const secret = getAuthSecret();
  if (!secret) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const [username, expiresAtRaw] = payload.split(":");
  const expiresAt = Number.parseInt(expiresAtRaw ?? "", 10);
  if (!username || Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }

  const key = await getHmacKey(secret);
  const providedRaw = fromBase64Url(signature);
  const provided = new Uint8Array(providedRaw);

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    provided,
    encoder.encode(payload)
  );

  if (!isValid) {
    return null;
  }

  const match = await findUserByUsername(username);
  if (!match) {
    return null;
  }

  const { passwordHash: _ignored, ...user } = match;
  void _ignored;
  return user;
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}
