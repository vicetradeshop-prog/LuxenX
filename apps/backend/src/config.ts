/**
 * Configuration du backend — lecture et validation des variables
 * d'environnement. Aucun secret n'est journalisé ni renvoyé aux clients.
 */

export interface BackendConfig {
  port: number;
  nodeEnv: "development" | "production" | "test";
  isProduction: boolean;
  sessionSecret: string | null;
  accessTokenTtl: number;
  refreshTokenTtl: number;
  upstash: { url: string; token: string } | null;
  github: { owner: string; repo: string; token: string | null } | null;
  admin: { email: string; password: string } | null;
  smtpConfigured: boolean;
  corsOrigins: string[];
}

function num(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BackendConfig {
  const nodeEnv = (env.NODE_ENV === "production" ? "production" : env.NODE_ENV === "test" ? "test" : "development") as
    | "development"
    | "production"
    | "test";

  const upstashUrl = env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = env.UPSTASH_REDIS_REST_TOKEN?.trim();

  const ghOwner = env.GITHUB_OWNER?.trim();
  const ghRepo = env.GITHUB_REPO?.trim() || "LuxenX";
  const ghToken = env.GITHUB_TOKEN?.trim();

  const adminEmail = env.ADMIN_EMAIL?.trim();
  const adminPassword = env.ADMIN_PASSWORD?.trim();

  return {
    port: num(env.PORT, 8787),
    nodeEnv,
    isProduction: nodeEnv === "production",
    sessionSecret: env.SESSION_SECRET?.trim() || null,
    accessTokenTtl: num(env.ACCESS_TOKEN_TTL, 900),
    refreshTokenTtl: num(env.REFRESH_TOKEN_TTL, 60 * 60 * 24 * 30),
    upstash: upstashUrl && upstashToken ? { url: upstashUrl, token: upstashToken } : null,
    github: ghOwner ? { owner: ghOwner, repo: ghRepo, token: ghToken || null } : null,
    admin: adminEmail && adminPassword ? { email: adminEmail, password: adminPassword } : null,
    smtpConfigured: !!(env.SMTP_HOST?.trim() && env.SMTP_USER?.trim()),
    corsOrigins: (env.CORS_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

/**
 * Vérifications de démarrage. En production, une configuration
 * incomplète empêche le serveur de démarrer (échec explicite).
 */
export function assertConfigUsable(cfg: BackendConfig): string[] {
  const warnings: string[] = [];
  if (!cfg.upstash) {
    const msg =
      "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN absents : le backend utilise un stockage mémoire VOLATILE (développement uniquement).";
    if (cfg.isProduction) throw new Error(`Configuration invalide en production : ${msg}`);
    warnings.push(msg);
  }
  if (!cfg.sessionSecret) {
    const msg = "SESSION_SECRET absent : les jetons ne peuvent pas être signés (authentification indisponible).";
    if (cfg.isProduction) throw new Error(`Configuration invalide en production : ${msg}`);
    warnings.push(msg);
  } else if (cfg.sessionSecret.length < 32) {
    warnings.push("SESSION_SECRET trop court (< 32 caractères). Générez un secret robuste.");
  }
  return warnings;
}
