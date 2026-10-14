/**
 * LuxenX Admin — passerelle IPC minimale et validée.
 * Aucune opération système exposée : configuration du backend, jetons
 * chiffrés, ouverture de liens https et contrôles de fenêtre.
 */
import { app, ipcMain, shell, type BrowserWindow } from "electron";
import { clearTokens, readSettings, readTokens, storageEncryptionActive, writeSettings, writeTokens } from "./store.js";
import { logger } from "./logger.js";

function validHttpUrl(value: unknown, max = 512): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > max) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  void getWindow;

  ipcMain.handle("app:get-info", () => ({
    version: app.getVersion(),
    electron: process.versions.electron ?? "",
    platform: process.platform,
    packaged: app.isPackaged,
    storageEncrypted: storageEncryptionActive(),
  }));

  ipcMain.handle("settings:get", () => readSettings());

  ipcMain.handle("settings:set", (_e, patch: unknown) => {
    if (typeof patch !== "object" || patch === null) throw new Error("patch invalide");
    const url = (patch as Record<string, unknown>).backendUrl;
    if (url !== undefined) {
      const valid = validHttpUrl(url);
      if (!valid) throw new Error("backendUrl invalide");
      return writeSettings({ backendUrl: valid.replace(/\/$/, "") });
    }
    return readSettings();
  });

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

  ipcMain.handle("shell:open-external", (_e, target: unknown) => {
    const url = validHttpUrl(target, 512);
    if (!url || !url.startsWith("https://")) throw new Error("URL externe invalide (https uniquement)");
    logger.info("ipc", `ouverture externe : ${new URL(url).hostname}`);
    return shell.openExternal(url);
  });

  ipcMain.on("log:renderer", (_e, msg: unknown) => {
    if (typeof msg === "string" && msg.length > 0) {
      logger.info("renderer", msg.slice(0, 800));
    }
  });

  ipcMain.on("window:minimize", () => getWindow()?.minimize());
  ipcMain.on("window:maximize-toggle", () => {
    const win = getWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on("window:close", () => getWindow()?.close());
}
