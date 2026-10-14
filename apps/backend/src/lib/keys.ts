/**
 * Schéma de clés Redis — versionné (DATA_VERSION) pour permettre
 * des migrations propres. Toute clé commence par "lux:v1:".
 */
import { DATA_VERSION } from "@luxenx/shared";

const P = `lux:${DATA_VERSION}`;

export const keys = {
  /** Hash utilisateur sérialisé JSON. */
  user: (id: string) => `${P}:user:${id}`,
  /** Index email -> userId (minuscule). */
  userEmail: (email: string) => `${P}:user:email:${email.toLowerCase()}`,
  /** Set de tous les userId. */
  usersIndex: () => `${P}:users:index`,
  /** Set des hashes de refresh tokens d'un utilisateur. */
  userSessions: (id: string) => `${P}:user:${id}:sessions`,
  /** Session (par hash sha256 du refresh token). */
  session: (tokenHash: string) => `${P}:session:${tokenHash}`,
  /** Reset password token -> JSON {userId, expiresAt}. */
  resetToken: (tokenHash: string) => `${P}:reset:${tokenHash}`,
  /** Rate limit : compteur. */
  rate: (bucket: string) => `${P}:rate:${bucket}`,
  /** Cartes : une clé par carte + index. */
  card: (id: string) => `${P}:card:${id}`,
  cardsIndex: () => `${P}:cards:index`,
  /** Configuration des tendances (JSON). */
  trending: () => `${P}:trending`,
  /** Paramètres globaux (JSON). */
  settings: () => `${P}:settings`,
  /** Contenu d'aide : FAQ + guides (JSON). */
  help: () => `${P}:help`,
  /** Releases : liste + une clé par version. */
  release: (version: string) => `${P}:release:${version}`,
  releasesIndex: () => `${P}:releases:index`,
  /** Journal d'audit (liste bornée). */
  audit: () => `${P}:audit`,
  /** Statistiques : inscriptions par jour (compteur). */
  signupsDay: (day: string) => `${P}:stats:signups:${day}`,
  /** Préférences utilisateur. */
  preferences: (id: string) => `${P}:user:${id}:prefs`,
  /** Verrou anti-double initialisation du seed. */
  seeded: () => `${P}:seeded`,
} as const;

export const dayKey = (d: Date = new Date()): string => d.toISOString().slice(0, 10);
