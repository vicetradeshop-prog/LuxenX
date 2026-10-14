/**
 * Propose la prochaine version LIBRE : supérieure à la version locale ET
 * absente des releases GitHub existantes (évite le piège des publications
 * interrompues qui laissent des versions fantômes).
 *
 * Usage CLI : node next-free-version.mjs <owner> <repo> <patch|minor|major>
 * Export testable : nextFree(base, kind, existingTags)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?$/.exec(v);
  return m ? { major: +m[1], minor: +m[2], patch: +m[3] } : null;
}

export function bump(base, kind) {
  const s = parseSemver(base);
  if (!s) throw new Error(`Version illisible : ${base}`);
  if (kind === "major") return `${s.major + 1}.0.0`;
  if (kind === "minor") return `${s.major}.${s.minor + 1}.0`;
  return `${s.major}.${s.minor}.${s.patch + 1}`;
}

/** Première version libre : bump(kind), puis patch suivants si occupée. */
export function nextFree(base, kind, existingTags) {
  const taken = new Set(existingTags.map((t) => t.replace(/^v/, "")));
  let candidate = bump(base, kind);
  let guard = 0;
  while (taken.has(candidate) && guard < 100) {
    candidate = bump(candidate, "patch");
    guard++;
  }
  return candidate;
}

// Partie CLI : uniquement en exécution directe (jamais à l'import des tests).
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [, , owner, repo, kindArg] = process.argv;
  if (!owner || !repo) {
    console.error("Usage : next-free-version.mjs <owner> <repo> <patch|minor|major>");
    process.exit(2);
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const base = JSON.parse(
    readFileSync(path.join(root, "apps", "luxenx-desktop", "package.json"), "utf8"),
  ).version;
  const kind = ["patch", "minor", "major"].includes(kindArg) ? kindArg : "patch";
  const tags = await fetchExistingTags(owner, repo);
  console.log(nextFree(base, kind, tags));
}

async function fetchExistingTags(owner, repo) {
  const gh = spawnSync("gh", ["release", "list", "--repo", `${owner}/${repo}`, "--limit", "100", "--json", "tagName"], {
    encoding: "utf8",
    shell: false,
  });
  if (gh.status === 0 && gh.stdout.trim()) {
    try {
      return JSON.parse(gh.stdout).map((r) => r.tagName);
    } catch {
      return [];
    }
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "LuxenX" },
    });
    if (res.ok) return ((await res.json()) ?? []).map((r) => r.tag_name);
  } catch {
    // réseau indisponible : liste vide
  }
  return [];
}

