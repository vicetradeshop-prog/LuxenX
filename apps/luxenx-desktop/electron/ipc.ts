/**
 * Passerelle IPC — surface minimale et validée.
 * Le renderer n'a AUCUN accès direct au système : chaque opération passe
 * par un canal explicite avec validation des entrées.
 */
import { app, dialog, ipcMain, shell, type BrowserWindow } from "electron";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  clearTokens,
  readSettings,
  readTokens,
  storageEncryptionActive,
  writeSettings,
  writeTokens,
  type LocalSettings,
} from "./store.js";
import { checkForUpdatesNow, downloadUpdate, getUpdateStatus, quitAndInstall } from "./updater.js";
import { getAutostartEnabled, setAutostartEnabled } from "./autostart.js";
import { musicService, type DepsStatus } from "./music-service.js";
import { logger } from "./logger.js";

/* ---------------- Validation des entrées ---------------- */

function validHttpUrl(value: unknown, max = 2048): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > max) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function validLocalPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return null;
  const resolved = path.resolve(value);
  return resolved;
}

const SETTINGS_KEYS: (keyof LocalSettings)[] = [
  "backendUrl",
  "animationsEnabled",
  "introEnabled",
  "introSeen",
  "notificationsEnabled",
  "autoCheckUpdates",
  "autoDownloadUpdates",
  "autostartEnabled",
  "downloadFolder",
  "reduceMotion",
  "ffmpegPath",
  "downloadFolderChosen",
];

/* ---------------- Enregistrement des canaux ---------------- */

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  /* --- Informations applicatives --- */
  ipcMain.handle("app:get-info", () => ({
    version: app.getVersion(),
    electron: process.versions.electron ?? "",
    chrome: process.versions.chrome ?? "",
    node: process.versions.node ?? "",
    platform: process.platform,
    packaged: app.isPackaged,
    storageEncrypted: storageEncryptionActive(),
  }));

  /* --- Préférences locales --- */
  ipcMain.handle("settings:get", () => readSettings());

  ipcMain.handle("settings:set", (_e, patch: unknown) => {
    if (typeof patch !== "object" || patch === null) throw new Error("patch invalide");
    const clean: Partial<LocalSettings> = {};
    for (const key of SETTINGS_KEYS) {
      const value = (patch as Record<string, unknown>)[key];
      if (value === undefined) continue;
      if (key === "backendUrl") {
        const url = validHttpUrl(value);
        if (!url) throw new Error("backendUrl invalide");
        clean.backendUrl = url.replace(/\/$/, "");
      } else if (key === "downloadFolder" || key === "ffmpegPath") {
        const p = validLocalPath(value);
        if (!p) throw new Error(`${key} invalide`);
        (clean as Record<string, string>)[key] = p;
      } else if (typeof value === "boolean") {
        (clean as Record<string, boolean>)[key] = value;
      }
    }
    const next = writeSettings(clean);
    if (clean.autostartEnabled !== undefined) setAutostartEnabled(clean.autostartEnabled);
    return next;
  });

  /* --- Jetons de session (chiffrés au repos) --- */
  ipcMain.handle("tokens:get", () => readTokens());

  ipcMain.handle("tokens:set", (_e, access: unknown, refresh: unknown) => {
    const a = typeof access === "string" && access.length < 8192 ? access : null;
    const r = typeof refresh === "string" && refresh.length < 8192 ? refresh : null;
    writeTokens({ accessToken: a, refreshToken: r });
    return true;
  });

  ipcMain.handle("tokens:clear", () => {
    clearTokens();
    return true;
  });

  /* --- Démarrage automatique --- */
  ipcMain.handle("autostart:get", () => getAutostartEnabled());
  ipcMain.handle("autostart:set", (_e, enabled: unknown) => {
    if (typeof enabled !== "boolean") throw new Error("enabled invalide");
    const ok = setAutostartEnabled(enabled);
    if (ok) writeSettings({ autostartEnabled: enabled });
    return ok;
  });

  /* --- Mises à jour --- */
  ipcMain.handle("updater:get-status", () => getUpdateStatus());
  ipcMain.handle("updater:check", () => checkForUpdatesNow());
  ipcMain.handle("updater:download", () => {
    downloadUpdate();
    return true;
  });
  ipcMain.handle("updater:install", () => {
    quitAndInstall();
    return true;
  });

  /* --- Boîtes de dialogue natives --- */
  ipcMain.handle("dialog:choose-folder", async () => {
    const win = getWindow();
    const current = readSettings().downloadFolder;
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: "Choisir le dossier de destination",
      defaultPath: existsSync(current) ? current : app.getPath("music"),
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const chosen = result.filePaths[0]!;
    writeSettings({ downloadFolder: chosen });
    return chosen;
  });

  /* --- Shell (strictement borné) --- */
  ipcMain.handle("shell:open-path", (_e, target: unknown) => {
    const p = validLocalPath(target);
    if (!p || !existsSync(p)) throw new Error("chemin introuvable");
    // Uniquement le dossier de téléchargement, ses sous-dossiers ou un fichier qu'ils contiennent.
    const root = musicService.getDownloadFolder();
    if (p !== root && !p.startsWith(root + path.sep)) {
      logger.warn("ipc", `shell:open-path refusé hors périmètre : ${p}`);
      throw new Error("ouverture refusée hors du dossier de téléchargement");
    }
    return shell.openPath(p);
  });

  ipcMain.handle("shell:show-item", (_e, target: unknown) => {
    const p = validLocalPath(target);
    if (!p || !existsSync(p)) throw new Error("chemin introuvable");
    shell.showItemInFolder(p);
    return true;
  });

  ipcMain.handle("shell:open-external", (_e, target: unknown) => {
    const url = validHttpUrl(target, 512);
    if (!url || !url.startsWith("https://")) throw new Error("URL externe invalide (https uniquement)");
    return shell.openExternal(url);
  });

  /* --- Script musique --- */
  ipcMain.handle("music:get-folder", () => musicService.getDownloadFolder());

  ipcMain.handle("music:analyze", (_e, url: unknown) => {
    const u = validHttpUrl(url);
    if (!u) throw new Error("URL invalide");
    return musicService.analyze(u);
  });

  ipcMain.handle("music:start", (_e, url: unknown, confirmedRights: unknown) => {
    const u = validHttpUrl(url);
    if (!u) throw new Error("URL invalide");
    if (confirmedRights !== true) throw new Error("confirmation des droits requise");
    return musicService.start(u, { confirmedRights: true });
  });

  ipcMain.handle("music:cancel", (_e, id: unknown) => {
    if (typeof id !== "string" || id.length > 64) throw new Error("id invalide");
    return musicService.cancel(id);
  });

  ipcMain.handle("music:list", () => musicService.list());

  ipcMain.handle("music:clear-history", () => {
    musicService.clearHistory();
    return musicService.list();
  });

  ipcMain.handle("music:deps", (_e, force: unknown) => musicService.checkDeps(force === true));

  ipcMain.handle("music:install-deps", async () => {
    const win = getWindow();
    const result = await musicService.installDeps((line) => {
      if (win && !win.isDestroyed()) win.webContents.send("lx:deps-log", line);
    });
    const deps: DepsStatus = await musicService.checkDeps(true);
    return { ...result, deps };
  });

  /* --- Journalisation du renderer (debug) --- */
  ipcMain.on("log:renderer", (_e, msg: unknown) => {
    if (typeof msg === "string" && msg.length > 0) {
      logger.info("renderer", msg.slice(0, 800));
    }
  });

  /* --- Fenêtre --- */
  ipcMain.on("window:minimize", () => getWindow()?.minimize());
  ipcMain.on("window:maximize-toggle", () => {
    const win = getWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on("window:close", () => getWindow()?.close());

  /* --- Événements service musique -> renderer --- */
  musicService.onTask((task) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send("lx:music-task", task);
  });
}
