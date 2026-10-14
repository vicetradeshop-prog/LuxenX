/**
 * Journal minimal du processus principal (fichier rotatif dans userData).
 */
import { app } from "electron";
import { appendFileSync, existsSync, mkdirSync, statSync, renameSync } from "node:fs";
import path from "node:path";

function logFile(): string {
  const dir = path.join(app.getPath("userData"), "logs");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return path.join(dir, "main.log");
}

function rotate(): void {
  try {
    const f = logFile();
    if (existsSync(f) && statSync(f).size > 2 * 1024 * 1024) {
      renameSync(f, f + ".1");
    }
  } catch {
    // ignorer
  }
}

export const logger = {
  info(scope: string, message: string, data?: unknown): void {
    write("info", scope, message, data);
  },
  warn(scope: string, message: string, data?: unknown): void {
    write("warn", scope, message, data);
  },
  error(scope: string, message: string, data?: unknown): void {
    write("error", scope, message, data);
  },
};

function write(level: string, scope: string, message: string, data?: unknown): void {
  const extra =
    data === undefined
      ? ""
      : " " + JSON.stringify(data, (_k, v) => (typeof v === "string" && v.length > 300 ? v.slice(0, 300) + "…" : v));
  const line = `${new Date().toISOString()} [${level}] (${scope}) ${message}${extra}\n`;
  // Jamais de jetons ni de mots de passe dans les journaux.
  const sanitized = line.replace(/(token|secret|password)=\S+/gi, "$1=[expurgé]");
  try {
    rotate();
    appendFileSync(logFile(), sanitized, "utf8");
  } catch {
    // ignorer
  }
  if (level === "error") console.error(sanitized.trimEnd());
  else console.log(sanitized.trimEnd());
}
