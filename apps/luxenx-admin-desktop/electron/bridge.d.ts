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

export interface LuxAdminBridge {
  app: { getInfo(): Promise<AdminAppInfo> };
  settings: {
    get(): Promise<{ backendUrl: string }>;
    set(patch: { backendUrl?: string }): Promise<{ backendUrl: string }>;
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
