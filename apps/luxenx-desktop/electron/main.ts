/**
 * LuxenX — processus principal Electron.
 *
 * Sécurité : contextIsolation true, nodeIntegration false, sandbox true,
 * passerelle IPC minimale (preload), CSP stricte, instance unique.
 *
 * Mode arrière-plan (--background-check, lancé par le démarrage Windows) :
 * aucune fenêtre, vérification des mises à jour puis fermeture.
 */
import { app, BrowserWindow, type WebContents } from "electron";
import path from "node:path";
import { hardenSession, hardenWindow } from "./security.js";
import { registerIpc } from "./ipc.js";
import { setupUpdater } from "./updater.js";
import { isBackgroundLaunch, getAutostartEnabled, setAutostartEnabled } from "./autostart.js";
import { logger } from "./logger.js";
import { readSettings, writeSettings } from "./store.js";

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const backgroundMode = isBackgroundLaunch();

let mainWindow: BrowserWindow | null = null;

/* ---------------- Instance unique ---------------- */

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Ramène la fenêtre existante au premier plan (pas de doublon,
    // pas de seconde vérification de mise à jour).
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else if (!backgroundMode) {
      void createMainWindow();
    }
  });
}

/* ---------------- Fenêtre principale ---------------- */

async function createMainWindow(): Promise<BrowserWindow> {
  const settings = readSettings();

  const win = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: "#050508",
    title: "LuxenX",
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

  // L'introduction complète n'est jouée qu'à la première utilisation ;
  // le renderer gère la version courte via les préférences.
  void settings;

  if (DEV_SERVER_URL) {
    await win.loadURL(DEV_SERVER_URL);
  } else {
    await win.loadFile(path.join(__dirname, "..", "renderer-dist", "index.html"));
  }

  mainWindow = win;
  return win;
}

/* ---------------- Cycle de vie ---------------- */

app.whenReady().then(async () => {
  hardenSession({ dev: !app.isPackaged });
  registerIpc(() => mainWindow);

  const getSender = (): WebContents | null => mainWindow?.webContents ?? null;
  setupUpdater(getSender, { background: backgroundMode });

  if (backgroundMode) {
    // Aucune fenêtre : vérification silencieuse des mises à jour,
    // puis fermeture gérée par le module updater (ou filet de sécurité).
    logger.info("main", "lancement en arrière-plan (vérification des mises à jour)");
    return;
  }

  // Politique de déploiement : le démarrage automatique (vérification des
  // mises à jour en arrière-plan) est imposé en version installée. Ce
  // comportement est divulgué dans l'accord présenté à l'installation et
  // reste visible dans les paramètres Windows > Applications > Démarrage.
  if (app.isPackaged && !getAutostartEnabled()) {
    const ok = setAutostartEnabled(true);
    if (ok) {
      writeSettings({ autostartEnabled: true });
      logger.info("autostart", "démarrage automatique réactivé (politique de déploiement)");
    }
  }

  await createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Sécurité supplémentaire : refuse toute création de fenêtre inattendue.
app.on("web-contents-created", (_e, contents) => {
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
});

process.on("uncaughtException", (err) => {
  logger.error("main", `exception non gérée : ${err.message}`);
});
