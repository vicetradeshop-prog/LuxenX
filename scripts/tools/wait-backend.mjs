/**
 * Attend que le backend réponde sur /api/v1/health (30 s maximum).
 * Utilisé par lancer.bat pour n'ouvrir LuxenX qu'une fois le serveur prêt.
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
const url = `${base}/api/v1/health`;
const deadline = Date.now() + 30_000;

while (Date.now() < deadline) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      console.log(`   Backend pret : ${base}`);
      process.exit(0);
    }
  } catch {
    // pas encore pret
  }
  await new Promise((r) => setTimeout(r, 700));
}
console.log("   [ATTENTION] Le backend n'est pas pret apres 30 secondes.");
console.log("   Regardez sa fenetre console : l'erreur y est affichee.");
process.exit(1);
