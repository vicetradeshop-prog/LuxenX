/**
 * Gestion des versions pour publier.bat.
 *
 *   node bump-version.mjs read          -> affiche la version courante
 *   node bump-version.mjs next patch|minor|major -> propose la suivante
 *   node bump-version.mjs set 1.2.3     -> applique partout (root + apps
 *                                          + backend + packages) et vérifie
 *                                          qu'elle n'existe pas déjà.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const TARGETS = [
  "package.json",
  "packages/shared/package.json",
  "packages/validation/package.json",
  "packages/api-client/package.json",
  "packages/ui/package.json",
  "apps/backend/package.json",
  "apps/luxenx-desktop/package.json",
  "apps/luxenx-admin-desktop/package.json",
];

function readVersion() {
  return JSON.parse(readFileSync(path.join(root, "apps/luxenx-desktop/package.json"), "utf8")).version;
}

function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?$/.exec(v);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre: m[4] ?? null };
}

function nextVersion(current, kind) {
  const s = parseSemver(current);
  if (!s) throw new Error(`Version illisible : ${current}`);
  if (kind === "major") return `${s.major + 1}.0.0`;
  if (kind === "minor") return `${s.major}.${s.minor + 1}.0`;
  return `${s.major}.${s.minor}.${s.patch + 1}`;
}

const [, , cmd, arg] = process.argv;

if (cmd === "read") {
  console.log(readVersion());
} else if (cmd === "next") {
  console.log(nextVersion(readVersion(), arg ?? "patch"));
} else if (cmd === "set") {
  const wanted = (arg ?? "").trim();
  if (!parseSemver(wanted)) {
    console.error(`Version invalide : « ${wanted} » (format attendu : 1.2.3)`);
    process.exit(2);
  }
  const current = readVersion();
  if (wanted === current) {
    console.error(`La version ${wanted} est déjà la version courante du projet.`);
    process.exit(3);
  }
  const cur = parseSemver(current);
  const nxt = parseSemver(wanted);
  const newer =
    nxt.major > cur.major ||
    (nxt.major === cur.major && (nxt.minor > cur.minor || (nxt.minor === cur.minor && nxt.patch > cur.patch)));
  if (!newer) {
    console.error(`Refus : ${wanted} n'est pas supérieure à la version courante ${current}.`);
    process.exit(4);
  }
  for (const rel of TARGETS) {
    const file = path.join(root, rel);
    if (!existsSync(file)) continue;
    const pkg = JSON.parse(readFileSync(file, "utf8"));
    pkg.version = wanted;
    writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  }
  console.log(`Version ${wanted} appliquée à ${TARGETS.length} fichiers package.json.`);
} else {
  console.error("Usage : bump-version.mjs read | next patch|minor|major | set X.Y.Z");
  process.exit(1);
}
