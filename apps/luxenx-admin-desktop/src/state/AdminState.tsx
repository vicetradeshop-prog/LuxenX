/**
 * État de LuxenX Admin : authentification administrateur.
 *
 * Le rôle admin est vérifié CÔTÉ SERVEUR : après connexion, /auth/me
 * renvoie le profil réel ; un compte non-admin est immédiatement
 * déconnecté. Modifier les fichiers locaux ne donne aucun accès :
 * toutes les routes /api/v1/admin/* refusent les non-admins (403).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserPublic } from "@luxenx/shared";
import { ApiClientError } from "@luxenx/api-client";
import { api, loadStoredTokens, setBackendUrl, setSessionExpiredHandler, tokenStore } from "../lib/api.js";
import { navigate } from "../lib/nav.js";

export type AdminPhase = "loading" | "anonymous" | "admin";

interface AdminState {
  phase: AdminPhase;
  admin: UserPublic | null;
  backendUrl: string;
  backendHealth: { status: string; redis: string; storage: string; version: string | null } | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkHealth: () => Promise<void>;
  updateBackendUrl: (url: string) => Promise<void>;
}

const Ctx = createContext<AdminState | null>(null);

export function useAdmin(): AdminState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdmin hors provider");
  return ctx;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<AdminPhase>("loading");
  const [admin, setAdmin] = useState<UserPublic | null>(null);
  const [backendUrl, setBackendUrlState] = useState("http://localhost:8787");
  const [backendHealth, setBackendHealth] = useState<AdminState["backendHealth"]>(null);

  const goAnonymous = useCallback(async () => {
    await window.luxadmin.tokens.clear();
    setAdmin(null);
    setPhase("anonymous");
    navigate("login");
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const h = await api.health();
      setBackendHealth({
        status: h.status,
        redis: h.redis,
        storage: (h as unknown as { storage?: string }).storage ?? "inconnu",
        version: h.version ?? null,
      });
    } catch (err) {
      setBackendHealth({
        status: err instanceof ApiClientError && err.isNetworkError ? "injoignable" : "erreur",
        redis: "inconnu",
        storage: "inconnu",
        version: null,
      });
    }
  }, []);

  /* --- Démarrage : configuration + restauration de session --- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const settings = await window.luxadmin.settings.get();
      if (cancelled) return;
      setBackendUrl(settings.backendUrl);
      setBackendUrlState(settings.backendUrl);
      setSessionExpiredHandler(() => void goAnonymous());

      const refresh = await loadStoredTokens();
      if (!refresh) {
        setPhase("anonymous");
        void checkHealth();
        return;
      }
      try {
        const me = await api.me();
        if (cancelled) return;
        if (me.role !== "admin") {
          // Un compte normal ne doit JAMAIS accéder à l'administration.
          await tokenStore.setTokens(null, null);
          setPhase("anonymous");
          return;
        }
        setAdmin(me);
        setPhase("admin");
        navigate("dashboard");
      } catch {
        if (!cancelled) await goAnonymous();
      } finally {
        if (!cancelled) void checkHealth();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkHealth, goAnonymous]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login({ email, password });
      if (res.user.role !== "admin") {
        // Refus explicite côté client ET côté serveur (routes admin 403).
        await tokenStore.setTokens(null, null);
        await window.luxadmin.tokens.clear();
        throw new ApiClientError(
          "forbidden",
          "Ce compte n'a pas le rôle administrateur. LuxenX Admin est réservé aux administrateurs vérifiés par le serveur.",
          403,
        );
      }
      await tokenStore.setTokens(res.accessToken, res.refreshToken);
      setAdmin(res.user);
      setPhase("admin");
      navigate("dashboard");
    },
    [],
  );

  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefreshToken();
    try {
      if (refresh) await api.logout(refresh);
    } catch {
      // la déconnexion locale prime
    }
    await goAnonymous();
  }, [goAnonymous]);

  const updateBackendUrl = useCallback(async (url: string) => {
    const next = await window.luxadmin.settings.set({ backendUrl: url });
    setBackendUrl(next.backendUrl);
    setBackendUrlState(next.backendUrl);
    await checkHealth();
  }, [checkHealth]);

  const value = useMemo<AdminState>(
    () => ({ phase, admin, backendUrl, backendHealth, login, logout, checkHealth, updateBackendUrl }),
    [phase, admin, backendUrl, backendHealth, login, logout, checkHealth, updateBackendUrl],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
