/**
 * Journal d'audit des opérations administratives.
 * Liste Redis bornée (500 dernières entrées). N'enregistre jamais de
 * mot de passe ni de jeton (expurgé à la source par le logger et par
 * la construction explicite des entrées).
 */
import { randomUUID } from "node:crypto";
import type { AuditEntry } from "@luxenx/shared";
import type { KvStore } from "../lib/kv.js";
import { keys } from "../lib/keys.js";

const MAX_ENTRIES = 500;

export function auditService(kv: KvStore) {
  return {
    async log(entry: Omit<AuditEntry, "id" | "at">): Promise<void> {
      const record: AuditEntry = {
        ...entry,
        id: randomUUID(),
        at: new Date().toISOString(),
      };
      await kv.lpush(keys.audit(), JSON.stringify(record));
      await kv.ltrim(keys.audit(), 0, MAX_ENTRIES - 1);
    },

    async list(page = 1, pageSize = 25): Promise<{ items: AuditEntry[]; total: number }> {
      const all = await kv.lrange(keys.audit(), 0, MAX_ENTRIES - 1);
      const items = all.map((raw) => JSON.parse(raw) as AuditEntry);
      const start = (page - 1) * pageSize;
      return { items: items.slice(start, start + pageSize), total: items.length };
    },
  };
}

export type AuditService = ReturnType<typeof auditService>;
