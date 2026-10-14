/**
 * Preload — passerelle stricte via contextBridge.
 * contextIsolation: true, nodeIntegration: false, sandbox: true.
 * Seuls les canaux listés ici sont exposés au renderer.
 */
import { contextBridge, ipcRenderer } from "electron";

const api = {
  app: {
    getInfo: () => ipcRenderer.invoke("app:get-info"),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (patch: unknown) => ipcRenderer.invoke("settings:set", patch),
  },
  tokens: {
    get: () => ipcRenderer.invoke("tokens:get"),
    set: (access: string | null, refresh: string | null) =>
      ipcRenderer.invoke("tokens:set", access, refresh),
    clear: () => ipcRenderer.invoke("tokens:clear"),
  },
  autostart: {
    get: () => ipcRenderer.invoke("autostart:get"),
    set: (enabled: boolean) => ipcRenderer.invoke("autostart:set", enabled),
  },
  updater: {
    getStatus: () => ipcRenderer.invoke("updater:get-status"),
    check: () => ipcRenderer.invoke("updater:check"),
    download: () => ipcRenderer.invoke("updater:download"),
    install: () => ipcRenderer.invoke("updater:install"),
    onState: (cb: (status: unknown) => void) => {
      const listener = (_e: unknown, status: unknown) => cb(status);
      ipcRenderer.on("lx:update-state", listener);
      return () => ipcRenderer.removeListener("lx:update-state", listener);
    },
  },
  dialog: {
    chooseFolder: () => ipcRenderer.invoke("dialog:choose-folder"),
  },
  shell: {
    openPath: (p: string) => ipcRenderer.invoke("shell:open-path", p),
    showItemInFolder: (p: string) => ipcRenderer.invoke("shell:show-item", p),
    openExternal: (url: string) => ipcRenderer.invoke("shell:open-external", url),
  },
  music: {
    getFolder: () => ipcRenderer.invoke("music:get-folder"),
    analyze: (url: string) => ipcRenderer.invoke("music:analyze", url),
    start: (url: string, confirmedRights: boolean) =>
      ipcRenderer.invoke("music:start", url, confirmedRights),
    cancel: (id: string) => ipcRenderer.invoke("music:cancel", id),
    list: () => ipcRenderer.invoke("music:list"),
    clearHistory: () => ipcRenderer.invoke("music:clear-history"),
    deps: (force?: boolean) => ipcRenderer.invoke("music:deps", force),
    installDeps: () => ipcRenderer.invoke("music:install-deps"),
    onTask: (cb: (task: unknown) => void) => {
      const listener = (_e: unknown, task: unknown) => cb(task);
      ipcRenderer.on("lx:music-task", listener);
      return () => ipcRenderer.removeListener("lx:music-task", listener);
    },
    onDepsLog: (cb: (line: string) => void) => {
      const listener = (_e: unknown, line: unknown) => cb(String(line));
      ipcRenderer.on("lx:deps-log", listener);
      return () => ipcRenderer.removeListener("lx:deps-log", listener);
    },
  },
  debug: {
    log: (message: unknown) =>
      ipcRenderer.send("log:renderer", typeof message === "string" ? message.slice(0, 800) : ""),
  },
  window: {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximizeToggle: () => ipcRenderer.send("window:maximize-toggle"),
    close: () => ipcRenderer.send("window:close"),
  },
} as const;

contextBridge.exposeInMainWorld("luxenx", api);

export type LuxenXBridge = typeof api;
