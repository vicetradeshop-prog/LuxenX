/**
 * LuxenX Admin — processus principal.
 * Application Windows INDÉPENDANTE : son propre exécutable, sa propre
 * fenêtre, sa propre configuration. Sécurité identique à LuxenX :
 * contextIsolation, sandbox, CSP, IPC minimal.
 */
import { app, BrowserWindow } from "electron";
import path from "node:path";
import { hardenSession, hardenWindow } from "./security.js";
import { registerIpc } from "./ipc.js";
import { logger } from "./logger.js";

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      void createMainWindow();
    }
  });
}

async function createMainWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    backgroundColor: "#050508",
    title: "LuxenX Admin",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0a0a12",
      symbolColor: "#b9b5c9",
      height: 38,
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      devTools: !app.isPackaged || process.env.LX_DEVTOOLS === "1",
    },
  });

  hardenWindow(win, DEV_SERVER_URL);
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  if (DEV_SERVER_URL) {
    await win.loadURL(DEV_SERVER_URL);
  } else {
    await win.loadFile(path.join(__dirname, "..", "renderer-dist", "index.html"));
  }

  mainWindow = win;
  logger.info("main", "fenêtre LuxenX Admin créée");
  return win;
}

app.whenReady().then(async () => {
  hardenSession({ dev: !app.isPackaged });
  registerIpc(() => mainWindow);
  await createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("web-contents-created", (_e, contents) => {
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
});

process.on("uncaughtException", (err) => {
  logger.error("main", `exception non gérée : ${err.message}`);
});
