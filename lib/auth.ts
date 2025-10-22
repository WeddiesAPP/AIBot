type RawAuthUser = {
  username?: string;
  password?: string;
  company?: string;
  dashboard?: string;
  label?: string;
  projectId?: string;
};

export type AuthUser = {
  username: string;
  password: string;
  company: string;
  dashboard: string;
  label: string;
  projectId?: string;
};

export type AuthenticatedUser = Omit<AuthUser, "password">;

const SESSION_COOKIE_NAME = "ck_session";
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const encoder = new TextEncoder();
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

let cachedUsers: AuthUser[] | null = null;
let cachedSecret: string | null | undefined;
let hmacKeyPromise: Promise<CryptoKey> | null = null;

function getAuthSecret(): string | null {
  if (cachedSecret !== undefined) {
    return cachedSecret;
  }
  cachedSecret = process.env.AUTH_SECRET?.trim() || null;
  return cachedSecret;
}

function parseUsers(): AuthUser[] {
  if (cachedUsers) {
    return cachedUsers;
  }

  const rawConfig = process.env.AUTH_USERS;
  if (!rawConfig) {
    cachedUsers = [];
    return cachedUsers;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawConfig);
  } catch (error) {
    console.error("AUTH_USERS kon niet geparse worden als JSON:", error);
    cachedUsers = [];
    return cachedUsers;
  }

  if (!Array.isArray(parsed)) {
    console.error("AUTH_USERS moet een array zijn van gebruikersobjecten.");
    cachedUsers = [];
    return cachedUsers;
  }

  const users: AuthUser[] = [];

  for (const entry of parsed as RawAuthUser[]) {
    const username = entry.username?.trim();
    const password = entry.password ?? "";
    const company = entry.company?.trim() ?? entry.dashboard?.split("/").pop();

    if (!username || !password || !company) {
      continue;
    }

    let dashboard = entry.dashboard?.trim();
    if (!dashboard) {
      dashboard = `/dashboard/${company}`;
    } else if (!dashboard.startsWith("/")) {
      dashboard = `/${dashboard}`;
    }

    const label = entry.label?.trim() || company;

    users.push({
      username,
      password,
      company,
      dashboard,
      label,
      projectId: entry.projectId?.trim() || undefined,
    });
  }

  cachedUsers = users;
  return cachedUsers;
}

export function getAuthUsers(): AuthUser[] {
  return parseUsers();
}

export function findUserByUsername(username: string): AuthUser | undefined {
  return parseUsers().find((user) => user.username === username);
}

export function findUserByCompany(company: string): AuthUser | undefined {
  return parseUsers().find((user) => user.company === company);
}

export function verifyCredentials(
  username: string,
  password: string
): AuthenticatedUser | null {
  const match = findUserByUsername(username);
  if (!match) {
    return null;
  }

  if (match.password !== password) {
    return null;
  }

  const { password: _password, ...rest } = match;
  void _password;
  return rest;
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

  const match = findUserByUsername(username);
  if (!match) {
    return null;
  }

  const { password: _password, ...user } = match;
  void _password;
  return user;
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}
