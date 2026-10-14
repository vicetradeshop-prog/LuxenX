/**
 * @luxenx/shared — Types et constantes partagés entre LuxenX, LuxenX Admin
 * et le backend. Aucune dépendance externe : ce paquet est consommé à la
 * fois par Node.js (backend, Electron main) et par le navigateur (renderer).
 */

/* ------------------------------------------------------------------ */
/* Utilisateurs et rôles                                               */
/* ------------------------------------------------------------------ */

export type Role = "user" | "admin";

export type AccountStatus = "active" | "disabled" | "pending_verification";

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  role: Role;
  status: AccountStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

/** Profil public renvoyé aux clients (jamais de haché de mot de passe). */
export type UserPublic = UserRecord;

export interface SessionInfo {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent?: string;
  current?: boolean;
}

/* ------------------------------------------------------------------ */
/* Cartes de fonctionnalités                                           */
/* ------------------------------------------------------------------ */

export type CardStatus = "available" | "coming_soon" | "maintenance" | "disabled" | "hidden";

export const CARD_STATUSES: readonly CardStatus[] = [
  "available",
  "coming_soon",
  "maintenance",
  "disabled",
  "hidden",
] as const;

export const CARD_STATUS_LABELS_FR: Record<CardStatus, string> = {
  available: "Disponible",
  coming_soon: "Bientôt disponible",
  maintenance: "En maintenance",
  disabled: "Temporairement désactivé",
  hidden: "Masquée",
};

/** Identifiants d'illustrations vectorielles 2D fournies par @luxenx/ui. */
export type IllustrationId =
  | "music"
  | "cloud"
  | "shield"
  | "rocket"
  | "terminal"
  | "network"
  | "drive"
  | "sparkle"
  | "tools";

export const ILLUSTRATION_IDS: readonly IllustrationId[] = [
  "music",
  "cloud",
  "shield",
  "rocket",
  "terminal",
  "network",
  "drive",
  "sparkle",
  "tools",
] as const;

export interface FeatureCard {
  id: string;
  title: string;
  description: string;
  category: string;
  illustration: IllustrationId;
  /** Teinte d'accent de la carte (clé du design system). */
  accent: "violet" | "blue" | "pink" | "lavender";
  order: number;
  status: CardStatus;
  badge?: string | null;
  featured: boolean;
  /** Route interne du renderer LuxenX (jamais de code exécutable distant). */
  destination: string;
  publishedAt: string | null;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Tendances                                                           */
/* ------------------------------------------------------------------ */

export interface TrendingEntry {
  cardId: string;
  pinned: boolean;
  priority: number;
  /** Début/fin de mise en avant (ISO). null = sans limite. */
  startsAt: string | null;
  endsAt: string | null;
}

export interface TrendingConfig {
  enabled: boolean;
  maxCards: number;
  entries: TrendingEntry[];
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Paramètres globaux                                                  */
/* ------------------------------------------------------------------ */

export interface GlobalSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  registrationsOpen: boolean;
  minClientVersion: string | null;
  announcements: Announcement[];
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  level: "info" | "warning";
  active: boolean;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Versions / releases                                                 */
/* ------------------------------------------------------------------ */

export type ReleaseChannel = "stable" | "beta";

export interface ReleaseInfo {
  version: string;
  channel: ReleaseChannel;
  notes: string;
  mandatory: boolean;
  publishedAt: string;
  githubReleaseUrl: string | null;
  assets: ReleaseAsset[];
  status: "draft" | "published" | "failed";
}

export interface ReleaseAsset {
  name: string;
  size: number;
  sha256: string | null;
}

/* ------------------------------------------------------------------ */
/* Aide / guides                                                       */
/* ------------------------------------------------------------------ */

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface GuideStep {
  title: string;
  body: string;
}

export interface Guide {
  id: string;
  title: string;
  category: string;
  illustration: IllustrationId;
  steps: GuideStep[];
}

export interface HelpContent {
  faq: FaqItem[];
  guides: Guide[];
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Script musique                                                      */
/* ------------------------------------------------------------------ */

export type MusicTaskState =
  | "queued"
  | "analyzing"
  | "downloading"
  | "converting"
  | "done"
  | "error"
  | "cancelled";

export interface MusicAnalysis {
  url: string;
  source: string;
  title: string;
  artist: string | null;
  durationSeconds: number | null;
  trackCount: number | null;
  available: boolean;
  message: string | null;
}

export interface MusicTask {
  id: string;
  url: string;
  state: MusicTaskState;
  progress: number | null; // 0..100, null = indéterminé
  title: string | null;
  outputPath: string | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Audit (administration)                                              */
/* ------------------------------------------------------------------ */

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  actorEmail: string;
  action: string;
  target: string | null;
  details: string | null;
}

/* ------------------------------------------------------------------ */
/* API — formes de réponse                                             */
/* ------------------------------------------------------------------ */

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse extends AuthTokens {
  user: UserPublic;
}

export interface DashboardPayload {
  user: UserPublic;
  cards: FeatureCard[];
  trending: { config: TrendingConfig; cards: FeatureCard[] };
  settings: GlobalSettings;
  help: HelpContent;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  activeUsers: number;
  disabledUsers: number;
  totalCards: number;
  availableCards: number;
  latestRelease: ReleaseInfo | null;
  backendVersion: string;
  redisOk: boolean;
  recentAudit: AuditEntry[];
}

/* ------------------------------------------------------------------ */
/* Constantes générales                                                */
/* ------------------------------------------------------------------ */

export const APP_NAMES = {
  desktop: "LuxenX",
  admin: "LuxenX Admin",
  backend: "LuxenX Backend",
} as const;

/** Préfixe de versionnement des clés Redis (stratégie de migration). */
export const DATA_VERSION = "v1";
