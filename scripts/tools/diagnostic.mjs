/**
 * Diagnostic complet de l'environnement LuxenX.
 * Écrit un rapport lisible ; AUCUN secret n'y apparaît (valeurs masquées).
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const reportPath = process.argv[2] ?? path.join(root, "logs", "diagnostic.txt");

const lines = [];
const out = (s = "") => {
  lines.push(s);
  console.log(s);
};

function tool(name, args = ["--version"]) {
  const r = spawnSync(name, args, { shell: false, encoding: "utf8", timeout: 15000 });
  if (r.error) return { name, ok: false, version: "introuvable" };
  const v = (r.stdout || r.stderr || "").trim().split(/\r?\n/)[0];
  return { name, ok: r.status === 0, version: v || "version inconnue" };
}

function envValue(key) {
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return null;
  const m = new RegExp(`^${key}=(.*)$`, "m").exec(readFileSync(envPath, "utf8"));
  return m ? m[1].trim() : "";
}

function mask(v) {
  if (!v) return v === "" ? "(vide)" : "(absent)";
  return `${v.slice(0, 6)}…${v.slice(-4)} (${v.length} car.)`;
}

out("==========================================================");
out(" LUXENX - RAPPORT DE DIAGNOSTIC");
out(` Date : ${new Date().toISOString()}`);
out("==========================================================");
out("");
out("-- Outils installés --------------------------------------");
for (const t of [tool("node"), tool("npm"), tool("git"), tool("gh"), tool("python"), tool("spotdl")]) {
  out(`  ${t.ok ? "[OK]     " : "[ABSENT] "} ${t.name.padEnd(8)} ${t.version}`);
}
out("");
out("-- Dépendances --------------------------------------------");
out(`  node_modules présent : ${existsSync(path.join(root, "node_modules")) ? "oui" : "NON (lancez installer.bat)"}`);
for (const ws of ["apps/backend", "apps/luxenx-desktop", "apps/luxenx-admin-desktop"]) {
  const ok = existsSync(path.join(root, ws, "node_modules")) || existsSync(path.join(root, "node_modules"));
  out(`  ${ok ? "[OK]     " : "[ABSENT] "} dépendances ${ws}`);
}
out("");
out("-- Configuration (.env, valeurs masquées) -----------------");
out(`  .env présent            : ${existsSync(path.join(root, ".env")) ? "oui" : "NON"}`);
out(`  UPSTASH_REDIS_REST_URL  : ${mask(envValue("UPSTASH_REDIS_REST_URL"))}`);
out(`  UPSTASH_REDIS_REST_TOKEN: ${envValue("UPSTASH_REDIS_REST_TOKEN") ? "présent (masqué)" : "(absent)"}`);
out(`  SESSION_SECRET          : ${envValue("SESSION_SECRET") ? "présent (masqué)" : "(absent)"}`);
out(`  BACKEND_URL             : ${envValue("BACKEND_URL") || "(défaut http://localhost:8787)"}`);
out(`  GITHUB_OWNER / REPO     : ${envValue("GITHUB_OWNER") || "(absent)"} / ${envValue("GITHUB_REPO") || "(absent)"}`);
out(`  ADMIN_EMAIL             : ${envValue("ADMIN_EMAIL") ? "présent (masqué)" : "(absent)"}`);
out("");
out("-- Accès réseau --------------------------------------------");
const backendUrl = envValue("BACKEND_URL") || "http://localhost:8787";
try {
  const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/v1/health`, { signal: AbortSignal.timeout(6000) });
  const body = await res.json();
  out(`  Backend ${backendUrl} : ${res.ok ? "OK" : `HTTP ${res.status}`} (redis=${body.redis}, stockage=${body.storage})`);
} catch {
  out(`  Backend ${backendUrl} : INJOIGNABLE (normal si le backend n'est pas lancé)`);
}
try {
  const up = envValue("UPSTASH_REDIS_REST_URL");
  const tk = envValue("UPSTASH_REDIS_REST_TOKEN");
  if (up && tk) {
    const res = await fetch(`${up.replace(/\/$/, "")}/ping`, {
      headers: { Authorization: `Bearer ${tk}` },
      signal: AbortSignal.timeout(6000),
    });
    out(`  Upstash direct (ping)  : HTTP ${res.status} ${res.ok ? "(connecté)" : "(refusé)"}`);
  } else {
    out("  Upstash direct (ping)  : non configuré");
  }
} catch {
  out("  Upstash direct (ping)  : injoignable");
}
{
  const gh = spawnSync("gh", ["auth", "status"], { encoding: "utf8", shell: false });
  out(`  GitHub CLI authentifié : ${gh.status === 0 ? "oui" : "NON (gh auth login)"}`);
}
out("");
out("-- Dossiers de sortie --------------------------------------");
for (const dir of ["dist", "apps/luxenx-desktop/release", "apps/luxenx-admin-desktop/release"]) {
  const p = path.join(root, dir);
  if (!existsSync(p)) {
    out(`  ${dir} : vide (pas encore de compilation)`);
    continue;
  }
  const files = readdirSync(p).filter((f) => f.endsWith(".exe") || f.endsWith(".yml"));
  out(`  ${dir} : ${files.length ? files.join(", ") : "vide"}`);
}
out("");
out("-- Journaux récents ----------------------------------------");
const logsDir = path.join(root, "logs");
if (existsSync(logsDir)) {
  const logs = readdirSync(logsDir)
    .map((f) => ({ f, t: statSync(path.join(logsDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)
    .slice(0, 5);
  for (const l of logs) out(`  logs/${l.f}`);
} else {
  out("  (aucun journal)");
}
out("");
out("==========================================================");
out(" Fin du diagnostic. Communiquez ce rapport à l'assistance");
out(" si nécessaire : il ne contient aucun secret.");
out("==========================================================");

writeFileSync(reportPath, lines.join("\n"), "utf8");
process.exit(0);
