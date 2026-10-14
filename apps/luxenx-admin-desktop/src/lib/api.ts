/**
 * Client API de LuxenX Admin. Même paquet @luxenx/api-client que LuxenX,
 * mais instance et stockage de jetons indépendants.
 */
import { ApiClient, type TokenStore } from "@luxenx/api-client";

let cachedTokens: { accessToken: string | null; refreshToken: string | null } = {
  accessToken: null,
  refreshToken: null,
};

export const tokenStore: TokenStore = {
  getAccessToken: () => cachedTokens.accessToken,
  getRefreshToken: () => cachedTokens.refreshToken,
  setTokens: async (access, refresh) => {
    cachedTokens = { accessToken: access, refreshToken: refresh };
    await window.luxadmin.tokens.set(access, refresh);
  },
};

export async function loadStoredTokens(): Promise<string | null> {
  cachedTokens = await window.luxadmin.tokens.get();
  return cachedTokens.refreshToken;
}

let backendUrl = "http://localhost:8787";

export function setBackendUrl(url: string): void {
  backendUrl = url.replace(/\/$/, "");
}

export function getBackendUrl(): string {
  return backendUrl;
}

let expiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(fn: () => void): void {
  expiredHandler = fn;
}

export const api = new ApiClient({
  baseUrl: () => backendUrl,
  tokenStore,
  onSessionExpired: () => expiredHandler?.(),
  timeoutMs: 20000,
});
