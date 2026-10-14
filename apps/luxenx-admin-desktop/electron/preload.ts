/**
 * LuxenX Admin — preload (contextBridge). Surface minimale.
 */
import { contextBridge, ipcRenderer } from "electron";

const api = {
  app: {
    getInfo: () => ipcRenderer.invoke("app:get-info"),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (patch: { backendUrl?: string }) => ipcRenderer.invoke("settings:set", patch),
  },
  tokens: {
    get: () => ipcRenderer.invoke("tokens:get"),
    set: (access: string | null, refresh: string | null) =>
      ipcRenderer.invoke("tokens:set", access, refresh),
    clear: () => ipcRenderer.invoke("tokens:clear"),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke("shell:open-external", url),
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

contextBridge.exposeInMainWorld("luxadmin", api);

export type LuxAdminBridge = typeof api;
