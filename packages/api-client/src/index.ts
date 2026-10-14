/**
 * @luxenx/api-client — Client HTTP typé pour l'API LuxenX.
 *
 * Utilisé par les renderers de LuxenX et LuxenX Admin.
 * Gère : jeton d'accès, rafraîchissement automatique, erreurs typées,
 * file d'attente des requêtes pendant le refresh.
 *
 * Aucun secret n'est manipulé ici : seulement des jetons de session
 * fournis par le backend, stockés par l'appelant (safeStorage côté Electron).
 */
import type {
  AdminStats,
  AuditEntry,
  AuthResponse,
  DashboardPayload,
  FeatureCard,
  GlobalSettings,
  HelpContent,
  Paginated,
  ReleaseInfo,
  SessionInfo,
  TrendingConfig,
  UserPublic,
} from "@luxenx/shared";

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }

  /** Erreur réseau (backend injoignable) plutôt que réponse d'erreur. */
  get isNetworkError(): boolean {
    return this.code === "network_error";
  }
}

export interface TokenStore {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(accessToken: string | null, refreshToken: string | null): void | Promise<void>;
}

export interface ApiClientOptions {
  /** URL de base fixe ou fonction (pour un backend reconfigurable à chaud). */
  baseUrl: string | (() => string);
  tokenStore: TokenStore;
  /** Appelée quand le refresh échoue (session expirée) : l'UI doit déconnecter. */
  onSessionExpired?: () => void;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
  skipRefresh?: boolean;
}

export class ApiClient {
  private refreshPromise: Promise<boolean> | null = null;
  private fetchImpl: typeof fetch;
  private timeoutMs: number;

  constructor(private readonly opts: ApiClientOptions) {
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = opts.timeoutMs ?? 15000;
  }

  get baseUrl(): string {
    return typeof this.opts.baseUrl === "string" ? this.opts.baseUrl : this.opts.baseUrl();
  }

  /* ---------------- mécanique interne ---------------- */

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const url = new URL(path.replace(/^\/?/, "/"), this.baseUrl.replace(/\/$/, "") + "/");
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, query, auth = true, skipRefresh = false } = options;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (auth) {
      const token = this.opts.tokenStore.getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await this.fetchImpl(this.buildUrl(path, query), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new ApiClientError(
        "network_error",
        aborted
          ? `Le serveur LuxenX (${this.baseUrl}) a mis trop de temps à répondre.`
          : `Impossible de joindre le serveur LuxenX (${this.baseUrl}). Vérifiez votre connexion ou l'adresse configurée.`,
        0,
      );
    } finally {
      clearTimeout(timer);
    }

    // Jeton expiré : une seule tentative de refresh, puis rejeu.
    if (response.status === 401 && auth && !skipRefresh) {
      const refreshed = await this.refreshTokens();
      if (refreshed) return this.request<T>(path, { ...options, skipRefresh: true });
      this.opts.onSessionExpired?.();
    }

    if (response.status === 204) return undefined as T;

    let payload: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const errBody = payload as { error?: { code?: string; message?: string; details?: unknown } } | null;
      throw new ApiClientError(
        errBody?.error?.code ?? `http_${response.status}`,
        errBody?.error?.message ?? `Erreur serveur (${response.status}).`,
        response.status,
        errBody?.error?.details,
      );
    }

    return payload as T;
  }

  /* ---------------- authentification ---------------- */

  async refreshTokens(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        const refreshToken = this.opts.tokenStore.getRefreshToken();
        if (!refreshToken) return false;
        try {
          const res = await this.request<AuthResponse>("/api/v1/auth/refresh", {
            method: "POST",
            body: { refreshToken },
            auth: false,
            skipRefresh: true,
          });
          await this.opts.tokenStore.setTokens(res.accessToken, res.refreshToken);
          return true;
        } catch {
          await this.opts.tokenStore.setTokens(null, null);
          return false;
        }
      })().finally(() => {
        // Libéré après résolution pour les prochains cycles.
        setTimeout(() => (this.refreshPromise = null), 0);
      });
    }
    return this.refreshPromise;
  }

  register(input: { email: string; username: string; password: string }): Promise<AuthResponse> {
    return this.request("/api/v1/auth/register", { method: "POST", body: input, auth: false });
  }

  login(input: { email: string; password: string }): Promise<AuthResponse> {
    return this.request("/api/v1/auth/login", { method: "POST", body: input, auth: false });
  }

  logout(refreshToken: string): Promise<void> {
    return this.request("/api/v1/auth/logout", {
      method: "POST",
      body: { refreshToken },
      skipRefresh: true,
    });
  }

  me(): Promise<UserPublic> {
    return this.request("/api/v1/auth/me");
  }

  forgotPassword(email: string): Promise<{ message: string; devToken?: string }> {
    return this.request("/api/v1/auth/forgot-password", {
      method: "POST",
      body: { email },
      auth: false,
    });
  }

  resetPassword(token: string, password: string): Promise<{ message: string }> {
    return this.request("/api/v1/auth/reset-password", {
      method: "POST",
      body: { token, password },
      auth: false,
    });
  }

  /* ---------------- compte ---------------- */

  getAccount(): Promise<{ user: UserPublic; preferences: Record<string, unknown>; sessions: SessionInfo[] }> {
    return this.request("/api/v1/account");
  }

  updateAccount(input: {
    username?: string;
    preferences?: Record<string, unknown>;
  }): Promise<UserPublic> {
    return this.request("/api/v1/account", { method: "PATCH", body: input });
  }

  changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request("/api/v1/account/password", {
      method: "POST",
      body: { currentPassword, newPassword },
    });
  }

  deleteAccount(password: string): Promise<void> {
    return this.request("/api/v1/account", {
      method: "DELETE",
      body: { password, confirm: true },
    });
  }

  revokeSession(sessionId: string): Promise<void> {
    return this.request(`/api/v1/account/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });
  }

  /* ---------------- données applicatives ---------------- */

  getDashboard(): Promise<DashboardPayload> {
    return this.request("/api/v1/dashboard");
  }

  getCards(): Promise<FeatureCard[]> {
    return this.request("/api/v1/cards");
  }

  getTrending(): Promise<{ config: TrendingConfig; cards: FeatureCard[] }> {
    return this.request("/api/v1/trending");
  }

  getSettings(): Promise<GlobalSettings> {
    return this.request("/api/v1/settings");
  }

  getHelp(): Promise<HelpContent> {
    return this.request("/api/v1/help");
  }

  getReleases(): Promise<ReleaseInfo[]> {
    return this.request("/api/v1/releases", { auth: false });
  }

  getLatestRelease(): Promise<ReleaseInfo | null> {
    return this.request("/api/v1/releases/latest", { auth: false });
  }

  /* ---------------- administration ---------------- */

  adminStats(): Promise<AdminStats> {
    return this.request("/api/v1/admin/stats");
  }

  adminListUsers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    role?: string;
  }): Promise<Paginated<UserPublic>> {
    return this.request("/api/v1/admin/users", { query: params });
  }

  adminGetUser(id: string): Promise<{ user: UserPublic; sessions: SessionInfo[] }> {
    return this.request(`/api/v1/admin/users/${encodeURIComponent(id)}`);
  }

  adminUpdateUser(
    id: string,
    input: { status?: string; role?: string; emailVerified?: boolean },
  ): Promise<UserPublic> {
    return this.request(`/api/v1/admin/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: input,
    });
  }

  adminDeleteUser(id: string): Promise<void> {
    return this.request(`/api/v1/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  adminRevokeUserSessions(id: string): Promise<{ revoked: number }> {
    return this.request(`/api/v1/admin/users/${encodeURIComponent(id)}/sessions`, {
      method: "DELETE",
    });
  }

  adminListCards(): Promise<FeatureCard[]> {
    return this.request("/api/v1/admin/cards");
  }

  adminUpsertCard(card: Record<string, unknown>): Promise<FeatureCard> {
    return this.request("/api/v1/admin/cards", { method: "PUT", body: card });
  }

  adminDeleteCard(id: string): Promise<void> {
    return this.request(`/api/v1/admin/cards/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  adminReorderCards(order: { id: string; order: number }[]): Promise<FeatureCard[]> {
    return this.request("/api/v1/admin/cards/reorder", { method: "POST", body: { order } });
  }

  adminGetTrending(): Promise<TrendingConfig> {
    return this.request("/api/v1/admin/trending");
  }

  adminPutTrending(config: Record<string, unknown>): Promise<TrendingConfig> {
    return this.request("/api/v1/admin/trending", { method: "PUT", body: config });
  }

  adminGetSettings(): Promise<GlobalSettings> {
    return this.request("/api/v1/admin/settings");
  }

  adminPutSettings(settings: Record<string, unknown>): Promise<GlobalSettings> {
    return this.request("/api/v1/admin/settings", { method: "PUT", body: settings });
  }

  adminListReleases(): Promise<ReleaseInfo[]> {
    return this.request("/api/v1/admin/releases");
  }

  adminCreateRelease(input: Record<string, unknown>): Promise<ReleaseInfo> {
    return this.request("/api/v1/admin/releases", { method: "POST", body: input });
  }

  adminPublishRelease(version: string): Promise<ReleaseInfo> {
    return this.request(`/api/v1/admin/releases/${encodeURIComponent(version)}/publish`, {
      method: "POST",
    });
  }

  adminDeleteRelease(version: string): Promise<void> {
    return this.request(`/api/v1/admin/releases/${encodeURIComponent(version)}`, {
      method: "DELETE",
    });
  }

  adminCheckGithubRelease(version: string): Promise<{
    exists: boolean;
    url: string | null;
    checkedWithToken: boolean;
    message: string;
  }> {
    return this.request(`/api/v1/admin/releases/${encodeURIComponent(version)}/github-check`);
  }

  adminAudit(params: { page?: number; pageSize?: number }): Promise<Paginated<AuditEntry>> {
    return this.request("/api/v1/admin/audit", { query: params });
  }

  adminGetHelp(): Promise<HelpContent> {
    return this.request("/api/v1/admin/help");
  }

  adminPutHelp(help: HelpContent): Promise<HelpContent> {
    return this.request("/api/v1/admin/help", { method: "PUT", body: help });
  }

  /* ---------------- santé ---------------- */

  health(): Promise<{ status: string; redis: "ok" | "unavailable" | "not_configured"; version: string }> {
    return this.request("/api/v1/health", { auth: false });
  }
}
