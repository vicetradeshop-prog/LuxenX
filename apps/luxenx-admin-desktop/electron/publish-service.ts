/**
 * Service de publication depuis une archive LuxenX-Complete.zip.
 *
 * Flux entièrement orchestré par le processus principal Admin :
 *  1. extraction du ZIP dans un dossier de travail dédié userData ;
 *  2. génération d'un .env minimal (owner/repo GitHub + URL backend) ;
 *  3. écriture des notes de version ;
 *  4. npm ci ;
 *  5. appel de scripts\publier.bat en mode --auto (verifications,
 *     compilation, push, release GitHub avec latest.yml/admin.yml) ;
 *  6. journal en temps réel envoyé à l'interface.
 *
 * Sécurité : chemins issus d'une boîte de dialogue native filtrée .zip,
 * commandes construites avec des arguments séparés lorsque c'est possible ;
 * les appels cmd /c ne reçoivent que des chemins internes ou validés.
 */
import { app, type WebContents } from "electron";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { logger } from "./logger.js";

export interface PublishRequest {
  zipPath: string;
  kind: "patch" | "minor" | "major";
  notes: string;
  githubOwner: string;
  githubRepo: string;
  backendUrl: string;
}

type Listener = (line: string) => void;
let listener: Listener | null = null;
let running = false;

export function onPublishLog(fn: Listener): void {
  listener = fn;
}

function log(line: string): void {
  logger.info("publish", line.slice(0, 400));
  listener?.(line);
}

export function isPublishRunning(): boolean {
  return running;
}

function workDir(): string {
  const dir = path.join(app.getPath("userData"), "publish-work");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

function run(cmd: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: false, windowsHide: true });
    child.stdout?.on("data", (d) => log(String(d).trimEnd()));
    child.stderr?.on("data", (d) => log(String(d).trimEnd()));
    child.on("error", (err) => {
      log(`[erreur] ${err.message}`);
      resolve(1);
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

export async function runPublishFromZip(req: PublishRequest, sender: WebContents | null): Promise<{ ok: boolean; message: string }> {
  if (running) return { ok: false, message: "Une publication est déjà en cours." };
  if (!/\.zip$/i.test(req.zipPath) || !existsSync(req.zipPath)) {
    return { ok: false, message: "Archive invalide : sélectionnez un fichier .zip existant." };
  }
  if (!/^[A-Za-z0-9_.-]{1,60}$/.test(req.githubOwner) || !/^[A-Za-z0-9_.-]{1,60}$/.test(req.githubRepo)) {
    return { ok: false, message: "Propriétaire ou dépôt GitHub invalide (voir Configuration)." };
  }
  running = true;
  void sender;
  const work = workDir();
  try {
    log(`Extraction de ${path.basename(req.zipPath)}…`);
    const codeTar = await run("tar", ["-xf", req.zipPath, "-C", work], work);
    if (codeTar !== 0) return { ok: false, message: `Extraction échouée (code ${codeTar}).` };

    const rootCandidate = existsSync(path.join(work, "package.json"))
      ? work
      : path.join(work, "LuxenX");
    if (!existsSync(path.join(rootCandidate, "package.json"))) {
      return { ok: false, message: "Archive invalide : package.json introuvable à la racine ou dans LuxenX/." };
    }
    if (!existsSync(path.join(rootCandidate, "scripts", "publier.bat"))) {
      return { ok: false, message: "Archive invalide : scripts\\publier.bat absent." };
    }

    log("Préparation de la configuration de publication…");
    const env = [
      `GITHUB_OWNER=${req.githubOwner}`,
      `GITHUB_REPO=${req.githubRepo}`,
      `BACKEND_URL=${req.backendUrl}`,
      `SESSION_SECRET=${randomBytes(32).toString("hex")}`,
      "NODE_ENV=development",
      "",
    ].join("\n");
    writeFileSync(path.join(rootCandidate, ".env"), env, "utf8");
    writeFileSync(
      path.join(rootCandidate, "RELEASE-NOTES.md"),
      req.notes.trim() ? req.notes.trim() + "\n" : "## Corrections\n- Maintenance de la plateforme.\n",
      "utf8",
    );

    log("Installation des dépendances (npm ci, plusieurs minutes possibles)…");
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const codeCi = await run(npm, ["ci"], rootCandidate);
    if (codeCi !== 0) return { ok: false, message: `npm ci a échoué (code ${codeCi}).` };

    log("Lancement de publier.bat en mode automatique…");
    const bat = path.join(rootCandidate, "scripts", "publier.bat");
    const codePub = await run("cmd.exe", ["/c", `"${bat}" --auto ${req.kind}`], rootCandidate);
    if (codePub !== 0) {
      return { ok: false, message: `publier.bat s'est arrêté avec le code ${codePub} : rien n'a été publié de manière incomplète.` };
    }
    log("Publication terminée avec succès.");
    return { ok: true, message: "Publication terminée. La release est en ligne sur GitHub." };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`[erreur] ${message}`);
    return { ok: false, message };
  } finally {
    running = false;
  }
}
