/**
 * État global de l'application : authentification, préférences,
 * données du tableau de bord, mises à jour.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  DashboardPayload,
  FeatureCard,
  GlobalSettings,
  HelpContent,
  TrendingConfig,
  UserPublic,
} from "@luxenx/shared";
import { ApiClientError } from "@luxenx/api-client";
import { api, loadStoredTokens, tokenStore, initApiFromSettings, setBackendUrl } from "../lib/api.js";
import { navigate } from "../lib/nav.js";
import { subscribeSessionExpired } from "../lib/session-bus.js";
import type { LocalSettingsLike, UpdateStatus } from "../../electron/bridge-types.js";

export type AuthPhase = "loading" | "anonymous" | "authenticated";

export interface AppData {
  cards: FeatureCard[];
  trending: { config: TrendingConfig; cards: FeatureCard[] };
  settings: GlobalSettings;
  help: HelpContent;
  user: UserPublic | null;
  fetchedAt: string | null;
  error: string | null;
}

const EMPTY_DATA: AppData = {
  cards: [],
  trending: { config: { enabled: false, maxCards: 3, entries: [], updatedAt: "" }, cards: [] },
  settings: {
    maintenanceMode: false,
    maintenanceMessage: null,
    registrationsOpen: true,
    minClientVersion: null,
    announcements: [],
    updatedAt: "",
  },
  help: { faq: [], guides: [], updatedAt: "" },
  user: null,
  fetchedAt: null,
  error: null,
};

interface AppState {
  phase: AuthPhase;
  user: UserPublic | null;
  data: AppData;
  localSettings: LocalSettingsLike | null;
  updateStatus: UpdateStatus;
  appInfo: { version: string; platform: string; packaged: boolean; storageEncrypted: boolean } | null;
  refreshData: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserPublic) => void;
  updateLocalSettings: (patch: Partial<LocalSettingsLike>) => Promise<LocalSettingsLike>;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp hors provider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<AuthPhase>("loading");
  const [user, setUserState] = useState<UserPublic | null>(null);
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [localSettings, setLocalSettings] = useState<LocalSettingsLike | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: "idle" });
  const [appInfo, setAppInfo] = useState<AppState["appInfo"]>(null);
  const lastFetch = useRef<string>(null);

  /* --- Données serveur (dashboard) --- */
  const refreshData = useCallback(async () => {
    try {
      const payload: DashboardPayload & { trending: AppData["trending"] } = await api.getDashboard();
      lastFetch.current = new Date().toISOString();
      setData({
        cards: payload.cards,
        trending: payload.trending,
        settings: payload.settings,
        help: payload.help,
        user: payload.user,
        fetchedAt: lastFetch.current,
        error: null,
      });
      setUserState(payload.user);
    } catch (err) {
      const message =
        err instanceof ApiClientError && err.isNetworkError
          ? "Serveur LuxenX injoignable. Les dernières données connues sont affichées."
          : err instanceof Error
            ? err.message
            : "Erreur inconnue lors de la synchronisation.";
      setData((d) => ({ ...d, error: message }));
    }
  }, []);

  /* --- Démarrage : restauration de session --- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initApiFromSettings();
      const [settings, info, tokens, status] = await Promise.all([
        window.luxenx.settings.get(),
        window.luxenx.app.getInfo(),
        loadStoredTokens().then(() => tokenStore.getRefreshToken()),
        window.luxenx.updater.getStatus(),
      ]);
      if (cancelled) return;
      setLocalSettings(settings);
      setBackendUrl(settings.backendUrl);
      setAppInfo({ version: info.version, platform: info.platform, packaged: info.packaged, storageEncrypted: info.storageEncrypted });
      setUpdateStatus(status);
      document.body.dataset.animations = settings.animationsEnabled && !settings.reduceMotion ? "on" : "off";
      document.body.dataset.notifications = settings.notificationsEnabled ? "on" : "off";

      if (!tokens) {
        setPhase("anonymous");
        navigate({ name: settings.introEnabled ? "intro" : "auth" });
        return;
      }

      // Jetons présents : tentative de restauration silencieuse.
      try {
        const me = await api.me();
        if (cancelled) return;
        setUserState(me);
        setPhase("authenticated");
        navigate({ name: settings.introEnabled && !settings.introSeen ? "intro" : "dashboard" });
        void refreshData();
      } catch {
        // refresh automatique déjà tenté par le client ; échec = session morte.
        await window.luxenx.tokens.clear();
        if (cancelled) return;
        setPhase("anonymous");
        navigate({ name: settings.introEnabled ? "intro" : "auth" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshData]);

  /* --- Événements de mise à jour --- */
  useEffect(() => {
    const off = window.luxenx.updater.onState((status) => setUpdateStatus(status));
    return off;
  }, []);

  /* --- Expiration de session --- */
  useEffect(() => {
    const off = subscribeSessionExpired(() => {
      setPhase("anonymous");
      setUserState(null);
      void window.luxenx.tokens.clear();
      navigate({ name: "auth" });
    });
    return off;
  }, []);

  /* --- Synchronisation périodique des tendances/cartes (5 min) --- */
  useEffect(() => {
    if (phase !== "authenticated") return;
    const timer = setInterval(() => void refreshData(), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [phase, refreshData]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    await tokenStore.setTokens(res.accessToken, res.refreshToken);
    setUserState(res.user);
    setPhase("authenticated");
    navigate({ name: "dashboard" });
    void refreshData();
  }, [refreshData]);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const res = await api.register({ email, username, password });
    await tokenStore.setTokens(res.accessToken, res.refreshToken);
    setUserState(res.user);
    setPhase("authenticated");
    navigate({ name: "dashboard" });
    void refreshData();
  }, [refreshData]);

  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefreshToken();
    try {
      if (refresh) await api.logout(refresh);
    } catch {
      // La déconnexion locale prime sur l'état du serveur.
    }
    await tokenStore.setTokens(null, null);
    await window.luxenx.tokens.clear();
    setUserState(null);
    setPhase("anonymous");
    setData(EMPTY_DATA);
    navigate({ name: "auth" });
  }, []);

  const updateLocalSettings = useCallback(async (patch: Partial<LocalSettingsLike>) => {
    const next = await window.luxenx.settings.set(patch);
    setLocalSettings(next);
    document.body.dataset.animations = next.animationsEnabled && !next.reduceMotion ? "on" : "off";
    document.body.dataset.notifications = next.notificationsEnabled ? "on" : "off";
    if (patch.backendUrl) setBackendUrl(patch.backendUrl);
    return next;
  }, []);

  const value = useMemo<AppState>(
    () => ({
      phase,
      user,
      data,
      localSettings,
      updateStatus,
      appInfo,
      refreshData,
      login,
      register,
      logout,
      setUser: setUserState,
      updateLocalSettings,
    }),
    [phase, user, data, localSettings, updateStatus, appInfo, refreshData, login, register, logout, updateLocalSettings],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
