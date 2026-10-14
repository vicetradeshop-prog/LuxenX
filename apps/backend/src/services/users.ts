/**
 * Service utilisateurs : comptes, sessions, préférences.
 * Les mots de passe sont hachés Argon2id ; les refresh tokens sont
 * stockés uniquement sous forme de hash SHA-256.
 */
import { randomUUID } from "node:crypto";
import type { AccountStatus, Role, SessionInfo, UserPublic, UserRecord } from "@luxenx/shared";
import type { KvStore } from "../lib/kv.js";
import { keys, dayKey } from "../lib/keys.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { generateRefreshToken, hashToken, newSessionId } from "../lib/tokens.js";

/** Record interne incluant le haché (ne quitte jamais le service). */
interface StoredUser extends UserRecord {
  passwordHash: string;
}

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  role?: Role;
  status?: AccountStatus;
}

export interface SessionRecord {
  sid: string;
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string;
}

export function toPublic(u: StoredUser): UserPublic {
  const { passwordHash: _ph, ...pub } = u;
  void _ph;
  return pub;
}

export function usersService(kv: KvStore) {
  async function findByEmailRaw(email: string): Promise<StoredUser | null> {
    const id = await kv.get(keys.userEmail(email));
    if (!id) return null;
    const raw = await kv.get(keys.user(id));
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  }

  async function findByIdRaw(id: string): Promise<StoredUser | null> {
    const raw = await kv.get(keys.user(id));
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  }

  async function save(u: StoredUser): Promise<void> {
    await kv.set(keys.user(u.id), JSON.stringify(u));
    await kv.set(keys.userEmail(u.email), u.id);
    await kv.sadd(keys.usersIndex(), u.id);
  }

  return {
    async create(input: CreateUserInput): Promise<UserRecord> {
      const now = new Date().toISOString();
      const user: StoredUser = {
        id: randomUUID(),
        email: input.email.toLowerCase(),
        username: input.username,
        role: input.role ?? "user",
        status: input.status ?? "active",
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
        passwordHash: await hashPassword(input.password),
      };
      await save(user);
      await kv.incr(keys.signupsDay(dayKey()));
      return toPublic(user);
    },

    async findById(id: string): Promise<UserRecord | null> {
      const u = await findByIdRaw(id);
      return u ? toPublic(u) : null;
    },

    async existsEmail(email: string): Promise<boolean> {
      return (await kv.get(keys.userEmail(email))) !== null;
    },

    async verifyCredentials(email: string, password: string): Promise<UserRecord | null> {
      const u = await findByEmailRaw(email);
      if (!u) {
        // Hachage factice pour lisser le temps de réponse (anti-énumération).
        await hashPassword("comparaison-temps-constant");
        return null;
      }
      const ok = await verifyPassword(password, u.passwordHash);
      return ok ? toPublic(u) : null;
    },

    async update(id: string, patch: Partial<Omit<StoredUser, "id" | "passwordHash">>): Promise<UserRecord | null> {
      const u = await findByIdRaw(id);
      if (!u) return null;
      const next: StoredUser = { ...u, ...patch, updatedAt: new Date().toISOString() };
      await save(next);
      return toPublic(next);
    },

    async changePassword(id: string, currentPassword: string, newPassword: string): Promise<boolean> {
      const u = await findByIdRaw(id);
      if (!u) return false;
      const ok = await verifyPassword(currentPassword, u.passwordHash);
      if (!ok) return false;
      u.passwordHash = await hashPassword(newPassword);
      u.updatedAt = new Date().toISOString();
      await save(u);
      return true;
    },

    async setPassword(id: string, newPassword: string): Promise<boolean> {
      const u = await findByIdRaw(id);
      if (!u) return false;
      u.passwordHash = await hashPassword(newPassword);
      u.updatedAt = new Date().toISOString();
      await save(u);
      return true;
    },

    async list(params: {
      page: number;
      pageSize: number;
      search?: string;
      status?: AccountStatus;
      role?: Role;
    }): Promise<{ items: UserPublic[]; total: number }> {
      const ids = await kv.smembers(keys.usersIndex());
      const users: StoredUser[] = [];
      for (const id of ids) {
        const u = await findByIdRaw(id);
        if (u) users.push(u);
      }
      const q = params.search?.toLowerCase().trim();
      const filtered = users
        .filter((u) => (params.status ? u.status === params.status : true))
        .filter((u) => (params.role ? u.role === params.role : true))
        .filter((u) =>
          q ? u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) : true,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const start = (params.page - 1) * params.pageSize;
      return {
        items: filtered.slice(start, start + params.pageSize).map(toPublic),
        total: filtered.length,
      };
    },

    async countByStatus(): Promise<{ total: number; active: number; disabled: number }> {
      const ids = await kv.smembers(keys.usersIndex());
      let active = 0;
      let disabled = 0;
      for (const id of ids) {
        const u = await findByIdRaw(id);
        if (!u) continue;
        if (u.status === "active") active++;
        else if (u.status === "disabled") disabled++;
      }
      return { total: ids.length, active, disabled };
    },

    async delete(id: string): Promise<void> {
      const u = await findByIdRaw(id);
      if (!u) return;
      await this.revokeAllSessions(id);
      await kv.del(keys.user(id), keys.userEmail(u.email), keys.preferences(id));
      await kv.srem(keys.usersIndex(), id);
    },

    /* ---------------- sessions ---------------- */

    async createSession(
      userId: string,
      ttlSeconds: number,
      userAgent: string,
    ): Promise<{ refreshToken: string; record: SessionRecord }> {
      const refreshToken = generateRefreshToken();
      const tokenHash = hashToken(refreshToken);
      const sid = newSessionId();
      const now = Date.now();
      const record: SessionRecord = {
        sid,
        tokenHash,
        userId,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
        userAgent: userAgent.slice(0, 200),
      };
      await kv.set(keys.session(sid), JSON.stringify({ ...record, tokenHash }), ttlSeconds);
      // Index inverse : hash de refresh token -> sid (même TTL).
      await kv.set(`${keys.session(tokenHash)}:sid`, sid, ttlSeconds);
      await kv.sadd(keys.userSessions(userId), sid);
      return { refreshToken, record };
    },

    async getSession(sid: string): Promise<SessionRecord | null> {
      const raw = await kv.get(keys.session(sid));
      return raw ? (JSON.parse(raw) as SessionRecord) : null;
    },

    async findSessionByRefreshToken(refreshToken: string): Promise<SessionRecord | null> {
      const tokenHash = hashToken(refreshToken);
      // Recherche via l'utilisateur : les sessions sont indexées par userId.
      // Pour éviter un parcours global, on stocke aussi une clé directe.
      const sid = await kv.get(`${keys.session(tokenHash)}:sid`);
      if (!sid) return null;
      const rec = await this.getSession(sid);
      if (!rec || rec.tokenHash !== tokenHash) return null;
      return rec;
    },

    async revokeSession(sid: string): Promise<void> {
      const rec = await this.getSession(sid);
      if (rec) {
        await kv.del(keys.session(sid), `${keys.session(rec.tokenHash)}:sid`);
        await kv.srem(keys.userSessions(rec.userId), sid);
      }
    },

    async revokeAllSessions(userId: string): Promise<number> {
      const sids = await kv.smembers(keys.userSessions(userId));
      let count = 0;
      for (const sid of sids) {
        const rec = await this.getSession(sid);
        if (rec) {
          await kv.del(keys.session(sid), `${keys.session(rec.tokenHash)}:sid`);
          count++;
        }
      }
      await kv.del(keys.userSessions(userId));
      return count;
    },

    async listSessions(userId: string, currentSid?: string): Promise<SessionInfo[]> {
      const sids = await kv.smembers(keys.userSessions(userId));
      const out: SessionInfo[] = [];
      for (const sid of sids) {
        const rec = await this.getSession(sid);
        if (!rec) continue;
        out.push({
          id: sid,
          createdAt: rec.createdAt,
          expiresAt: rec.expiresAt,
          userAgent: rec.userAgent,
          current: sid === currentSid,
        });
      }
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    /* ---------------- préférences ---------------- */

    async getPreferences(userId: string): Promise<Record<string, unknown>> {
      const raw = await kv.get(keys.preferences(userId));
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    },

    async setPreferences(userId: string, prefs: Record<string, unknown>): Promise<void> {
      const current = await this.getPreferences(userId);
      await kv.set(keys.preferences(userId), JSON.stringify({ ...current, ...prefs }));
    },
  };
}

export type UsersService = ReturnType<typeof usersService>;
