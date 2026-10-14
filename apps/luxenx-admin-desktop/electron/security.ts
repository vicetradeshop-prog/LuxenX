/**
 * Durcissement Electron :
 * - contextIsolation: true, nodeIntegration: false, sandbox: true
 * - CSP appliquée via les en-têtes du processus principal (seule source)
 * - navigation et nouvelles fenêtres strictement contrôlées
 * - aucun accès général du renderer au système de fichiers
 *
 * Deux profils CSP :
 *  - PRODUCTION (app packagée) : stricte, aucun script inline.
 *  - DEVELOPPEMENT : autorise les scripts inline et websockets nécessaires
 *    à Vite/React Refresh. Sans cela le renderer crashe au démarrage
 *    (écran noir) — bug historique du projet, corrigé et testé.
 */
import { session, shell, type BrowserWindow } from "electron";

const CSP_PRODUCTION = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' http://localhost:* http://127.0.0.1:* https:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

const CSP_DEVELOPPEMENT = [
  "default-src 'self'",
  // Vite injecte un préambule inline (React Refresh) en développement.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // ws: nécessaire au HMR de Vite.
  "connect-src 'self' ws: http: https:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

export function hardenSession(opts: { dev: boolean }): void {
  const csp = opts.dev ? CSP_DEVELOPPEMENT : CSP_PRODUCTION;
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });
}

export function hardenWindow(win: BrowserWindow, devServerUrl?: string): void {
  // Aucune navigation sortante.
  win.webContents.on("will-navigate", (event, url) => {
    const allowed = url.startsWith("file://") || (!!devServerUrl && url.startsWith(devServerUrl));
    if (!allowed) event.preventDefault();
  });

  // Aucune fenêtre popup : les liens externes passent par le shell,
  // uniquement pour https.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Journalisation console du renderer vers le fichier de log principal.
  // Signature compatible anciennes ET nouvelles versions d'Electron.
  win.webContents.on(
    "console-message",
    (event: unknown, legacyLevel?: number, legacyMessage?: string) => {
      const e = event as { level?: number; message?: string };
      const level = typeof e?.level === "number" ? e.level : (legacyLevel ?? 0);
      const message = typeof e?.message === "string" ? e.message : (legacyMessage ?? "");
      if (level >= 2) {
        console.log(`[renderer-console] ${message}`.slice(0, 600));
      }
    },
  );
  win.webContents.on("render-process-gone", (_e, details) => {
    console.error(`[renderer] processus rendu arrêté : ${details.reason}`);
  });
  win.webContents.on("preload-error", (_e, path, err) => {
    console.error(`[preload] erreur ${path} : ${err.message}`);
  });
}
