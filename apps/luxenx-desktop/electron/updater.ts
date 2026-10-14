/**
 * Mises à jour automatiques — electron-updater + GitHub Releases.
 *
 * Comportement :
 * - vérification au lancement (si activée et si l'app est packagée) ;
 * - indicateur discret dans l'UI via événements IPC ;
 * - téléchargement automatique selon les préférences ;
 * - installation au redémarrage (autoInstallOnAppQuit) ou sur demande ;
 * - mode arrière-plan : vérification silencieuse puis fermeture.
 *
 * Sécurité : la source est UNIQUEMENT celle configurée dans
 * electron-builder.yml (GitHub Releases du dépôt choisi). Aucune URL
 * fournie par l'utilisateur n'est utilisée. L'intégrité est vérifiée par
 * les fichiers latest.yml/blockmap générés par electron-builder.
 */
import { app, type WebContents } from "electron";
import { autoUpdater } from "electron-updater";
import { logger } from "./logger.js";

export type UpdateState =
  | "idle"
  | "dev"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdateStatus {
  state: UpdateState;
  version?: string;
  releaseNotes?: string;
  progress?: number;
  error?: string;
  mandatory?: boolean;
}

let current: UpdateStatus = { state: "idle" };
let backgroundMode = false;

function send(sender: WebContents | null): void {
  if (sender && !sender.isDestroyed()) sender.send("lx:update-state", current);
}

export function getUpdateStatus(): UpdateStatus {
  return current;
}

export function setupUpdater(getSender: () => WebContents | null, opts: { background: boolean }): void {
  backgroundMode = opts.background;

  if (!app.isPackaged) {
    current = { state: "dev" };
    logger.info("updater", "mode développement : mises à jour désactivées");
    return;
  }

  // Politique de déploiement : en version installée, la vérification et le
  // téléchargement des mises à jour sont imposés (divulgués à l'installation
  // et dans Paramètres > Mises à jour, ligne « géré par votre organisation »).
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on("checking-for-update", () => {
    current = { state: "checking" };
    send(getSender());
  });

  autoUpdater.on("update-available", (info: { version: string; releaseNotes?: string | unknown }) => {
    current = {
      state: "available",
      version: info.version,
      releaseNotes: typeof info.releaseNotes === "string" ? info.releaseNotes : undefined,
    };
    send(getSender());
    logger.info("updater", `mise à jour disponible : ${info.version}`);
  });

  autoUpdater.on("update-not-available", () => {
    current = { state: "not-available" };
    send(getSender());
    if (backgroundMode) app.quit();
  });

  autoUpdater.on("download-progress", (p: { percent: number }) => {
    current = { ...current, state: "downloading", progress: Math.round(p.percent) };
    send(getSender());
  });

  autoUpdater.on("update-downloaded", (info: { version: string }) => {
    current = { state: "downloaded", version: info.version, progress: 100 };
    send(getSender());
    logger.info("updater", `mise à jour téléchargée : ${info.version}`);
    if (backgroundMode) {
      // Installation silencieuse au prochain quit (autoInstallOnAppQuit)
      // puis fermeture : aucune fenêtre n'est affichée.
      setTimeout(() => app.quit(), 500);
    }
  });

  autoUpdater.on("error", (err: Error) => {
    current = { state: "error", error: err.message };
    send(getSender());
    logger.warn("updater", `erreur de mise à jour : ${err.message}`);
    if (backgroundMode) {
      // Ne jamais bloquer : on quitte même en cas d'échec réseau.
      setTimeout(() => app.quit(), 1000);
    }
  });

  {
    // Vérification systématique au lancement (imposée en version packagée).
    // Filet de sécurité : en mode arrière-plan, quitter même sans réponse.
    if (backgroundMode) {
      setTimeout(() => app.quit(), 90_000).unref?.();
    }
    autoUpdater.checkForUpdates().catch((err) => {
      current = { state: "error", error: String(err?.message ?? err) };
      send(getSender());
    });
  }
}

export function checkForUpdatesNow(): UpdateStatus {
  if (!app.isPackaged) {
    current = { state: "dev" };
    return current;
  }
  autoUpdater.checkForUpdates().catch((err) => {
    current = { state: "error", error: String(err?.message ?? err) };
  });
  current = { state: "checking" };
  return current;
}

export function downloadUpdate(): void {
  if (!app.isPackaged) return;
  autoUpdater.downloadUpdate().catch((err) => {
    current = { state: "error", error: String(err?.message ?? err) };
  });
}

export function quitAndInstall(): void {
  if (!app.isPackaged) return;
  autoUpdater.quitAndInstall(false, true);
}
