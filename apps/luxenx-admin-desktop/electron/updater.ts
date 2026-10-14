/**
 * Mises à jour automatiques de LuxenX Admin — electron-updater.
 * Canal dédié « admin » (fichier admin.yml de la release GitHub) :
 * les mises à jour de l'admin ne se mélangent jamais avec celles de LuxenX.
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
  progress?: number;
  error?: string;
}

let current: UpdateStatus = { state: "idle" };

function send(sender: WebContents | null): void {
  if (sender && !sender.isDestroyed()) sender.send("lxadmin:update-state", current);
}

export function getUpdateStatus(): UpdateStatus {
  return current;
}

export function setupUpdater(getSender: () => WebContents | null): void {
  if (!app.isPackaged) {
    current = { state: "dev" };
    return;
  }
  autoUpdater.channel = "admin"; // lit admin.yml, pas latest.yml
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on("checking-for-update", () => {
    current = { state: "checking" };
    send(getSender());
  });
  autoUpdater.on("update-available", (info: { version: string }) => {
    current = { state: "available", version: info.version };
    send(getSender());
    logger.info("updater", `mise à jour admin disponible : ${info.version}`);
  });
  autoUpdater.on("update-not-available", () => {
    current = { state: "not-available" };
    send(getSender());
  });
  autoUpdater.on("download-progress", (p: { percent: number }) => {
    current = { ...current, state: "downloading", progress: Math.round(p.percent) };
    send(getSender());
  });
  autoUpdater.on("update-downloaded", (info: { version: string }) => {
    current = { state: "downloaded", version: info.version, progress: 100 };
    send(getSender());
  });
  autoUpdater.on("error", (err: Error) => {
    current = { state: "error", error: err.message };
    send(getSender());
    logger.warn("updater", `erreur de mise à jour admin : ${err.message}`);
  });

  autoUpdater.checkForUpdates().catch((err) => {
    current = { state: "error", error: String(err?.message ?? err) };
    send(getSender());
  });
}

export function checkNow(): UpdateStatus {
  if (!app.isPackaged) return { state: "dev" };
  current = { state: "checking" };
  autoUpdater.checkForUpdates().catch((err) => {
    current = { state: "error", error: String(err?.message ?? err) };
  });
  return current;
}

export function quitAndInstall(): void {
  if (!app.isPackaged) return;
  autoUpdater.quitAndInstall(false, true);
}
