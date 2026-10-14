/**
 * Utilitaires de test : application Express complète branchée sur
 * MemoryKv (aucune dépendance externe : ni Redis, ni réseau).
 */
import request, { type SuperTest, type Test } from "supertest";
import { MemoryKv } from "../src/lib/kv.js";
import { createContext, type AppContext } from "../src/context.js";
import { createApp } from "../src/app.js";
import { loadConfig, type BackendConfig } from "../src/config.js";
import type { Express } from "express";

export interface TestApp {
  app: Express;
  ctx: AppContext;
  kv: MemoryKv;
  cfg: BackendConfig;
  http: SuperTest<Test>;
}

export function makeApp(env: Record<string, string> = {}): TestApp {
  const cfg = loadConfig({
    NODE_ENV: "test",
    SESSION_SECRET: "secret-de-test-0123456789abcdef-0123456789abcdef",
    ...env,
  } as unknown as NodeJS.ProcessEnv);
  const kv = new MemoryKv();
  const ctx = createContext(cfg, kv, "memory");
  const app = createApp(ctx);
  return { app, ctx, kv, cfg, http: request(app) };
}

export interface TestUser {
  id: string;
  email: string;
  username: string;
  accessToken: string;
  refreshToken: string;
}

/** Crée un compte via l'API et renvoie ses jetons. */
export async function registerUser(
  t: TestApp,
  email: string,
  password = "motdepasse-solide-123",
  username = "utilisateur",
): Promise<TestUser> {
  const res = await t.http.post("/api/v1/auth/register").send({ email, username, password });
  if (res.status !== 201) throw new Error(`registerUser échoué (${res.status}): ${JSON.stringify(res.body)}`);
  const body = res.body as { accessToken: string; refreshToken: string; user: { id: string; email: string; username: string } };
  return {
    id: body.user.id,
    email: body.user.email,
    username: body.user.username,
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
  };
}

/** Crée un administrateur directement en base (procédure seed). */
export async function makeAdmin(t: TestApp, email = "admin@luxenx.test"): Promise<TestUser> {
  const user = await t.ctx.users.create({
    email,
    username: "admin",
    password: "admin-motdepasse-solide",
    role: "admin",
  });
  const res = await t.http
    .post("/api/v1/auth/login")
    .send({ email, password: "admin-motdepasse-solide" });
  if (res.status !== 200) throw new Error(`login admin échoué (${res.status})`);
  return {
    id: user.id,
    email,
    username: "admin",
    accessToken: (res.body as { accessToken: string }).accessToken,
    refreshToken: (res.body as { refreshToken: string }).refreshToken,
  };
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
