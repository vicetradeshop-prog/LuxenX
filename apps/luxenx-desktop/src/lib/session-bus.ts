/**
 * Petit bus d'événements pour la session (éviter les imports circulaires
 * entre lib/api et le contexte d'authentification).
 */
type Handler = () => void;
const handlers = new Set<Handler>();

export function onSessionExpired(): void {
  for (const h of handlers) h();
}

export function subscribeSessionExpired(handler: Handler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}
