/**
 * Journalisation expurgée : ne contient JAMAIS de mots de passe,
 * de jetons, de hachés ou d'adresses de session complets.
 */

const SENSITIVE_KEYS = /pass|token|secret|authorization|cookie|hash/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value.length > 160 ? `${value.slice(0, 160)}…` : value;
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.test(k) ? "[expurgé]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export type LogLevel = "info" | "warn" | "error";

export const logger = {
  info(scope: string, message: string, data?: unknown): void {
    emit("info", scope, message, data);
  },
  warn(scope: string, message: string, data?: unknown): void {
    emit("warn", scope, message, data);
  },
  error(scope: string, message: string, data?: unknown): void {
    emit("error", scope, message, data);
  },
};

function emit(level: LogLevel, scope: string, message: string, data?: unknown): void {
  const line = {
    at: new Date().toISOString(),
    level,
    scope,
    message,
    ...(data !== undefined ? { data: redact(data) } : {}),
  };
  const text = JSON.stringify(line);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}
