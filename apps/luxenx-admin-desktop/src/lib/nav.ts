/**
 * Navigation interne de LuxenX Admin.
 */
import { useSyncExternalStore } from "react";

export type AdminRoute =
  | "login"
  | "dashboard"
  | "users"
  | "cards"
  | "trending"
  | "releases"
  | "help"
  | "audit"
  | "settings";

let current: AdminRoute = "login";
const listeners = new Set<() => void>();

export function navigate(route: AdminRoute): void {
  if (route === current) return;
  current = route;
  for (const l of listeners) l();
}

export function useAdminRoute(): AdminRoute {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
