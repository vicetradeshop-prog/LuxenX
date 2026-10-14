/**
 * Couche d'accès clé/valeur.
 *
 * - En production : Upstash Redis via REST (@upstash/redis).
 * - En développement sans identifiants : implémentation mémoire volatile
 *   (signalée explicitement dans /health et au démarrage).
 * - En test : MemoryKv déterministe.
 *
 * IMPORTANT : Redis n'offre pas de transactions multi-clés garanties ici ;
 * les services écrivent donc clé par clé et tolèrent les états partiels
 * (relecture + réparation au besoin).
 */

/**
 * Upstash Redis désérialise automatiquement les valeurs JSON stockées.
 * Notre convention KV est « chaînes opaques » : on reconstruit donc la
 * chaîne d'origine quelle que soit la forme rendue par Upstash.
 * Sans cela : JSON.parse(objet) -> "[object Object]" is not valid JSON.
 */
export function normalizeUpstashValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export interface KvStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  ttl(key: string): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<void>;
  srem(key: string, ...members: string[]): Promise<void>;
  smembers(key: string): Promise<string[]>;
  lpush(key: string, ...values: string[]): Promise<void>;
  ltrim(key: string, start: number, stop: number): Promise<void>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  exists(key: string): Promise<boolean>;
}

/* ------------------------------------------------------------------ */
/* Upstash Redis (REST)                                                */
/* ------------------------------------------------------------------ */

export async function createUpstashKv(url: string, token: string): Promise<KvStore> {
  const { Redis } = await import("@upstash/redis");
  const redis = new Redis({ url, token });
  return {
    async get(key) {
      const v = await redis.get<unknown>(key);
      return normalizeUpstashValue(v);
    },
    async set(key, value, ttlSeconds) {
      if (ttlSeconds && ttlSeconds > 0) await redis.set(key, value, { ex: ttlSeconds });
      else await redis.set(key, value);
    },
    async del(...keys) {
      if (keys.length) await redis.del(...keys);
    },
    async incr(key) {
      return redis.incr(key);
    },
    async expire(key, ttlSeconds) {
      await redis.expire(key, ttlSeconds);
    },
    async ttl(key) {
      return redis.ttl(key);
    },
    async sadd(key, ...members) {
      if (members.length) await redis.sadd(key, members);
    },
    async srem(key, ...members) {
      if (members.length) await redis.srem(key, members);
    },
    async smembers(key) {
      const members = (await redis.smembers(key)) as unknown[];
      return members.map((m) => normalizeUpstashValue(m) ?? "");
    },
    async lpush(key, ...values) {
      if (values.length) await redis.lpush(key, values);
    },
    async ltrim(key, start, stop) {
      await redis.ltrim(key, start, stop);
    },
    async lrange(key, start, stop) {
      const values = (await redis.lrange(key, start, stop)) as unknown[];
      return values.map((v) => normalizeUpstashValue(v) ?? "");
    },
    async exists(key) {
      const n = await redis.exists(key);
      return n > 0;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Mémoire volatile (dev/test)                                         */
/* ------------------------------------------------------------------ */

interface MemEntry {
  value: string;
  expiresAt: number | null;
}

export class MemoryKv implements KvStore {
  private store = new Map<string, MemEntry>();
  private sets = new Map<string, Set<string>>();
  private lists = new Map<string, string[]>();

  private alive(entry: MemEntry | undefined, key?: string): entry is MemEntry {
    if (!entry) return false;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      if (key) this.store.delete(key);
      return false;
    }
    return true;
  }

  async get(key: string): Promise<string | null> {
    const e = this.store.get(key);
    return this.alive(e, key) ? e.value : null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(...keys: string[]): Promise<void> {
    for (const k of keys) {
      this.store.delete(k);
      this.sets.delete(k);
      this.lists.delete(k);
    }
  }

  async incr(key: string): Promise<number> {
    const cur = Number((await this.get(key)) ?? "0");
    const next = cur + 1;
    const existing = this.store.get(key);
    this.store.set(key, { value: String(next), expiresAt: this.alive(existing) ? existing.expiresAt : null });
    return next;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const e = this.store.get(key);
    if (this.alive(e)) this.store.set(key, { value: e.value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async ttl(key: string): Promise<number> {
    const e = this.store.get(key);
    if (!this.alive(e, key)) return -2;
    if (e.expiresAt === null) return -1;
    return Math.max(0, Math.ceil((e.expiresAt - Date.now()) / 1000));
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    const s = this.sets.get(key) ?? new Set<string>();
    for (const m of members) s.add(m);
    this.sets.set(key, s);
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    const s = this.sets.get(key);
    if (!s) return;
    for (const m of members) s.delete(m);
  }

  async smembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? [])];
  }

  async lpush(key: string, ...values: string[]): Promise<void> {
    const l = this.lists.get(key) ?? [];
    l.unshift(...values);
    this.lists.set(key, l);
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    const l = this.lists.get(key);
    if (!l) return;
    const end = stop < 0 ? l.length + stop + 1 : stop + 1;
    this.lists.set(key, l.slice(start, end));
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const l = this.lists.get(key) ?? [];
    const end = stop < 0 ? l.length + stop + 1 : stop + 1;
    return l.slice(start, end);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.get(key)) !== null || this.sets.has(key) || this.lists.has(key);
  }

  /** Test helper : vide tout. */
  clear(): void {
    this.store.clear();
    this.sets.clear();
    this.lists.clear();
  }
}
