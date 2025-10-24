type AuthMode = "env" | "database";

function normalizeMode(value: string | undefined | null): AuthMode {
  if (typeof value !== "string") {
    return "env";
  }
  return value.trim().toLowerCase() === "database" ? "database" : "env";
}

function envUsersConfigured(): boolean {
  const raw = process.env.AUTH_USERS;
  if (!raw) {
    return false;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch (error) {
    console.error("AUTH_USERS kon niet geparse worden als JSON:", error);
    return false;
  }
}

export const AUTH_MODE: AuthMode = normalizeMode(process.env.AUTH_MODE);
export const USE_DATABASE = AUTH_MODE === "database";

export function getAuthSecretFromEnv(): string | null {
  return process.env.AUTH_SECRET?.trim() || null;
}

export function isAuthConfigured(): boolean {
  const secret = getAuthSecretFromEnv();
  if (!secret) {
    return false;
  }
  if (USE_DATABASE) {
    return true;
  }
  return envUsersConfigured();
}

export type { AuthMode };
