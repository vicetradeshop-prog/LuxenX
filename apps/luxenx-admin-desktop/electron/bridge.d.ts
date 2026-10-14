/**
 * Typage du bridge LuxenX Admin (window.luxadmin).
 */
export interface AdminAppInfo {
  version: string;
  electron: string;
  platform: string;
  packaged: boolean;
  storageEncrypted: boolean;
}

export interface AdminUpdateStatus {
  state: "idle" | "dev" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
  version?: string;
  progress?: number;
  error?: string;
}

export interface LuxAdminBridge {
  app: { getInfo(): Promise<AdminAppInfo> };
  settings: {
    get(): Promise<{ backendUrl: string; githubOwner: string; githubRepo: string }>;
    set(patch: { backendUrl?: string; githubOwner?: string; githubRepo?: string }): Promise<{
      backendUrl: string;
      githubOwner: string;
      githubRepo: string;
    }>;
  };
  updater: {
    getStatus(): Promise<AdminUpdateStatus>;
    check(): Promise<AdminUpdateStatus>;
    install(): Promise<boolean>;
    onState(cb: (status: AdminUpdateStatus) => void): () => void;
  };
  publish: {
    selectZip(): Promise<string | null>;
    running(): Promise<boolean>;
    start(req: { zipPath: string; kind: "patch" | "minor" | "major"; notes: string }): Promise<{ ok: boolean; message: string }>;
    onLog(cb: (line: string) => void): () => void;
  };
  tokens: {
    get(): Promise<{ accessToken: string | null; refreshToken: string | null }>;
    set(access: string | null, refresh: string | null): Promise<boolean>;
    clear(): Promise<boolean>;
  };
  shell: { openExternal(url: string): Promise<void> };
  debug: { log(message: string): void };
  window: {
    minimize(): void;
    maximizeToggle(): void;
    close(): void;
  };
}

declare global {
  interface Window {
    luxadmin: LuxAdminBridge;
  }
}

export {};
