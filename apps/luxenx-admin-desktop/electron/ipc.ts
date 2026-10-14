/**
 * LuxenX Admin — passerelle IPC minimale et validée.
 * Aucune opération système exposée : configuration du backend, jetons
 * chiffrés, ouverture de liens https et contrôles de fenêtre.
 */
import { app, ipcMain, shell, type BrowserWindow } from "electron";
import { clearTokens, readSettings, readTokens, storageEncryptionActive, writeSettings, writeTokens } from "./store.js";
import { dialog } from "electron";
import { isPublishRunning, runPublishFromZip } from "./publish-service.js";
import { checkNow, getUpdateStatus, quitAndInstall } from "./updater.js";
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
    const p = patch as Record<string, unknown>;
    const next: Partial<ReturnType<typeof readSettings>> = {};
    if (p.backendUrl !== undefined) {
      const valid = validHttpUrl(p.backendUrl);
      if (!valid) throw new Error("backendUrl invalide");
      next.backendUrl = valid.replace(/\/$/, "");
    }
    if (p.githubOwner !== undefined) {
      if (typeof p.githubOwner !== "string" || !/^[A-Za-z0-9_.-]{0,60}$/.test(p.githubOwner)) throw new Error("githubOwner invalide");
      next.githubOwner = p.githubOwner;
    }
    if (p.githubRepo !== undefined) {
      if (typeof p.githubRepo !== "string" || !/^[A-Za-z0-9_.-]{0,60}$/.test(p.githubRepo)) throw new Error("githubRepo invalide");
      next.githubRepo = p.githubRepo;
    }
    return writeSettings(next);
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

  /* --- Mises à jour automatiques (canal admin) --- */
  ipcMain.handle("updater:get-status", () => getUpdateStatus());
  ipcMain.handle("updater:check", () => checkNow());
  ipcMain.handle("updater:install", () => {
    quitAndInstall();
    return true;
  });

  /* --- Publication depuis une archive zip --- */
  ipcMain.handle("publish:select-zip", async () => {
    const win = getWindow();
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: "Choisir l'archive LuxenX-Complete.zip",
      filters: [{ name: "Archive LuxenX", extensions: ["zip"] }],
      properties: ["openFile"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0]!;
  });

  ipcMain.handle("publish:running", () => isPublishRunning());

  ipcMain.handle("publish:start", async (_e, req: unknown) => {
    const r = req as {
      zipPath?: unknown;
      kind?: unknown;
      notes?: unknown;
    };
    const settings = readSettings();
    const zipPath = typeof r?.zipPath === "string" ? r.zipPath : "";
    const kind = r?.kind === "minor" || r?.kind === "major" ? r.kind : "patch";
    const notes = typeof r?.notes === "string" ? r.notes.slice(0, 20000) : "";
    return runPublishFromZip(
      {
        zipPath,
        kind,
        notes,
        githubOwner: settings.githubOwner,
        githubRepo: settings.githubRepo,
        backendUrl: settings.backendUrl,
      },
      getWindow()?.webContents ?? null,
    );
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
