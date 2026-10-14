/**
 * Contrôle des secrets.
 *
 * Deux modes :
 *  - développement (défaut, utilisé par verifier.bat) : la présence d'un
 *    fichier .env est NORMALE (configuration locale) → simple info ;
 *    la recherche de motifs de secrets s'exécute sur tout le reste.
 *  - distribution : node tests/check-secrets.mjs --dist
 *    utilisé pour valider une archive extraite : tout .env présent est
 *    alors une fuite bloquante.
 *
 * Détecte : jetons Upstash/GitHub, clés privées PEM, secrets codés en dur.
 * N'affiche jamais la valeur d'un secret, seulement le fichier concerné.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_MODE = process.argv.includes("--dist");

const IGNORE_DIRS = new Set([
  "node_modules", "dist", "release", "renderer-dist", "electron-dist",
  "logs", ".git", "coverage", "build",
]);

const PATTERNS = [
  { re: /UPSTASH_REDIS_REST_TOKEN\s*=\s*[A-Za-z0-9_-]{20,}/, label: "jeton Upstash en clair" },
  { re: /ghp_[A-Za-z0-9]{20,}/, label: "jeton GitHub personnel (ghp_)" },
  { re: /github_pat_[A-Za-z0-9_]{20,}/, label: "jeton GitHub fin (github_pat_)" },
  { re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, label: "clé privée PEM" },
  { re: /sk-live-[A-Za-z0-9]{16,}/, label: "clé secrète de paiement" },
  { re: /SESSION_SECRET\s*=\s*["']?[A-Za-z0-9]{32,}/, label: "SESSION_SECRET codé en dur" },
];

const ALLOWED_FILES = new Set([".env.example", "check-secrets.mjs"]);

let problems = 0;
let scanned = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (IGNORE_DIRS.has(entry)) continue;
      walk(full);
      continue;
    }
    if (entry === ".env" || entry.endsWith(".env")) {
      if (DIST_MODE) {
        console.error(`[SECRET] Fichier de configuration reel dans une archive : ${path.relative(root, full)}`);
        problems++;
      } else {
        console.log(`[INFO]  .env present (normal en developpement) : non scanne, non distribue.`);
      }
      continue;
    }
    if (!/\.(ts|tsx|js|mjs|cjs|json|md|yml|yaml|bat|txt)$/.test(entry)) continue;
    if (st.size > 2_000_000) continue;
    scanned++;
    const text = readFileSync(full, "utf8");
    for (const { re, label } of PATTERNS) {
      if (ALLOWED_FILES.has(entry)) continue;
      if (re.test(text)) {
        console.error(`[SECRET] ${label} detecte dans ${path.relative(root, full)}`);
        problems++;
      }
    }
  }
}

if (!existsSync(root)) {
  console.error("Racine du projet introuvable.");
  process.exit(2);
}

walk(root);
console.log(
  `Controle des secrets${DIST_MODE ? " (mode distribution)" : " (mode developpement)"} : ` +
    `${scanned} fichiers analyses, ${problems} probleme(s).`,
);
process.exit(problems > 0 ? 1 : 0);
