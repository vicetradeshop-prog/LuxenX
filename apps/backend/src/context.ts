/**
 * Contexte applicatif : dépendances partagées par les routes.
 * Construit une fois au démarrage (ou injecté dans les tests avec MemoryKv).
 */
import type { BackendConfig } from "./config.js";
import type { KvStore } from "./lib/kv.js";
import { usersService, type UsersService } from "./services/users.js";
import { contentService, type ContentService } from "./services/content.js";
import { releasesService, type ReleasesService } from "./services/releases.js";
import { auditService, type AuditService } from "./services/audit.js";

export interface AppContext {
  cfg: BackendConfig;
  kv: KvStore;
  users: UsersService;
  content: ContentService;
  releases: ReleasesService;
  audit: AuditService;
  kvKind: "upstash" | "memory";
}

export function createContext(cfg: BackendConfig, kv: KvStore, kvKind: "upstash" | "memory"): AppContext {
  return {
    cfg,
    kv,
    kvKind,
    users: usersService(kv),
    content: contentService(kv),
    releases: releasesService(kv, cfg),
    audit: auditService(kv),
  };
}
