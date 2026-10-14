/**
 * Typage du bridge exposé par le preload (window.luxenx).
 */
import type { MusicAnalysis, MusicTask, DepsStatus, LocalSettingsLike, UpdateStatus, AppInfo } from "./bridge-types.js";

export type { AppInfo, UpdateStatus };

export interface LuxenXBridge {
  app: { getInfo(): Promise<AppInfo> };
  settings: {
    get(): Promise<LocalSettingsLike>;
    set(patch: Partial<LocalSettingsLike>): Promise<LocalSettingsLike>;
  };
  tokens: {
    get(): Promise<{ accessToken: string | null; refreshToken: string | null }>;
    set(access: string | null, refresh: string | null): Promise<boolean>;
    clear(): Promise<boolean>;
  };
  autostart: { get(): Promise<boolean>; set(enabled: boolean): Promise<boolean> };
  updater: {
    getStatus(): Promise<UpdateStatus>;
    check(): Promise<UpdateStatus>;
    download(): Promise<boolean>;
    install(): Promise<boolean>;
    onState(cb: (status: UpdateStatus) => void): () => void;
  };
  dialog: { chooseFolder(): Promise<string | null> };
  shell: {
    openPath(p: string): Promise<string>;
    showItemInFolder(p: string): Promise<boolean>;
    openExternal(url: string): Promise<void>;
  };
  music: {
    getFolder(): Promise<string>;
    analyze(url: string): Promise<MusicAnalysis>;
    start(url: string, confirmedRights: boolean): Promise<MusicTask>;
    cancel(id: string): Promise<boolean>;
    list(): Promise<MusicTask[]>;
    clearHistory(): Promise<MusicTask[]>;
    deps(force?: boolean): Promise<DepsStatus>;
    installDeps(): Promise<{ ok: boolean; message: string; deps: DepsStatus }>;
    onTask(cb: (task: MusicTask) => void): () => void;
    onDepsLog(cb: (line: string) => void): () => void;
  };
  debug: { log(message: string): void };
  window: {
    minimize(): void;
    maximizeToggle(): void;
    close(): void;
  };
}

declare global {
  interface Window {
    luxenx: LuxenXBridge;
  }
}

export {};
