/**
 * Navigation interne — routeur minimaliste à pile (sans dépendance).
 * Les routes sont internes à l'application ; aucune URL distante.
 */
import { useSyncExternalStore } from "react";

export type Route =
  | { name: "intro" }
  | { name: "auth" }
  | { name: "dashboard" }
  | { name: "features" }
  | { name: "trending" }
  | { name: "history" }
  | { name: "music" }
  | { name: "account" }
  | { name: "settings" }
  | { name: "help" };

type Listener = () => void;

let current: Route = { name: "intro" };
let previous: Route | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l();
}

export function navigate(route: Route): void {
  if (route.name === current.name) return;
  previous = current;
  current = route;
  emit();
}

export function getRoute(): Route {
  return current;
}

export function getPreviousRoute(): Route | null {
  return previous;
}

/** Abonnement brut au changement de route (utilisé par useRoute et les tests). */
export function subscribeRoute(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribeRoute, () => current);
}
