/**
 * Sonde rapide (2 s) : le backend répond-il déjà ?
 * exit 0 = oui, exit 1 = non. Utilisé par lancer.bat pour décider
 * s'il faut démarrer la fenêtre backend automatiquement.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
let base = process.env.BACKEND_URL ?? "";
if (!base) {
  const envFile = path.join(root, ".env");
  if (existsSync(envFile)) {
    const m = /^BACKEND_URL=(.*)$/m.exec(readFileSync(envFile, "utf8"));
    base = m?.[1]?.trim() ?? "";
  }
}
base = (base || "http://localhost:8787").replace(/\/$/, "");

try {
  const res = await fetch(`${base}/api/v1/health`, { signal: AbortSignal.timeout(2000) });
  process.exit(res.ok ? 0 : 1);
} catch {
  process.exit(1);
}
