/**
 * Configuration du client API : jetons persistés via le bridge Electron
 * (safeStorage côté processus principal), URL du backend configurable.
 */
import { ApiClient, type TokenStore } from "@luxenx/api-client";
import { onSessionExpired } from "./session-bus.js";

let cachedTokens: { accessToken: string | null; refreshToken: string | null } = {
  accessToken: null,
  refreshToken: null,
};

export const tokenStore: TokenStore = {
  getAccessToken: () => cachedTokens.accessToken,
  getRefreshToken: () => cachedTokens.refreshToken,
  setTokens: async (access, refresh) => {
    cachedTokens = { accessToken: access, refreshToken: refresh };
    await window.luxenx.tokens.set(access, refresh);
  },
};

export async function loadStoredTokens(): Promise<void> {
  cachedTokens = await window.luxenx.tokens.get();
}

let backendUrl = "http://localhost:8787";

export function getBackendUrl(): string {
  return backendUrl;
}

export async function initApiFromSettings(): Promise<void> {
  const settings = await window.luxenx.settings.get();
  backendUrl = settings.backendUrl.replace(/\/$/, "");
}

export function setBackendUrl(url: string): void {
  backendUrl = url.replace(/\/$/, "");
}

export const api = new ApiClient({
  baseUrl: () => backendUrl,
  tokenStore,
  onSessionExpired: () => onSessionExpired(),
});

/** Recrée le client si l'URL du backend change (paramètres). */
export function apiWithBaseUrl(url: string): ApiClient {
  return new ApiClient({
    baseUrl: url.replace(/\/$/, ""),
    tokenStore,
    onSessionExpired: () => onSessionExpired(),
  });
}

export function currentApi(): ApiClient {
  // Le singleton "api" lit baseUrl dynamiquement via le getter.
  return api;
}
